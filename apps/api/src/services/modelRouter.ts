import Anthropic from '@anthropic-ai/sdk';

export type ModelProvider = 'claude' | 'ollama' | 'qwen';

export interface Message {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; source?: unknown }>;
}

export interface RouterRequest {
  messages: Message[];
  system: string;
  maxTokens?: number;
  mode?: string;
}

export interface UsageStats {
  input_tokens: number;
  output_tokens: number;
}

// Heuristic: route symbolic/formula modes to Qwen, heavy reasoning to DeepSeek, default to Claude
export function selectProvider(mode: string): ModelProvider {
  const ollamaEnabled = !!process.env.OLLAMA_BASE_URL;
  const qwenEnabled = !!process.env.QWEN_BASE_URL;

  if ((mode === 'formula' || mode === 'deep-solve') && qwenEnabled) return 'qwen';
  if ((mode === 'scientist' || mode === 'hypothesis' || mode === 'synergy') && ollamaEnabled) return 'ollama';
  return 'claude';
}

/**
 * Probes the Ollama-compatible endpoint with a lightweight HEAD/GET call.
 * Returns true if the service responds within 2 seconds, false otherwise.
 */
export async function checkOllamaHealth(baseURL: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${baseURL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
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
  });

  try {
    const res = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal,
    });

    if (!res.ok || !res.body) {
      onError(new Error(`Upstream ${baseURL} returned ${res.status}`));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') {
          onDone({ input_tokens: inputTokens, output_tokens: outputTokens });
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            onText(delta);
            outputTokens += delta.split(/\s+/).length; // rough approximation until Ollama exposes usage
          }
          // Ollama does emit usage in the final chunk when stream_options.include_usage is true
          if (parsed.usage) {
            inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
            outputTokens = parsed.usage.completion_tokens ?? outputTokens;
          }
        } catch { /* skip malformed */ }
      }
    }
    onDone({ input_tokens: inputTokens, output_tokens: outputTokens });
  } catch (err: unknown) {
    onError(err instanceof Error ? err : new Error(String(err)));
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
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = client.messages.stream({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: req.maxTokens ?? 4000,
      system: req.system,
      messages: req.messages as Anthropic.MessageParam[],
    });
    stream.on('text', onText);
    stream.on('finalMessage', (msg) => onDone(msg.usage));
    stream.on('error', onError);
    if (signal) signal.addEventListener('abort', () => stream.abort());
    return;
  }

  if (provider === 'ollama') {
    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'deepseek-r1:8b';

    const healthy = await checkOllamaHealth(baseURL);
    if (!healthy) {
      console.warn(`[modelRouter] Ollama at ${baseURL} is unreachable — falling back to Claude.`);
      return routeModelStream(req, 'claude', onText, onDone, onError, signal);
    }

    await streamOllamaCompatible(baseURL, model, req, onText, onDone, onError, signal);
    return;
  }

  if (provider === 'qwen') {
    const baseURL = process.env.QWEN_BASE_URL || 'http://localhost:11434';
    const model = process.env.QWEN_MODEL || 'qwen2.5-math:7b';

    const healthy = await checkOllamaHealth(baseURL);
    if (!healthy) {
      console.warn(`[modelRouter] Qwen at ${baseURL} is unreachable — falling back to Claude.`);
      return routeModelStream(req, 'claude', onText, onDone, onError, signal);
    }

    await streamOllamaCompatible(baseURL, model, req, onText, onDone, onError, signal);
    return;
  }
}
