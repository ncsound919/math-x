/**
 * @mathx/shared — app-agnostic constants and utilities.
 *
 * Re-exports all types from @mathx/math-core so consumers only need one import.
 * Add constants and helpers here that are needed by both apps/api and apps/web
 * but don't belong in the domain-specific math-core package.
 */
export * from '@mathx/math-core'

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------
export const API_VERSION = '0.5.0'

// ---------------------------------------------------------------------------
// Mode registry — single source of truth for valid mode strings
// ---------------------------------------------------------------------------
export const SUPPORTED_MODES = [
  'scientist',
  'formula',
  'hypothesis',
  'deep-solve',
  'synergy',
  'probability',
  'file-intel',
] as const

export type SupportedMode = typeof SUPPORTED_MODES[number]

export function isSupportedMode(value: string): value is SupportedMode {
  return (SUPPORTED_MODES as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------
export const SUPPORTED_PROVIDERS = ['claude', 'ollama', 'qwen', 'auto'] as const
export type SupportedProvider = typeof SUPPORTED_PROVIDERS[number]

export function isSupportedProvider(value: string): value is SupportedProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Rate limit constants — shared so API and any future gateway agree
// ---------------------------------------------------------------------------
export const RATE_LIMITS = {
  chat:       { windowMs: 60_000, max: 30  },
  verify:     { windowMs: 60_000, max: 15  },
  ocr:        { windowMs: 60_000, max: 10  },
  literature: { windowMs: 60_000, max: 20  },
  general:    { windowMs: 60_000, max: 100 },
} as const

// ---------------------------------------------------------------------------
// File type helpers — shared between OCR route and web file handling
// ---------------------------------------------------------------------------
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number]

export function isSupportedImageType(value: string): value is SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(value)
}

export const SUPPORTED_BIO_EXTENSIONS = [
  '.fasta', '.fa', '.fna', '.faa',
  '.fastq', '.fq',
  '.vcf',
  '.pdb', '.ent',
  '.bed',
  '.gff', '.gff3', '.gtf',
  '.sam',
] as const
