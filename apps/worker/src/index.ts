// Cloudflare Worker entry — Hono. Portable API callable by other apps.
// Mirrors the Express routes but runs on the edge.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

type Env = {
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  API_KEYS?: string;
  ALLOWED_ORIGINS?: string;
  OLLAMA_BASE_URL?: string;
  OLLAMA_MODEL?: string;
  QWEN_BASE_URL?: string;
  QWEN_MODEL?: string;
  MODEL?: string;
  MAX_TOKENS?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const origins = (c.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
  const corsMw = cors({ origin: origins, allowMethods: ['GET', 'POST'], allowHeaders: ['Content-Type', 'Authorization'] });
  return corsMw(c, next);
});

// Auth middleware
app.use('/api/*', async (c, next) => {
  const auth = c.req.header('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const keys = (c.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return c.json({ error: 'Server auth not configured' }, 500);
  if (!token || !keys.includes(token)) return c.json({ error: 'Unauthorized' }, 401);
  return next();
});

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString(), version: '0.5.0', runtime: 'cloudflare-workers' }));

// Literature search (OpenAlex) — edge-native
app.post('/api/literature/openalex/search', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const query = String(body?.query || '').trim();
  if (query.length < 2) return c.json({ error: 'query must be at least 2 chars' }, 400);
  const max = Math.min(Math.max(Number(body?.maxResults) || 5, 1), 20);
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${max}&select=id,title,authorships,abstract_inverted_index,publication_year,primary_location,cited_by_count`;
  const res = await fetch(url, { headers: { 'User-Agent': 'MathX/1.0 (mailto:mathx@ncsound919.dev)' } });
  if (!res.ok) return c.json({ error: `OpenAlex ${res.status}` }, 502);
  const data = await res.json() as any;
  const reconstruct = (inv: any) => {
    if (!inv) return '';
    const words: string[] = [];
    for (const [w, pos] of Object.entries(inv)) for (const p of pos as number[]) words[p] = w;
    return words.filter(Boolean).join(' ').slice(0, 400);
  };
  const results = (data?.results || []).map((w: any) => ({
    id: (w.id || '').replace('https://openalex.org/', 'oa-'),
    title: w.title,
    authors: (w.authorships || []).slice(0, 4).map((a: any) => a?.author?.display_name).filter(Boolean),
    year: w.publication_year,
    venue: w.primary_location?.source?.display_name,
    citedByCount: w.cited_by_count,
    abstract: reconstruct(w.abstract_inverted_index),
  }));
  return c.json({ results, source: 'openalex', query });
});

// Unified multi-source search
app.post('/api/literature/search-all', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const query = String(body?.query || '').trim();
  if (query.length < 2) return c.json({ error: 'query must be at least 2 chars' }, 400);
  const maxPer = Math.min(Math.max(Number(body?.maxPerSource) || 4, 1), 8);
  const sources = (body?.sources as string[]) || ['openalex'];

  const out: { source: string; results: any[]; error?: string }[] = [];
  const tasks: Promise<void>[] = [];

  if (sources.includes('openalex')) {
    tasks.push((async () => {
      try {
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${maxPer}&select=id,title,authorships,abstract_inverted_index,publication_year,primary_location,cited_by_count`;
        const r = await fetch(url, { headers: { 'User-Agent': 'MathX/1.0 (mailto:mathx@ncsound919.dev)' } });
        if (!r.ok) throw new Error(`OpenAlex ${r.status}`);
        const d = await r.json() as any;
        const reconstruct = (inv: any) => {
          if (!inv) return '';
          const words: string[] = [];
          for (const [w, pos] of Object.entries(inv)) for (const p of pos as number[]) words[p] = w;
          return words.filter(Boolean).join(' ').slice(0, 400);
        };
        out.push({ source: 'openalex', results: (d?.results || []).map((w: any) => ({
          id: (w.id || '').replace('https://openalex.org/', 'oa-'),
          title: w.title,
          authors: (w.authorships || []).slice(0, 3).map((a: any) => a?.author?.display_name).filter(Boolean),
          year: w.publication_year,
          citedByCount: w.cited_by_count,
          abstract: reconstruct(w.abstract_inverted_index),
        })) });
      } catch (e: any) { out.push({ source: 'openalex', results: [], error: e.message }); }
    })());
  }

  await Promise.all(tasks);
  const total = out.reduce((n, s) => n + s.results.length, 0);
  return c.json({ query, total, sources: out });
});

// Chat with AI SDK (streaming SSE)
app.post('/api/chat-ai', async (c) => {
  try {
  const body = await c.req.json().catch(() => ({}));
  const messages = body?.messages || [];
  const mode = body?.mode || 'scientist';
  const domain = body?.domain;
  const providerPref = body?.provider || 'auto';
  const retrieved = body?.retrieved || [];

  const MODE_PREFIXES: Record<string, string> = {
    scientist: 'SCIENTIST MODE: Think like a research mathematician. Query: ',
  };
  const prefix = MODE_PREFIXES[mode] || MODE_PREFIXES.scientist;

  const processed = messages.map((m: any, i: number) => {
    if (i === messages.length - 1 && m.role === 'user') {
      const base = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      let ctx = '';
      if (retrieved?.length) ctx = `\n\n## Retrieved Context\n${retrieved.map((r: any) => `Source: ${r.source}\n${r.text}`).join('\n---\n')}`;
      return { role: 'user' as const, content: `${prefix}${base}${ctx}` };
    }
    return { role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
  });

  const selectProvider = (m: string) => 'claude';
  const provider = providerPref === 'auto' ? selectProvider(mode) : providerPref;

  const getModel = () => {
    if (provider === 'ollama') {
      const ollama = createOpenAICompatible({ name: 'ollama', baseURL: `${c.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/v1` });
      return ollama(c.env.OLLAMA_MODEL || 'deepseek-r1:8b');
    }
    if (provider === 'qwen') {
      const qwen = createOpenAICompatible({ name: 'qwen', baseURL: `${c.env.QWEN_BASE_URL || 'http://localhost:11434'}/v1` });
      return qwen(c.env.QWEN_MODEL || 'qwen2.5-math:7b');
    }
    if (c.env.ANTHROPIC_API_KEY) {
      return anthropic(c.env.MODEL || 'claude-sonnet-4-20250514');
    }
    // Fallback to Google Gemini (OpenAI-compatible) — free tier available
    const gemini = createOpenAICompatible({
      name: 'gemini',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      headers: { 'Authorization': `Bearer ${c.env.GEMINI_API_KEY || ''}` },
    });
    return gemini(c.env.MODEL || 'gemini-3.1-flash-lite');
  };

  const result = streamText({
    model: getModel(),
    system: 'You are MATH X. Use LaTeX. Be precise.',
    messages: processed,
    maxOutputTokens: parseInt(c.env.MAX_TOKENS || '4000', 10),
  });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const delta of result.textStream) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        }
        const usage = await result.usage;
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true, usage, provider })}\n\n`));
      } catch (e: any) {
        console.error('stream error', e);
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: e?.message || String(e) })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Model-Provider': provider,
    },
  });
  } catch (e: any) {
    return c.json({ error: e?.message || String(e) }, 500);
  }
});

export default app;