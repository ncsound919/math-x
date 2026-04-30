import { useState, useCallback } from 'react';

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  pdfUrl: string;
  published: string;
  score?: number;
}

export function useLiteratureRAG() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, topK = 10): Promise<Paper[]> => {
    setLoading(true);
    try {
      const res = await fetch('/api/literature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: topK }),
      });
      const { results } = await res.json();
      setPapers(results);
      return results;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { papers, search, loading };
}

// Lightweight pipeline helper — no React state, just returns context strings
export async function fetchLiteratureContext(query: string, limit = 3): Promise<string[]> {
  try {
    const res = await fetch('/api/literature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });
    if (!res.ok) return [];
    const { results } = await res.json();
    return (results as Paper[]).map(p =>
      `[arXiv: ${p.id}] ${p.title}\nAuthors: ${p.authors.slice(0, 3).join(', ')}\n${p.abstract.slice(0, 480)}...`
    );
  } catch {
    return [];
  }
}
