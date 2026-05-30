/**
 * @mathx/math-core
 * Shared mathematical utilities, prompt builders, domain logic, and type definitions
 * for the Math X monorepo. Used by apps/api, apps/web, and packages/schemas.
 *
 * @example
 * import { selectProvider, buildPrompt, estimateTokens } from '@mathx/math-core'
 */

// Types (always export first so downstream re-exports work)
export * from './types';

// Model routing
export {
  selectProvider,
  checkOllamaHealth,
  maxTokensForMode,
  MODE_MAX_TOKENS,
} from './modelRouter';

// Prompt construction
export {
  MATHX_SYSTEM,
  MODE_PREFIXES,
  buildPrompt,
  buildRetrievedContextBlock,
  buildExecutionBlock,
} from './prompts';

// Domain prompts
export {
  DOMAIN_SYSTEM_PROMPTS,
  PROOF_ASSISTANT_PROMPT,
  getDomainPrompt,
} from './domainPrompts';

// Verification utilities
export {
  parseVerifySteps,
  computeSummary,
  buildSymPyVerificationCode,
} from './verify';

// Tokenizer / text utilities
export {
  estimateTokens,
  truncateToTokens,
  chunkText,
  detectContentMode,
} from './tokenizer';
