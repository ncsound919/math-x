/** Core message type shared across the monorepo. */
export interface MathXMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; source?: unknown }>;
}

/** Model provider keys. */
export type ModelProvider = 'claude' | 'ollama' | 'qwen';

/** Token usage statistics returned by any provider. */
export interface UsageStats {
  input_tokens: number;
  output_tokens: number;
}

/** Supported export formats. */
export type ExportFormat = 'markdown' | 'latex' | 'jupyter' | 'plain';

/** Math X interaction modes. */
export type MathXMode =
  | 'scientist'
  | 'formula'
  | 'hypothesis'
  | 'deep-solve'
  | 'synergy'
  | 'probability'
  | 'file-intel';
