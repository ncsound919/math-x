// React hook wrapping the embedding worker.
import { useCallback, useEffect, useRef, useState } from 'react';
import { globalVectorStore, type VectorDoc } from '../utils/vectorStore';

let workerSingleton: Worker | null = null;
function getWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new Worker(new URL('../workers/embeddingWorker.ts', import.meta.url), { type: 'module' });
  }
  return workerSingleton;
}

let reqCounter = 0;
function callWorker(type: string, payload: any): Promise<any> {
  const w = getWorker();
  const id = ++reqCounter;
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      w.removeEventListener('message', handler);
      if (e.data?.ok) resolve(e.data);
      else reject(new Error(e.data?.error || 'worker error'));
    };
    w.addEventListener('message', handler);
    w.postMessage({ id, type, payload });
  });
}

export function useEmbeddings() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const warmedRef = useRef(false);

  const warmup = useCallback(async () => {
    if (warmedRef.current) return;
    setLoading(true);
    try {
      await callWorker('warmup', {});
      warmedRef.current = true;
      setReady(true);
    } catch (e: any) {
      setError(e?.message || 'warmup failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const embed = useCallback(async (texts: string[]): Promise<number[][]> => {
    const res = await callWorker('embed', { texts });
    return res.vectors as number[][];
  }, []);

  const ingest = useCallback(async (docs: Array<{ id: string; text: string; source: string; meta?: any }>) => {
    const texts = docs.map(d => d.text);
    const vecs = await embed(texts);
    const vdocs: VectorDoc[] = docs.map((d, i) => ({ id: d.id, text: d.text, source: d.source, vector: vecs[i], meta: d.meta }));
    globalVectorStore.addMany(vdocs);
    return vdocs.length;
  }, [embed]);

  const search = useCallback(async (query: string, k = 5) => {
    const [qv] = await embed([query]);
    return globalVectorStore.search(qv, k);
  }, [embed]);

  useEffect(() => { /* lazy warmup on first use */ }, []);

  return { ready, loading, error, warmup, embed, ingest, search, store: globalVectorStore };
}