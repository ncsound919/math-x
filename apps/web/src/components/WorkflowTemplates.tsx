/**
 * WorkflowTemplates — shortcut buttons for common research patterns.
 *
 * FIX: Removed the inline useSessions() hook that used localStorage.
 * Session state is now owned by App.tsx and passed down as props,
 * consistent with the IndexedDB-backed sessions.ts implementation.
 * This eliminates the two-storage-system split and the duplicate-session bug.
 */
import type { Session, Message } from '../state/types'

const WORKFLOW_TEMPLATES = [
  {
    id: 'genomics_qc',
    icon: '🧬',
    label: 'Genomics QC',
    color: 'var(--green)',
    prompt: 'Run quality control analysis on the uploaded VCF/FASTQ/FASTA file. Report variant counts, read quality stats, GC content, and flag anomalies.',
    mode: 'files',
  },
  {
    id: 'lit_review',
    icon: '📚',
    label: 'Lit Review',
    color: 'var(--gold)',
    prompt: 'Search PubMed and arXiv for the top 10 papers most relevant to this topic. Rank by relevance score and extract key findings.',
    mode: 'scientist',
  },
  {
    id: 'derive_verify',
    icon: '∂',
    label: 'Derive & Verify',
    color: 'var(--blue)',
    prompt: 'Derive this expression step-by-step using SymPy. Justify each transformation with a theorem or algebraic rule badge.',
    mode: 'solve',
  },
  {
    id: 'hypothesis_test',
    icon: '⬡',
    label: 'Hypothesis Test',
    color: 'var(--purple)',
    prompt: 'Generate 3 testable hypotheses from this data. For each: state the null hypothesis, propose a statistical test, and estimate required sample size.',
    mode: 'hypothesis',
  },
  {
    id: 'monte_carlo',
    icon: '🎲',
    label: 'Monte Carlo',
    color: 'var(--orange)',
    prompt: 'Run a Monte Carlo simulation with 10,000 samples. Report mean, variance, 95% confidence interval, and plot the distribution.',
    mode: 'probability',
  },
  {
    id: 'cross_domain',
    icon: '⊗',
    label: 'Cross-Domain',
    color: 'var(--orange)',
    prompt: 'Identify hidden structural connections between this concept and 3 other scientific domains. Show the mathematical bridge.',
    mode: 'synergy',
  },
  {
    id: 'export_bundle',
    icon: '📦',
    label: 'Export Bundle',
    color: 'var(--teal)',
    prompt: 'Package all results from this session into a publication bundle: LaTeX equations, Jupyter notebook, BibTeX references, and DOCX summary.',
    mode: 'files',
  },
]

interface WorkflowTemplatesProps {
  onApplyTemplate: (prompt: string, mode: string) => void
  modeColor?: string
  activeMode?: string
  /** Sessions passed from App — backed by IndexedDB via sessions.ts */
  sessions?: Session[]
  activeSessionId?: string | null
  onReplaySession?: (session: Session) => void
  onDeleteSession?: (id: string) => void
}

import { useState } from 'react'

export function WorkflowTemplates({
  onApplyTemplate,
  modeColor = 'var(--gold)',
  activeMode: _activeMode,
  sessions = [],
  activeSessionId,
  onReplaySession,
  onDeleteSession,
}: WorkflowTemplatesProps) {
  const [tab, setTab] = useState<'templates' | 'sessions'>('templates')
  const [hover, setHover] = useState<string | null>(null)

  const tabStyle = (active: boolean) => ({
    padding: '5px 12px',
    background: 'none',
    border: 'none',
    borderBottom: active ? `2px solid ${modeColor}` : '2px solid transparent',
    color: active ? modeColor : 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.62rem',
    letterSpacing: '0.1em',
    fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dim)', marginBottom: 8 }}>
        <button style={tabStyle(tab === 'templates')} onClick={() => setTab('templates')}>⚡ TEMPLATES</button>
        <button style={tabStyle(tab === 'sessions')} onClick={() => setTab('sessions')}>
          ◷ SESSIONS {sessions.length > 0 && (
            <span style={{ color: modeColor, fontSize: '0.6rem' }}>({sessions.length})</span>
          )}
        </button>
      </div>

      {tab === 'templates' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {WORKFLOW_TEMPLATES.map(t => (
            <button
              key={t.id}
              title={t.prompt}
              onClick={() => onApplyTemplate(t.prompt, t.mode)}
              onMouseEnter={() => setHover(t.id)}
              onMouseLeave={() => setHover(null)}
              style={{
                padding: '5px 10px',
                background: hover === t.id ? `${t.color}18` : 'var(--bg1)',
                border: `1px solid ${hover === t.id ? t.color : 'var(--border)'}`,
                borderRadius: 16,
                color: hover === t.id ? t.color : 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
          {sessions.length === 0 && (
            <div style={{ color: 'var(--border-bright)', fontSize: '0.62rem', textAlign: 'center', padding: '12px 0' }}>
              No saved sessions yet. Start a conversation to auto-save.
            </div>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                background: activeSessionId === s.id ? `${modeColor}14` : 'var(--bg)',
                border: `1px solid ${activeSessionId === s.id ? modeColor + '44' : 'var(--border-dim)'}`,
                borderRadius: 5,
              }}
            >
              <span style={{
                fontSize: '0.58rem',
                color: 'var(--border-bright)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                <span style={{ color: 'var(--text-dim)', marginRight: 4 }}>{s.mode?.toUpperCase()}</span>
                {s.name}
              </span>
              <span style={{ fontSize: '0.55rem', color: 'var(--border)', flexShrink: 0 }}>
                {new Date(s.createdAt).toLocaleDateString()}
              </span>
              {onReplaySession && (
                <button
                  onClick={() => onReplaySession(s)}
                  style={{
                    background: 'none',
                    border: `1px solid ${modeColor}44`,
                    borderRadius: 3,
                    color: modeColor,
                    fontSize: '0.55rem',
                    padding: '1px 5px',
                    cursor: 'pointer',
                  }}
                  title="Replay session"
                >
                  ▶ REPLAY
                </button>
              )}
              {onDeleteSession && (
                <button
                  onClick={() => onDeleteSession(s.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-faint)',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    padding: '0 2px',
                  }}
                  title="Delete session"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
