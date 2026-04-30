// MoleculeViewer — WebGL 3D protein structure viewer using NGL Viewer.
// Accepts a PDB string directly (no file server needed).
// Lazy-loads NGL from CDN to avoid bundling its ~2 MB payload at startup.
import { useEffect, useRef, useState } from 'react';

interface MoleculeViewerProps {
  pdbData: string;
  accentColor?: string;
  height?: number;
}

type RepresentationType = 'cartoon' | 'ball+stick' | 'surface' | 'spacefill';

export function MoleculeViewer({ pdbData, accentColor = '#00c8ff', height = 360 }: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<unknown>(null);
  const [rep, setRep] = useState<RepresentationType>('cartoon');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load NGL and initialise stage
  useEffect(() => {
    if (!containerRef.current || !pdbData) return;
    let cancelled = false;

    (async () => {
      try {
        // Load NGL from CDN — not bundled
        if (!(window as any).NGL) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/ngl@2.3.1/dist/ngl.js';
            s.onload = () => resolve();
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        if (cancelled) return;

        const NGL = (window as any).NGL;
        const stage = new NGL.Stage(containerRef.current, {
          backgroundColor: '#080600',
        });
        stageRef.current = stage;

        const blob = new Blob([pdbData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const comp = await stage.loadFile(url, { ext: 'pdb', defaultRepresentation: false });
        URL.revokeObjectURL(url);

        if (!cancelled) {
          comp.addRepresentation(rep, { color: 'chainname' });
          stage.autoView();
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [pdbData]);

  // Swap representation without reload
  useEffect(() => {
    const stage = stageRef.current as any;
    if (!stage) return;
    stage.compList.forEach((comp: any) => {
      comp.removeAllRepresentations();
      comp.addRepresentation(rep, { color: 'chainname' });
    });
  }, [rep]);

  const BTN = ({ id, label }: { id: RepresentationType; label: string }) => (
    <button
      onClick={() => setRep(id)}
      style={{
        padding: '3px 9px', fontSize: '0.62rem',
        background: rep === id ? `${accentColor}22` : '#0a0800',
        border: `1px solid ${rep === id ? accentColor : '#2a2010'}`,
        borderRadius: 12, color: rep === id ? accentColor : '#4a3820',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >{label}</button>
  );

  if (error) {
    return (
      <div style={{ padding: 10, color: '#ff6b35', fontSize: '0.75rem' }}>
        Molecule viewer error: {error}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 6, alignItems: 'center' }}>
        <span style={{ fontSize: '0.58rem', color: accentColor, letterSpacing: '0.1em', marginRight: 4 }}>
          ⬛ PDB STRUCTURE
        </span>
        <BTN id="cartoon"   label="Cartoon" />
        <BTN id="ball+stick" label="Ball+Stick" />
        <BTN id="surface"   label="Surface" />
        <BTN id="spacefill" label="Spacefill" />
      </div>
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${accentColor}22` }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: '#080600', color: '#4a3820', fontSize: '0.7rem', zIndex: 2,
          }}>
            Loading NGL…
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height }} />
      </div>
    </div>
  );
}
