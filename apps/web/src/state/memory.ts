// Lightweight in-memory vector store using cosine similarity on TF-IDF style embeddings.
// In production, replace with LanceDB WASM or @xenova/transformers for real embeddings.

interface MemoryEntry {
  id: string;
  query: string;
  response: string;
  tokens: string[];
  timestamp: number;
}

const store: MemoryEntry[] = [];

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

function tfidfScore(queryTokens: string[], entry: MemoryEntry): number {
  const qSet = new Set(queryTokens);
  const matches = entry.tokens.filter(t => qSet.has(t)).length;
  return matches / Math.max(entry.tokens.length, queryTokens.length, 1);
}

export function useMemory() {
  const search = async (query: string, topK = 5): Promise<Array<{ source: string; text: string; score: number }>> => {
    if (store.length === 0) return [];
    const qTokens = tokenize(query);
    return store
      .map(e => ({ source: e.id, text: e.response.slice(0, 400), score: tfidfScore(qTokens, e) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  };

  const storeEntry = async (query: string, response: string) => {
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}`,
      query,
      response,
      tokens: tokenize(query + ' ' + response),
      timestamp: Date.now(),
    };
    store.push(entry);
    if (store.length > 200) store.shift(); // rolling window
  };

  return { search, store: storeEntry };
}
