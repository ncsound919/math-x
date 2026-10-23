import { describe, it, expect } from 'vitest';
import { DOMAINS, getDomain, domainsByCategory, suggestDomains } from '../domains/registry';
import { DOMAIN_BRIDGES, composeDomains, findBridges, suggestDomainsWithBridges } from '../domains/composition';
import { DOMAIN_CHAINS, decomposeProblem } from '../domains/chaining';

const NEW_DOMAINS = [
  'biotechnology_math', 'synthetic_biology_math', 'bioinformatics_math', 'structural_bioinformatics',
  'spatial_statistics', 'spatial_epidemiology', 'spatial_genomics', 'geospatial_math',
  'longitudinal_data_analysis', 'survival_analysis_math', 'time_series_biology', 'repeated_measures',
];

describe('New biotech/bioinformatics domains', () => {
  for (const id of ['biotechnology_math', 'synthetic_biology_math', 'bioinformatics_math', 'structural_bioinformatics']) {
    it(`${id} is registered with valid spec`, () => {
      const d = getDomain(id);
      expect(d).toBeDefined();
      expect(d!.name).toBeTruthy();
      expect(d!.description).toBeTruthy();
      expect(d!.keywords.length).toBeGreaterThan(0);
      expect(d!.prompt).toBeTruthy();
      expect(d!.tools.length).toBeGreaterThan(0);
      expect(d!.verification).toBeTruthy();
      expect(d!.examples.length).toBeGreaterThan(0);
    });
  }

  it('biotechnology has correct category', () => {
    expect(getDomain('biotechnology_math')!.category).toBe('biology');
  });

  it('bioinformatics has biopython tool', () => {
    expect(getDomain('bioinformatics_math')!.tools).toContain('biopython');
  });
});

describe('New spatial domains', () => {
  for (const id of ['spatial_statistics', 'spatial_epidemiology', 'spatial_genomics', 'geospatial_math']) {
    it(`${id} is registered with valid spec`, () => {
      const d = getDomain(id);
      expect(d).toBeDefined();
      expect(d!.keywords.length).toBeGreaterThan(3);
      expect(d!.examples.length).toBeGreaterThan(0);
    });
  }

  it('spatial_genomics has squidpy tool', () => {
    expect(getDomain('spatial_genomics')!.tools).toContain('squidpy');
  });

  it('spatial_statistics has scipy tool', () => {
    expect(getDomain('spatial_statistics')!.tools).toContain('scipy');
  });
});

describe('New longitudinal domains', () => {
  for (const id of ['longitudinal_data_analysis', 'survival_analysis_math', 'time_series_biology', 'repeated_measures']) {
    it(`${id} is registered with valid spec`, () => {
      const d = getDomain(id);
      expect(d).toBeDefined();
      expect(['applied_math', 'medicine', 'biology']).toContain(d!.category);
      expect(d!.keywords.length).toBeGreaterThan(3);
    });
  }

  it('survival_analysis has lifelines tool', () => {
    expect(getDomain('survival_analysis_math')!.tools).toContain('lifelines');
  });
});

describe('New domain bridges', () => {
  const newBridgeIds = ['biotech_bioinfo', 'synthetic_biology', 'spatial_genomics_bridge', 'spatial_epidemiology_bridge', 'longitudinal_survival', 'bioinformatics_genomics', 'biotech_longitudinal'];

  it('all new bridges are defined', () => {
    for (const id of newBridgeIds) {
      const bridge = DOMAIN_BRIDGES.find(b => b.id === id);
      expect(bridge).toBeDefined();
      expect(bridge!.domains.length).toBeGreaterThan(1);
      expect(bridge!.name).toBeTruthy();
    }
  });

  it('biotech_bioinfo bridge connects biotech + bioinformatics', () => {
    const bridge = DOMAIN_BRIDGES.find(b => b.id === 'biotech_bioinfo')!;
    expect(bridge.domains).toContain('biotechnology_math');
    expect(bridge.domains).toContain('bioinformatics_math');
  });

  it('spatial_genomics bridge connects spatial + genomics', () => {
    const bridge = DOMAIN_BRIDGES.find(b => b.id === 'spatial_genomics_bridge')!;
    expect(bridge.domains).toContain('spatial_genomics');
    expect(bridge.domains).toContain('single_cell_analysis');
  });
});

describe('Composition with new domains', () => {
  it('composes biotech + bioinformatics', () => {
    const result = composeDomains(['biotechnology_math', 'bioinformatics_math']);
    expect(result.domains.length).toBe(2);
    expect(result.prompt).toContain('Biotechnology');
    expect(result.prompt).toContain('Bioinformatics');
  });

  it('composes spatial + longitudinal', () => {
    const result = composeDomains(['spatial_statistics', 'longitudinal_data_analysis']);
    expect(result.domains.length).toBe(2);
  });

  it('finds bridges for new domains', () => {
    const bridges = findBridges(['synthetic_biology_math']);
    expect(bridges.length).toBeGreaterThan(0);
  });
});

describe('suggestDomains with new keywords', () => {
  it('suggests biotechnology for fermentation query', () => {
    const results = suggestDomainsWithBridges('fermentation kinetics bioreactor');
    expect(results.some(r => r.id === 'biotechnology_math')).toBe(true);
  });

  it('suggests spatial genomics for spatial transcriptomics', () => {
    const results = suggestDomainsWithBridges('spatial transcriptomics neighborhood');
    expect(results.some(r => r.id === 'spatial_genomics')).toBe(true);
  });

  it('suggests survival analysis for kaplan-meier', () => {
    const results = suggestDomainsWithBridges('kaplan-meier survival cox');
    expect(results.some(r => r.id === 'survival_analysis_math')).toBe(true);
  });

  it('suggests longitudinal for repeated measures', () => {
    const results = suggestDomainsWithBridges('repeated measures mixed effects');
    expect(results.some(r => r.id === 'longitudinal_data_analysis' || r.id === 'repeated_measures')).toBe(true);
  });
});

describe('Problem decomposition with new domains', () => {
  it('decomposes a biotech query', () => {
    const dp = decomposeProblem('optimize fermentation and analyze protein structure');
    expect(dp.subProblems.length).toBeGreaterThan(0);
  });

  it('decomposes a spatial genomics query', () => {
    const dp = decomposeProblem('find spatially variable genes in tissue');
    expect(dp.subProblems.length).toBeGreaterThan(0);
  });
});

describe('Total domain count', () => {
  it('has at least 55 domains', () => {
    expect(Object.keys(DOMAINS).length).toBeGreaterThanOrEqual(55);
  });

  it('has at least 19 bridges', () => {
    expect(DOMAIN_BRIDGES.length).toBeGreaterThanOrEqual(19);
  });
});
