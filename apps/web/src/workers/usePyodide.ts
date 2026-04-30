import { useState, useEffect, useRef, useCallback } from 'react';

type PyodideWorkerMessage =
  | { type: 'ready' }
  | { type: 'result'; id: string; out: string }
  | { type: 'error'; id: string; error: string };

// Worker supports two run modes:
//   run  – fresh stdout capture, globals PRESERVED (REPL behaviour)
//   run_fresh – resets Python globals before each execution (one-shot mode)
const WORKER_CODE = `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js');

let pyodide = null;
let ready = false;

async function boot() {
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/' });
  await pyodide.loadPackage(['numpy', 'sympy', 'scipy', 'pandas']);
  await pyodide.loadPackage('micropip');
  const micropip = pyodide.pyimport('micropip');
  try {
    await micropip.install(['scikit-learn', 'statsmodels', 'networkx']);
  } catch(e) {
    console.warn('Optional packages failed:', e);
  }
  // Prime the namespace with useful imports so REPL sessions start fast
  await pyodide.runPythonAsync('import numpy as np, json, math, sympy as sp');
  ready = true;
  self.postMessage({ type: 'ready' });
}

boot();

self.onmessage = async (e) => {
  if (!ready) return;
  const { type, code, id } = e.data;

  if (type === 'run' || type === 'run_fresh') {
    try {
      if (type === 'run_fresh') {
        // Wipe user-defined names but keep builtins + pre-loaded packages
        await pyodide.runPythonAsync(\`
import sys
_keep = set(dir(__builtins__)) | {'np','json','math','sp','pandas','scipy','sklearn','sys','io'}
_drop = [k for k in list(globals().keys()) if k not in _keep and not k.startswith('_')]
for _k in _drop:
    try: del globals()[_k]
    except: pass
\`);
      }
      // Capture stdout for this run
      await pyodide.runPythonAsync('import sys, io; sys.stdout = io.StringIO()');
      await pyodide.runPythonAsync(code);
      const out = await pyodide.runPythonAsync('sys.stdout.getvalue()');
      self.postMessage({ type: 'result', id, out: String(out).trim() });
    } catch(err) {
      self.postMessage({ type: 'error', id, error: String(err) });
    }
  }

  if (type === 'reset') {
    // Full namespace wipe
    try {
      await pyodide.runPythonAsync(\`
import sys
_keep = set(dir(__builtins__)) | {'np','json','math','sp','sys','io'}
_drop = [k for k in list(globals().keys()) if k not in _keep and not k.startswith('_')]
for _k in _drop:
    try: del globals()[_k]
    except: pass
\`);
      self.postMessage({ type: 'result', id, out: '# Kernel reset.' });
    } catch(err) {
      self.postMessage({ type: 'error', id, error: String(err) });
    }
  }
};
`;

export function usePyodide() {
  const [ready, setReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, { resolve: (v: string) => void; reject: (e: string) => void }>>(new Map());

  useEffect(() => {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<PyodideWorkerMessage>) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        setReady(true);
      } else if (msg.type === 'result') {
        pendingRef.current.get(msg.id)?.resolve(msg.out);
        pendingRef.current.delete(msg.id);
      } else if (msg.type === 'error') {
        pendingRef.current.get(msg.id)?.reject(msg.error);
        pendingRef.current.delete(msg.id);
      }
    };

    return () => { worker.terminate(); URL.revokeObjectURL(url); };
  }, []);

  const _send = useCallback((type: string, code: string): Promise<string> => {
    if (!workerRef.current || !ready) return Promise.resolve('WASM engine not ready.');
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      pendingRef.current.set(id, { resolve, reject: (e) => resolve(`Error: ${e}`) });
      workerRef.current!.postMessage({ type, code, id });
    });
  }, [ready]);

  // REPL: globals persist across calls – ideal for interactive exploration
  const compute = useCallback((code: string) => _send('run', code), [_send]);

  // One-shot: globals are wiped before execution
  const computeFresh = useCallback((code: string) => _send('run_fresh', code), [_send]);

  // Reset kernel (wipe user-defined names)
  const resetKernel = useCallback(() => _send('reset', ''), [_send]);

  return { ready, compute, computeFresh, resetKernel };
}
