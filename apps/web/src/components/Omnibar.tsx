import { useState, useRef, useCallback } from 'react';
import type { Mode } from '../state/types';

interface OmnibarProps {
  modeObj: Mode;
  onSend: (text: string, files: File[]) => void;
  loading: boolean;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const QUICK_PROBES = [
  'Find the cross-domain analogue',
  'What symmetry underlies this?',
  'Run a Monte Carlo simulation',
  'Generalize this formula',
  'What is the information-theoretic view?',
];

export function Omnibar({ modeObj, onSend, loading, files, setFiles }: OmnibarProps) {
  const [input, setInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && (input.trim() || files.length > 0)) {
        onSend(input, files);
        setInput('');
      }
    }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected].slice(0, 20));
    e.target.value = '';
  };

  return (
    <div style={{
      padding: '10px 20px 14px',
      borderTop: '1px solid #1e1808',
      background: 'rgba(6,4,0,0.98)',
      backdropFilter: 'blur(12px)',
      position: 'sticky', bottom: 0, zIndex: 20, flexShrink: 0,
    }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Quick probes */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 8, paddingBottom: 2 }}>
          {QUICK_PROBES.map(p => (
            <button key={p}
              onClick={() => setInput(prev => prev ? `${prev}. ${p}` : p)}
              style={{
                padding: '3px 10px', background: '#0a0800',
                border: '1px solid #2a2010', borderRadius: 20,
                color: '#4a3820', fontSize: '0.62rem',
                whiteSpace: 'nowrap', cursor: 'pointer',
                flexShrink: 0, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { const t = e.target as HTMLButtonElement; t.style.color = modeObj.color; t.style.borderColor = modeObj.color + '44'; }}
              onMouseLeave={e => { const t = e.target as HTMLButtonElement; t.style.color = '#4a3820'; t.style.borderColor = '#2a2010'; }}
            >{p}</button>
          ))}
        </div>

        {/* Attached file pills */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
            {files.map((f, i) => (
              <span key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#1a1408', border: '1px solid #3a2e10',
                borderRadius: 5, padding: '3px 9px',
                fontSize: '0.7rem', color: '#c8a050',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {f.type.startsWith('image/') ? '🖼' : '📄'} {f.name}
                <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a4820', padding: 0, fontSize: '0.75rem' }}>✕</button>
              </span>
            ))}
          </div>
        )}

        {/* Mode indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: '0.6rem', color: modeObj.color, letterSpacing: '0.12em' }}>
            {modeObj.icon} {modeObj.label.toUpperCase()} · {modeObj.desc}
          </span>
        </div>

        {/* Input box */}
        <div style={{
          display: 'flex', gap: 7, alignItems: 'flex-end',
          background: '#0a0800',
          border: `1px solid #2a2010`,
          borderRadius: 10, padding: '8px 10px',
        }}>
          {/* File attach */}
          <button title="Attach files" onClick={() => fileRef.current?.click()}
            style={{ width: 28, height: 28, borderRadius: 5, flexShrink: 0, background: '#0e0c07', border: '1px solid #2a2010', color: '#4a3820', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 1 }}>
            📎
          </button>
          {/* Folder attach */}
          <button title="Ingest folder" onClick={() => folderRef.current?.click()}
            style={{ width: 28, height: 28, borderRadius: 5, flexShrink: 0, background: '#0e0c07', border: '1px solid #2a2010', color: '#4a3820', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 1 }}>
            ◫
          </button>

          <input ref={fileRef} type="file" accept=".pdf,.csv,.json,.parquet,image/*,.py,.ts,.js,.md,.txt" multiple style={{ display: 'none' }} onChange={handleFileAdd} />
          <input ref={folderRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileAdd}
            {...{ webkitdirectory: 'true', directory: 'true' } as any} />

          <textarea
            ref={taRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`${modeObj.label} query... (↵ send, ⇧↵ newline)`}
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: '#c8bfa8', fontSize: '0.88rem', lineHeight: 1.65,
              minHeight: 22, maxHeight: 130,
              fontFamily: "'DM Mono', monospace", letterSpacing: '0.01em',
            }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 130) + 'px';
            }}
          />

          <button
            onClick={() => { if (!loading && (input.trim() || files.length > 0)) { onSend(input, files); setInput(''); } }}
            disabled={loading || (!input.trim() && files.length === 0)}
            style={{
              width: 30, height: 30, borderRadius: 6, flexShrink: 0,
              background: `linear-gradient(135deg, ${modeObj.color}cc, ${modeObj.color}88)`,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', color: '#060400', fontWeight: 700,
              marginBottom: 1,
              opacity: loading || (!input.trim() && files.length === 0) ? 0.35 : 1,
              transition: 'all 0.15s',
            }}>↑</button>
        </div>
      </div>
    </div>
  );
}
