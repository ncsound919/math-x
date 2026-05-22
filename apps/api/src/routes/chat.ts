import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { MATHX_SYSTEM, MODE_PREFIXES } from '../services/prompts';
import { selectProvider, routeModelStream, type Message } from '../services/modelRouter';

const router = Router();

/** Per-mode token budget. Deep Solve and Formula Lab need room to breathe. */
const MODE_MAX_TOKENS: Record<string, number> = {
  'deep-solve':  8000,
  'formula':     6000,
  'hypothesis':  6000,
  'scientist':   4000,
  'synergy':     4000,
  'probability': 4000,
  'file-intel':  4000,
};

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.string(),
    z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      source: z.any().optional(),
    }))
  ]),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  mode: z.string().default('scientist'),
  domain: z.string().optional(),
  provider: z.enum(['claude', 'ollama', 'qwen', 'auto']).default('auto'),
  retrieved: z.array(z.object({
    source: z.string(),
    text: z.string(),
    score: z.number(),
  })).optional(),
  execution: z.object({
    stdout: z.string().optional(),
    error: z.string().optional(),
    chart: z.any().optional(),
    table: z.any().optional(),
  }).optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = ChatRequestSchema.parse(req.body);
    const { messages, mode, domain, provider: providerPref, retrieved, execution } = body;

    let contextBlock = '';
    if (retrieved && retrieved.length > 0) {
      contextBlock = `\n\n## Retrieved Context (local vector search)\n${retrieved.map(r =>
        `Source: ${r.source} (score: ${r.score.toFixed(3)})\n${r.text}`
      ).join('\n---\n')}`;
    }

    let executionBlock = '';
    if (execution?.stdout) executionBlock = `\n\n## Local Computation Result\n\`\`\`\n${execution.stdout}\n\`\`\``;
    if (execution?.error) executionBlock += `\n\nComputation error: ${execution.error}`;

    const prefixKey = domain && MODE_PREFIXES[domain] ? domain : mode;
    const prefix = MODE_PREFIXES[prefixKey] || MODE_PREFIXES.scientist;

    const processedMessages: Message[] = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user') {
        const content = typeof m.content === 'string'
          ? `${prefix}${m.content}${contextBlock}${executionBlock}`
          : m.content;
        return { ...m, content };
      }
      return m;
    });

    const provider = providerPref === 'auto' ? selectProvider(mode) : providerPref;
    const maxTokens = MODE_MAX_TOKENS[mode] ?? parseInt(process.env.MAX_TOKENS || '4000', 10);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-Model-Provider', provider);
    res.flushHeaders();

    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    await routeModelStream(
      { messages: processedMessages, system: MATHX_SYSTEM, maxTokens, mode },
      provider,
      (text) => res.write(`data: ${JSON.stringify({ delta: text })}\n\n`),
      (usage) => { res.write(`data: ${JSON.stringify({ done: true, usage, provider })}\n\n`); res.end(); },
      (err) => { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); },
      abortController.signal,
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Chat route error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

export { router as chatRouter };
