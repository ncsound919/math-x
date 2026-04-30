import { useState, useRef, useCallback, useEffect, DragEvent } from 'react';
import { useOCR } from '../utils/useOCR';
import { ModelSelector } from './ModelSelector';
import type { Mode } from '../state/types';
import type { ProviderOption } from './ModelSelector';

const ACCEPT = '.pdf,.csv,.json,.txt,.py,.ts,.fasta,.fa,.fastq,.fq,.vcf,.bed,.gff,.gff3,.gtf,.pdb,.parquet,.png,.jpg,.jpeg,.gif,.webp';

interface OmnibarProps {
  onSend: (text: string, files: File[]) => void;
  loading: boolean;
  onStop?: () => void;
  modeObj: Mode;
  provider: ProviderOption;
  onProviderChange: (v: ProviderOption) => void;
}

export function Omnibar({ onSend, loading, onStop, modeObj, provider, onProviderChange }: OmnibarProps) {
  const [input, setInput]           = useState('');
  const [files, setFiles]           = useState<File[]>([]);
  const [dragging, setDragging]     = useState(false);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { extractLatex, loading: ocrLoading, result: ocrResult, error: ocrError } = useOCR();

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'SET_INPUT') {
        setInput(e.data.text || '');
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (ocrResult?.latex) {
      setInput(prev => prev ? `${prev}\n\n${ocrResult.latex}` : ocrResult.latex);
      setOcrPreview(null);
    }
  }, [ocrResult]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text && files.length === 0) return;
    onSend(text, files);
    setInput('');
    setFiles([]);
    setOcrPreview(null);
  }, [input, files, onSend]);

  const addFiles = useCallback(async (incoming: File[]) => {
    const images    = incoming.filter(f => f.type.startsWith('image/'));
    const nonImages = incoming.filter(f => !f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...nonImages.filter(f => !prev.find(e => e.name === f.name))]);
    for (const img of images) {
      const url = URL.createObjectURL(img);
      setOcrPreview(url);
      await extractLatex(img);
      URL.revokeObjectURL(url);
    }
  }, [extractLatex]);

  const onDrop      = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }, [addFiles]);
  const onDragOver  = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const removeFile  = (name: string) => setFiles(prev => prev.filter(f => f.name !== name));

  const { color } = modeObj;

  return (
    <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
      {ocrPreview && (
        <div style={{
          marginBottom: 8, padding: '8px 12px',
          background: '#0d0b00', border: `1px solid ${color}44`,
          borderRadius: 6, display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <img src={ocrPreview} alt="OCR preview" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 4, background: '#000' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: color, marginBottom: 2 }}>EXTRACTING LATEX…</div>
            {ocrLoading && (
              <div style={{ width: '100%', height: 3, background: '#1a1408', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '60%', background: color, borderRadius: 2, animation: 'scan 1s ease-in-out infinite alternate' }} />
              </div>
            )}
            {ocrError && <div style={{ fontSize: '0.65rem', color: '#ff6b35' }}>{ocrError}</div>}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {files.map(f => (
            <span key={f.name} style={{
              fontSize: '0.65rem', color: '#c8bfa8',
              background: '#1a1408', border: '1px solid #3a2e10',
              borderRadius: 4, padding: '2px 8px',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              📎 {f.name}
              <button onClick={() => removeFile(f.name)}
                style={{ background: 'none', border: 'none', color: '#6a5830', cursor: 'pointer', padding: 0, fontSize: '0.7rem', lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      <div
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        style={{
          background: '#0a0800',
          border: `1px solid ${dragging ? color : '#2a2010'}`,
          borderRadius: 10, padding: '10px 14px',
          transition: 'border-color 0.15s',
          boxShadow: dragging ? `0 0 16px ${color}22` : 'none',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
          }}
          placeholder={dragging ? 'Drop files here…' : 'Ask a mathematical question, drop a file, or paste a formula…'}
          rows={1}
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            color: '#c8bfa8', fontSize: '0.88rem', lineHeight: 1.6,
            resize: 'none', fontFamily: 'inherit', minHeight: 36,
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              style={{
                background: 'none', border: '1px solid #2a2010', borderRadius: 4,
                color: '#6a5830', cursor: 'pointer', fontSize: '0.75rem', padding: '3px 8px',
              }}
            >📎</button>
            <input
              ref={fileInputRef} type="file" multiple accept={ACCEPT}
              style={{ display: 'none' }}
              onChange={e => e.target.files && addFiles(Array.from(e.target.files))}
            />
            <ModelSelector value={provider} onChange={onProviderChange} />
            <span style={{ fontSize: '0.6rem', color: '#3a2e10' }}>
              {dragging ? 'DROP TO ATTACH' : '⌘⏎ to send'}
            </span>
          </div>

          {loading ? (
            <button
              onClick={onStop}
              style={{
                background: '#1a0800', border: '1px solid #ff6b3555',
                color: '#ff6b35', borderRadius: 6, padding: '6px 16px',
                cursor: 'pointer', fontSize: '0.72rem',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >■ STOP</button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() && files.length === 0}
              style={{
                background: input.trim() || files.length > 0 ? `${color}22` : '#0a0800',
                border: `1px solid ${input.trim() || files.length > 0 ? color + '88' : '#2a2010'}`,
                color: input.trim() || files.length > 0 ? color : '#3a2e10',
                borderRadius: 6, padding: '6px 18px',
                cursor: input.trim() || files.length > 0 ? 'pointer' : 'default',
                fontSize: '0.72rem', transition: 'all 0.15s',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >SEND ▶</button>
          )}
        </div>
      </div>
    </div>
  );
}
