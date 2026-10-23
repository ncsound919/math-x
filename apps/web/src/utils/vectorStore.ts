// In-browser vector store for RAG. Cosine similarity over normalized embeddings.
// Persistence to IndexedDB is optional via idb-keyval (left as a future enhancement).

export interface VectorDoc {
  id: string;
  text: string;
  source: string;
  vector: number[];
  meta?: Record<string, unknown>;
}

export class VectorStore {
  private docs: VectorDoc[] = [];

  add(doc: VectorDoc) {
    const idx = this.docs.findIndex(d => d.id === doc.id);
    if (idx >= 0) this.docs[idx] = doc;
    else this.docs.push(doc);
  }

  addMany(docs: VectorDoc[]) {
    for (const d of docs) this.add(d);
  }

  remove(id: string) {
    this.docs = this.docs.filter(d => d.id !== id);
  }

  clear() {
    this.docs = [];
  }

  size() {
    return this.docs.length;
  }

  /** Cosine similarity search. Returns top-k docs. */
  search(queryVec: number[], k = 5): Array<{ doc: VectorDoc; score: number }> {
    const scored = this.docs.map(d => ({ doc: d, score: cosine(d.vector, queryVec) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  all() {
    return [...this.docs];
  }

  toJSON() {
    return this.docs;
  }

  fromJSON(docs: VectorDoc[]) {
    this.docs = docs || [];
  }
}

function cosine(a: number[], b: number[]) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export const globalVectorStore = new VectorStore();