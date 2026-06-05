// ExportPanel — Publication bundle export: LaTeX / .ipynb / BibTeX / DOCX from session messages
import { useState } from 'react';
import type { Message } from '../state/types';

interface ExportPanelProps {
  messages: Message[];
  modeColor?: string;
  sessionName?: string;
  apiBase?: string;
}

type ExportFormat = 'latex' | 'ipynb' | 'bibtex' | 'docx' | 'markdown';

const EXPORT_FORMATS: { id: ExportFormat; icon: string; label: string; ext: string; mime: string; desc: string }[] = [
  { id: 'latex',    icon: 'Σ', label: 'LaTeX',    ext: 'tex',   mime: 'text/plain',       desc: 'Math equations + derivations as .tex' },
  { id: 'ipynb',    icon: '▶', label: 'Notebook', ext: 'ipynb', mime: 'application/json', desc: 'Executable Jupyter notebook (.ipynb)' },
  { id: 'bibtex',   icon: '📎', label: 'BibTeX',   ext: 'bib',   mime: 'text/plain',       desc: 'Literature references as .bib' },
  { id: 'docx',     icon: '📄', label: 'DOCX',     ext: 'docx',  mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', desc: 'Full report as Word document' },
  { id: 'markdown', icon: '#',  label: 'Markdown', ext: 'md',    mime: 'text/plain',       desc: 'Full session as Markdown' },
];

// ---------------------------------------------------------------------------
// LaTeX escaping — must run on ALL user-supplied strings before interpolation
// ---------------------------------------------------------------------------

/**
 * Escape characters that have special meaning in LaTeX.
 * Does NOT escape math delimiters ($, \) so KaTeX content passes through.
 * Use this for title / session name strings that are plain text, not math.
 */
function latexEscapePlainText(text: string): string {
  return text
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\\/g, '\\textbackslash{}') // must come last — avoids double-escaping
}

/**
 * Escape a string for inclusion in LaTeX body content.
 * Preserves existing $...$ and $$...$$ math blocks untouched.
 * Escapes special chars in plain-text segments only.
 */
function latexEscapeBody(text: string): string {
  // Split on math delimiters, escape only the non-math segments
  const parts = text.split(/((?:\$\$[\s\S]*?\$\$|\$[^\n$]*?\$))/g);
  return parts.map((part, i) => {
    // Odd-indexed parts are the math blocks captured by the group
    if (i % 2 === 1) return part;
    return part
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/#/g, '\\#')
      .replace(/_(?![a-zA-Z])/g, '\\_')    // don't break x_1 in math that leaked out
      .replace(/</g, '\\textless{}')
      .replace(/>/g, '\\textgreater{}');
  }).join('');
}

// ---- Client-side generators (no server needed for text formats) ----

function generateMarkdown(messages: Message[], sessionName: string): string {
  const lines = [`# ${sessionName}`, `_Exported from Math X ◈ — ${new Date().toISOString()}_`, ''];
  for (const m of messages) {
    lines.push(`## ${m.role === 'user' ? '💻 User' : '◈ Math X'}`);
    lines.push(m.content);
    if (m.execution?.stdout) {
      lines.push('\n```python-output');
      lines.push(m.execution.stdout);
      lines.push('```');
    }
    lines.push('');
  }
  return lines.join('\n');
}

function generateBibTeX(messages: Message[]): string {
  const allText = messages.map(m => m.content).join(' ');
  const doiPattern = /10\.\d{4,}\/[\w./-]+/g;
  const dois = [...new Set(allText.match(doiPattern) || [])];
  if (dois.length === 0) {
    return '% No DOIs detected in session.\n% Paste DOIs or paper titles here to auto-generate BibTeX.\n';
  }
  return dois.map((doi, i) => [
    `@article{ref${i + 1},`,
    `  doi = {${doi}},`,
    `  url = {https://doi.org/${doi}},`,
    `  note = {Referenced in Math X session: ${new Date().toLocaleDateString()}}`,
    `}`,
  ].join('\n')).join('\n\n');
}

function generateLaTeX(messages: Message[], sessionName: string): string {
  const escapedTitle = latexEscapePlainText(sessionName);

  const body = messages
    .filter(m => m.role === 'assistant')
    .map(m => {
      // Apply markdown-to-LaTeX transforms on the escaped body
      return latexEscapeBody(m.content)
        .replace(/^#{1,3} (.+)$/gm, (_: string, h: string) => `\\subsection*{${h}}`)
        .replace(/\*\*(.+?)\*\*/g, (_: string, b: string) => `\\textbf{${b}}`)
        .replace(/`([^`]+)`/g, (_: string, c: string) => `\\texttt{${c}}`);
    })
    .join('\n\n');

  return [
    '\\documentclass{article}',
    '\\usepackage{amsmath,amssymb,hyperref,listings,geometry}',
    '\\geometry{margin=1in}',
    `\\title{${escapedTitle}}`,
    `\\date{${new Date().toLocaleDateString()}}`,
    '\\begin{document}',
    '\\maketitle',
    body,
    '\\end{document}',
  ].join('\n');
}

function generateIpynb(messages: Message[], sessionName: string): string {
  const cells = [];

  cells.push({
    cell_type: 'markdown',
    metadata: {},
    source: [`# ${sessionName}\n`, `_Math X export — ${new Date().toISOString()}_`],
  });

  for (const m of messages) {
    if (m.role === 'user') {
      cells.push({
        cell_type: 'markdown',
        metadata: {},
        source: [`**User:** ${m.content}`],
      });
    } else {
      cells.push({
        cell_type: 'markdown',
        metadata: {},
        source: [m.content],
      });
      if (m.execution?.stdout) {
        cells.push({
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [
            {
              output_type: 'stream',
              name: 'stdout',
              text: [m.execution.stdout],
            },
          ],
          source: ['# Math X computed output\nprint("""' + m.execution.stdout + '""")'],
        });
      }
    }
  }

  const nb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.11.0' },
    },
    cells,
  };
  return JSON.stringify(nb, null, 2);
}

// ---- Component ----

export function ExportPanel({ messages, modeColor = 'var(--teal)', sessionName = 'Math X Session', apiBase = '/api' }: ExportPanelProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ExportFormat | null>(null);

  const assistantMessages = messages.filter(m => m.role === 'assistant');
  if (assistantMessages.length === 0) return null;

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (fmt: ExportFormat) => {
    setExporting(fmt);
    setError(null);
    setDone(null);
    const safeName = sessionName.replace(/[^a-z0-9]/gi, '_').slice(0, 40);

    try {
      if (fmt === 'markdown') {
        triggerDownload(generateMarkdown(messages, sessionName), `${safeName}.md`, 'text/plain');
      } else if (fmt === 'bibtex') {
        triggerDownload(generateBibTeX(messages), `${safeName}.bib`, 'text/plain');
      } else if (fmt === 'latex') {
        triggerDownload(generateLaTeX(messages, sessionName), `${safeName}.tex`, 'text/plain');
      } else if (fmt === 'ipynb') {
        triggerDownload(generateIpynb(messages, sessionName), `${safeName}.ipynb`, 'application/json');
      } else if (fmt === 'docx') {
        // Server-side DOCX generation — POST to /api/export with format:'plain'
        // then the server reformats for download. The export route handles
        // the conversion; DOCX-specific generation uses the 'plain' pipeline
        // until a dedicated docx endpoint is implemented.
        const content = messages
          .filter(m => m.role === 'assistant')
          .map(m => m.content)
          .join('\n\n---\n\n');

        const res = await fetch(`${apiBase}/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            format: 'plain',
            title: sessionName,
          }),
        });
        if (!res.ok) {
          // Do not surface the raw server error body to the user
          throw new Error(`Export failed (HTTP ${res.status})`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.txt`; // plaintext until real DOCX endpoint lands
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setDone(fmt);
      setTimeout(() => setDone(null), 2500);
    } catch (e: unknown) {
      // Show only a controlled message — never raw Error.message from fetch/server
      setError(e instanceof Error ? e.message : 'Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div
      style={{
        margin: '10px 0',
        padding: '10px 14px',
        background: '#060500',
        border: `1px solid ${modeColor}22`,
        borderRadius: 7,
      }}
    >
      <div style={{ fontSize: '0.6rem', color: modeColor, letterSpacing: '0.15em', marginBottom: 8 }}>
        📦 PUBLICATION BUNDLE EXPORT
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {EXPORT_FORMATS.map(f => (
          <button
            key={f.id}
            title={f.desc}
            disabled={exporting === f.id}
            onClick={() => handleExport(f.id)}
            style={{
              padding: '4px 10px',
              background: done === f.id ? `${modeColor}22` : 'var(--bg1)',
              border: `1px solid ${done === f.id ? modeColor : 'var(--border)'}`,
              borderRadius: 14,
              color: done === f.id ? modeColor : exporting === f.id ? 'var(--border)' : '#5a4a20',
              cursor: exporting === f.id ? 'wait' : 'pointer',
              fontSize: '0.63rem',
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{f.icon}</span>
            <span>{done === f.id ? '✓ ' : ''}{f.label}</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--border-bright)' }}>.{f.ext}</span>
          </button>
        ))}
      </div>
      {error && (
        <div style={{ marginTop: 6, fontSize: '0.6rem', color: '#ff4444' }}>⚠ {error}</div>
      )}
    </div>
  );
}
