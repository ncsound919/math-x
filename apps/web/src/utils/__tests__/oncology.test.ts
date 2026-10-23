import { describe, it, expect } from 'vitest';
import * as O from '../oncology';
import { jevDecision } from '../jev';

describe('oncology pain-point tools', () => {
  it('BH-FDR rejects small p-values', () => {
    const r = O.benjaminiHochberg([0.001, 0.01, 0.03, 0.05, 0.1, 0.2, 0.5], 0.05);
    expect(r.rejected[0]).toBe(true);
    expect(r.rejected[6]).toBe(false);
  });

  it('batch diagnostic flags confounded batches', () => {
    const r = O.batchEffectDiagnostic([1,2,3, 10,11,12], [0,0,0,1,1,1]);
    expect(r.fStat).toBeGreaterThan(0);
    expect(r.confounded).toBe(true);
  });

  it('RMST returns finite positive', () => {
    const r = O.rmst([1,2,3,4,5], [1,1,0,1,0], 5);
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThan(0);
  });

  it('ctDNA LOD and FN prob', () => {
    const lod = O.limitOfDetection(1000);
    expect(lod).toBeGreaterThan(0);
    const fn = O.falseNegativeProb(0.001, 1000);
    expect(fn).toBeGreaterThanOrEqual(0);
    expect(fn).toBeLessThanOrEqual(1);
  });

  it('tumor purity deconvolution', () => {
    const p = O.tumorPurity([5,6,7], [10,12,14], [1,2,3]);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('TMB calibration', () => {
    expect(O.tmbCalibrate(10)).toBeCloseTo(12.5, 1);
  });

  it('Bliss and HSA synergy', () => {
    expect(O.blissSynergy(0.3, 0.4, 0.7)).toBeCloseTo(0.12, 2);
    expect(O.hsaSynergy(0.3, 0.4, 0.7)).toBeCloseTo(0.3, 2);
  });

  it('BOIN dose decision', () => {
    expect(['escalate','stay','de-escalate']).toContain(O.boinNextDose(6, 1));
  });

  it('conformal interval', () => {
    const ci = O.conformalInterval([0.1,-0.2,0.15,-0.1,0.05], 0.1);
    expect(ci.q).toBeGreaterThanOrEqual(0);
    expect(ci.lower(5)).toBeLessThan(ci.upper(5));
  });

  it('reproducibility hash deterministic', () => {
    const h1 = O.reproducibilityHash({ seed: 42 });
    const h2 = O.reproducibilityHash({ seed: 42 });
    expect(h1).toBe(h2);
  });

  it('power two-sample', () => {
    const p = O.powerTwoSample(10, 10, 1, 1);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('hierarchical borrowing shrinks', () => {
    const r = O.hierarchicalBorrowing([5, 6, 7], [10, 10, 10]);
    expect(r.length).toBe(3);
  });

  it('surrogate correlation', () => {
    const r = O.surrogateCorrelation([3,4,5,6,7], [6,8,10,12,14]);
    expect(r.r).toBeGreaterThan(0.9);
  });

  it('e-value', () => {
    const r = O.eValue(2.5);
    expect(r.eValue).toBeGreaterThan(2.5);
  });

  it('clonal tree count', () => {
    expect(O.countClonalTrees(4)).toBe(16);
  });

  it('cosine similarity', () => {
    const s = O.cosineSimilarity([1,2,3], [1,2,3]);
    expect(s).toBeCloseTo(1, 5);
  });

  it('driver gene expected + p-value', () => {
    const exp = O.expectedMutations(1000, 0.001, 1.2);
    expect(exp).toBeCloseTo(1.2, 5);
    const p = O.driverPValue(5, exp);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('dropout rate', () => {
    expect(O.dropoutRate([0,3,0,5])).toBeCloseTo(0.5, 5);
  });

  it('Moran I', () => {
    const W = [[0,1,0,1],[1,0,1,0],[0,1,0,1],[1,0,1,0]];
    const m = O.moransI([1,2,3,4], W);
    expect(Number.isFinite(m)).toBe(true);
  });

  it('replicator step', () => {
    const r = O.replicatorStep([0.5,0.5], [1.0,0.8]);
    expect(r.length).toBe(2);
    expect(r[0] + r[1]).toBeCloseTo(1, 1);
  });

  it('dose volume histogram', () => {
    const v = O.doseVolumeHistogram([10,20,30,40,50], 30);
    expect(v).toBeCloseTo(0.6, 5);
  });

  it('identifiability score', () => {
    const s = O.identifiabilityScore([[1,0.5],[0.5,1]]);
    expect(s).toBeGreaterThan(0);
  });

  it('oncology JEV returns certainty', () => {
    const j = O.oncologyJEV(true, true, true, true, 0.8);
    expect(j.certainty).toBeGreaterThan(0.7);
  });
});

describe('JEV decision model', () => {
  it('high evidence gives high certainty', () => {
    const j = jevDecision({ hasResult: true, stable: true, crossCheck: true, authoritative: true, dataVolume: 0.9 });
    expect(j.certainty).toBeGreaterThan(0.7);
    expect(j.verdict).toBe('high');
  });
  it('no evidence gives low certainty', () => {
    const j = jevDecision({ hasResult: false, stable: false, crossCheck: false, authoritative: false, dataVolume: 0 });
    expect(j.certainty).toBeLessThan(0.3);
  });
});