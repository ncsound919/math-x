// DerivationVerifier — shows a step-by-step verified derivation with SymPy trust badges.
// Steps computed by Claude; algebraic equality verified locally by SymPy in Pyodide WASM.
import { useState } from 'react';
import { usePyodide } from '../workers/usePyodide';

interface VerificationResult {
  verified: boolean | null;
  method: string;
  error?: string;
}

interface DerivationStep {
  step: number;
  description: string;
  from_expr: string;
  to_expr: string;
  operation: string;
  verifiable: boolean;
  verification?: VerificationResult;
}

interface DerivationSummary {
  total: number;
  verified: number;
  failed: number;
  not_verifiable: number;
  trust_score: number;
}

interface DerivationVerifierProps {
  expression: string;
  modeColor?: string;
  apiBase?: string;
}

const OPERATION_COLORS: Record<string, string> = {
  expand: '#4a7a9a',
  factor: '#7a4a9a',
  simplify: '#4a9a6a',
  differentiate: '#9a7a4a',
  integrate: '#9a4a6a',
  substitute: '#4a6a9a',
  rearrange: '#6a9a4a',
  definition: '#7a7a4a',
  default: '#5a5a5a',
};

function VerificationBadge({ result, verifiable }: { result?: VerificationResult; verifiable: boolean }) {
  if (!verifiable) {
    return <span style={{ fontSize: '0.6rem', color: '#5a5040', padding: '2px 7px', border: '1px solid #2a2010', borderRadius: 20 }}>AXIOM</span>;
  }
  if (!result) {
    return <span style={{ fontSize: '0.6rem', color: '#5a5040', padding: '2px 7px', border: '1px solid #2a2010', borderRadius: 20 }}>PENDING</span>;
  }
  if (result.verified === true) {
    return <span style={{ fontSize: '0.6rem', color: '#4a9a4a', padding: '2px 7px', border: '1px solid #2a502a', borderRadius: 20, fontWeight: 700 }}>✓ VERIFIED</span>;
  }
  if (result.verified === false) {
    return (
      <span title={result.error || 'Could not verify algebraic equality'}
        style={{ fontSize: '0.6rem', color: '#9a4a4a', padding: '2px 7px', border: '1px solid #502a2a', borderRadius: 20, fontWeight: 700, cursor: 'help' }}>
        ⚠ UNVERIFIED
      </span>
    );
  }
  return null;
}

export function DerivationVerifier({ expression, modeColor = '#F0A500', apiBase = '/api' }: DerivationVerifierProps) {
  const [steps, setSteps] = useState<DerivationStep[]>([]);
  const [summary, setSummary] = useState<DerivationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ready: pyodideReady, compute } = usePyodide();

  const runVerification = async () => {
    if (!expression.trim()) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    setSteps([]);

    try {
      // Step 1: Extract structured steps from Claude
      const extractRes = await fetch(`${apiBase}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression, mode: 'algebraic' }),
      });
      const { steps: rawSteps, sympyCode, numVerifiable } = await extractRes.json();
      setSteps(rawSteps);
      setLoading(false);

      if (numVerifiable === 0 || !pyodideReady) {
        const mergeRes = await fetch(`${apiBase}/verify/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps: rawSteps, sympyResults: [] }),
        });
        const { steps: annotated, summary: s } = await mergeRes.json();
        setSteps(annotated);
        setSummary(s);
        return;
      }

      // Step 2: Run SymPy verification in Pyodide WASM (local, no server)
      setVerifying(true);
      const sympyOutput = await compute(sympyCode);
      let sympyResults: any[] = [];
      try {
        const parsed = JSON.parse(sympyOutput);
        sympyResults = parsed.results || [];
      } catch {
        sympyResults = [];
      }

      // Step 3: Merge results
      const mergeRes = await fetch(`${apiBase}/verify/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: rawSteps, sympyResults }),
      });
      const { steps: annotated, summary: s } = await mergeRes.json();
      setSteps(annotated);
      setSummary(s);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <div style={{ fontFamily: 'inherit', maxWidth: 700 }}>
      <button
        onClick={runVerification}
        disabled={loading || verifying}
        style={{
          background: loading || verifying ? '#1a1408' : `${modeColor}18`,
          border: `1px solid ${modeColor}44`,
          borderRadius: 8, padding: '8px 16px',
          color: loading || verifying ? modeColor + '66' : modeColor,
          fontSize: '0.7rem', fontWeight: 700, cursor: loading || verifying ? 'default' : 'pointer',
          marginBottom: 16, letterSpacing: '0.1em',
        }}
      >
        {loading ? '○ Extracting steps...' : verifying ? '○ Running SymPy verification...' : '✓ VERIFY DERIVATION'}
      </button>

      {error && <div style={{ color: '#cc4444', fontSize: '0.68rem', marginBottom: 12 }}>⚠ {error}</div>}

      {/* Trust Score Summary */}
      {summary && (
        <div style={{
          background: '#0a0900', border: `1px solid ${modeColor}22`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', gap: 20, alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: summary.trust_score >= 80 ? '#4a9a4a' : summary.trust_score >= 50 ? modeColor : '#9a4a4a' }}>
              {summary.trust_score}%
            </div>
            <div style={{ fontSize: '0.58rem', color: '#4a3820', letterSpacing: '0.1em' }}>TRUST SCORE</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: '0.65rem', color: '#4a9a4a' }}>✓ {summary.verified} verified algebraically</div>
            {summary.failed > 0 && <div style={{ fontSize: '0.65rem', color: '#9a4a4a' }}>⚠ {summary.failed} unverified</div>}
            <div style={{ fontSize: '0.65rem', color: '#5a5040' }}>○ {summary.not_verifiable} axiomatic/definitional</div>
          </div>
          {!pyodideReady && (
            <div style={{ fontSize: '0.62rem', color: '#6a5830', marginLeft: 'auto', textAlign: 'right' }}>
              WASM engine loading…<br />verification will run when ready
            </div>
          )}
        </div>
      )}

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map(s => {
          const opColor = OPERATION_COLORS[s.operation] || OPERATION_COLORS.default;
          return (
            <div key={s.step} style={{
              background: '#0a0900',
              border: `1px solid ${s.verification?.verified === true ? '#2a502a' : s.verification?.verified === false ? '#502a2a' : '#1a1808'}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  background: opColor + '22', color: opColor,
                  border: `1px solid ${opColor}44`, borderRadius: 4,
                  padding: '1px 7px', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em',
                }}>{s.operation?.toUpperCase()}</span>
                <span style={{ color: '#5a4a2a', fontSize: '0.65rem', flex: 1 }}>{s.description}</span>
                <VerificationBadge result={s.verification} verifiable={s.verifiable} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                <span style={{ color: '#8a7850', flex: 1, wordBreak: 'break-all' }}>{s.from_expr}</span>
                <span style={{ color: '#4a3820' }}>→</span>
                <span style={{ color: '#c8b880', flex: 1, wordBreak: 'break-all' }}>{s.to_expr}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
