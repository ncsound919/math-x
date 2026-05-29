import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for Ollama health checks
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// We import after stubbing globals
const { selectProvider, checkOllamaHealth } = await import('../modelRouter')

describe('selectProvider', () => {
  it('routes formula mode to qwen when ollama available', () => {
    expect(selectProvider('formula', true)).toBe('qwen')
  })

  it('routes deep-solve mode to qwen when ollama available', () => {
    expect(selectProvider('deep-solve', true)).toBe('qwen')
  })

  it('routes scientist mode to ollama when available', () => {
    expect(selectProvider('scientist', true)).toBe('ollama')
  })

  it('routes hypothesis mode to ollama when available', () => {
    expect(selectProvider('hypothesis', true)).toBe('ollama')
  })

  it('falls back to claude when ollama unavailable for scientist mode', () => {
    expect(selectProvider('scientist', false)).toBe('claude')
  })

  it('falls back to claude when ollama unavailable for hypothesis mode', () => {
    expect(selectProvider('hypothesis', false)).toBe('claude')
  })

  it('defaults to claude for unknown mode', () => {
    expect(selectProvider('unknown', true)).toBe('claude')
  })

  it('defaults to claude for chat mode', () => {
    expect(selectProvider('chat', false)).toBe('claude')
  })
})

describe('checkOllamaHealth', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns true when Ollama responds with ok status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    const result = await checkOllamaHealth()
    expect(result).toBe(true)
  })

  it('returns false when Ollama responds with error status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const result = await checkOllamaHealth()
    expect(result).toBe(false)
  })

  it('returns false when fetch throws (Ollama unreachable)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const result = await checkOllamaHealth()
    expect(result).toBe(false)
  })
})
