// LiteraturePanel — search PubMed + arXiv from within Math X session.
// Results inject into Claude context for literature-grounded answers.
import { useState } from 'react';

interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  journal: string;
  url: string;
  source: 'pubmed' | 'arxiv';
}

interface LiteraturePanelProps {
  modeColor?: string;
  onInjectContext?: (papers: Paper[]) => void;
  apiBase?: string;
}

export function LiteraturePanel({ modeColor = '#F0A500', onInjectContext, apiBase = '/api' }: LiteraturePanelProps) {
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<{ pubmed: boolean; arxiv: boolean }>({ pubmed: true, arxiv: true });
  const [results, setResults] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const sourcesArr = Object.entries(sources).filter(([, v]) => v).map(([k]) => k);
      const res = await fetch(`${apiBase}/literature/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sources: sourcesArr, maxPerSource: 5 }),
      });
      const data = await res.json();
      setResults(data.results || []);
      if (data.errors?.length) setError(data.errors.join('; '));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const injectSelected = () => {
    const papers = results.filter(r => selected.has(r.id));
    onInjectContext?.(papers);
    setSelected(new Set());
  };

  return (
    <div style={{
      background: '#080700', border: `1px solid ${modeColor}22`,
      borderRadius: 12, padding: 16, fontFamily: 'inherit',
    }}>
      <div style={{ color: modeColor, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', marginBottom: 12 }}>
        📚 LITERATURE SEARCH
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search PubMed + arXiv..."
          style={{
            flex: 1, background: '#0f0c02', border: `1px solid ${modeColor}33`,
            borderRadius: 8, padding: '8px 12px', color: '#c8b880',
            fontSize: '0.72rem', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button onClick={search} disabled={loading}
          style={{
            background: loading ? '#1a1408' : modeColor, color: '#0a0800',
            border: 'none', borderRadius: 8, padding: '8px 14px',
            fontSize: '0.7rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer',
          }}>
          {loading ? '○' : 'SEARCH'}
        </button>
      </div>

      {/* Source toggles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['pubmed', 'arxiv'] as const).map(src => (
          <button key={src} onClick={() => setSources(p => ({ ...p, [src]: !p[src] }))}
            style={{
              background: sources[src] ? `${modeColor}18` : '#0f0c02',
              border: `1px solid ${sources[src] ? modeColor + '55' : '#2a2010'}`,
              borderRadius: 20, padding: '3px 12px',
              color: sources[src] ? modeColor : '#4a3820',
              fontSize: '0.62rem', cursor: 'pointer', fontWeight: 600,
            }}>
            {src === 'pubmed' ? '🧬 PubMed' : '📜 arXiv'}
          </button>
        ))}
      </div>

      {error && <div style={{ color: '#cc6644', fontSize: '0.65rem', marginBottom: 8 }}>⚠ {error}</div>}

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
        {results.map(paper => {
          const isSelected = selected.has(paper.id);
          return (
            <div key={paper.id}
              onClick={() => toggleSelect(paper.id)}
              style={{
                background: isSelected ? `${modeColor}0e` : '#0f0c02',
                border: `1px solid ${isSelected ? modeColor + '55' : '#2a2010'}`,
                borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: paper.source === 'pubmed' ? '#4a9a6a' : '#6a8aaa', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                  {paper.source.toUpperCase()} · {paper.year}
                </span>
                {isSelected && <span style={{ color: modeColor, fontSize: '0.62rem' }}>✓ SELECTED</span>}
              </div>
              <div style={{ color: '#c8b880', fontSize: '0.7rem', fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>
                {paper.title}
              </div>
              <div style={{ color: '#5a4a2a', fontSize: '0.62rem', marginBottom: 6 }}>
                {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}
                {paper.journal !== 'arXiv' ? ` · ${paper.journal}` : ''}
              </div>
              <div style={{ color: '#4a3820', fontSize: '0.62rem', lineHeight: 1.6 }}>
                {paper.abstract.slice(0, 200)}{paper.abstract.length > 200 ? '...' : ''}
              </div>
              <a href={paper.url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: modeColor + '88', fontSize: '0.6rem', display: 'block', marginTop: 6 }}>
                ↗ {paper.url}
              </a>
            </div>
          );
        })}
      </div>

      {/* Inject selected into context */}
      {selected.size > 0 && (
        <button onClick={injectSelected}
          style={{
            marginTop: 10, width: '100%', background: modeColor,
            color: '#0a0800', border: 'none', borderRadius: 8,
            padding: '10px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
          }}>
          ⬆ INJECT {selected.size} PAPER{selected.size > 1 ? 'S' : ''} INTO CONTEXT
        </button>
      )}
    </div>
  );
}

// Build literature context block for Claude injection
export function buildLiteratureContext(papers: Paper[]): string {
  if (!papers.length) return '';
  return [
    '## Injected Literature Context',
    `*${papers.length} paper${papers.length > 1 ? 's' : ''} selected from PubMed/arXiv — use these to ground your answer.*`,
    '',
    ...papers.map((p, i) =>
      `### [${i + 1}] ${p.title} (${p.year})
**Authors:** ${p.authors.join(', ')}  
**Source:** ${p.source.toUpperCase()} · ${p.journal}  
**URL:** ${p.url}

**Abstract:**
${p.abstract}`
    ),
  ].join('\n');
}
