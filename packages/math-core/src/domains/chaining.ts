/**
 * Domain chaining and problem decomposition for Math X.
 *
 * Extends cross-domain composition with ordered pipelines: the output of one
 * domain feeds into the next. Enables multi-step interdisciplinary reasoning.
 */

import { DOMAINS, type DomainSpec, type DomainCategory } from './registry';
import { composeDomains, DOMAIN_BRIDGES, findBridges, suggestDomainsWithBridges } from './composition';

// ---------------------------------------------------------------------------
// Domain chains — ordered pipelines where output of step N feeds step N+1
// ---------------------------------------------------------------------------
export interface DomainChainStep {
  domain: string;
  role: 'input' | 'transform' | 'verify' | 'output';
  description: string;
  inputFrom?: number; // index of previous step whose output feeds this
}

export interface DomainChain {
  id: string;
  name: string;
  description: string;
  steps: DomainChainStep[];
  example: string;
}

export const DOMAIN_CHAINS: DomainChain[] = [
  {
    id: 'data_to_model',
    name: 'Data → Model → Validation',
    description: 'Ingest data, build a statistical model, validate with cross-domain checks.',
    steps: [
      { domain: 'statistics', role: 'input', description: 'Exploratory data analysis and hypothesis formulation' },
      { domain: 'machine_learning_math', role: 'transform', description: 'Model training and generalization analysis', inputFrom: 0 },
      { domain: 'model_calibration_uncertainty', role: 'verify', description: 'Calibration, conformal prediction, drift detection', inputFrom: 1 },
    ],
    example: 'Build and validate a predictive model from a clinical dataset.',
  },
  {
    id: 'math_to_code',
    name: 'Math → Algorithm → Verification',
    description: 'Derive a mathematical result, implement as algorithm, verify symbolically.',
    steps: [
      { domain: 'numerical_analysis', role: 'input', description: 'Mathematical derivation and formula' },
      { domain: 'complexity_theory', role: 'transform', description: 'Algorithm design and complexity analysis', inputFrom: 0 },
      { domain: 'reproducibility_audit', role: 'verify', description: 'Determinism and provenance check', inputFrom: 1 },
    ],
    example: 'Derive an ODE solver, analyze its convergence, verify implementation.',
  },
  {
    id: 'bio_to_drug',
    name: 'Biology → Pharmacology → Trial',
    description: 'Mechanism → PK/PD → clinical trial design.',
    steps: [
      { domain: 'biomathematics', role: 'input', description: 'Biological mechanism and population dynamics' },
      { domain: 'pharmacology_math', role: 'transform', description: 'PK/PD modeling and dose-response', inputFrom: 0 },
      { domain: 'clinical_trials_math', role: 'output', description: 'Trial design, sample size, adaptive endpoints', inputFrom: 1 },
    ],
    example: 'Design a Phase I dose-finding study for a targeted therapy.',
  },
  {
    id: 'physics_to_engineering',
    name: 'Physics → Engineering → Control',
    description: 'Physical model → engineering optimization → control system.',
    steps: [
      { domain: 'mathematical_physics', role: 'input', description: 'Physical system modeling (PDEs, field theory)' },
      { domain: 'operations_research', role: 'transform', description: 'Design optimization and resource allocation', inputFrom: 0 },
      { domain: 'control_theory', role: 'output', description: 'Feedback controller design and stability proof', inputFrom: 1 },
    ],
    example: 'Optimize a thermal management system and design its controller.',
  },
  {
    id: 'genomics_to_therapy',
    name: 'Genomics → Statistics → Therapy',
    description: 'Variant interpretation → survival analysis → treatment optimization.',
    steps: [
      { domain: 'tumor_genomics', role: 'input', description: 'Variant calling, clonal deconvolution, signatures' },
      { domain: 'oncology_statistics', role: 'transform', description: 'Survival analysis, multiple testing, causal inference', inputFrom: 0 },
      { domain: 'drug_synergy', role: 'output', description: 'Combination therapy scoring and experimental design', inputFrom: 1 },
    ],
    example: 'Interpret a tumor genomic profile and recommend a combination strategy.',
  },
  {
    id: 'climate_to_policy',
    name: 'Climate → Statistics → Policy',
    description: 'Climate model → extreme event analysis → decision under uncertainty.',
    steps: [
      { domain: 'climate_math', role: 'input', description: 'Energy balance, tipping points, projections' },
      { domain: 'statistics', role: 'transform', description: 'Extreme value analysis, uncertainty quantification', inputFrom: 0 },
      { domain: 'operations_research', role: 'output', description: 'Robust decision-making under uncertainty', inputFrom: 1 },
    ],
    example: 'Assess flood risk under climate change and design adaptation policy.',
  },
  {
    id: 'signal_to_ml',
    name: 'Signal → Features → ML',
    description: 'Signal processing → feature extraction → machine learning.',
    steps: [
      { domain: 'signal_processing', role: 'input', description: 'Filtering, transforms, spectral analysis' },
      { domain: 'numerical_analysis', role: 'transform', description: 'Feature engineering and numerical methods', inputFrom: 0 },
      { domain: 'machine_learning_math', role: 'output', description: 'Model training, generalization, evaluation', inputFrom: 1 },
    ],
    example: 'Build a classifier from raw sensor time-series data.',
  },
  {
    id: 'proof_pipeline',
    name: 'Conjecture → Proof → Verification',
    description: 'Formalize a conjecture, attempt proof, verify with symbolic tools.',
    steps: [
      { domain: 'set_theory', role: 'input', description: 'Formalize the conjecture in logical terms' },
      { domain: 'functional_analysis', role: 'transform', description: 'Apply analytic techniques', inputFrom: 0 },
      { domain: 'reproducibility_audit', role: 'verify', description: 'Symbolic verification via SymPy/Z3', inputFrom: 1 },
    ],
    example: 'Prove and verify a theorem about operator spectra.',
  },
];

// ---------------------------------------------------------------------------
// Problem decomposition — break complex queries into domain-specific sub-tasks
// ---------------------------------------------------------------------------
export interface SubProblem {
  index: number;
  domain: string;
  task: string;
  dependsOn: number[];
  verification: string;
}

export interface DecomposedProblem {
  originalQuery: string;
  subProblems: SubProblem[];
  suggestedChain: string | null;
  domains: string[];
}

/**
 * Decompose a complex query into ordered sub-problems.
 * Uses keyword matching to identify relevant domains and chains.
 */
export function decomposeProblem(query: string): DecomposedProblem {
  const q = query.toLowerCase();
  const suggestions = suggestDomainsWithBridges(query, 8);
  const domainIds = suggestions.map(s => s.id);

  // Try to match a known chain
  let suggestedChain: string | null = null;
  for (const chain of DOMAIN_CHAINS) {
    const chainDomains = chain.steps.map(s => s.domain);
    if (chainDomains.every(d => domainIds.includes(d))) {
      suggestedChain = chain.id;
      break;
    }
  }

  // Build sub-problems from suggested domains
  const subProblems: SubProblem[] = domainIds.map((id, i) => {
    const spec = DOMAINS[id];
    return {
      index: i,
      domain: id,
      task: `${spec?.name || id}: analyze the "${spec?.description || ''}" aspects of the query`,
      dependsOn: i > 0 ? [i - 1] : [],
      verification: spec?.verification || 'none',
    };
  });

  // If a chain matched, reorder sub-problems by chain order
  if (suggestedChain) {
    const chain = DOMAIN_CHAINS.find(c => c.id === suggestedChain)!;
    const ordered: SubProblem[] = [];
    for (const step of chain.steps) {
      const sp = subProblems.find(s => s.domain === step.domain);
      if (sp) {
        sp.task = step.description;
        sp.dependsOn = step.inputFrom !== undefined ? [step.inputFrom] : [];
        ordered.push(sp);
      }
    }
    // append any extra domains not in the chain
    for (const sp of subProblems) {
      if (!ordered.includes(sp)) ordered.push(sp);
    }
    subProblems.length = 0;
    subProblems.push(...ordered);
    subProblems.forEach((sp, i) => (sp.index = i));
  }

  return { originalQuery: query, subProblems, suggestedChain, domains: domainIds };
}

/**
 * Build a composite system prompt for a decomposed problem,
 * with step-by-step instructions.
 */
export function buildDecomposedPrompt(dp: DecomposedProblem): string {
  if (dp.subProblems.length === 0) return '';
  const chain = dp.suggestedChain
    ? DOMAIN_CHAINS.find(c => c.id === dp.suggestedChain)
    : null;

  const header = chain
    ? `Interdisciplinary pipeline: ${chain.name}\n${chain.description}\n`
    : `Multi-domain analysis across: ${dp.domains.join(', ')}\n`;

  const steps = dp.subProblems
    .map((sp, i) => `Step ${i + 1} [${sp.domain}] (${sp.verification}): ${sp.task}`)
    .join('\n');

  return `${header}\n${steps}\n\nSynthesize results across all steps. Verify each step using its stated strategy.`;
}

// (composition and registry are re-exported by index.ts)
