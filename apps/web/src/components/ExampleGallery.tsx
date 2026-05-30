/**
 * ExampleGallery — filterable grid of curated Math X prompts.
 *
 * Data lives in src/data/examples.json — edit that file to add/remove examples.
 * This component is pure UI; no business logic, no large inline constants.
 */
import { useState } from 'react'
import EXAMPLES from '../data/examples.json'

// Derive filter options from data so they stay in sync automatically
const ALL_MODES = ['All', ...Array.from(new Set(EXAMPLES.map(e => e.modeLabel)))]
const ALL_TAGS  = Array.from(new Set(EXAMPLES.flatMap(e => e.tags))).sort()

interface Example {
  id: string
  mode: string
  modeLabel: string
  modeColor: string
  title: string
  subtitle: string
  tags: string[]
  prompt: string
  preview: string
}

export default function ExampleGallery() {
  const [activeMode, setActiveMode] = useState('All')
  const [activeTag,  setActiveTag]  = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [copied,     setCopied]     = useState<string | null>(null)

  const filtered = (EXAMPLES as Example[]).filter(ex => {
    if (activeMode !== 'All' && ex.modeLabel !== activeMode) return false
    if (activeTag && !ex.tags.includes(activeTag))           return false
    if (search) {
      const q = search.toLowerCase()
      return (
        ex.title.toLowerCase().includes(q)    ||
        ex.subtitle.toLowerCase().includes(q) ||
        ex.tags.some(t => t.includes(q))      ||
        ex.preview.toLowerCase().includes(q)
      )
    }
    return true
  })

  function copyPrompt(ex: Example) {
    navigator.clipboard.writeText(ex.prompt).catch(() => {})
    setCopied(ex.id)
    setTimeout(() => setCopied(null), 1800)
  }

  function launchExample(ex: Example) {
    if (typeof window !== 'undefined' && (window as any).sendPrompt) {
      ;(window as any).sendPrompt(ex.prompt)
    } else {
      copyPrompt(ex)
    }
  }

  function clearFilters() {
    setSearch('')
    setActiveMode('All')
    setActiveTag(null)
  }

  return (
    <div style={{ padding: '0 0 2rem' }}>
      <h2 className="sr-only">Math X Example Gallery — {EXAMPLES.length} curated examples across all modes</h2>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="search"
          placeholder="Search examples…"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveMode('All'); setActiveTag(null) }}
          style={{ width: '100%', fontSize: 15 }}
        />
      </div>

      {/* Mode filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.75rem' }}>
        {ALL_MODES.map(m => {
          const active = activeMode === m
          const ex = EXAMPLES.find(e => e.modeLabel === m)
          const col = ex?.modeColor ?? null
          return (
            <button
              key={m}
              onClick={() => { setActiveMode(m); setActiveTag(null) }}
              style={{
                fontSize: 12, padding: '4px 12px',
                borderRadius: 'var(--border-radius-md)',
                background: active ? (col ? col + '22' : 'var(--color-background-secondary)') : 'transparent',
                border: active
                  ? `0.5px solid ${col ?? 'var(--color-border-secondary)'}`
                  : '0.5px solid var(--color-border-tertiary)',
                color: active ? (col ?? 'var(--color-text-primary)') : 'var(--color-text-secondary)',
                fontWeight: active ? 500 : 400,
                cursor: 'pointer',
              }}
            >{m}</button>
          )
        })}
      </div>

      {/* Tag filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: '1.25rem' }}>
        {ALL_TAGS.map(t => {
          const active = activeTag === t
          return (
            <button
              key={t}
              onClick={() => setActiveTag(active ? null : t)}
              style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 20,
                background: active ? 'var(--color-background-info)' : 'var(--color-background-secondary)',
                border: '0.5px solid var(--color-border-tertiary)',
                color: active ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                cursor: 'pointer', fontWeight: active ? 500 : 400,
              }}
            >{t}</button>
          )
        })}
      </div>

      {/* Results count */}
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
        {filtered.length} example{filtered.length !== 1 ? 's' : ''}
        {activeMode !== 'All' ? ` · ${activeMode}` : ''}
        {activeTag ? ` · #${activeTag}` : ''}
      </p>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {filtered.map(ex => {
          const isExpanded = expanded === ex.id
          const isCopied   = copied   === ex.id
          return (
            <div
              key={ex.id}
              style={{
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '1rem 1.25rem',
                display: 'flex', flexDirection: 'column', gap: 10,
                borderTop: `2px solid ${ex.modeColor}`,
              }}
            >
              {/* Mode badge + tags */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '2px 8px',
                  borderRadius: 'var(--border-radius-md)',
                  background: ex.modeColor + '18', color: ex.modeColor,
                  border: `0.5px solid ${ex.modeColor}44`,
                }}>{ex.modeLabel}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {ex.tags.slice(0, 2).map(t => (
                    <span key={t} style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 20,
                      border: '0.5px solid var(--color-border-tertiary)',
                      color: 'var(--color-text-tertiary)',
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 15, lineHeight: 1.4 }}>{ex.title}</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {ex.subtitle}
                </p>
              </div>

              {/* Preview */}
              <p style={{
                margin: 0, fontSize: 13, lineHeight: 1.6,
                color: 'var(--color-text-secondary)',
                display: isExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: isExpanded ? undefined : 2,
                WebkitBoxOrient: 'vertical',
                overflow: isExpanded ? 'visible' : 'hidden',
              }}>{ex.preview}</p>

              {!isExpanded && (
                <button
                  onClick={() => setExpanded(ex.id)}
                  style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--color-text-secondary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >▾ more</button>
              )}

              {isExpanded && (
                <div style={{
                  background: 'var(--color-background-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '10px 12px', fontSize: 12, lineHeight: 1.6,
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  border: '0.5px solid var(--color-border-tertiary)',
                }}>{ex.prompt}</div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button
                  onClick={() => launchExample(ex)}
                  style={{
                    flex: 1, fontSize: 13, padding: '7px 0',
                    borderRadius: 'var(--border-radius-md)',
                    background: ex.modeColor + '18',
                    border: `0.5px solid ${ex.modeColor}66`,
                    color: ex.modeColor, fontWeight: 500, cursor: 'pointer',
                  }}
                >Try this ↗</button>
                <button
                  onClick={() => !isCopied && copyPrompt(ex)}
                  title={isCopied ? 'Copied!' : 'Copy prompt'}
                  style={{
                    fontSize: 12, padding: '7px 12px',
                    borderRadius: 'var(--border-radius-md)',
                    background: 'transparent',
                    border: '0.5px solid var(--color-border-secondary)',
                    color: isCopied ? 'var(--color-text-success)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >{isCopied ? '✓' : '⎘'}</button>
                <button
                  onClick={() => setExpanded(isExpanded ? null : ex.id)}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                  style={{
                    fontSize: 12, padding: '7px 12px',
                    borderRadius: 'var(--border-radius-md)',
                    background: 'transparent',
                    border: '0.5px solid var(--color-border-tertiary)',
                    color: 'var(--color-text-tertiary)', cursor: 'pointer',
                  }}
                >{isExpanded ? '▲' : '▼'}</button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-secondary)', fontSize: 15 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>⌕</div>
          No examples match that filter.
          <br />
          <button
            onClick={clearFilters}
            style={{
              marginTop: 12, fontSize: 13, cursor: 'pointer',
              background: 'none', border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)', padding: '6px 16px',
              color: 'var(--color-text-secondary)',
            }}
          >Clear filters</button>
        </div>
      )}
    </div>
  )
}
