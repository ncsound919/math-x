import type { ModelProvider } from './types';

/**
 * Mode → preferred provider mapping.
 * Formula and Deep Solve benefit from Qwen2.5-Math's specialized training.
 * Scientist, Hypothesis, and Synergy benefit from DeepSeek-R1's chain-of-thought reasoning.
 * Everything else falls through to Claude.
 */
const QWEN_MODES  = new Set(['formula', 'deep-solve']);
const OLLAMA_MODES = new Set(['scientist', 'hypothesis', 'synergy']);

/**
 * Select the optimal model provider for a given mode.
 *
 * @param mode            - The active Math X mode (e.g. 'formula', 'scientist')
 * @param ollamaAvailable - Whether the Ollama service is reachable (default: check env)
 * @returns               The chosen provider key
 *
 * @example
 * selectProvider('formula', true)   // → 'qwen'
 * selectProvider('scientist', true) // → 'ollama'
 * selectProvider('scientist', false)// → 'claude'
 * selectProvider('synergy', false)  // → 'claude'
 */
export function selectProvider(
  mode: string,
  ollamaAvailable?: boolean,
): ModelProvider {
  // Allow callers to skip the env check by passing availability directly
  const hasOllama =
    ollamaAvailable !== undefined
      ? ollamaAvailable
      : Boolean(
          typeof process !== 'undefined' &&
            (process.env.OLLAMA_BASE_URL || process.env.QWEN_BASE_URL),
        );

  if (QWEN_MODES.has(mode) && hasOllama)   return 'qwen';
  if (OLLAMA_MODES.has(mode) && hasOllama) return 'ollama';
  return 'claude';
}

/**
 * Probe an Ollama-compatible endpoint and return whether it is healthy.
 * Times out after `timeoutMs` (default 2 000 ms).
 */
export async function checkOllamaHealth(
  baseURL = 'http://localhost:11434',
  timeoutMs = 2000,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${baseURL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Per-mode token budget. Deep Solve and Formula Lab need extra breathing room.
 * All other modes default to 4 000 tokens.
 */
export const MODE_MAX_TOKENS: Record<string, number> = {
  'deep-solve':  8000,
  'formula':     6000,
  'hypothesis':  6000,
  'scientist':   4000,
  'synergy':     4000,
  'probability': 4000,
  'file-intel':  4000,
};

export function maxTokensForMode(mode: string, fallback = 4000): number {
  return MODE_MAX_TOKENS[mode] ?? fallback;
}
