/**
 * GenomeBrowser — IGV.js-powered genomic track viewer.
 *
 * Previously loaded IGV from CDN at runtime (contradicted "edge-native" claim
 * and failed in offline/airgapped environments). Now imported as an npm package.
 *
 * Reference genome data (hg38, mm10, etc.) still requires network access —
 * those are multi-GB datasets that cannot be bundled. This is documented in
 * the README. All local track data (BED, VCF, GFF from uploaded files) works
 * fully offline.
 */
import { useEffect, useRef, useState } from 'react'

export type TrackType = 'annotation' | 'variant' | 'wig' | 'bed'

export interface GenomeTrack {
  type: TrackType
  name: string
  format?: string
  features?: unknown[]
  url?: string
  color?: string
}

interface GenomeBrowserProps {
  tracks: GenomeTrack[]
  genome?: string   // e.g. 'hg38', 'mm10'
  locus?: string    // e.g. 'chr1:1-1000000'
  accentColor?: string
  height?: number
}

export function GenomeBrowser({
  tracks,
  genome = 'hg38',
  locus = 'chr1:1-50000000',
  accentColor = 'var(--green)',
  height = 400,
}: GenomeBrowserProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const browserRef   = useRef<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    ;(async () => {
      try {
        // Dynamic import — IGV is large (~2MB); only load when this component mounts
        const igv = await import('igv')

        if (cancelled) return

        // Dispose any previous browser instance in this container
        if (browserRef.current) {
          ;(browserRef.current as any).dispose?.()
          if (containerRef.current) containerRef.current.innerHTML = ''
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
        }

        const browser = await (igv as any).createBrowser(containerRef.current, config)
        browserRef.current = browser
        if (!cancelled) setLoading(false)
      } catch (e: unknown) {
        if (!cancelled) setError(String(e))
      }
    })()

    return () => { cancelled = true }
  }, [tracks, genome, locus, accentColor])

  if (error) {
    return (
      <div style={{ padding: 10, color: 'var(--orange)', fontSize: '0.75rem', fontFamily: "var(--font-mono)" }}>
        <div>Genome browser error: {error}</div>
        <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: '0.65rem' }}>
          Reference genome data requires an internet connection. Local track data works offline.
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.58rem', color: accentColor, letterSpacing: '0.1em', marginBottom: 6 }}>
        🧬 GENOME BROWSER — {genome.toUpperCase()} · {locus}
        <span style={{ color: 'var(--text-faint)', marginLeft: 8 }}>
          (reference data requires network)
        </span>
      </div>
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${accentColor}22` }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '0.7rem',
          }}>
            Loading IGV…
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height }} />
      </div>
    </div>
  )
}
