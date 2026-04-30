import { useState, useRef, useEffect } from 'react';

interface ExportButtonProps {
  content: string;
  accent: string;
}

function contentToLatex(text: string): string {
  // Wrap existing LaTeX blocks and format as a LaTeX document snippet
  const lines = text.split('\n');
  const latex = lines.map(line => {
    if (line.startsWith('$$') && line.endsWith('$$')) {
      return `\\[
${line.slice(2, -2).trim()}
\\]`;
    }
    return line.replace(/\$(.+?)\$/g, '\\($1\\)');
  }).join('\n');
  return `% Math X export\n\\documentclass{article}\n\\usepackage{amsmath,amssymb}\n\\begin{document}\n\n${latex}\n\n\\end{document}`;
}

function contentToNotebook(text: string): string {
  const cells = text.split('\n\n').filter(Boolean).map(block => ({
    cell_type: 'markdown',
    metadata: {},
    source: [block],
    outputs: [],
    execution_count: null,
  }));
  return JSON.stringify({
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.11.0' },
    },
    cells,
  }, null, 2);
}

export function ExportButton({ content, accent }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const copyLatex = () => {
    navigator.clipboard.writeText(contentToLatex(content));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setOpen(false);
  };

  const downloadNotebook = () => {
    const blob = new Blob([contentToNotebook(content)], { type: 'application/x-ipynb+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mathx-${Date.now()}.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const copyText = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setOpen(false);
  };

  const btn: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'none', border: 'none', color: '#c8bfa8',
    padding: '5px 10px', cursor: 'pointer', fontSize: '0.65rem',
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: 'nowrap',
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Export"
        style={{
          background: 'none', border: `1px solid ${accent}33`,
          color: copied ? accent : '#4a3820',
          cursor: 'pointer', fontSize: '0.6rem',
          padding: '2px 8px', borderRadius: 4,
          fontFamily: "'JetBrains Mono', monospace",
          transition: 'color 0.2s',
        }}
      >
        {copied ? '✓ COPIED' : '↗ EXPORT'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '110%', left: 0,
          background: '#0d0b00', border: `1px solid ${accent}44`,
          borderRadius: 6, padding: '4px 0', zIndex: 20,
          minWidth: 150, boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
        }}>
          <button style={btn} onMouseEnter={e => { (e.target as HTMLElement).style.background = '#1a1408'; }} onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; }} onClick={copyLatex}>📋 Copy as LaTeX</button>
          <button style={btn} onMouseEnter={e => { (e.target as HTMLElement).style.background = '#1a1408'; }} onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; }} onClick={downloadNotebook}>📓 Download .ipynb</button>
          <button style={btn} onMouseEnter={e => { (e.target as HTMLElement).style.background = '#1a1408'; }} onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; }} onClick={copyText}>📝 Copy plain text</button>
        </div>
      )}
    </div>
  );
}
