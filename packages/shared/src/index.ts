// @mathx/shared — shared types, constants, and utilities
// Re-export from @mathx/math-core for types, add app-agnostic constants here.

export * from '@mathx/math-core';

export const API_VERSION = '0.4.0';

export const SUPPORTED_MODES = [
  'scientist',
  'formula',
  'hypothesis',
  'deep-solve',
  'synergy',
  'probability',
  'file-intel',
] as const;

export const SUPPORTED_PROVIDERS = ['claude', 'ollama', 'qwen', 'auto'] as const;
