import { useRef } from 'react';

interface LeftDrawerProps {
  open: boolean;
  ingestedFiles: string[];
  onIngest: (files: File[]) => void;
  modeColor: string;
}

export function LeftDrawer({ open, ingestedFiles, onIngest, modeColor }: LeftDrawerProps) {
  const folderRef = useRef<HTMLInputElement>(null);

  const handleFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onIngest(files);
    e.target.value = '';
  };

  return (
    <div style={{
      width: open ? 240 : 0,
      minWidth: open ? 240 : 0,
      overflow: 'hidden',
      transition: 'all 0.22s ease',
      borderRight: open ? '1px solid #1e1808' : 'none',
      background: '#080600',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '16px 14px', overflowY: 'auto', flex: 1 }}>
        <div style={{ fontSize: '0.6rem', color: '#3a2e10', letterSpacing: '0.18em', marginBottom: 14 }}>◫ FILE INTELLIGENCE</div>

        {/* Folder drop zone */}
        <div
          onClick={() => folderRef.current?.click()}
          style={{
            border: `1px dashed ${modeColor}44`,
            borderRadius: 7, padding: '16px 10px',
            textAlign: 'center', cursor: 'pointer',
            marginBottom: 14, transition: 'all 0.15s',
            color: '#4a3820', fontSize: '0.72rem',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = modeColor + '88'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = modeColor + '44'; }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: 6, color: modeColor }}>◫</div>
          <div>INGEST FOLDER</div>
          <div style={{ fontSize: '0.6rem', marginTop: 3, color: '#3a2e10' }}>PDF · CSV · JSON · IMG · CODE</div>
        </div>

        <input ref={folderRef} type="file" multiple style={{ display: 'none' }} onChange={handleFolder}
          {...{ webkitdirectory: 'true', directory: 'true' } as any} />

        {/* Ingested file list */}
        {ingestedFiles.length > 0 && (
          <div>
            <div style={{ fontSize: '0.58rem', color: '#3a2e10', letterSpacing: '0.12em', marginBottom: 8 }}>LOADED ({ingestedFiles.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ingestedFiles.map((f, i) => (
                <div key={i} style={{
                  fontSize: '0.68rem', color: '#6a5a3a',
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '4px 8px',
                  background: '#0e0c07', borderRadius: 4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  border: '1px solid #1e1808',
                }}>
                  {f.endsWith('.csv') || f.endsWith('.parquet') || f.endsWith('.json') ? '📊' : '📄'} {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard shortcuts */}
        <div style={{ marginTop: 20, padding: '10px', background: '#0e0c07', borderRadius: 6, border: '1px solid #1e1808' }}>
          <div style={{ fontSize: '0.58rem', color: '#3a2e10', letterSpacing: '0.12em', marginBottom: 8 }}>SHORTCUTS</div>
          {[['↵', 'Send query'], ['⇧↵', 'New line'], ['☰', 'Toggle drawer'], ['📎', 'Attach files'], ['◫', 'Ingest folder']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#4a3820', marginBottom: 4 }}>
              <code style={{ color: modeColor, fontFamily: "'JetBrains Mono', monospace" }}>{k}</code>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
