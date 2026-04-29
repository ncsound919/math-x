// Dedicated Pyodide worker for bioinformatics file parsing.
// Runs Biopython + numpy entirely in-browser via WASM — zero data leaves the device.
import { useState, useEffect, useRef } from 'react';

type BioWorkerMsg =
  | { type: 'ready' }
  | { type: 'result'; id: string; out: string }
  | { type: 'error'; id: string; error: string };

const WORKER_CODE = `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js');

let pyodide = null;
let ready = false;

async function boot() {
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/' });
  await pyodide.loadPackage(['numpy', 'pandas']);
  await pyodide.loadPackage('micropip');
  const micropip = pyodide.pyimport('micropip');
  try {
    await micropip.install(['biopython']);
  } catch(e) {
    console.warn('Biopython install failed:', e);
  }
  ready = true;
  self.postMessage({ type: 'ready' });
}

boot();

self.onmessage = async (e) => {
  if (!ready) return;
  const { type, code, id } = e.data;
  if (type === 'run') {
    try {
      await pyodide.runPythonAsync(\`
import sys, io
sys.stdout = io.StringIO()
\`);
      await pyodide.runPythonAsync(code);
      const out = await pyodide.runPythonAsync('sys.stdout.getvalue()');
      self.postMessage({ type: 'result', id, out: String(out).trim() });
    } catch(err) {
      self.postMessage({ type: 'error', id, error: String(err) });
    }
  }
};
`;

export function useBioPyodide() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, { resolve: (v: string) => void; reject: (e: string) => void }>>(new Map());

  useEffect(() => {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<BioWorkerMsg>) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        setReady(true);
        setLoading(false);
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

  const run = (code: string): Promise<string> => {
    if (!workerRef.current || !ready) return Promise.resolve('Bio engine not ready.');
    const id = `bio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      pendingRef.current.set(id, { resolve, reject: (e) => resolve(`Error: ${e}`) });
      workerRef.current!.postMessage({ type: 'run', code, id });
    });
  };

  return { ready, loading, run };
}
