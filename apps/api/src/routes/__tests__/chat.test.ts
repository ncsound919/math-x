import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'

// Mock the modelRouter to avoid real API calls
vi.mock('../../services/modelRouter', () => ({
  checkOllamaHealth: vi.fn().mockResolvedValue(false),
  routeModelStream: vi.fn(),
  selectProvider: vi.fn().mockReturnValue('claude'),
}))

const { default: app } = await import('../../index')

describe('POST /api/chat', () => {
  it('returns 400 when messages array is missing', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ mode: 'formula' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when messages is empty array', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ messages: [], mode: 'formula' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid mode', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        messages: [{ role: 'user', content: 'hello' }],
        mode: 'invalid-mode-xyz',
      })
    expect(res.status).toBe(400)
  })

  it('accepts valid chat payload and begins streaming', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        messages: [{ role: 'user', content: 'Solve x^2 = 4' }],
        mode: 'formula',
        domain: 'algebra',
      })
      .timeout(3000)
    // Even if upstream streaming fails in test, it should not be 400
    expect(res.status).not.toBe(400)
  })
})

describe('GET /api/chat (method not allowed)', () => {
  it('returns 404 for GET on /api/chat', async () => {
    const res = await request(app).get('/api/chat')
    expect(res.status).toBe(404)
  })
})
