/**
 * Domain-specific system prompt extensions.
 * Derived from the structured domain registry (packages/math-core/src/domains).
 * Kept as a flat map for backward compatibility with existing consumers.
 */
import { DOMAINS } from './domains';

export const DOMAIN_SYSTEM_PROMPTS: Record<string, string> = Object.fromEntries(
  Object.values(DOMAINS).map(d => [d.id, d.prompt]),
);

export const PROOF_ASSISTANT_PROMPT = `You are a Formal Proof Assistant.
When given a theorem statement:
1. Decompose it into necessary definitions and lemmas.
2. Outline the overall strategy (Induction, Contradiction, Direct, etc.).
3. Provide step-by-step reasoning.
4. For each step, indicate if it is symbolically verifiable (via SymPy/Z3) or requires higher-level mathematical intuition.`;

/**
 * Return the domain system prompt for the given domain key.
 * Falls back to an empty string if the domain is not registered.
 */
export function getDomainPrompt(domain: string): string {
  return DOMAIN_SYSTEM_PROMPTS[domain] ?? '';
}
