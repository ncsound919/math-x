/**
 * useLiteratureRAG — live literature search + local embedding + retrieval.
 * Searches arXiv + PubMed via the API, embeds results using
 * transformers.js (all-MiniLM-L6-v2) in a Web Worker, stores in
 * an in-memory vector index, retrieves top-k for any query.
 *
 * Zero data leaves the browser after the API call. Embeddings run locally.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export interface LiteraturePaper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  published: string;
  url: string;
  source: 'arxiv' | 'pubmed';
  journal?: string;
}

export interface RetrievedPaper extends LiteraturePaper {
  score: number;
}

// In-memory flat vector store (adequate for <1000 papers per session)
interface VectorEntry {
  paper: LiteraturePaper;
  embedding: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

// Lightweight embedding worker using the transformers.js pipeline
const EMBED_WORKER_CODE = /* javascript */`
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
env.allowLocalModels = false;
let embedder = null;
self.onmessage = async (e) => {
  const { type, id, texts } = e.data;
  if (type === 'init') {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
    self.postMessage({ type: 'ready' });
    return;
  }
  if (type === 'embed' && embedder) {
    try {
      const output = await embedder(texts, { pooling: 'mean', normalize: true });
      const vecs = Array.from({ length: texts.length }, (_, i) => Array.from(output[i].data));
      self.postMessage({ type: 'embeddings', id, vecs });
    } catch(err) {
      self.postMessage({ type: 'error', id, error: String(err) });
    }
  }
};
`;

export function useLiteratureRAG() {
  const [ready, setReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [totalIndexed, setTotalIndexed] = useState(0);
  const storeRef = useRef<VectorEntry[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, (vecs: number[][]) => void>>(new Map());

  useEffect(() => {
    const blob = new Blob([EMBED_WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url, { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') { setReady(true); return; }
      if (e.data.type === 'embeddings') {
        pendingRef.current.get(e.data.id)?.(e.data.vecs);
        pendingRef.current.delete(e.data.id);
      }
      if (e.data.type === 'error') {
        pendingRef.current.get(e.data.id)?.([]);
        pendingRef.current.delete(e.data.id);
      }
    };
    worker.postMessage({ type: 'init' });
    return () => { worker.terminate(); URL.revokeObjectURL(url); };
  }, []);

  const embed = useCallback((texts: string[]): Promise<number[][]> => {
    if (!workerRef.current) return Promise.resolve([]);
    const id = `emb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      pendingRef.current.set(id, resolve);
      workerRef.current!.postMessage({ type: 'embed', id, texts });
    });
  }, []);

  /**
   * Search arXiv + PubMed, embed results, add to local vector store.
   */
  const searchAndIndex = useCallback(async (query: string, sources: ('arxiv' | 'pubmed')[] = ['arxiv', 'pubmed']): Promise<LiteraturePaper[]> => {
    setSearching(true);
    try {
      const res = await fetch('/api/literature/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sources, maxResults: 10 }),
      });
      const { papers } = await res.json() as { papers: LiteraturePaper[] };
      if (!papers || papers.length === 0) return [];

      // Embed: title + abstract concatenated
      const texts = papers.map(p => `${p.title}. ${p.abstract}`.slice(0, 512));
      const vecs = await embed(texts);

      // Add to in-memory store (deduplicate by id)
      const existingIds = new Set(storeRef.current.map(e => e.paper.id));
      let added = 0;
      papers.forEach((paper, i) => {
        if (!existingIds.has(paper.id) && vecs[i]?.length > 0) {
          storeRef.current.push({ paper, embedding: vecs[i] });
          added++;
        }
      });
      setTotalIndexed(storeRef.current.length);
      return papers;
    } finally {
      setSearching(false);
    }
  }, [embed]);

  /**
   * Retrieve top-k most relevant papers for a query.
   */
  const retrieve = useCallback(async (query: string, topK = 4): Promise<RetrievedPaper[]> => {
    if (storeRef.current.length === 0) return [];
    const [queryVec] = await embed([query.slice(0, 512)]);
    if (!queryVec || queryVec.length === 0) return [];

    return storeRef.current
      .map(entry => ({ ...entry.paper, score: cosineSimilarity(queryVec, entry.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }, [embed]);

  return { ready, searching, totalIndexed, searchAndIndex, retrieve };
}
