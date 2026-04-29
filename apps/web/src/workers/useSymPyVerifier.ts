/**
 * useSymPyVerifier — runs SymPy verification code in the Pyodide WASM engine.
 * Flow: API generates SymPy code → this hook executes it locally → returns VERIFIED/UNVERIFIED/ERROR.
 * All computation is local. The API only generates code, never sees results.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export type VerificationStatus = 'pending' | 'verifying' | 'VERIFIED' | 'UNVERIFIED' | 'ERROR' | 'skipped';

export interface VerificationResult {
  id: string;
  status: VerificationStatus;
  error?: string;
  sympy_code?: string;
}

const WORKER_CODE = /* javascript */`
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js');
let pyodide = null;
let ready = false;
async function boot() {
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/' });
  await pyodide.loadPackage(['sympy']);
  ready = true;
  self.postMessage({ type: 'ready' });
}
boot();
self.onmessage = async (e) => {
  const { type, id, code } = e.data;
  if (!ready) { self.postMessage({ type: 'result', id, verdict: 'ERROR: worker not ready' }); return; }
  if (type === 'verify') {
    try {
      await pyodide.runPythonAsync(\`import sys, io; sys.stdout = io.StringIO()\`);
      await pyodide.runPythonAsync(code);
      const out = (await pyodide.runPythonAsync('sys.stdout.getvalue()')).trim();
      self.postMessage({ type: 'result', id, verdict: out });
    } catch(err) {
      self.postMessage({ type: 'result', id, verdict: 'ERROR: ' + String(err) });
    }
  }
};
`;

export function useSymPyVerifier() {
  const [ready, setReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, (verdict: string) => void>>(new Map());

  useEffect(() => {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') { setReady(true); return; }
      const resolve = pendingRef.current.get(e.data.id);
      if (resolve) { resolve(e.data.verdict); pendingRef.current.delete(e.data.id); }
    };
    return () => { worker.terminate(); URL.revokeObjectURL(url); };
  }, []);

  const verifyCode = useCallback((id: string, code: string): Promise<string> => {
    if (!workerRef.current || !ready) return Promise.resolve('ERROR: verifier not ready');
    return new Promise((resolve) => {
      pendingRef.current.set(id, resolve);
      workerRef.current!.postMessage({ type: 'verify', id, code });
    });
  }, [ready]);

  /**
   * Full pipeline: call API to generate SymPy code, execute locally, return verdicts.
   */
  const verifySteps = useCallback(async (
    steps: { id: string; description: string; expression_before: string; expression_after: string; step_type?: string }[],
    context?: string
  ): Promise<VerificationResult[]> => {
    // 1. Get SymPy code from API
    const apiRes = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps, context }),
    });
    const { results: codeResults } = await apiRes.json();

    // 2. Execute each piece of SymPy code locally
    const verdicts = await Promise.all(
      codeResults.map(async (r: any): Promise<VerificationResult> => {
        if (r.status === 'error' || !r.sympy_code) {
          return { id: r.id, status: 'ERROR', error: r.error || 'No code generated' };
        }
        const verdict = await verifyCode(r.id, r.sympy_code);
        let status: VerificationStatus = 'UNVERIFIED';
        if (verdict.startsWith('VERIFIED')) status = 'VERIFIED';
        else if (verdict.startsWith('ERROR')) status = 'ERROR';
        return { id: r.id, status, error: status === 'ERROR' ? verdict : undefined, sympy_code: r.sympy_code };
      })
    );

    return verdicts;
  }, [verifyCode, ready]);

  return { ready, verifySteps, verifyCode };
}
