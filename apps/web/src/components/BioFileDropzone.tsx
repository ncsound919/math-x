/**
 * BioFileDropzone — drag-and-drop bioinformatics file ingestion panel.
 * Accepts FASTA, FASTQ, VCF, PDB, BED, GFF3. Parses locally via Biopython WASM.
 * Emits BioParseResult to parent so the chat layer can inject it as context.
 */
import { useCallback, useState, useRef } from 'react';
import type { BioParseResult, BioFileType } from '../workers/useBioPyodide';
import { useBioPyodide, detectFileType } from '../workers/useBioPyodide';

const ACCEPTED_EXTENSIONS = ['.fasta', '.fa', '.fna', '.faa', '.fastq', '.fq', '.vcf', '.pdb', '.ent', '.bed', '.gff', '.gff3', '.gtf', '.sam', '.csv', '.tsv', '.txt'];

const FILE_TYPE_COLORS: Record<BioFileType | 'unknown', string> = {
  fasta:   '#4ade80',
  fastq:   '#60a5fa',
  vcf:     '#f472b6',
  pdb:     '#fbbf24',
  bed:     '#a78bfa',
  gff3:    '#34d399',
  sam:     '#fb923c',
  csv:     '#e2e8f0',
  tsv:     '#e2e8f0',
  unknown: '#6b7280',
};

interface LoadedFile {
  name: string;
  type: BioFileType;
  size: number;
  result: BioParseResult | null;
  parsing: boolean;
  error?: string;
}

interface BioFileDropzoneProps {
  onFileParsed: (filename: string, result: BioParseResult, rawContent: string) => void;
  modeColor: string;
  collapsed?: boolean;
}

export function BioFileDropzone({ onFileParsed, modeColor, collapsed = false }: BioFileDropzoneProps) {
  const { ready, parseFile } = useBioPyodide();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const text = await file.text();
    const fileType = detectFileType(file.name, text);
    const entry: LoadedFile = { name: file.name, type: fileType, size: file.size, result: null, parsing: true };
    setFiles(prev => [entry, ...prev.filter(f => f.name !== file.name)]);

    const result = await parseFile(file.name, text);
    setFiles(prev => prev.map(f => f.name === file.name ? { ...f, result, parsing: false, error: result.error } : f));
    onFileParsed(file.name, result, text);
  }, [parseFile, onFileParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(processFile);
  }, [processFile]);

  const typeColor = (t: BioFileType) => FILE_TYPE_COLORS[t] || FILE_TYPE_COLORS.unknown;

  if (collapsed) return null;

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragging ? modeColor : '#2a2010'}`,
          borderRadius: 8,
          padding: '16px 12px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? `${modeColor}08` : '#0a0800',
          transition: 'all 0.15s',
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🧬</div>
        <div style={{ color: ready ? modeColor : '#4a3820', fontSize: '0.68rem', letterSpacing: '0.1em' }}>
          {ready ? 'DROP BIO FILES' : 'LOADING BIO ENGINE…'}
        </div>
        <div style={{ color: '#3a2e10', fontSize: '0.58rem', marginTop: 4 }}>
          FASTA · FASTQ · VCF · PDB · BED · GFF3
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>

      {/* Loaded files list */}
      {files.map(f => (
        <div key={f.name} style={{
          background: '#0d0a04',
          border: `1px solid ${typeColor(f.type)}22`,
          borderRadius: 6,
          padding: '8px 10px',
          marginBottom: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: f.result ? 4 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                background: typeColor(f.type) + '22',
                color: typeColor(f.type),
                fontSize: '0.55rem',
                padding: '1px 6px',
                borderRadius: 3,
                letterSpacing: '0.1em',
                fontWeight: 700,
              }}>{f.type.toUpperCase()}</span>
              <span style={{ color: '#8a7a5a', fontSize: '0.65rem' }}>{f.name}</span>
            </div>
            <span style={{ color: '#3a2e10', fontSize: '0.6rem' }}>{(f.size / 1024).toFixed(1)} KB</span>
          </div>

          {f.parsing && (
            <div style={{ color: '#4a3820', fontSize: '0.62rem', marginTop: 4, letterSpacing: '0.08em' }}>⟳ parsing locally…</div>
          )}

          {f.result && !f.parsing && (
            <div>
              <div style={{ color: typeColor(f.type), fontSize: '0.62rem', marginTop: 4, lineHeight: 1.6 }}>{f.result.summary}</div>
              {f.result.stats && Object.keys(f.result.stats).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                  {Object.entries(f.result.stats)
                    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <span key={k} style={{
                        background: '#1a1408',
                        border: '1px solid #2a2010',
                        borderRadius: 4,
                        padding: '2px 6px',
                        fontSize: '0.58rem',
                        color: '#6a5a3a',
                      }}>
                        <span style={{ color: '#4a3820' }}>{k.replace(/_/g,' ')}</span>
                        {' '}<span style={{ color: '#a89870' }}>{String(v)}</span>
                      </span>
                    ))}
                </div>
              )}
              {f.result.preview && (
                <details style={{ marginTop: 5 }}>
                  <summary style={{ color: '#3a2e10', fontSize: '0.58rem', cursor: 'pointer', letterSpacing: '0.08em' }}>PREVIEW</summary>
                  <pre style={{ color: '#6a5a3a', fontSize: '0.58rem', marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}>{f.result.preview}</pre>
                </details>
              )}
            </div>
          )}

          {f.error && (
            <div style={{ color: '#f87171', fontSize: '0.6rem', marginTop: 4 }}>⚠ {f.error}</div>
          )}
        </div>
      ))}
    </div>
  );
}
