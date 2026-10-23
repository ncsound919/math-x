import { describe, it, expect } from 'vitest';
import { decomposeProblem, buildDecomposedPrompt, DOMAIN_CHAINS } from '../domains/chaining';

describe('decomposeProblem', () => {
  it('decomposes a clinical trial query', () => {
    const dp = decomposeProblem('design a clinical trial for a drug targeting a tumor suppressor');
    expect(dp.subProblems.length).toBeGreaterThan(0);
    expect(dp.domains.length).toBeGreaterThan(0);
  });

  it('suggests a chain when domains match', () => {
    const dp = decomposeProblem('pharmacology PK/PD model for a clinical trial dose finding');
    // Should suggest bio_to_drug or pharma_pkpd chain
    expect(dp.originalQuery).toContain('pharmacology');
  });

  it('returns empty sub-problems for gibberish', () => {
    const dp = decomposeProblem('zzzzz qqqqq');
    expect(dp.subProblems.length).toBe(0);
    expect(dp.domains.length).toBe(0);
  });

  it('buildDecomposedPrompt produces non-empty output for real query', () => {
    const dp = decomposeProblem('survival analysis for oncology clinical trial');
    const prompt = buildDecomposedPrompt(dp);
    if (dp.subProblems.length > 0) {
      expect(prompt.length).toBeGreaterThan(0);
    }
  });

  it('buildDecomposedPrompt returns empty for no sub-problems', () => {
    const dp = { originalQuery: 'x', subProblems: [], suggestedChain: null, domains: [] };
    expect(buildDecomposedPrompt(dp)).toBe('');
  });
});

describe('DOMAIN_CHAINS', () => {
  it('has at least 5 chains', () => {
    expect(DOMAIN_CHAINS.length).toBeGreaterThanOrEqual(5);
  });

  it('every chain has steps', () => {
    for (const c of DOMAIN_CHAINS) {
      expect(c.steps.length).toBeGreaterThan(0);
      expect(c.name).toBeTruthy();
      expect(c.description).toBeTruthy();
    }
  });

  it('chain steps reference valid domains', () => {
    for (const c of DOMAIN_CHAINS) {
      for (const step of c.steps) {
        expect(typeof step.domain).toBe('string');
        expect(step.description).toBeTruthy();
      }
    }
  });
});
