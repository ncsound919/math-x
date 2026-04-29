/**
 * ProofVerifier — UI for extracting and verifying derivation steps from a message.
 * Parses numbered mathematical steps from assistant output,
 * submits them to the SymPy verifier pipeline,
 * and renders per-step VERIFIED / UNVERIFIED / ERROR badges.
 */
import { useState, useCallback } from 'react';
import { useSymPyVerifier, VerificationStatus } from '../workers/useSymPyVerifier';

export interface DerivationStep {
  id: string;
  description: string;
  expression_before: string;
  expression_after: string;
  step_type: string;
}

interface ProofVerifierProps {
  messageContent: string;
  modeColor: string;
}

const STATUS_CONFIG: Record<VerificationStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'PENDING',     color: '#6a5a3a', bg: '#1a1408' },
  verifying:   { label: 'VERIFYING…', color: '#fbbf24', bg: '#1c1504' },
  VERIFIED:    { label: '✓ VERIFIED',   color: '#4ade80', bg: '#0a1a0a' },
  UNVERIFIED:  { label: '⚠ UNVERIFIED', color: '#f87171', bg: '#1a0a0a' },
  ERROR:       { label: '✕ ERROR',      color: '#f87171', bg: '#1a0a0a' },
  skipped:     { label: 'SKIPPED',     color: '#4a3820', bg: '#0a0800' },
};

/**
 * Naively extracts numbered steps from markdown-style derivation text.
 * E.g. "1. Start with f(x) = x^2 + 2x"
 * Looks for patterns like: "Step N:" or "N." followed by math expressions.
 */
function extractSteps(content: string): DerivationStep[] {
  const steps: DerivationStep[] = [];
  // Match lines like: "1. Description: expr_before -> expr_after"
  // or "Step 1: Description\n   Before: ...\n   After: ..."
  const lines = content.split('\n');
  let stepIndex = 0;

  // Strategy: find lines with LaTeX expressions separated by \Rightarrow, =>, or \to
  const arrowPattern = /(.+?)\s*(?:=>|\\Rightarrow|\\to|\u2192|=)\s*(.+)/;
  const numberedStep = /^(?:Step\s+)?\d+[.:)\s]/i;

  for (let i = 0; i < lines.length && stepIndex < 12; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 5) continue;

    const isNumbered = numberedStep.test(line);
    if (!isNumbered && !line.includes('$')) continue;

    const arrowMatch = line.match(arrowPattern);
    if (arrowMatch) {
      steps.push({
        id: `step-${stepIndex++}`,
        description: line.replace(/[$\\]/g, '').slice(0, 80),
        expression_before: arrowMatch[1].replace(/`/g, '').trim(),
        expression_after: arrowMatch[2].replace(/`/g, '').trim(),
        step_type: inferStepType(line),
      });
    } else if (isNumbered && i + 1 < lines.length) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && (nextLine.includes('=') || nextLine.includes('$'))) {
        steps.push({
          id: `step-${stepIndex++}`,
          description: line.replace(/^\d+[.:)\s]+/, '').trim().slice(0, 80),
          expression_before: line.slice(0, 60),
          expression_after: nextLine.slice(0, 60),
          step_type: inferStepType(line),
        });
      }
    }
  }

  return steps;
}

function inferStepType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('integrat') || t.includes('\\int')) return 'integrate';
  if (t.includes('differentiat') || t.includes('deriv') || t.includes("d/dx") || t.includes('\\frac{d')) return 'differentiate';
  if (t.includes('limit') || t.includes('\\lim')) return 'limit';
  if (t.includes('factor')) return 'factor';
  if (t.includes('expand')) return 'expand';
  if (t.includes('substit')) return 'substitute';
  if (t.includes('simplif')) return 'simplify';
  if (t.includes('solv')) return 'solve';
  if (t.includes('matrix') || t.includes('det(') || t.includes('eigenvalue')) return 'matrix';
  return 'algebra';
}

export function ProofVerifier({ messageContent, modeColor }: ProofVerifierProps) {
  const { ready, verifySteps } = useSymPyVerifier();
  const [steps, setSteps] = useState<(DerivationStep & { status: VerificationStatus; error?: string })[]>([]);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [ran, setRan] = useState(false);

  const run = useCallback(async () => {
    const extracted = extractSteps(messageContent);
    if (extracted.length === 0) return;
    setSteps(extracted.map(s => ({ ...s, status: 'verifying' })));
    setRunning(true); setExpanded(true); setRan(true);

    const results = await verifySteps(extracted);
    setSteps(prev => prev.map((s, i) => ({ ...s, ...(results[i] || { status: 'skipped' }) })));
    setRunning(false);
  }, [messageContent, verifySteps]);

  const extractedPreview = extractSteps(messageContent);
  if (extractedPreview.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {!ran ? (
        <button
          onClick={run}
          disabled={!ready || running}
          style={{
            background: 'none',
            border: `1px solid ${modeColor}44`,
            borderRadius: 4,
            color: ready ? modeColor : '#4a3820',
            fontSize: '0.6rem',
            padding: '3px 10px',
            cursor: ready ? 'pointer' : 'not-allowed',
            letterSpacing: '0.1em',
          }}
        >
          Σ VERIFY {extractedPreview.length} STEP{extractedPreview.length !== 1 ? 'S' : ''}
        </button>
      ) : (
        <div style={{ background: '#0a0800', border: '1px solid #2a2010', borderRadius: 6, padding: '8px 10px' }}>
          <button
            onClick={() => setExpanded(p => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: modeColor, fontSize: '0.62rem', letterSpacing: '0.1em', marginBottom: expanded ? 8 : 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>Σ SYMPY VERIFICATION</span>
            <span style={{ opacity: 0.5 }}>{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && steps.map(step => {
            const cfg = STATUS_CONFIG[step.status];
            return (
              <div key={step.id} style={{
                background: cfg.bg,
                border: `1px solid ${cfg.color}33`,
                borderRadius: 5,
                padding: '6px 8px',
                marginBottom: 5,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}>
                <span style={{
                  background: cfg.color + '22',
                  color: cfg.color,
                  fontSize: '0.55rem',
                  padding: '2px 6px',
                  borderRadius: 3,
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  marginTop: 1,
                }}>{cfg.label}</span>
                <div>
                  <div style={{ color: '#8a7a5a', fontSize: '0.63rem', lineHeight: 1.5 }}>{step.description}</div>
                  {step.error && <div style={{ color: '#f87171', fontSize: '0.58rem', marginTop: 2 }}>{step.error}</div>}
                </div>
              </div>
            );
          })}

          {running && (
            <div style={{ color: '#4a3820', fontSize: '0.6rem', marginTop: 4, letterSpacing: '0.08em' }}>⟳ running sympy locally…</div>
          )}
        </div>
      )}
    </div>
  );
}
