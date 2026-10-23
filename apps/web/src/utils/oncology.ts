// Oncology-specific mathematical analysis tools.
import { jevDecision } from './jev';

// 1. Multiple testing: Benjamini-Hochberg FDR
export function benjaminiHochberg(pvalues: number[], alpha = 0.05): { rejected: boolean[]; threshold: number } {
  const n = pvalues.length;
  const indexed = pvalues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const rejected = Array(n).fill(false);
  let k = 0;
  for (let i = n - 1; i >= 0; i--) {
    const rank = i + 1;
    if (indexed[i].p <= (rank / n) * alpha) { k = rank; break; }
  }
  for (let i = 0; i < k; i++) rejected[indexed[i].i] = true;
  const threshold = k > 0 ? indexed[k - 1].p : 0;
  return { rejected, threshold };
}

// 2. Batch effect diagnostic: simple ANOVA-like F between batches (proxy)
export function batchEffectDiagnostic(values: number[], batches: number[]): { fStat: number; confounded: boolean } {
  const groups = new Map<number, number[]>();
  batches.forEach((b, i) => { if (!groups.has(b)) groups.set(b, []); groups.get(b)!.push(values[i]); });
  const groupMeans = [...groups.values()].map(g => g.reduce((a, c) => a + c, 0) / g.length);
  const grandMean = values.reduce((a, c) => a + c, 0) / values.length;
  let ssb = 0, ssw = 0;
  groups.forEach((g, b) => {
    const gm = groupMeans[[...groups.keys()].indexOf(b)];
    ssb += g.length * (gm - grandMean) ** 2;
    g.forEach(v => { ssw += (v - gm) ** 2; });
  });
  const dfb = groups.size - 1;
  const dfw = values.length - groups.size;
  const fStat = dfb > 0 && dfw > 0 ? (ssb / dfb) / (ssw / dfw || 1) : 0;
  return { fStat, confounded: fStat > 4 };
}

// 4. RMST (Restricted Mean Survival Time) difference
export function rmst(times: number[], events: number[], tau: number): number {
  // trapezoidal integration of Kaplan-Meier up to tau
  const order = times.map((t, i) => i).sort((a, b) => times[a] - times[b]);
  let s = 1, prevT = 0, area = 0;
  const n = times.length;
  let atRisk = n;
  let i = 0;
  const sortedTimes = [...times].sort((a, b) => a - b);
  for (const t of sortedTimes) {
    if (t > tau) break;
    const ev = events.filter((e, idx) => times[idx] === t && e === 1).length;
    // approximate: integrate step
    area += s * (Math.min(t, tau) - prevT);
    if (ev > 0) s *= (atRisk - ev) / atRisk;
    atRisk -= events.filter((e, idx) => times[idx] === t).length;
    prevT = Math.min(t, tau);
  }
  if (prevT < tau) area += s * (tau - prevT);
  return area;
}

// 7. Limit of detection for ctDNA (binomial)
export function limitOfDetection(n: number, alpha = 0.05): number {
  // Minimum VAF detectable with n reads at alpha
  // Solve: P(X>=1 | p) = alpha -> p = 1 - (1-alpha)^(1/n)
  return 1 - Math.pow(1 - alpha, 1 / n);
}

export function falseNegativeProb(vaf: number, depth: number): number {
  // P(no mutant reads) = (1-vaf)^depth
  return Math.pow(1 - vaf, depth);
}

// 8. Tumor purity via simple deconvolution (least squares)
export function tumorPurity(bulk: number[], pureTumor: number[], pureNormal: number[]): number {
  // bulk = p*tumor + (1-p)*normal ; solve for p
  let num = 0, den = 0;
  for (let i = 0; i < bulk.length; i++) {
    const d = pureTumor[i] - pureNormal[i];
    num += (bulk[i] - pureNormal[i]) * d;
    den += d * d;
  }
  const p = den === 0 ? 0.5 : num / den;
  return Math.max(0, Math.min(1, p));
}

// 10. TMB panel-to-exome calibration (linear)
export function tmbCalibrate(panelTmb: number, slope = 1.2, intercept = 0.5): number {
  return slope * panelTmb + intercept;
}

// 14. Identifiability check: condition number of Fisher info (proxy)
export function identifiabilityScore(jacobian: number[][]): number {
  // Use determinant magnitude as proxy
  let det = 1;
  const n = jacobian.length;
  // gaussian elim
  const M = jacobian.map(r => [...r]);
  for (let i = 0; i < n; i++) {
    let pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) return 0;
    for (let j = i + 1; j < n; j++) {
      const factor = M[j][i] / pivot;
      for (let k = i; k < n; k++) M[j][k] -= factor * M[i][k];
    }
    det *= pivot;
  }
  return Math.min(1, Math.abs(det));
}

// 15. Drug synergy: Bliss, Loewe, HSA
export function blissSynergy(ea: number, eb: number, eab: number): number {
  // Bliss: expected = ea + eb - ea*eb; synergy = observed - expected
  const expected = ea + eb - ea * eb;
  return eab - expected;
}

export function hsaSynergy(ea: number, eb: number, eab: number): number {
  return eab - Math.max(ea, eb);
}

// 17. BOIN dose-finding simulation (simplified)
export function boinNextDose(n: number, dlt: number, lambda1 = 0.2, lambda2 = 0.4): 'escalate' | 'stay' | 'de-escalate' {
  const rate = n === 0 ? 0 : dlt / n;
  if (rate <= lambda1) return 'escalate';
  if (rate >= lambda2) return 'de-escalate';
  return 'stay';
}

// 19. Conformal prediction interval (regression, residual-based)
export function conformalInterval(residuals: number[], alpha = 0.1): { q: number; lower: (pred: number) => number; upper: (pred: number) => number } {
  const sorted = [...residuals].map(Math.abs).sort((a, b) => a - b);
  const idx = Math.ceil((sorted.length + 1) * (1 - alpha)) - 1;
  const q = sorted[Math.min(sorted.length - 1, Math.max(0, idx))];
  return { q, lower: (pred) => pred - q, upper: (pred) => pred + q };
}

// 20. Reproducibility hash (simple)
export function reproducibilityHash(inputs: Record<string, unknown>): string {
  const str = JSON.stringify(inputs, Object.keys(inputs).sort());
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

// 3. Small samples: power for two-sample t-test + hierarchical Bayesian borrowing (shrinkage)
export function powerTwoSample(n1: number, n2: number, delta: number, sigma: number, alpha = 0.05): number {
  // Approximate power via normal
  const se = sigma * Math.sqrt(1 / n1 + 1 / n2);
  const z = (delta / se);
  const zCrit = 1.96; // two-sided alpha=0.05
  // power = P(Z > zCrit - z) + P(Z < -zCrit - z) approx
  const cdf = (x: number) => 0.5 * (1 + erf(x / Math.sqrt(2)));
  return 1 - cdf(zCrit - z) + cdf(-zCrit - z);
}
function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
export function hierarchicalBorrowing(groupMeans: number[], groupSizes: number[], tau = 1): number[] {
  // Empirical Bayes shrinkage toward grand mean
  const grandMean = groupMeans.reduce((a, b, i) => a + b * groupSizes[i], 0) / groupSizes.reduce((a, b) => a + b, 0);
  const out = groupMeans.map((m, i) => {
    const shrink = groupSizes[i] / (groupSizes[i] + tau);
    return shrink * m + (1 - shrink) * grandMean;
  });
  return out;
}

// 5. Surrogate endpoint validation: trial-level correlation
export function surrogateCorrelation(trialPFS: number[], trialOS: number[]): { r: number; r2: number } {
  const n = trialPFS.length;
  const mx = trialPFS.reduce((a, b) => a + b, 0) / n;
  const my = trialOS.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxx += (trialPFS[i] - mx) ** 2; sxy += (trialPFS[i] - mx) * (trialOS[i] - my); syy += (trialOS[i] - my) ** 2; }
  const r = (sxx * syy) === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  return { r, r2: r * r };
}

// 6. Causal inference: E-value for unmeasured confounding
export function eValue(rr: number): { eValue: number; eValueLower: number } {
  // E-value = RR + sqrt(RR*(RR-1)) for RR>=1
  const r = rr >= 1 ? rr : 1 / rr;
  const ev = r + Math.sqrt(r * (r - 1));
  return { eValue: ev, eValueLower: ev };
}

// 9. Clonal phylogeny enumeration: count of possible trees (Cayley-like) for n clones
export function countClonalTrees(n: number): number {
  // Number of labeled trees on n nodes = n^(n-2) (Cayley)
  if (n <= 1) return 1;
  return Math.pow(n, n - 2);
}

// 10. Mutational signature stability: cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return (na === 0 || nb === 0) ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// 11. Driver gene: expected mutations under covariate-aware null (Poisson)
export function expectedMutations(length: number, rate: number, covariateFactor = 1): number {
  return length * rate * covariateFactor;
}
export function driverPValue(observed: number, expected: number): number {
  // Poisson tail p-value P(X >= observed)
  let p = 0;
  for (let k = observed; k < observed + 100; k++) {
    p += (Math.pow(expected, k) * Math.exp(-expected)) / factorial(k);
  }
  return Math.min(1, p);
}
function factorial(n: number): number { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }

// 12. Single-cell: dropout rate + zero-inflation
export function dropoutRate(counts: number[]): number {
  const zeros = counts.filter(c => c === 0).length;
  return zeros / counts.length;
}
// clustering stability: bootstrap ARI placeholder (returns 0..1)
export function clusteringStability(labels: number[], nBootstrap = 10): number {
  // Simplified: return fraction of stable assignments (placeholder)
  return Math.min(1, labels.length / (labels.length + 10));
}

// 13. Spatial omics: Moran's I
export function moransI(values: number[], weights: number[][]): number {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const dev = values.map(v => v - mean);
  let num = 0, den = 0, wsum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      num += weights[i][j] * dev[i] * dev[j];
      wsum += weights[i][j];
    }
    den += dev[i] * dev[i];
  }
  return (n / wsum) * (num / den);
}

// 16. Resistance evolution: replicator dynamics step
export function replicatorStep(freqs: number[], fitness: number[], dt = 0.1): number[] {
  const avgFit = freqs.reduce((a, f, i) => a + f * fitness[i], 0);
  return freqs.map((f, i) => f + dt * f * (fitness[i] - avgFit));
}

// 18. Radiotherapy: simple dose-volume constraint check
export function doseVolumeHistogram(doses: number[], volumeThreshold: number): number {
  const above = doses.filter(d => d >= volumeThreshold).length;
  return above / doses.length;
}

// JEV certainty for an oncology claim
export function oncologyJEV(hasResult: boolean, stable: boolean, crossCheck: boolean, authoritative: boolean, dataVolume: number) {
  return jevDecision({ hasResult, stable, crossCheck, authoritative, dataVolume });
}