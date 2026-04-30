import { useState, useEffect, useRef, useCallback } from 'react';

export interface PyodideStatus {
  ready: boolean;
  loading: boolean;
  kernelCleared: boolean;
  extraPackages: string[];
}

const WORKER_SRC = `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js');

let pyodide = null;
let isReady = false;
const loadedExtras = new Set();

async function boot() {
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/',
  });
  await pyodide.loadPackagesFromImports('import numpy, scipy, sympy, json, io, sys');
  pyodide.runPython(\`
import sys, io
class _CaptureIO(io.StringIO):
    pass
\`);
  isReady = true;
  self.postMessage({ type: 'ready' });
}

boot().catch(e => self.postMessage({ type: 'error', id: 'boot', error: String(e) }));

self.onmessage = async (e) => {
  const { type, id, code, packages } = e.data;

  if (type === 'load-extra') {
    const toLoad = (packages || []).filter(p => !loadedExtras.has(p));
    if (toLoad.length === 0) {
      self.postMessage({ type: 'extra-loaded', id, loaded: [] });
      return;
    }
    try {
      await pyodide.loadPackage(toLoad);
      toLoad.forEach(p => loadedExtras.add(p));
      self.postMessage({ type: 'extra-loaded', id, loaded: toLoad });
    } catch(err) {
      self.postMessage({ type: 'error', id, error: String(err) });
    }
    return;
  }

  if (type === 'clear') {
    try {
      pyodide.runPython(\`
import builtins as _b
_keep = {'__name__', '__doc__', '__package__', '__loader__', '__spec__', '__builtins__'}
_g = globals()
for _k in list(_g.keys()):
    if _k not in _keep:
        del _g[_k]
\`);
      self.postMessage({ type: 'cleared', id });
    } catch(err) {
      self.postMessage({ type: 'cleared', id });
    }
    return;
  }

  if (type === 'run') {
    if (!isReady) {
      self.postMessage({ type: 'error', id, error: 'Pyodide not ready' });
      return;
    }
    try {
      pyodide.runPython(\`
import sys, io
_stdout_capture = io.StringIO()
sys.stdout = _stdout_capture
\`);
      await pyodide.runPythonAsync(code);
      const out = pyodide.runPython(\`
sys.stdout = sys.__stdout__
_stdout_capture.getvalue()
\`);
      self.postMessage({ type: 'result', id, stdout: String(out).trim() });
    } catch (err) {
      pyodide.runPython('import sys; sys.stdout = sys.__stdout__').catch(() => {});
      self.postMessage({ type: 'error', id, error: String(err) });
    }
  }
};
`;

export function usePyodide() {
  const [status, setStatus] = useState<PyodideStatus>({
    ready: false, loading: true, kernelCleared: false, extraPackages: [],
  });
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, {
    resolve: (v: string) => void;
    reject: (e: string) => void;
  }>>(new Map());

  useEffect(() => {
    const blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        setStatus({ ready: true, loading: false, kernelCleared: false, extraPackages: [] });
      } else if (msg.type === 'result') {
        pendingRef.current.get(msg.id)?.resolve(msg.stdout);
        pendingRef.current.delete(msg.id);
      } else if (msg.type === 'extra-loaded') {
        setStatus(s => ({ ...s, extraPackages: [...s.extraPackages, ...msg.loaded] }));
        pendingRef.current.get(msg.id)?.resolve(msg.loaded.join(','));
        pendingRef.current.delete(msg.id);
      } else if (msg.type === 'error') {
        pendingRef.current.get(msg.id)?.reject(msg.error);
        pendingRef.current.delete(msg.id);
      } else if (msg.type === 'cleared') {
        setStatus(s => ({ ...s, kernelCleared: true }));
        pendingRef.current.get(msg.id)?.resolve('Kernel cleared');
        pendingRef.current.delete(msg.id);
        setTimeout(() => setStatus(s => ({ ...s, kernelCleared: false })), 2000);
      }
    };

    worker.onerror = (e) => {
      console.error('Pyodide worker error:', e);
      setStatus({ ready: false, loading: false, kernelCleared: false, extraPackages: [] });
    };

    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  }, []);

  const compute = useCallback((code: string): Promise<string> => {
    const worker = workerRef.current;
    if (!worker || !status.ready) return Promise.resolve('');
    const id = `py-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });
      worker.postMessage({ type: 'run', id, code });
    });
  }, [status.ready]);

  const loadExtra = useCallback((packages: string[]): Promise<string> => {
    const worker = workerRef.current;
    if (!worker) return Promise.resolve('');
    const id = `load-${Date.now()}`;
    return new Promise((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });
      worker.postMessage({ type: 'load-extra', id, packages });
    });
  }, []);

  const clearKernel = useCallback((): Promise<void> => {
    const worker = workerRef.current;
    if (!worker) return Promise.resolve();
    const id = `clear-${Date.now()}`;
    return new Promise((resolve) => {
      pendingRef.current.set(id, { resolve: () => resolve(), reject: () => resolve() });
      worker.postMessage({ type: 'clear', id });
    });
  }, []);

  return { status, compute, loadExtra, clearKernel };
}
