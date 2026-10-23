// AI SDK-powered chat route (Vercel AI SDK).
// Drop-in alternative to /api/chat: same SSE contract ({delta}, {done}, {error}).
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { MATHX_SYSTEM, MODE_PREFIXES } from '../services/prompts';
import { selectProvider } from '../services/modelRouter';

const router = Router();

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([z.string(), z.array(z.any())]),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  mode: z.string().default('scientist').refine(
    (m) => Object.prototype.hasOwnProperty.call(MODE_PREFIXES, m) ||
            ['scientist','formula','hypothesis','solve','synergy','probability','files','domain','deep-solve','file-intel'].includes(m),
    { message: 'Invalid mode' },
  ),
  domain: z.string().optional(),
  provider: z.enum(['claude', 'ollama', 'qwen', 'auto']).default('auto'),
  retrieved: z.array(z.object({ source: z.string(), text: z.string(), score: z.number() })).optional(),
});

const ollamaProvider = createOpenAICompatible({
  name: 'ollama',
  baseURL: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/v1`,
});

const qwenProvider = createOpenAICompatible({
  name: 'qwen',
  baseURL: `${process.env.QWEN_BASE_URL || 'http://localhost:11434'}/v1`,
});

function getModel(provider: string) {
  if (provider === 'ollama') return ollamaProvider(process.env.OLLAMA_MODEL || 'deepseek-r1:8b') as any;
  if (provider === 'qwen') return qwenProvider(process.env.QWEN_MODEL || 'qwen2.5-math:7b') as any;
  return anthropic(process.env.MODEL || 'claude-sonnet-4-20250514') as any;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = ChatRequestSchema.parse(req.body);
    const { messages, mode, domain, provider: providerPref, retrieved } = body;

    const prefixKey = domain && MODE_PREFIXES[domain] ? domain : mode;
    const prefix = MODE_PREFIXES[prefixKey] || MODE_PREFIXES.scientist;

    const processed = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user') {
        const base = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        let ctx = '';
        if (retrieved && retrieved.length) {
          ctx = `\n\n## Retrieved Context\n${retrieved.map(r => `Source: ${r.source} (score ${r.score.toFixed(3)})\n${r.text}`).join('\n---\n')}`;
        }
        return { role: 'user' as const, content: `${prefix}${base}${ctx}` };
      }
      return { role: m.role as 'user' | 'assistant', content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
    });

    const provider = providerPref === 'auto' ? selectProvider(mode) : providerPref;
    const maxTokens = parseInt(process.env.MAX_TOKENS || '4000', 10);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-Model-Provider', provider);
    res.flushHeaders();

    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    const result = streamText({
      model: getModel(provider),
      system: MATHX_SYSTEM,
      messages: processed,
      maxOutputTokens: maxTokens,
    });

    for await (const delta of result.textStream) {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }

    const finalUsage = await result.usage;
    res.write(`data: ${JSON.stringify({ done: true, usage: finalUsage, provider })}\n\n`);
    res.end();
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      if (!res.headersSent) return res.status(400).json({ error: 'Invalid request', details: err.errors });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Chat-AI route error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

export { router as chatAiRouter };