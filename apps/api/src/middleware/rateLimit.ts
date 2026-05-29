import rateLimit from 'express-rate-limit'
import type { Request, Response } from 'express'

/**
 * Standard error response for rate limit violations
 */
const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please wait before sending more requests.',
    retryAfter: 60,
  })
}

/**
 * Chat endpoint limiter: 30 requests/min per IP
 * Applied to /api/chat which proxies expensive LLM calls
 */
export const chatLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Chat rate limit exceeded',
})

/**
 * Verify endpoint limiter: 15 requests/min per IP
 * Applied to /api/verify which runs SymPy via Claude then local WASM
 */
export const verifyLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Verify rate limit exceeded',
})

/**
 * OCR endpoint limiter: 10 requests/min per IP
 * Image processing is compute-heavy
 */
export const ocrLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'OCR rate limit exceeded',
})

/**
 * Literature endpoint limiter: 20 requests/min per IP
 * PubMed/arXiv lookups are network-bound
 */
export const literatureLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Literature search rate limit exceeded',
})

/**
 * General API limiter: 100 requests/min per IP
 * Broad fallback for all other routes
 */
export const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})
