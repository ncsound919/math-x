// WorkflowTemplates — shortcut buttons for common research patterns + session replay tabs
import { useState, useEffect } from 'react';
import type { Session, Message } from '../state/types';

const WORKFLOW_TEMPLATES = [
  {
    id: 'genomics_qc',
    icon: '🧬',
    label: 'Genomics QC',
    color: '#7cff6b',
    prompt: 'Run quality control analysis on the uploaded VCF/FASTQ/FASTA file. Report variant counts, read quality stats, GC content, and flag anomalies.',
    mode: 'files',
  },
  {
    id: 'lit_review',
    icon: '📚',
    label: 'Lit Review',
    color: '#f0a500',
    prompt: 'Search PubMed and arXiv for the top 10 papers most relevant to this topic. Rank by relevance score and extract key findings.',
    mode: 'scientist',
  },
  {
    id: 'derive_verify',
    icon: '∂',
    label: 'Derive & Verify',
    color: '#00c8ff',
    prompt: 'Derive this expression step-by-step using SymPy. Justify each transformation with a theorem or algebraic rule badge.',
    mode: 'solve',
  },
  {
    id: 'hypothesis_test',
    icon: '⬡',
    label: 'Hypothesis Test',
    color: '#e05aff',
    prompt: 'Generate 3 testable hypotheses from this data. For each: state the null hypothesis, propose a statistical test, and estimate required sample size.',
    mode: 'hypothesis',
  },
  {
    id: 'monte_carlo',
    icon: '🎲',
    label: 'Monte Carlo',
    color: '#ff6b35',
    prompt: 'Run a Monte Carlo simulation with 10,000 samples. Report mean, variance, 95% confidence interval, and plot the distribution.',
    mode: 'probability',
  },
  {
    id: 'cross_domain',
    icon: '⊗',
    label: 'Cross-Domain',
    color: '#ff6b35',
    prompt: 'Identify hidden structural connections between this concept and 3 other scientific domains. Show the mathematical bridge.',
    mode: 'synergy',
  },
  {
    id: 'export_bundle',
    icon: '📦',
    label: 'Export Bundle',
    color: '#00e5b0',
    prompt: 'Package all results from this session into a publication bundle: LaTeX equations, Jupyter notebook, BibTeX references, and DOCX summary.',
    mode: 'files',
  },
];

const SESSION_STORAGE_KEY = 'mathx_sessions';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const saveSession = (session: Session) => {
    setSessions(prev => {
      const next = [session, ...prev.filter(s => s.id !== session.id)].slice(0, 20);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { sessions, saveSession, deleteSession };
}

interface WorkflowTemplatesProps {
  onApplyTemplate: (prompt: string, mode: string) => void;
  modeColor?: string;
  activeMode?: string;
  messages?: Message[];
  onReplaySession?: (session: Session) => void;
}

export function WorkflowTemplates({
  onApplyTemplate,
  modeColor = '#f0a500',
  activeMode,
  messages = [],
  onReplaySession,
}: WorkflowTemplatesProps) {
  const [tab, setTab] = useState<'templates' | 'sessions'>('templates');
  const [hover, setHover] = useState<string | null>(null);
  const { sessions, saveSession, deleteSession } = useSessions();

  // Auto-save current session when messages change
  useEffect(() => {
    if (messages.length < 2) return;
    const session: Session = {
      id: `session_${Date.now()}`,
      name: messages[0]?.content?.slice(0, 48) + '…' || 'Session',
      mode: activeMode || 'scientist',
      messages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
    };
    // Debounce: only save if last message changed
    const existing = sessions.find(s =>
      s.messages.length === messages.length &&
      s.messages[s.messages.length - 1]?.content === messages[messages.length - 1]?.content
    );
    if (!existing) saveSession(session);
  }, [messages]);

  const tabStyle = (active: boolean) => ({
    padding: '5px 12px',
    background: 'none',
    border: 'none',
    borderBottom: active ? `2px solid ${modeColor}` : '2px solid transparent',
    color: active ? modeColor : '#4a3820',
    cursor: 'pointer',
    fontSize: '0.62rem',
    letterSpacing: '0.1em',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e1808', marginBottom: 8 }}>
        <button style={tabStyle(tab === 'templates')} onClick={() => setTab('templates')}>⚡ TEMPLATES</button>
        <button style={tabStyle(tab === 'sessions')} onClick={() => setTab('sessions')}>
          ◷ SESSIONS {sessions.length > 0 && <span style={{ color: modeColor, fontSize: '0.6rem' }}>({sessions.length})</span>}
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
                background: hover === t.id ? `${t.color}18` : '#0a0800',
                border: `1px solid ${hover === t.id ? t.color : '#2a2010'}`,
                borderRadius: 16,
                color: hover === t.id ? t.color : '#6a5a30',
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
            <div style={{ color: '#3a2e10', fontSize: '0.62rem', textAlign: 'center', padding: '12px 0' }}>
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
                background: '#080600',
                border: '1px solid #1e1808',
                borderRadius: 5,
              }}
            >
              <span style={{ fontSize: '0.58rem', color: '#3a2e10', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: '#6a5a30', marginRight: 4 }}>{s.mode?.toUpperCase()}</span>
                {s.name}
              </span>
              <span style={{ fontSize: '0.55rem', color: '#2a2010', flexShrink: 0 }}>
                {new Date(s.createdAt).toLocaleDateString()}
              </span>
              {onReplaySession && (
                <button
                  onClick={() => onReplaySession(s)}
                  style={{
                    background: 'none', border: `1px solid ${modeColor}44`, borderRadius: 3,
                    color: modeColor, fontSize: '0.55rem', padding: '1px 5px', cursor: 'pointer',
                  }}
                  title="Replay session"
                >
                  ▶ REPLAY
                </button>
              )}
              <button
                onClick={() => deleteSession(s.id)}
                style={{
                  background: 'none', border: 'none',
                  color: '#3a2010', fontSize: '0.6rem', cursor: 'pointer', padding: '0 2px',
                }}
                title="Delete session"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
