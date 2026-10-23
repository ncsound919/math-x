// Notebook mode — Jupyter-like cells for reproducible research.
import { useState } from 'react';
import type { NotebookCell, NotebookCellType } from '../state/notebook';

interface NotebookProps {
  modeColor?: string;
  compute?: (code: string) => Promise<string>;
  onAskAI?: (prompt: string) => Promise<string>;
}

function newCell(type: NotebookCellType = 'code'): NotebookCell {
  return { id: `cell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, content: '' };
}

export function Notebook({ modeColor = '#F0A500', compute, onAskAI }: NotebookProps) {
  const [cells, setCells] = useState<NotebookCell[]>([newCell('markdown')]);
  const [runningAll, setRunningAll] = useState(false);

  const updateCell = (id: string, patch: Partial<NotebookCell>) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const addCell = (type: NotebookCellType, afterId?: string) => {
    const cell = newCell(type);
    setCells(prev => {
      if (!afterId) return [...prev, cell];
      const idx = prev.findIndex(c => c.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, cell);
      return next;
    });
  };

  const removeCell = (id: string) => setCells(prev => prev.filter(c => c.id !== id));

  const moveCell = (id: string, dir: -1 | 1) => {
    setCells(prev => {
      const idx = prev.findIndex(c => c.id === id);
      const ni = idx + dir;
      if (ni < 0 || ni >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return next;
    });
  };

  const runCell = async (cell: NotebookCell) => {
    updateCell(cell.id, { running: true, error: undefined });
    try {
      if (cell.type === 'code') {
        const out = compute ? await compute(cell.content) : '(no compute backend)';
        updateCell(cell.id, { output: out, running: false });
      } else if (cell.type === 'ai') {
        const out = onAskAI ? await onAskAI(cell.content) : '(no AI backend)';
        updateCell(cell.id, { output: out, running: false });
      } else {
        updateCell(cell.id, { running: false });
      }
    } catch (e: any) {
      updateCell(cell.id, { error: e?.message || String(e), running: false });
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const c of cells) {
      if (c.type === 'code' || c.type === 'ai') await runCell(c);
    }
    setRunningAll(false);
  };

  const exportMarkdown = () => {
    const md = cells.map(c => {
      if (c.type === 'markdown') return c.content;
      if (c.type === 'code') return `\`\`\`python\n${c.content}\n\`\`\`\n\n**Output:**\n\`\`\`\n${c.output || ''}\n\`\`\``;
      return `> AI: ${c.content}\n\n${c.output || ''}`;
    }).join('\n\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'notebook.md'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 16, fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ color: modeColor, fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.12em' }}>📓 NOTEBOOK</span>
        <button onClick={runAll} disabled={runningAll}
          style={{ background: modeColor, color: 'var(--bg1)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>
          {runningAll ? 'RUNNING…' : '▶ RUN ALL'}
        </button>
        <button onClick={exportMarkdown}
          style={{ background: 'var(--bg2)', color: modeColor, border: `1px solid ${modeColor}44`, borderRadius: 6, padding: '4px 10px', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>
          ⬇ EXPORT MD
        </button>
        <button onClick={() => addCell('markdown')}
          style={{ background: 'var(--bg2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.62rem', cursor: 'pointer' }}>+ MD</button>
        <button onClick={() => addCell('code')}
          style={{ background: 'var(--bg2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.62rem', cursor: 'pointer' }}>+ CODE</button>
        <button onClick={() => addCell('ai')}
          style={{ background: 'var(--bg2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.62rem', cursor: 'pointer' }}>+ AI</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cells.map((cell, i) => (
          <div key={cell.id} style={{ background: 'var(--bg1)', border: `1px solid ${modeColor}22`, borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.6rem', color: modeColor, fontWeight: 700 }}>{cell.type.toUpperCase()}</span>
              <button onClick={() => moveCell(cell.id, -1)} style={btnStyle}>↑</button>
              <button onClick={() => moveCell(cell.id, 1)} style={btnStyle}>↓</button>
              <button onClick={() => runCell(cell)} disabled={cell.running}
                style={{ ...btnStyle, color: modeColor }}>{cell.running ? '…' : '▶'}</button>
              <button onClick={() => removeCell(cell.id)} style={{ ...btnStyle, color: '#cc6644' }}>×</button>
            </div>
            <textarea
              value={cell.content}
              onChange={e => updateCell(cell.id, { content: e.target.value })}
              placeholder={cell.type === 'markdown' ? 'Markdown…' : cell.type === 'code' ? 'Python code…' : 'Prompt for AI…'}
              rows={Math.max(2, cell.content.split('\n').length)}
              style={{
                width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: 8, color: 'var(--text)', fontSize: '0.78rem',
                fontFamily: cell.type === 'code' ? 'var(--font-mono)' : 'inherit',
                resize: 'vertical', outline: 'none',
              }}
            />
            {cell.error && <div style={{ color: '#cc6644', fontSize: '0.65rem', marginTop: 6 }}>⚠ {cell.error}</div>}
            {cell.output && (
              <pre style={{
                marginTop: 6, padding: 8, background: 'var(--bg)', borderRadius: 6,
                fontSize: '0.72rem', color: 'var(--green)', overflowX: 'auto',
                border: '1px solid #1a2e1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{cell.output}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4,
  padding: '2px 6px', fontSize: '0.6rem', cursor: 'pointer', color: 'var(--text-muted)',
};