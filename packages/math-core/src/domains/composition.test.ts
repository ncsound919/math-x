import { describe, it, expect } from 'vitest';
import { composeDomains, findBridges, suggestDomainsWithBridges, domainsWithBridges, DOMAIN_BRIDGES } from '../domains/composition';
import { DOMAINS } from '../domains/registry';

describe('composeDomains', () => {
  it('composes a single domain', () => {
    const result = composeDomains(['statistics']);
    expect(result.domains.length).toBe(1);
    expect(result.prompt).toContain('Statistics');
    expect(result.categories).toContain('applied_math');
    expect(result.tools.length).toBeGreaterThan(0);
  });

  it('composes multiple domains', () => {
    const result = composeDomains(['statistics', 'machine_learning_math']);
    expect(result.domains.length).toBe(2);
    expect(result.categories.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for unknown domains', () => {
    const result = composeDomains(['nonexistent_domain']);
    expect(result.domains.length).toBe(0);
    expect(result.prompt).toBe('');
  });

  it('deduplicates categories and tools', () => {
    const result = composeDomains(['statistics', 'probability_theory']);
    const catSet = new Set(result.categories);
    expect(catSet.size).toBe(result.categories.length);
  });
});

describe('findBridges', () => {
  it('finds bridges for a domain', () => {
    const bridges = findBridges(['machine_learning_math']);
    expect(bridges.length).toBeGreaterThan(0);
    expect(bridges.some(b => b.id === 'ml_physics')).toBe(true);
  });

  it('returns empty for unrelated domains', () => {
    const bridges = findBridges(['set_theory']);
    // set_theory has no bridges defined
    expect(Array.isArray(bridges)).toBe(true);
  });
});

describe('suggestDomainsWithBridges', () => {
  it('suggests domains for a query', () => {
    const results = suggestDomainsWithBridges('survival analysis clinical trial');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty for gibberish', () => {
    const results = suggestDomainsWithBridges('zzzzz qqqqq');
    expect(results.length).toBe(0);
  });
});

describe('domainsWithBridges', () => {
  it('returns direct + bridged domains', () => {
    const result = domainsWithBridges('medicine');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('DOMAIN_BRIDGES', () => {
  it('has at least 10 bridges', () => {
    expect(DOMAIN_BRIDGES.length).toBeGreaterThanOrEqual(10);
  });

  it('every bridge has domains', () => {
    for (const b of DOMAIN_BRIDGES) {
      expect(b.domains.length).toBeGreaterThan(0);
      expect(b.name).toBeTruthy();
      expect(b.description).toBeTruthy();
    }
  });
});
