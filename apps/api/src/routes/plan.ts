import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLANNER_SYSTEM = `You are a query planner for a mathematical intelligence system. Given a user query, you return a JSON plan.

You must respond with ONLY valid JSON, no markdown, no explanation.

Schema:
{
  "engine": "symbolic" | "montecarlo" | "bayesian" | "dataset" | "plot" | "compute" | "document" | "reason",
  "requires_code": boolean,
  "requires_chart": boolean,
  "requires_retrieval": boolean,
  "domain": string,
  "complexity": "low" | "medium" | "high",
  "summary": string
}`;

const PlanRequestSchema = z.object({
  query: z.string(),
  mode: z.string().optional(),
  hasFiles: z.boolean().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, mode, hasFiles } = PlanRequestSchema.parse(req.body);

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: PLANNER_SYSTEM,
      messages: [{
        role: 'user',
        content: `Mode: ${mode || 'scientist'}\nHas uploaded files: ${hasFiles || false}\nQuery: ${query}`,
      }],
    });

    const raw = response.content.find(b => b.type === 'text')?.text || '{}';
    const plan = JSON.parse(raw);
    res.json({ plan });
  } catch (err: any) {
    console.error('Plan route error:', err);
    res.status(500).json({
      plan: {
        engine: 'reason',
        requires_code: false,
        requires_chart: false,
        requires_retrieval: false,
        domain: 'general',
        complexity: 'medium',
        summary: 'Direct reasoning',
      }
    });
  }
});

export { router as planRouter };
