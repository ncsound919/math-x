import { useEffect, useRef } from 'react';
import { MathRenderer } from './MathRenderer';
import { ChartView } from './ChartView';
import type { Message, Mode } from '../state/types';

const QUICK_PROBES = [
  'Find the cross-domain analogue', 'What symmetry underlies this?',
  'Run a Monte Carlo simulation', 'Build a testable hypothesis',
  'Translate to quantum mechanics', 'What would a physicist call this?',
  'Find the variational principle', 'Generalize this formula',
];

interface ResultsPaneProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  modeObj: Mode;
}

export function ResultsPane({ messages, loading, error, modeObj }: ResultsPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
            fontFamily: "'Libre Baskerville', serif",
            fontWeight: 700, color: '#f0a500',
            filter: 'drop-shadow(0 0 30px #f0a50040)',
          }}>X</div>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '1.3rem', color: '#8a6a30', letterSpacing: '0.08em', marginBottom: 4 }}>MATH X</div>
          <div style={{ fontSize: '0.7rem', color: '#3a2e10', letterSpacing: '0.2em', marginBottom: 24 }}>CROSS-DOMAIN MATHEMATICAL SCIENTIST</div>
          <div style={{ background: '#0a0800', border: `1px solid ${modeObj.color}28`, borderRadius: 10, padding: '14px 22px', maxWidth: 460, marginBottom: 22 }}>
            <div style={{ color: modeObj.color, fontSize: '0.7rem', letterSpacing: '0.12em', marginBottom: 5 }}>{modeObj.icon} {modeObj.label.toUpperCase()} MODE</div>
            <div style={{ color: '#6a5a3a', fontSize: '0.8rem', lineHeight: 1.6 }}>{modeObj.desc}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 540 }}>
            {QUICK_PROBES.map(p => (
              <span key={p} style={{ padding: '4px 11px', background: '#0a0800', border: '1px solid #2a2010', borderRadius: 20, color: '#4a3820', fontSize: '0.7rem', cursor: 'default' }}>{p}</span>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: '9px 18px', border: '1px dashed #2a2010', borderRadius: 8, color: '#3a2e10', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
            ◫ DRAG & DROP any folder — PDFs, CSVs, code, images
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} modeObj={modeObj} />
          ))}
          {loading && <LoadingIndicator modeObj={modeObj} />}
          {error && (
            <div style={{ margin: '10px 0', padding: '10px 14px', background: '#1a0800', border: '1px solid #ff6b3544', borderRadius: 8, color: '#ff6b35', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace" }}>
              ERROR: {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, modeObj }: { msg: Message; modeObj: Mode }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', gap: 12, marginBottom: 22,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'msgIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, marginTop: 2, background: 'linear-gradient(135deg,#2a1f00,#3d2e00)', border: `1px solid ${modeObj.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: modeObj.color, boxShadow: `0 0 8px ${modeObj.color}22` }}>X</div>
      )}
      <div style={{
        maxWidth: '85%',
        background: isUser ? '#0e0c07' : '#0a0800',
        border: isUser ? '1px solid #2a2010' : `1px solid ${modeObj.color}28`,
        borderRadius: isUser ? '14px 14px 3px 14px' : '3px 14px 14px 14px',
        padding: '12px 16px',
      }}>
        {isUser ? (
          <div>
            <p style={{ margin: 0, color: '#a89870', lineHeight: 1.65, fontSize: '0.88rem' }}>{msg.content}</p>
            {msg.files && msg.files.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
                {msg.files.map((f, i) => <span key={i} style={{ fontSize: '0.68rem', color: '#6a5830', background: '#1a1408', border: '1px solid #3a2e10', borderRadius: 4, padding: '2px 7px' }}>📎 {f}</span>)}
              </div>
            )}
          </div>
        ) : (
          <div>
            {msg.execution?.parsed?.chart && <ChartView spec={msg.execution.parsed} />}
            {msg.execution?.parsed?.table && <TableView data={msg.execution.parsed} />}
            {msg.execution?.stdout && !msg.execution?.parsed?.chart && !msg.execution?.parsed?.table && (
              <pre style={{ margin: '0 0 10px', padding: '8px 12px', background: '#060400', borderRadius: 6, fontSize: '0.78rem', color: '#7cff6b', overflowX: 'auto', border: '1px solid #1a2e1a' }}>{msg.execution.stdout}</pre>
            )}
            <MathRenderer text={msg.content} accent={modeObj.color} />
            {msg.plan && (
              <div style={{ marginTop: 10, fontSize: '0.6rem', color: '#3a2e10', fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span>engine:{msg.plan.engine}</span>
                <span>domain:{msg.plan.domain}</span>
                <span>complexity:{msg.plan.complexity}</span>
              </div>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, marginTop: 2, background: '#0e0c07', border: '1px solid #2a2010', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#5a4820' }}>YOU</div>
      )}
    </div>
  );
}

function LoadingIndicator({ modeObj }: { modeObj: Mode }) {
  const labels: Record<string, string> = {
    synergy: 'MAPPING CONNECTIONS', hypothesis: 'GENERATING HYPOTHESIS',
    formula: 'SYNTHESIZING FORMULA', files: 'ANALYZING CONTENT',
    probability: 'COMPUTING DISTRIBUTION', scientist: 'REASONING',
    solve: 'SOLVING', formula_lab: 'BUILDING FORMULA',
  };
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'msgIn 0.2s ease-out' }}>
      <div style={{ width: 32, height: 32, borderRadius: 7, background: '#0e0c07', border: `1px solid ${modeObj.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: modeObj.color, flexShrink: 0 }}>X</div>
      <div style={{ background: '#0a0800', border: `1px solid ${modeObj.color}28`, borderRadius: '3px 14px 14px 14px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${modeObj.color}44`, borderTopColor: modeObj.color, animation: 'spin 0.7s linear infinite' }} />
        <span style={{ fontSize: '0.75rem', color: '#4a3820', letterSpacing: '0.08em' }}>
          {labels[modeObj.id] || 'COMPUTING'}<span style={{ animation: 'blink 0.8s step-start infinite' }}>_</span>
        </span>
      </div>
    </div>
  );
}

function TableView({ data }: { data: any }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#c8bfa8', width: '100%' }}>
        <thead>
          <tr>{data.columns?.map((c: string) => <th key={c} style={{ padding: '4px 10px', borderBottom: '1px solid #2a2010', color: '#f0a500', textAlign: 'left' }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {data.rows?.slice(0, 20).map((row: any[], i: number) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} style={{ padding: '3px 10px', borderBottom: '1px solid #1a1408', color: '#a89870' }}>{String(cell)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
