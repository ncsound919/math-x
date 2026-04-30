import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
  accent?: string;
}

function renderKaTeX(src: string): string {
  // Block math: $$...$$ or \[...\]
  src = src.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => {
    try {
      return katex.renderToString((a || b).trim(), { displayMode: true, throwOnError: false });
    } catch { return `<code>${a || b}</code>`; }
  });
  // Inline math: $...$ or \(...\)
  src = src.replace(/\$([^\$\n]+?)\$|\\\((.+?)\\\)/g, (_, a, b) => {
    try {
      return katex.renderToString((a || b).trim(), { displayMode: false, throwOnError: false });
    } catch { return `<code>${a || b}</code>`; }
  });
  return src;
}

export function MathRenderer({ text, accent = '#f0a500' }: MathRendererProps) {
  const html = useMemo(() => {
    let src = text;
    src = renderKaTeX(src);

    src = src
      .replace(/\*\*##\s*(.+?)\*\*/g, `<div style="color:${accent};font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:14px 0 5px;font-family:'JetBrains Mono',monospace">$1</div>`)
      .replace(/\*\*(.+?)\*\*/g, "<strong style='color:#e8e0cc'>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em style='color:#c8b896'>$1</em>")
      .replace(/`([^`\n]+)`/g, `<code style="background:#1a1408;padding:2px 6px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:0.8em;color:#f0a500;border:1px solid #3a2e10">$1</code>`)
      .replace(/^(\d+)\.\s/gm, `<span style="color:${accent};font-weight:700">$1.</span> `)
      .replace(/^-\s/gm, `<span style="color:${accent};opacity:0.6">◦</span> `)
      .replace(/🔗 Cross-Domain Bridge/g, `<span style="color:#00e5b0;font-weight:700">🔗 Cross-Domain Bridge</span>`)
      .replace(/⚡ Hidden Insight/g, `<span style="color:#f0a500;font-weight:700">⚡ Hidden Insight</span>`)
      .replace(/\*\*Conjecture:\*\*/g, `<span style="color:#e05aff;font-weight:700;font-family:'JetBrains Mono',monospace">▶ CONJECTURE:</span>`)
      .replace(/\[KNOWN\]/g, `<span style="background:#1a2e1a;color:#7cff6b;padding:1px 5px;border-radius:3px;font-size:0.7em">KNOWN</span>`)
      .replace(/\[UNDEREXPLORED\]/g, `<span style="background:#2e2a1a;color:#f0a500;padding:1px 5px;border-radius:3px;font-size:0.7em">UNDEREXPLORED</span>`)
      .replace(/\[NOVEL\]/g, `<span style="background:#1a1a2e;color:#00c8ff;padding:1px 5px;border-radius:3px;font-size:0.7em">NOVEL</span>`)
      .replace(/\[SPECULATIVE\]/g, `<span style="background:#2e1a2e;color:#e05aff;padding:1px 5px;border-radius:3px;font-size:0.7em">SPECULATIVE</span>`)
      .replace(/\n\n/g, '</p><p style="margin:8px 0">')
      .replace(/\n/g, '<br/>');

    return `<p style="margin:0">${src}</p>`;
  }, [text, accent]);

  return (
    <div
      style={{ lineHeight: 1.8, color: '#c8bfa8', fontSize: '0.88rem' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
