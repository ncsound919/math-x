import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLANNER_SYSTEM = `You are a query planner for a mathematical intelligence system. Given a user query, return a JSON plan.

Respond with ONLY valid JSON, no markdown, no explanation.

Schema:
{
  "engine": "symbolic" | "montecarlo" | "bayesian" | "dataset" | "plot" | "compute" | "document" | "reason",
  "requires_code": boolean,
  "requires_chart": boolean,
  "requires_retrieval": boolean,
  "domain": string,
  "complexity": "low" | "medium" | "high",
  "summary": string,
  "chain": string[]   // ordered execution steps, e.g. ["retrieve","codegen","chart"] or ["retrieve","reason"]
}`;

const PlanRequestSchema = z.object({
  query: z.string(),
  mode: z.string().optional(),
  domain: z.string().optional(),
  hasFiles: z.boolean().optional(),
});

const DEFAULT_PLAN = {
  engine: 'reason',
  requires_code: false,
  requires_chart: false,
  requires_retrieval: false,
  domain: 'general',
  complexity: 'medium',
  summary: 'Direct reasoning',
  chain: ['reason'],
};

router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, mode, domain, hasFiles } = PlanRequestSchema.parse(req.body);
    const domainCtx = domain ? `\nActive domain: ${domain}` : '';

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: PLANNER_SYSTEM,
      messages: [{
        role: 'user',
        content: `Mode: ${mode || 'scientist'}${domainCtx}\nHas uploaded files: ${hasFiles || false}\nQuery: ${query}`,
      }],
    });

    const raw = response.content.find(b => b.type === 'text')?.text || '{}';
    const plan = { ...DEFAULT_PLAN, ...JSON.parse(raw) };
    res.json({ plan });
  } catch (err: any) {
    console.error('Plan route error:', err);
    res.status(500).json({ plan: DEFAULT_PLAN });
  }
});

export { router as planRouter };
