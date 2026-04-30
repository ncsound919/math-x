import { useRef } from 'react';
import type { Session } from '../state/types';

interface LeftDrawerProps {
  open: boolean;
  ingestedFiles: string[];
  onIngest: (files: File[]) => void;
  modeColor: string;
  sessions: Session[];
  activeSessionId: string | null;
  onRestoreSession: (session: Session) => void;
  onDeleteSession: (id: string) => void;
  onNewSession: () => void;
}

export function LeftDrawer({
  open, ingestedFiles, onIngest, modeColor,
  sessions, activeSessionId, onRestoreSession, onDeleteSession, onNewSession,
}: LeftDrawerProps) {
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

        {/* Session history */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: '0.6rem', color: '#3a2e10', letterSpacing: '0.18em' }}>⧗ SESSIONS</div>
            <button
              onClick={onNewSession}
              title="New session"
              style={{
                background: 'none', border: `1px solid ${modeColor}44`,
                borderRadius: 4, padding: '2px 7px',
                color: modeColor, cursor: 'pointer', fontSize: '0.6rem',
              }}
            >+ NEW</button>
          </div>

          {sessions.length === 0 ? (
            <div style={{ fontSize: '0.65rem', color: '#2a2010', fontStyle: 'italic', padding: '6px 0' }}>No sessions yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {sessions.slice(0, 20).map(s => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: activeSessionId === s.id ? `${modeColor}14` : '#0e0c07',
                    border: `1px solid ${activeSessionId === s.id ? modeColor + '44' : '#1e1808'}`,
                    borderRadius: 5, padding: '5px 7px',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                  onClick={() => onRestoreSession(s)}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      fontSize: '0.65rem',
                      color: activeSessionId === s.id ? modeColor : '#8a7a5a',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{s.name}</div>
                    <div style={{ fontSize: '0.58rem', color: '#3a2e10', marginTop: 1 }}>
                      {new Date(s.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{s.messages.filter(m => m.role === 'user').length}q
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
                    title="Delete session"
                    style={{
                      background: 'none', border: 'none',
                      color: '#3a2e10', cursor: 'pointer',
                      fontSize: '0.7rem', padding: '0 2px', flexShrink: 0,
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.color = '#ff6b35'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.color = '#3a2e10'; }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Folder drop zone */}
        <div style={{ fontSize: '0.6rem', color: '#3a2e10', letterSpacing: '0.18em', marginBottom: 10 }}>◫ FILE INTELLIGENCE</div>
        <div
          onClick={() => folderRef.current?.click()}
          style={{
            border: `1px dashed ${modeColor}44`,
            borderRadius: 7, padding: '14px 10px',
            textAlign: 'center', cursor: 'pointer',
            marginBottom: 14, transition: 'all 0.15s',
            color: '#4a3820', fontSize: '0.72rem',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = modeColor + '88'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = modeColor + '44'; }}
        >
          <div style={{ fontSize: '1.4rem', marginBottom: 5, color: modeColor }}>◫</div>
          <div>INGEST FOLDER</div>
          <div style={{ fontSize: '0.6rem', marginTop: 3, color: '#3a2e10' }}>PDF · CSV · JSON · IMG · CODE</div>
        </div>

        <input ref={folderRef} type="file" multiple style={{ display: 'none' }} onChange={handleFolder}
          {...{ webkitdirectory: 'true', directory: 'true' } as any} />

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

        <div style={{ marginTop: 20, padding: '10px', background: '#0e0c07', borderRadius: 6, border: '1px solid #1e1808' }}>
          <div style={{ fontSize: '0.58rem', color: '#3a2e10', letterSpacing: '0.12em', marginBottom: 8 }}>SHORTCUTS</div>
          {[['\u2318\u23ce', 'Send query'], ['⇧⏎', 'New line'], ['☰', 'Toggle drawer'], ['📎', 'Attach files'], ['◫', 'Ingest folder']].map(([k, v]) => (
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
