// Web worker for client-side embeddings via Transformers.js.
// Keeps the main thread free; model loads lazily on first embed request.
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder: any = null;

async function getEmbedder() {
  if (embedder) return embedder;
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return embedder;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data || {};
  try {
    if (type === 'embed') {
      const texts: string[] = Array.isArray(payload?.texts) ? payload.texts : [String(payload?.text ?? '')];
      const model = await getEmbedder();
      const out = await model(texts, { pooling: 'mean', normalize: true });
      const vectors: number[][] = Array.from(out.data ? [out.data] : out).length
        ? (Array.isArray(out.tolist) ? out.tolist() : Array.from(out.data))
        : [];
      // Transformers.js returns a Tensor; use .tolist() when available
      const list = typeof out.tolist === 'function' ? out.tolist() : [Array.from(out.data)];
      const normalized = (Array.isArray(list[0]) ? list : [list]).map((v: any) => Array.from(v));
      self.postMessage({ id, ok: true, vectors: normalized });
    } else if (type === 'warmup') {
      await getEmbedder();
      self.postMessage({ id, ok: true, warmed: true });
    } else {
      self.postMessage({ id, ok: false, error: `unknown type ${type}` });
    }
  } catch (err: any) {
    self.postMessage({ id, ok: false, error: err?.message || String(err) });
  }
};