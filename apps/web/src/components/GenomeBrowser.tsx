// GenomeBrowser — IGV.js-powered genomic track viewer for BED, VCF, GFF data.
// Accepts raw track data as JavaScript objects — no file server needed.
// IGV.js is lazy-loaded from CDN to keep the initial bundle lean.
import { useEffect, useRef, useState } from 'react';

export type TrackType = 'annotation' | 'variant' | 'wig' | 'bed';

export interface GenomeTrack {
  type: TrackType;
  name: string;
  format?: string;
  features?: unknown[];
  url?: string;
  color?: string;
}

interface GenomeBrowserProps {
  tracks: GenomeTrack[];
  genome?: string; // e.g. 'hg38', 'mm10'
  locus?: string;  // e.g. 'chr1:1-1000000'
  accentColor?: string;
  height?: number;
}

export function GenomeBrowser({
  tracks,
  genome = 'hg38',
  locus = 'chr1:1-50000000',
  accentColor = '#7cff6b',
  height = 400,
}: GenomeBrowserProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        if (!(window as any).igv) {
          await new Promise<void>((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/igv@2.15.12/dist/igv.css';
            document.head.appendChild(link);

            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/igv@2.15.12/dist/igv.min.js';
            s.onload = () => resolve();
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        if (cancelled) return;

        const igv = (window as any).igv;

        // If a browser was previously created in this container, destroy it
        if (browserRef.current) {
          (browserRef.current as any).dispose?.();
          if (containerRef.current) containerRef.current.innerHTML = '';
        }

        const config = {
          genome,
          locus,
          tracks: tracks.map(t => ({
            ...t,
            color: t.color ?? accentColor,
            displayMode: 'EXPANDED',
          })),
          theme: 'dark',
        };

        const browser = await igv.createBrowser(containerRef.current, config);
        browserRef.current = browser;
        if (!cancelled) setLoading(false);
      } catch (e: unknown) {
        if (!cancelled) setError(String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [tracks, genome, locus]);

  if (error) {
    return (
      <div style={{ padding: 10, color: '#ff6b35', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}>
        Genome browser error: {error}
        <div style={{ marginTop: 4, color: '#4a3820', fontSize: '0.65rem' }}>
          Note: IGV.js requires a network connection to load reference genome data.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.58rem', color: accentColor, letterSpacing: '0.1em', marginBottom: 6 }}>
        🧬 GENOME BROWSER — {genome.toUpperCase()} · {locus}
      </div>
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${accentColor}22` }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#080600', color: '#4a3820', fontSize: '0.7rem',
          }}>
            Loading IGV.js…
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height }} />
      </div>
    </div>
  );
}
