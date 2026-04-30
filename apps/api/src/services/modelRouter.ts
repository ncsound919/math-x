import Anthropic from '@anthropic-ai/sdk';

export type ModelProvider = 'claude' | 'ollama' | 'qwen';

export interface RouterRequest {
  messages: any[];
  system: string;
  maxTokens?: number;
  mode?: string;
}

// Heuristic: route symbolic/formula modes to Qwen, heavy reasoning to DeepSeek, default to Claude
export function selectProvider(mode: string): ModelProvider {
  const ollamaEnabled = !!process.env.OLLAMA_BASE_URL;
  const qwenEnabled = !!process.env.QWEN_BASE_URL;

  if ((mode === 'formula' || mode === 'deep-solve') && qwenEnabled) return 'qwen';
  if ((mode === 'scientist' || mode === 'hypothesis' || mode === 'synergy') && ollamaEnabled) return 'ollama';
  return 'claude';
}

async function streamOllamaCompatible(
  baseURL: string,
  model: string,
  req: RouterRequest,
  onText: (t: string) => void,
  onDone: (usage: any) => void,
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { onDone({ input_tokens: 0, output_tokens: 0 }); return; }
        try {
          const parsed = JSON.parse(raw);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) onText(delta);
        } catch { /* skip malformed */ }
      }
    }
    onDone({ input_tokens: 0, output_tokens: 0 });
  } catch (err: any) {
    onError(err);
  }
}

export async function routeModelStream(
  req: RouterRequest,
  provider: ModelProvider,
  onText: (t: string) => void,
  onDone: (usage: any) => void,
  onError: (e: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  if (provider === 'claude') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = client.messages.stream({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: req.maxTokens ?? 4000,
      system: req.system,
      messages: req.messages,
    });
    stream.on('text', onText);
    stream.on('finalMessage', (msg: any) => onDone(msg.usage));
    stream.on('error', onError);
    if (signal) signal.addEventListener('abort', () => stream.abort());
    return;
  }

  if (provider === 'ollama') {
    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'deepseek-r1:8b';
    await streamOllamaCompatible(baseURL, model, req, onText, onDone, onError, signal);
    return;
  }

  if (provider === 'qwen') {
    const baseURL = process.env.QWEN_BASE_URL || 'http://localhost:11434';
    const model = process.env.QWEN_MODEL || 'qwen2.5-math:7b';
    await streamOllamaCompatible(baseURL, model, req, onText, onDone, onError, signal);
    return;
  }
}
