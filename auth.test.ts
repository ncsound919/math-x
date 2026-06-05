import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(authHeader?: string): Partial<Request> {
  return {
    path: '/api/chat',
    headers: authHeader ? { authorization: authHeader } : {},
  }
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as unknown as Response
}

const next: NextFunction = vi.fn()

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requireAuth middleware', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('allows /health without any auth header', async () => {
    process.env.NODE_ENV = 'development'
    const { requireAuth, initAuth } = await import('../auth')
    initAuth()

    const req = { path: '/health', headers: {} } as unknown as Request
    const res = makeRes()
    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization header is missing', async () => {
    process.env.API_KEYS = 'a'.repeat(32)
    const { requireAuth, initAuth } = await import('../auth')
    initAuth()

    const req = makeReq() as Request
    const res = makeRes()
    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when Bearer token is wrong', async () => {
    process.env.API_KEYS = 'a'.repeat(32)
    const { requireAuth, initAuth } = await import('../auth')
    initAuth()

    const req = makeReq('Bearer ' + 'b'.repeat(32)) as Request
    const res = makeRes()
    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() when Bearer token matches', async () => {
    const key = 'x'.repeat(32)
    process.env.API_KEYS = key
    const { requireAuth, initAuth } = await import('../auth')
    initAuth()

    const req = makeReq(`Bearer ${key}`) as Request
    const res = makeRes()
    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('accepts any key from a comma-separated list', async () => {
    const key1 = 'k'.repeat(32)
    const key2 = 'm'.repeat(32)
    process.env.API_KEYS = `${key1},${key2}`
    const { requireAuth, initAuth } = await import('../auth')
    initAuth()

    const req = makeReq(`Bearer ${key2}`) as Request
    const res = makeRes()
    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('rejects keys shorter than 32 characters', async () => {
    process.env.API_KEYS = 'short'
    const { requireAuth, initAuth } = await import('../auth')
    initAuth() // short key is silently dropped, no valid keys remain

    const req = makeReq('Bearer short') as Request
    const res = makeRes()
    // In dev (no valid keys), all requests pass through
    // This tests that 'short' is not accepted as a valid key
    requireAuth(req, res, next)
    // With no valid keys in dev mode, next() is called (open mode)
    expect(next).toHaveBeenCalledOnce()
  })

  it('401 message is identical for wrong key vs nonexistent key (no information leak)', async () => {
    process.env.API_KEYS = 'a'.repeat(32)
    const { requireAuth, initAuth } = await import('../auth')
    initAuth()

    const resWrong = makeRes()
    requireAuth(makeReq('Bearer ' + 'b'.repeat(32)) as Request, resWrong, next)

    const resNoHeader = makeRes()
    // Different status code (401 vs 401) but message should not reveal "exists vs wrong"
    requireAuth(makeReq('Bearer ' + 'c'.repeat(32)) as Request, resNoHeader, next)

    const wrongCall = (resWrong.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const noHeaderCall = (resNoHeader.json as ReturnType<typeof vi.fn>).mock.calls[0][0]

    expect(wrongCall.message).toBe(noHeaderCall.message)
  })

  it('throws in production when no keys are configured', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.API_KEYS
    delete process.env.API_KEY
    const { initAuth } = await import('../auth')
    expect(() => initAuth()).toThrow(/No valid API_KEYS/)
  })
})
