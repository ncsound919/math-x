/**
 * modelRouter.test.ts
 *
 * FIX: Previous tests mocked selectProvider with the math-core signature
 * (mode, ollamaAvailable?) but the API's selectProvider only takes (mode)
 * and reads env vars directly. Tests now cover the actual API implementation.
 *
 * When the math-core migration is complete and apps/api imports from
 * @mathx/math-core, these tests can be collapsed into the shared package tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('selectProvider — API implementation (env-driven)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    mockFetch.mockReset()
  })

  it('routes formula mode to qwen when QWEN_BASE_URL is set', async () => {
    process.env.QWEN_BASE_URL = 'http://localhost:11434'
    const { selectProvider } = await import('../modelRouter')
    expect(selectProvider('formula')).toBe('qwen')
  })

  it('routes deep-solve mode to qwen when QWEN_BASE_URL is set', async () => {
    process.env.QWEN_BASE_URL = 'http://localhost:11434'
    const { selectProvider } = await import('../modelRouter')
    expect(selectProvider('deep-solve')).toBe('qwen')
  })

  it('routes scientist mode to ollama when OLLAMA_BASE_URL is set', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    delete process.env.QWEN_BASE_URL
    const { selectProvider } = await import('../modelRouter')
    expect(selectProvider('scientist')).toBe('ollama')
  })

  it('falls back to claude when OLLAMA_BASE_URL is not set', async () => {
    delete process.env.OLLAMA_BASE_URL
    delete process.env.QWEN_BASE_URL
    const { selectProvider } = await import('../modelRouter')
    expect(selectProvider('scientist')).toBe('claude')
  })

  it('falls back to claude for unknown mode even with ollama configured', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    const { selectProvider } = await import('../modelRouter')
    expect(selectProvider('unknown-mode')).toBe('claude')
  })

  it('falls back to claude for formula mode when QWEN_BASE_URL is not set', async () => {
    delete process.env.QWEN_BASE_URL
    delete process.env.OLLAMA_BASE_URL
    const { selectProvider } = await import('../modelRouter')
    expect(selectProvider('formula')).toBe('claude')
  })
})

describe('checkOllamaHealth', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
  })

  it('returns true when Ollama responds ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    const { checkOllamaHealth } = await import('../modelRouter')
    const result = await checkOllamaHealth('http://localhost:11434')
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('returns false when Ollama responds with non-ok status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const { checkOllamaHealth } = await import('../modelRouter')
    expect(await checkOllamaHealth('http://localhost:11434')).toBe(false)
  })

  it('returns false when fetch throws (Ollama unreachable)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const { checkOllamaHealth } = await import('../modelRouter')
    expect(await checkOllamaHealth('http://localhost:11434')).toBe(false)
  })

  it('uses the baseURL parameter, not a hardcoded default', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    const { checkOllamaHealth } = await import('../modelRouter')
    await checkOllamaHealth('http://custom-host:9999')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://custom-host:9999/api/tags',
      expect.anything(),
    )
  })
})
