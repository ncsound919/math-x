// Agentic Analysis Lab — LLM-utilized analysis with JEV certainty.
import { useState } from 'react';
import { descriptiveStats, linearRegression, numericalIntegral, matrixDeterminant } from '../utils/analysis';
import { jevDecision, JEV_VERDICT_COLOR } from '../utils/jev';

interface AnalysisLabProps {
  modeColor?: string;
  apiBase?: string;
}

export function AnalysisLab({ modeColor = '#F0A500', apiBase = '/api' }: AnalysisLabProps) {
  const [dataInput, setDataInput] = useState('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
  const [xInput, setXInput] = useState('1,2,3,4,5');
  const [yInput, setYInput] = useState('2,4,6,8,10');
  const [expr, setExpr] = useState('x^2');
  const [a, setA] = useState('0');
  const [b, setB] = useState('1');
  const [result, setResult] = useState<string>('');
  const [jev, setJev] = useState<ReturnType<typeof jevDecision> | null>(null);
  const [loading, setLoading] = useState(false);

  const parseNums = (s: string) => s.split(/[,;\s]+/).map(x => Number(x.trim())).filter(n => !isNaN(n));

  const runStats = () => {
    const data = parseNums(dataInput);
    const stats = descriptiveStats(data);
    setResult(JSON.stringify(stats, null, 2));
    setJev(jevDecision({ hasResult: true, stable: true, crossCheck: false, authoritative: false, dataVolume: Math.min(1, data.length / 50) }));
  };

  const runRegression = () => {
    const xs = parseNums(xInput);
    const ys = parseNums(yInput);
    const r = linearRegression(xs, ys);
    setResult(JSON.stringify(r, null, 2));
    setJev(jevDecision({ hasResult: true, stable: true, crossCheck: false, authoritative: false, dataVolume: Math.min(1, xs.length / 20) }));
  };

  const runIntegral = () => {
    let f: (x: number) => number;
    try {
      f = new Function('x', 'return ' + expr.replace(/\^/g, '**')) as any;
    } catch {
      setResult('Invalid expression');
      return;
    }
    const val = numericalIntegral(f, Number(a), Number(b));
    setResult(`∫_${a}^{b} (${expr}) dx ≈ ${val}`);
    setJev(jevDecision({ hasResult: true, stable: true, crossCheck: true, authoritative: false, dataVolume: 0.5 }));
  };

  const runMatrix = () => {
    try {
      const m = JSON.parse(dataInput) as number[][];
      const det = matrixDeterminant(m);
      setResult(`det = ${det}`);
      setJev(jevDecision({ hasResult: true, stable: Math.abs(det) > 1e-12, crossCheck: false, authoritative: false, dataVolume: 0.3 }));
    } catch {
      setResult('Enter a JSON matrix in the data field, e.g. [[1,2],[3,4]]');
    }
  };

  const askLLM = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/chat-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `Analyze this dataset: ${dataInput}. Compute descriptive statistics and interpret.` }], mode: 'scientist' }),
      });
      const text = await res.text();
      setResult(text.slice(0, 1000));
    } catch (e: any) {
      setResult(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'inherit' }}>
      <div style={{ color: modeColor, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.12em', marginBottom: 12 }}>🧪 AGENTIC ANALYSIS LAB</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={lbl}>Data (comma-separated)</label>
          <textarea value={dataInput} onChange={e => setDataInput(e.target.value)} rows={3} style={ta} />
        </div>
        <div>
          <label style={lbl}>X values</label>
          <input value={xInput} onChange={e => setXInput(e.target.value)} style={inp} />
          <label style={{ ...lbl, marginTop: 6 }}>Y values</label>
          <input value={yInput} onChange={e => setYInput(e.target.value)} style={inp} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={runStats} style={btn(modeColor)}>📊 STATS</button>
        <button onClick={runRegression} style={btn(modeColor)}>📈 REGRESSION</button>
        <button onClick={runMatrix} style={btn(modeColor)}>🔢 MATRIX DET</button>
        <button onClick={askLLM} disabled={loading} style={btn(modeColor)}>{loading ? '…' : '🤖 ASK LLM'}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <label style={lbl}>∫ expr</label>
        <input value={expr} onChange={e => setExpr(e.target.value)} style={{ ...inp, width: 120 }} />
        <label style={lbl}>from</label>
        <input value={a} onChange={e => setA(e.target.value)} style={{ ...inp, width: 60 }} />
        <label style={lbl}>to</label>
        <input value={b} onChange={e => setB(e.target.value)} style={{ ...inp, width: 60 }} />
        <button onClick={runIntegral} style={btn(modeColor)}>∫ INTEGRATE</button>
      </div>

      {result && (
        <pre style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, fontSize: '0.72rem', color: 'var(--green)', whiteSpace: 'pre-wrap', marginBottom: 12, maxHeight: 240, overflowY: 'auto' }}>{result}</pre>
      )}

      {jev && (
        <div style={{ background: 'var(--bg2)', border: `1px solid ${JEV_VERDICT_COLOR[jev.verdict]}44`, borderRadius: 8, padding: 12 }}>
          <div style={{ color: JEV_VERDICT_COLOR[jev.verdict], fontWeight: 700, fontSize: '0.7rem', marginBottom: 6 }}>JEV CERTAINTY: {(jev.certainty * 100).toFixed(1)}% — {jev.verdict.toUpperCase()}</div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            <span>Judgment: {(jev.judgment * 100).toFixed(0)}%</span>
            <span>Evaluation: {(jev.evaluation * 100).toFixed(0)}%</span>
            <span>Verification: {(jev.verification * 100).toFixed(0)}%</span>
            <span>Uncertainty: {(jev.uncertainty * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: '0.62rem', color: 'var(--text-muted)', marginRight: 4 };
const ta: React.CSSProperties = { width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, color: 'var(--text)', fontSize: '0.72rem', resize: 'vertical', outline: 'none' };
const inp: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: '0.72rem', outline: 'none' };
function btn(color: string): React.CSSProperties { return { background: color, color: 'var(--bg1)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }; }