/**
 * Cross-domain composition for Math X.
 *
 * Extends the flat domain registry with the ability to combine multiple
 * domains into a single composite specialist prompt, and to discover
 * interdisciplinary bridges between domains.
 */

import { DOMAINS, type DomainSpec, type DomainCategory } from './registry';

export interface DomainBridge {
  id: string;
  domains: string[];
  name: string;
  description: string;
  example: string;
}

export const DOMAIN_BRIDGES: DomainBridge[] = [
  { id: 'ml_physics', domains: ['machine_learning_math', 'mathematical_physics'], name: 'ML for Physics', description: 'Neural network surrogates for PDEs, physics-informed neural networks.', example: 'Train a PINN to solve Navier-Stokes.' },
  { id: 'bio_stats', domains: ['biomathematics', 'statistics', 'oncology_statistics'], name: 'Biostatistics', description: 'Survival analysis, clinical trial design, omics multiple testing.', example: 'Design a group-sequential trial with FDR-controlled endpoints.' },
  { id: 'crypto_number_theory', domains: ['cryptographic_math', 'algebraic_number_theory', 'analytic_number_theory'], name: 'Cryptographic Number Theory', description: 'Post-quantum lattices, elliptic curve pairings, prime distribution.', example: 'Explain LWE reduction to SVP.' },
  { id: 'climate_stats', domains: ['climate_math', 'statistics', 'stochastic_processes'], name: 'Climate Statistics', description: 'Extreme event attribution, tipping-point early warning.', example: 'Compute return period of a 100-year flood.' },
  { id: 'neuro_dynamics', domains: ['neuroscience_math', 'chaos_dynamical_systems', 'stochastic_processes'], name: 'Neural Dynamics', description: 'Neuron models, population coding, bifurcation analysis.', example: 'Analyze a Hopf bifurcation in a Wilson-Cowan model.' },
  { id: 'materials_physics', domains: ['materials_science_math', 'mathematical_physics', 'pde'], name: 'Materials Physics', description: 'Crystallography, phase transitions, diffusion.', example: 'Model diffusion in a composite material.' },
  { id: 'astro_stats', domains: ['astronomy_math', 'statistics', 'numerical_analysis'], name: 'Astrostatistics', description: 'Orbital fitting, photometric redshifts, cosmological parameters.', example: 'Fit orbital parameters via MCMC.' },
  { id: 'pharma_pkpd', domains: ['pharmacology_math', 'clinical_trials_math', 'statistics'], name: 'Pharmacometrics', description: 'PK/PD modeling, dose optimization, adaptive designs.', example: 'Fit a two-compartment PK model.' },
  { id: 'genomics_stats', domains: ['tumor_genomics', 'oncology_statistics', 'single_cell_analysis', 'spatial_omics'], name: 'Cancer Genomics Statistics', description: 'Variant calling, clonal deconvolution, single-cell/spatial analysis.', example: 'Deconvolve tumor purity and test spatial autocorrelation.' },
  { id: 'finance_stoch', domains: ['financial_math', 'stochastic_processes', 'probability_theory'], name: 'Quantitative Finance', description: 'Stochastic calculus, option pricing, risk measures.', example: 'Derive Black-Scholes via risk-neutral pricing.' },
  { id: 'info_coding', domains: ['information_theory', 'complexity_theory', 'combinatorics_graph'], name: 'Information & Coding', description: 'Channel capacity, error-correcting codes.', example: 'Compute capacity of a binary symmetric channel.' },
  { id: 'genomics_oncology', domains: ['tumor_genomics', 'oncology_statistics', 'clinical_trials_math'], name: 'Oncology Genomics', description: 'Variant interpretation, TMB, clinical trial math for oncology.', example: 'Estimate limit of detection for ctDNA.' },
];

export function composeDomains(domainIds: string[]): {
  prompt: string;
  domains: DomainSpec[];
  categories: DomainCategory[];
  tools: string[];
  verification: string;
} {
  const specs = domainIds.map(id => DOMAINS[id]).filter((d): d is DomainSpec => !!d);
  if (specs.length === 0) return { prompt: '', domains: [], categories: [], tools: [], verification: 'none' };
  const prompt = specs.map(d => `[${d.name}]\n${d.prompt}`).join('\n\n---\n\n');
  const categories = [...new Set(specs.map(d => d.category))];
  const tools = [...new Set(specs.flatMap(d => d.tools))];
  const verification = specs.map(d => d.verification).join(' + ');
  return { prompt, domains: specs, categories, tools, verification };
}

export function findBridges(domainIds: string[]): DomainBridge[] {
  const set = new Set(domainIds);
  return DOMAIN_BRIDGES.filter(b => b.domains.some(d => set.has(d)));
}

export function suggestDomainsWithBridges(query: string, limit = 5): Array<{ id: string; score: number; bridge?: string }> {
  const q = query.toLowerCase();
  const scored = Object.values(DOMAINS).map(d => {
    let score = 0;
    for (const kw of d.keywords) { if (q.includes(kw.toLowerCase())) score += kw.split(/\s+/).length + 1; }
    if (q.includes(d.name.toLowerCase())) score += 5;
    return { id: d.id, score };
  });
  const top = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  const topIds = top.map(t => t.id);
  const bridges = findBridges(topIds);
  for (const b of bridges.slice(0, 2)) {
    if (!topIds.includes(b.id)) top.push({ id: b.id, score: 1 });
  }
  return top;
}

export function domainsWithBridges(cat: DomainCategory): DomainSpec[] {
  const direct = Object.values(DOMAINS).filter(d => d.category === cat);
  const bridgeIds = DOMAIN_BRIDGES
    .filter(b => b.domains.some(d => DOMAINS[d]?.category === cat))
    .flatMap(b => b.domains)
    .filter(id => DOMAINS[id] && DOMAINS[id]!.category !== cat);
  const bridged = bridgeIds.map(id => DOMAINS[id]!).filter(Boolean);
  return [...direct, ...bridged];
}
