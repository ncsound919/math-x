// JEV (Judgment, Evaluation, Verification) decision model.
// Produces a certainty score (0..1) and a breakdown for a research claim.

export interface JEVEvidence {
  /** Tool/analysis result available */
  hasResult: boolean;
  /** Result is numerically stable / converged */
  stable: boolean;
  /** Cross-check agreed (e.g., two methods agree) */
  crossCheck: boolean;
  /** Source is peer-reviewed / authoritative */
  authoritative: boolean;
  /** Sample size or data volume (normalized 0..1) */
  dataVolume: number;
}

export interface JEVBreakdown {
  judgment: number;     // prior plausibility
  evaluation: number;   // evidence quality
  verification: number; // independent verification
  certainty: number;    // combined 0..1
  uncertainty: number;  // 1 - certainty
  verdict: 'high' | 'moderate' | 'low' | 'speculative';
}

export function jevDecision(evidence: JEVEvidence, prior = 0.5): JEVBreakdown {
  // Judgment: prior plausibility, nudged by data volume
  const judgment = clamp(prior * 0.6 + evidence.dataVolume * 0.4);

  // Evaluation: evidence quality
  let evalScore = 0;
  if (evidence.hasResult) evalScore += 0.4;
  if (evidence.stable) evalScore += 0.3;
  if (evidence.authoritative) evalScore += 0.3;
  evalScore = clamp(evalScore);

  // Verification: independent checks
  let verScore = 0;
  if (evidence.crossCheck) verScore += 0.6;
  if (evidence.hasResult && evidence.stable) verScore += 0.4;
  verScore = clamp(verScore);

  // Combined certainty (weighted)
  const certainty = clamp(judgment * 0.25 + evalScore * 0.4 + verScore * 0.35);
  const uncertainty = 1 - certainty;

  let verdict: JEVBreakdown['verdict'] = 'speculative';
  if (certainty >= 0.75) verdict = 'high';
  else if (certainty >= 0.5) verdict = 'moderate';
  else if (certainty >= 0.25) verdict = 'low';

  return { judgment, evaluation: evalScore, verification: verScore, certainty, uncertainty, verdict };
}

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export const JEV_VERDICT_COLOR: Record<JEVBreakdown['verdict'], string> = {
  high: '#4ade80',
  moderate: '#fbbf24',
  low: '#f87171',
  speculative: '#94a3b8',
};