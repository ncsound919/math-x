/**
 * Structured logger for Math X API.
 *
 * Uses pino in production (JSON, low overhead).
 * Falls back to a console wrapper in development if pino is not installed.
 *
 * Usage:
 *   import { logger } from '../lib/logger'
 *   logger.info({ provider: 'claude', mode: 'formula' }, 'Chat request started')
 *   logger.error({ err, route: '/api/verify' }, 'Route error')
 */
import type { Request, Response, NextFunction } from 'express'

interface LogFn {
  (obj: Record<string, unknown>, msg: string): void
  (msg: string): void
}

export interface Logger {
  info:  LogFn
  warn:  LogFn
  error: LogFn
  debug: LogFn
  child: (bindings: Record<string, unknown>) => Logger
}

// ---------------------------------------------------------------------------
// Pino (production)
// ---------------------------------------------------------------------------
function tryLoadPino(): Logger | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pino = require('pino')
    return pino({
      level: process.env.LOG_LEVEL ?? 'info',
      redact: {
        paths: ['req.headers.authorization', 'ANTHROPIC_API_KEY', 'API_KEYS', 'API_KEY'],
        censor: '[REDACTED]',
      },
      transport:
        process.env.NODE_ENV !== 'production' && process.env.LOG_PRETTY === '1'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    })
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Console fallback
// ---------------------------------------------------------------------------
function makeConsoleLogger(prefix = ''): Logger {
  const tag = prefix ? `[${prefix}] ` : ''
  const fmt = (obj: Record<string, unknown> | string, msg?: string) =>
    typeof obj === 'string'
      ? `${tag}${obj}`
      : `${tag}${msg ?? ''} ${Object.keys(obj).length ? JSON.stringify(obj) : ''}`.trimEnd()

  const self: Logger = {
    // eslint-disable-next-line no-console
    info:  (obj: any, msg?: any) => console.log(fmt(obj, msg)),
    // eslint-disable-next-line no-console
    warn:  (obj: any, msg?: any) => console.warn(fmt(obj, msg)),
    // eslint-disable-next-line no-console
    error: (obj: any, msg?: any) => console.error(fmt(obj, msg)),
    debug: (obj: any, msg?: any) => {
      if (process.env.LOG_LEVEL === 'debug') {
        // eslint-disable-next-line no-console
        console.debug(fmt(obj, msg))
      }
    },
    child: (bindings: Record<string, unknown>) =>
      makeConsoleLogger(Object.values(bindings).join(':')),
  }
  return self
}

export const logger: Logger = tryLoadPino() ?? makeConsoleLogger()

// ---------------------------------------------------------------------------
// Request logger middleware
// ---------------------------------------------------------------------------
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health') { next(); return }

  const start = Date.now()
  const reqLog = logger.child({ reqId: Math.random().toString(36).slice(2, 8) })

  reqLog.info({ method: req.method, url: req.url }, 'request')

  res.on('finish', () => {
    const ms = Date.now() - start
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    reqLog[level]({ method: req.method, url: req.url, status: res.statusCode, ms }, 'response')
  })

  next()
}
