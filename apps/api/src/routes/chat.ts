import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { MATHX_SYSTEM, MODE_PREFIXES } from '../services/prompts';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    const { messages, mode, domain, retrieved, execution } = body;

    // Build context injection from local retrieval results
    let contextBlock = '';
    if (retrieved && retrieved.length > 0) {
      contextBlock = `\n\n## Retrieved Context (local vector search)\n${retrieved.map(r => `Source: ${r.source} (score: ${r.score.toFixed(3)})\n${r.text}`).join('\n---\n')}`;
    }

    // Inject execution results if present
    let executionBlock = '';
    if (execution?.stdout) {
      executionBlock = `\n\n## Local Computation Result\n\`\`\`\n${execution.stdout}\n\`\`\``;
    }
    if (execution?.error) {
      executionBlock += `\n\nComputation error: ${execution.error}`;
    }

    // Resolve mode prefix — domain specialist overrides mode if domain is set
    const prefixKey = domain && MODE_PREFIXES[domain] ? domain : mode;
    const prefix = MODE_PREFIXES[prefixKey] || MODE_PREFIXES.scientist;

    const processedMessages = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user') {
        const content = typeof m.content === 'string'
          ? `${prefix}${m.content}${contextBlock}${executionBlock}`
          : m.content;
        return { ...m, content };
      }
      return m;
    });

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const stream = client.messages.stream({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: parseInt(process.env.MAX_TOKENS || '4000'),
      system: MATHX_SYSTEM,
      messages: processedMessages as any,
    });

    stream.on('text', (text: string) => {
      res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
    });

    stream.on('finalMessage', (msg: any) => {
      res.write(`data: ${JSON.stringify({ done: true, usage: msg.usage })}\n\n`);
      res.end();
    });

    stream.on('error', (err: Error) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

    req.on('close', () => {
      stream.abort();
    });

  } catch (err: any) {
    console.error('Chat route error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

export { router as chatRouter };
