/**
 * LiteraturePanel — UI for live arXiv + PubMed literature search and retrieval.
 * Rendered in the left drawer. Allows searching, previewing results,
 * and provides retrieved papers as context in the chat.
 */
import { useState, useCallback } from 'react';
import type { LiteraturePaper, RetrievedPaper } from '../utils/useLiteratureRAG';

interface LiteraturePanelProps {
  onSearchAndIndex: (query: string, sources: ('arxiv' | 'pubmed')[]) => Promise<LiteraturePaper[]>;
  onRetrieve: (query: string) => Promise<RetrievedPaper[]>;
  searching: boolean;
  totalIndexed: number;
  ready: boolean;
  modeColor: string;
}

export function LiteraturePanel({ onSearchAndIndex, onRetrieve, searching, totalIndexed, ready, modeColor }: LiteraturePanelProps) {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<LiteraturePaper[]>([]);
  const [sources, setSources] = useState<('arxiv' | 'pubmed')[]>(['arxiv', 'pubmed']);
  const [activeTab, setActiveTab] = useState<'search' | 'indexed'>('search');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    const results = await onSearchAndIndex(query.trim(), sources);
    setPapers(results);
  }, [query, sources, onSearchAndIndex]);

  const toggleSource = (s: 'arxiv' | 'pubmed') => {
    setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const SOURCE_COLORS = { arxiv: '#f87171', pubmed: '#60a5fa' };

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: modeColor, fontSize: '0.65rem', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 4 }}>LITERATURE RAG</div>
        <div style={{ color: '#3a2e10', fontSize: '0.58rem' }}>
          {ready ? `${totalIndexed} papers indexed locally` : 'loading embedder…'}
        </div>
      </div>

      {/* Source toggles */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
        {(['arxiv', 'pubmed'] as const).map(s => (
          <button key={s} onClick={() => toggleSource(s)} style={{
            background: sources.includes(s) ? SOURCE_COLORS[s] + '22' : 'transparent',
            border: `1px solid ${sources.includes(s) ? SOURCE_COLORS[s] + '66' : '#2a2010'}`,
            borderRadius: 4, color: sources.includes(s) ? SOURCE_COLORS[s] : '#4a3820',
            fontSize: '0.58rem', padding: '2px 8px', cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'monospace',
          }}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. RNA-seq differential expression"
          style={{
            flex: 1, background: '#0d0a04', border: '1px solid #2a2010',
            borderRadius: 4, color: '#c8a866', fontSize: '0.62rem',
            padding: '5px 8px', fontFamily: 'monospace', outline: 'none',
          }}
        />
        <button onClick={handleSearch} disabled={searching || !ready} style={{
          background: 'none', border: `1px solid ${modeColor}55`,
          borderRadius: 4, color: modeColor, fontSize: '0.6rem',
          padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.08em',
          opacity: searching || !ready ? 0.4 : 1,
        }}>{searching ? '⟳' : 'SEARCH'}</button>
      </div>

      {/* Results */}
      {papers.map(p => (
        <div key={p.id} style={{
          background: '#0a0800', border: '1px solid #2a2010',
          borderRadius: 5, padding: '7px 8px', marginBottom: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
            <span style={{
              background: SOURCE_COLORS[p.source] + '22', color: SOURCE_COLORS[p.source],
              fontSize: '0.52rem', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.1em',
            }}>{p.source.toUpperCase()}</span>
            <span style={{ color: '#3a2e10', fontSize: '0.55rem' }}>{p.published}</span>
          </div>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#c8a866', fontSize: '0.64rem', textDecoration: 'none', lineHeight: 1.4, display: 'block', marginBottom: 3 }}
          >
            {p.title.slice(0, 90)}{p.title.length > 90 ? '…' : ''}
          </a>
          <div style={{ color: '#4a3820', fontSize: '0.58rem' }}>{p.authors.slice(0, 3).join(', ')}{p.authors.length > 3 ? ' et al.' : ''}</div>
          {p.abstract && (
            <details style={{ marginTop: 4 }}>
              <summary style={{ color: '#3a2e10', fontSize: '0.55rem', cursor: 'pointer', letterSpacing: '0.08em' }}>ABSTRACT</summary>
              <div style={{ color: '#6a5a3a', fontSize: '0.58rem', marginTop: 3, lineHeight: 1.5 }}>{p.abstract.slice(0, 300)}…</div>
            </details>
          )}
        </div>
      ))}

      {papers.length === 0 && !searching && (
        <div style={{ color: '#3a2e10', fontSize: '0.6rem', textAlign: 'center', padding: '12px 0' }}>
          Search arXiv and PubMed to build your local knowledge base
        </div>
      )}
    </div>
  );
}
