/**
 * @deprecated
 * This file is a thin re-export from @mathx/math-core.
 * It exists only to avoid breaking any imports that haven't been updated yet.
 * The API-specific streaming logic (routeModelStream, streamOllamaCompatible)
 * stays here since it depends on @anthropic-ai/sdk and belongs in the API layer.
 *
 * DO NOT add new logic here. Add to packages/math-core/src/modelRouter.ts instead.
 */

// Re-export shared types and pure logic from math-core
export type { ModelProvider, MathXMessage as Message, UsageStats } from '@mathx/math-core'
export { selectProvider, checkOllamaHealth, maxTokensForMode, MODE_MAX_TOKENS } from '@mathx/math-core'

// API-only types (streaming infrastructure)
import type { ModelProvider, UsageStats } from '@mathx/math-core'
import { checkOllamaHealth } from '@mathx/math-core'
import Anthropic from '@anthropic-ai/sdk'

export interface RouterRequest {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string | Array<{ type: string; text?: string; source?: unknown }>
  }>
  system: string
  maxTokens?: number
  mode?: string
}

async function streamOllamaCompatible(
  baseURL: string,
  model: string,
  req: RouterRequest,
  onText: (t: string) => void,
  onDone: (usage: UsageStats) => void,
  onError: (e: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  const body = JSON.stringify({
    model,
    stream: true,
    messages: [
      { role: 'system', content: req.system },
      ...req.messages,
    ],
    max_tokens: req.maxTokens ?? 4000,
  })

  try {
    const res = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal,
    })

    if (!res.ok || !res.body) {
      onError(new Error(`Upstream ${baseURL} returned ${res.status}`))
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let inputTokens = 0
    let outputTokens = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') {
          onDone({ input_tokens: inputTokens, output_tokens: outputTokens })
          return
        }
        try {
          const parsed = JSON.parse(raw)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            onText(delta)
            outputTokens += delta.split(/\s+/).length
          }
          if (parsed.usage) {
            inputTokens = parsed.usage.prompt_tokens ?? inputTokens
            outputTokens = parsed.usage.completion_tokens ?? outputTokens
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
    onDone({ input_tokens: inputTokens, output_tokens: outputTokens })
  } catch (err: unknown) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}

export async function routeModelStream(
  req: RouterRequest,
  provider: ModelProvider,
  onText: (t: string) => void,
  onDone: (usage: UsageStats) => void,
  onError: (e: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  if (provider === 'claude') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const stream = client.messages.stream({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: req.maxTokens ?? 4000,
      system: req.system,
      messages: req.messages as Anthropic.MessageParam[],
    })
    stream.on('text', onText)
    stream.on('finalMessage', (msg) => onDone(msg.usage))
    stream.on('error', onError)
    if (signal) signal.addEventListener('abort', () => stream.abort())
    return
  }

  if (provider === 'ollama') {
    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const model = process.env.OLLAMA_MODEL || 'deepseek-r1:8b'
    const healthy = await checkOllamaHealth(baseURL)
    if (!healthy) {
      logger.warn({ provider: 'ollama' }, ` Ollama at ${baseURL} unreachable — falling back to Claude.`)
      return routeModelStream(req, 'claude', onText, onDone, onError, signal)
    }
    await streamOllamaCompatible(baseURL, model, req, onText, onDone, onError, signal)
    return
  }

  if (provider === 'qwen') {
    const baseURL = process.env.QWEN_BASE_URL || 'http://localhost:11434'
    const model = process.env.QWEN_MODEL || 'qwen2.5-math:7b'
    const healthy = await checkOllamaHealth(baseURL)
    if (!healthy) {
      logger.warn({ provider: 'ollama' }, ` Qwen at ${baseURL} unreachable — falling back to Claude.`)
      return routeModelStream(req, 'claude', onText, onDone, onError, signal)
    }
    await streamOllamaCompatible(baseURL, model, req, onText, onDone, onError, signal)
    return
  }
}
