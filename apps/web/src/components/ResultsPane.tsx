import { useEffect, useRef, useCallback, useState } from 'react'
import { MathRenderer } from './MathRenderer'
import { ChartView } from './ChartView'
import { ExportButton } from './ExportButton'
import { ParameterSliders } from './ParameterSliders'
import type { Message, Mode } from '../state/types'

const PROVIDER_BADGE: Record<string, { icon: string; label: string; color: string }> = {
  claude: { icon: '☁', label: 'Claude',       color: 'var(--blue)'   },
  ollama: { icon: '⚡', label: 'DeepSeek-R1',  color: 'var(--green)'  },
  qwen:   { icon: '∂', label: 'Qwen2.5-Math', color: 'var(--purple)' },
}

const QUICK_PROBES = [
  'Find the cross-domain analogue',   'What symmetry underlies this?',
  'Run a Monte Carlo simulation',     'Build a testable hypothesis',
  'Translate to quantum mechanics',   'What would a physicist call this?',
  'Find the variational principle',   'Generalize this formula',
]

interface ResultsPaneProps {
  messages: Message[]
  loading: boolean
  error: string | null
  modeObj: Mode
  compute: (code: string) => Promise<string>
}

export function ResultsPane({ messages, loading, error, modeObj, compute }: ResultsPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', position: 'relative' }}>
      {messages.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '55vh', textAlign: 'center',
          animation: 'fadeIn 0.4s ease-out',
        }}>
          <div style={{
            fontSize: '4rem', marginBottom: 14,
            fontFamily: 'var(--font-serif)', fontWeight: 700,
            color: 'var(--gold)', filter: 'drop-shadow(0 0 30px var(--gold)40)',
          }}>X</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#8a6a30', letterSpacing: '0.08em', marginBottom: 4 }}>MATH X</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', letterSpacing: '0.2em', marginBottom: 24 }}>CROSS-DOMAIN MATHEMATICAL SCIENTIST</div>
          <div style={{
            background: 'var(--bg1)', border: `1px solid ${modeObj.color}28`,
            borderRadius: 'var(--radius-lg)', padding: '14px 22px',
            maxWidth: 460, marginBottom: 22,
          }}>
            <div style={{ color: modeObj.color, fontSize: '0.7rem', letterSpacing: '0.12em', marginBottom: 5 }}>
              {modeObj.icon} {modeObj.label.toUpperCase()} MODE
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: 1.6 }}>{modeObj.desc}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 540 }}>
            {QUICK_PROBES.map(p => (
              <span key={p} style={{
                padding: '4px 11px', background: 'var(--bg1)',
                border: '1px solid var(--border)', borderRadius: 20,
                color: 'var(--text-muted)', fontSize: '0.7rem',
              }}>{p}</span>
            ))}
          </div>
          <div style={{
            marginTop: 24, padding: '9px 18px',
            border: '1px dashed var(--border)', borderRadius: 8,
            color: 'var(--text-faint)', fontSize: '0.65rem', letterSpacing: '0.1em',
          }}>
            ◫ DRAG & DROP any folder — PDFs, CSVs, code, images
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} modeObj={modeObj} compute={compute} />
          ))}
          {loading && <LoadingIndicator modeObj={modeObj} />}
          {error && (
            <div style={{
              margin: '10px 0', padding: '10px 14px',
              background: '#1a0800', border: '1px solid var(--orange)44',
              borderRadius: 8, color: 'var(--orange)',
              fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
            }}>
              ⚠ {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg, modeObj, compute }: { msg: Message; modeObj: Mode; compute: (code: string) => Promise<string> }) {
  const isUser = msg.role === 'user'
  const [liveStdout, setLiveStdout] = useState<string | null>(null)
  const [liveChart,  setLiveChart]  = useState<any>(null)
  const [sliderRunning, setSliderRunning] = useState(false)

  const handleParamsChange = useCallback(async (params: Record<string, number>) => {
    if (!msg.execution?.code) return
    setSliderRunning(true)
    const injection   = Object.entries(params).map(([k, v]) => `${k} = ${v}`).join('\n')
    const updatedCode = injection + '\n\n' + msg.execution.code
    try {
      const result = await compute(updatedCode)
      setLiveStdout(result)
      try { const p = JSON.parse(result); if (p?.chart) setLiveChart(p.chart) } catch { /* non-JSON */ }
    } catch (e) { console.warn('Slider re-run error:', e) }
    finally { setSliderRunning(false) }
  }, [msg.execution?.code, compute])

  const chart  = liveChart || (msg.execution?.parsed as any)?.chart
  const table  = (msg.execution?.parsed as any)?.table
  const stdout = liveStdout || msg.execution?.stdout
  const badge  = msg.provider ? PROVIDER_BADGE[msg.provider] : null

  return (
    <div style={{
      display: 'flex', gap: 12, marginBottom: 22,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'msgIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: 7, flexShrink: 0, marginTop: 2,
          background: 'linear-gradient(135deg,#2a1f00,#3d2e00)',
          border: `1px solid ${modeObj.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: modeObj.color,
          boxShadow: `0 0 8px ${modeObj.color}22`,
        }}>X</div>
      )}
      <div style={{
        maxWidth: '85%', position: 'relative',
        background: isUser ? 'var(--bg2)' : 'var(--bg1)',
        border: isUser ? '1px solid var(--border)' : `1px solid ${modeObj.color}28`,
        borderRadius: isUser ? 'var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl)'
                             : 'var(--radius-sm) var(--radius-xl) var(--radius-xl) var(--radius-xl)',
        padding: '12px 16px',
      }}>
        {isUser ? (
          <div>
            <p style={{ margin: 0, color: '#a89870', lineHeight: 1.65, fontSize: '0.88rem' }}>{msg.content}</p>
            {msg.files && msg.files.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
                {msg.files.map((f, fi) => (
                  <span key={fi} style={{
                    fontSize: '0.68rem', color: 'var(--text-dim)',
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 4, padding: '2px 7px',
                  }}>📎 {f}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {chart  && <ChartView data={chart} />}
            {table  && <TableView data={table} />}
            {stdout && !chart && !table && (
              <pre style={{
                margin: '0 0 10px', padding: '8px 12px',
                background: 'var(--bg)', borderRadius: 6,
                fontSize: '0.75rem', color: 'var(--green)',
                overflowX: 'auto', border: '1px solid #1a2e1a',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{stdout}</pre>
            )}
            {msg.execution?.code && (
              <ParameterSliders
                code={msg.execution.code}
                onParamsChange={handleParamsChange}
                accent={modeObj.color}
                running={sliderRunning}
              />
            )}
            <MathRenderer text={msg.content} accent={modeObj.color} streaming={msg.streaming ?? false} />
            <div style={{
              marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-dim)',
              display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <ExportButton content={msg.content} accent={modeObj.color} />
              {badge && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.58rem', color: badge.color,
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 7px', background: 'var(--bg2)',
                  border: `1px solid ${badge.color}33`, borderRadius: 10,
                }}>
                  {badge.icon} {badge.label}
                </div>
              )}
              {msg.plan && (
                <div style={{
                  fontSize: '0.58rem', color: 'var(--text-faint)',
                  fontFamily: 'var(--font-mono)', display: 'flex', gap: 8, flexWrap: 'wrap',
                }}>
                  <span>engine: {msg.plan.engine}</span>
                  <span>complexity: {msg.plan.complexity}</span>
                  {msg.plan.chain && <span>chain: [{msg.plan.chain.join(' → ')}]</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: 7, flexShrink: 0, marginTop: 2,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', color: 'var(--text-dim)',
        }}>YOU</div>
      )}
    </div>
  )
}

function LoadingIndicator({ modeObj }: { modeObj: Mode }) {
  const labels: Record<string, string> = {
    synergy: 'MAPPING CONNECTIONS', hypothesis: 'GENERATING HYPOTHESIS',
    formula: 'SYNTHESIZING FORMULA', files: 'ANALYZING CONTENT',
    probability: 'COMPUTING DISTRIBUTION', scientist: 'REASONING',
    solve: 'SOLVING', domain: 'CONSULTING SPECIALIST',
  }
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'msgIn 0.2s ease-out' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 7, background: 'var(--bg2)',
        border: `1px solid ${modeObj.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: modeObj.color, flexShrink: 0,
      }}>X</div>
      <div style={{
        background: 'var(--bg1)', border: `1px solid ${modeObj.color}28`,
        borderRadius: 'var(--radius-sm) var(--radius-xl) var(--radius-xl) var(--radius-xl)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <div style={{
          width: 13, height: 13, borderRadius: '50%',
          border: `2px solid ${modeObj.color}44`, borderTopColor: modeObj.color,
          animation: 'spin 0.7s linear infinite',
        }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          {labels[modeObj.id] || 'COMPUTING'}
          <span style={{ animation: 'blink 0.8s step-start infinite' }}>_</span>
        </span>
      </div>
    </div>
  )
}

function TableView({ data }: { data: { columns: string[]; rows: any[][] } }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table style={{
        borderCollapse: 'collapse', fontSize: '0.73rem',
        fontFamily: 'var(--font-mono)', color: 'var(--text)', width: '100%',
      }}>
        <thead>
          <tr>
            {data.columns?.map(c => (
              <th key={c} style={{
                padding: '5px 10px', borderBottom: '1px solid var(--border)',
                color: 'var(--gold)', textAlign: 'left',
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows?.slice(0, 30).map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '3px 10px', borderBottom: '1px solid var(--border-dim)',
                  color: '#a89870',
                }}>{String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
