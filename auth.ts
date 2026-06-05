/**
 * API key authentication middleware.
 *
 * Design decisions:
 * - Keys are validated using timingSafeEqual to prevent timing attacks
 * - Multiple keys supported via comma-separated API_KEYS env var (allows rotation)
 * - Health endpoint is explicitly excluded (monitoring must work without auth)
 * - All other /api/* routes require a valid Bearer token
 * - 401 responses never reveal whether a key exists vs. is invalid
 */
import type { Request, Response, NextFunction } from 'express'
import { timingSafeEqual, createHash } from 'crypto'

// ---------------------------------------------------------------------------
// Key loading
// ---------------------------------------------------------------------------

/**
 * Parse and normalize API keys from environment.
 * Keys are hashed so we never hold raw secrets in memory longer than boot.
 */
function loadKeyHashes(): Buffer[] {
  const raw = process.env.API_KEYS ?? process.env.API_KEY ?? ''
  if (!raw.trim()) return []

  return raw
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length >= 32) // Enforce minimum key entropy
    .map(k => createHash('sha256').update(k).digest())
}

let keyHashes: Buffer[] = []

/**
 * Call once at server boot, after dotenv.config().
 * Throws if no valid keys are configured in production.
 * Warns if ANTHROPIC_API_KEY is absent when no local models are configured.
 */
export function initAuth(): void {
  keyHashes = loadKeyHashes()

  if (keyHashes.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'AUTH: No valid API_KEYS configured. ' +
        'Set API_KEYS env var to a comma-separated list of secrets (min 32 chars each).'
      )
    } else {
      console.warn(
        '[auth] WARNING: No API_KEYS configured. ' +
        'All /api routes are unprotected. Set API_KEYS before deploying.'
      )
    }
  } else {
    console.log(`[auth] Loaded ${keyHashes.length} API key(s).`)
  }

  // Validate ANTHROPIC_API_KEY unless running fully local
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim())
  const hasOllamaConfig  = Boolean(process.env.OLLAMA_BASE_URL?.trim())
  const hasQwenConfig    = Boolean(process.env.QWEN_BASE_URL?.trim())

  if (!hasAnthropicKey) {
    if (!hasOllamaConfig && !hasQwenConfig) {
      // No AI provider at all — fatal in production
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'AUTH: ANTHROPIC_API_KEY is not set and no local model (OLLAMA_BASE_URL / ' +
          'QWEN_BASE_URL) is configured. At least one AI provider must be available.'
        )
      } else {
        console.warn(
          '[auth] WARNING: ANTHROPIC_API_KEY is not set and no local model is configured. ' +
          'Chat and most routes will fail. Set ANTHROPIC_API_KEY or configure Ollama/Qwen.'
        )
      }
    } else {
      // Local models available — cloud features will degrade gracefully
      console.warn(
        '[auth] NOTE: ANTHROPIC_API_KEY is not set. ' +
        'Routes that require Claude (OCR, export, domain) will fail. ' +
        'Local model routes (chat via Ollama/Qwen) will work.'
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token.length > 0 ? token : null
}

function isValidKey(token: string): boolean {
  if (keyHashes.length === 0) {
    // No keys configured → open in dev, initAuth() would have thrown in prod
    return true
  }

  const tokenHash = createHash('sha256').update(token).digest()

  // timingSafeEqual requires same-length buffers; sha256 output is always 32 bytes
  for (const stored of keyHashes) {
    if (timingSafeEqual(tokenHash, stored)) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

const UNAUTHENTICATED_ROUTES = new Set(['/health'])

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Always allow health checks — monitoring infrastructure needs this
  if (UNAUTHENTICATED_ROUTES.has(req.path)) {
    next()
    return
  }

  const token = extractBearerToken(req)

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header. Expected: Authorization: Bearer <key>',
    })
    return
  }

  if (!isValidKey(token)) {
    // Deliberate: same message whether key is wrong or doesn't exist
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key.',
    })
    return
  }

  next()
}

/**
 * Expose key count for the /api/models health endpoint,
 * without exposing the keys themselves.
 */
export function authStatus(): { configured: boolean; keyCount: number } {
  return {
    configured: keyHashes.length > 0,
    keyCount: keyHashes.length,
  }
}
