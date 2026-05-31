/**
 * MoleculeViewer — WebGL 3D protein structure viewer using NGL.
 *
 * Previously loaded NGL from CDN at runtime. Now imported as an npm package.
 * Accepts PDB string data directly — no file server needed.
 */
import { useEffect, useRef, useState } from 'react'

interface MoleculeViewerProps {
  pdbData: string
  accentColor?: string
  height?: number
}

type RepresentationType = 'cartoon' | 'ball+stick' | 'surface' | 'spacefill'

export function MoleculeViewer({ pdbData, accentColor = 'var(--blue)', height = 360 }: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef     = useRef<unknown>(null)
  const [rep,     setRep]     = useState<RepresentationType>('cartoon')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !pdbData) return
    let cancelled = false

    ;(async () => {
      try {
        // Dynamic import — NGL is ~2MB; only load when component mounts
        const NGL = await import('ngl')

        if (cancelled) return

        const stage = new (NGL as any).Stage(containerRef.current, {
          backgroundColor: 'var(--bg)',
        })
        stageRef.current = stage

        const blob = new Blob([pdbData], { type: 'text/plain' })
        const url  = URL.createObjectURL(blob)
        const comp = await stage.loadFile(url, { ext: 'pdb', defaultRepresentation: false })
        URL.revokeObjectURL(url)

        if (!cancelled) {
          comp.addRepresentation(rep, { color: 'chainname' })
          stage.autoView()
          setLoading(false)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(String(e))
      }
    })()

    return () => { cancelled = true }
  }, [pdbData])

  // Swap representation without reloading the structure
  useEffect(() => {
    const stage = stageRef.current as any
    if (!stage) return
    stage.compList.forEach((comp: any) => {
      comp.removeAllRepresentations()
      comp.addRepresentation(rep, { color: 'chainname' })
    })
  }, [rep])

  const RepBtn = ({ id, label }: { id: RepresentationType; label: string }) => (
    <button
      onClick={() => setRep(id)}
      style={{
        padding: '3px 9px', fontSize: '0.62rem',
        background: rep === id ? `${accentColor}22` : 'var(--bg1)',
        border: `1px solid ${rep === id ? accentColor : 'var(--border)'}`,
        borderRadius: 12,
        color: rep === id ? accentColor : 'var(--text-muted)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >{label}</button>
  )

  if (error) {
    return (
      <div style={{ padding: 10, color: 'var(--orange)', fontSize: '0.75rem' }}>
        Molecule viewer error: {error}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.58rem', color: accentColor, letterSpacing: '0.1em', marginRight: 4 }}>
          ⬛ PDB STRUCTURE
        </span>
        <RepBtn id="cartoon"    label="Cartoon"    />
        <RepBtn id="ball+stick" label="Ball+Stick" />
        <RepBtn id="surface"    label="Surface"    />
        <RepBtn id="spacefill"  label="Spacefill"  />
      </div>
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${accentColor}22` }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '0.7rem', zIndex: 2,
          }}>
            Loading NGL…
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height }} />
      </div>
    </div>
  )
}
