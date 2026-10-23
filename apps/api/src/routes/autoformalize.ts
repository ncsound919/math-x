import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AUTOFORMALIZE_SYSTEM = `You are a mathematical auto-formalization engine.
Given a natural-language mathematical statement, conjecture, or problem, produce a structured JSON object.

Output ONLY valid JSON, no markdown, no explanation.

Schema:
{
  "conjecture": string,           // the formalized conjecture in mathematical notation
  "domain": string,               // primary domain id (e.g. "number_theory", "topology")
  "domains": string[],            // all relevant domain ids
  "assumptions": string[],        // explicit assumptions
  "proof_goal": string,           // what needs to be proven
  "verification_strategy": string, // "symbolic" | "smt" | "numeric" | "formal" | "statistical" | "none"
  "sympy_expressions": string[],   // SymPy-parseable expressions to verify (if any)
  "difficulty": "low" | "medium" | "high",
  "related_concepts": string[]     // related mathematical concepts
}`;

const AutoformalizeSchema = z.object({
  text: z.string().min(1),
  context: z.string().optional(),
});

// POST /api/autoformalize — translate NL math into formal conjecture + proof goals
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, context } = AutoformalizeSchema.parse(req.body);

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: AUTOFORMALIZE_SYSTEM,
      messages: [{
        role: 'user',
        content: context ? `Context: ${context}\n\nStatement: ${text}` : text,
      }],
    });

    const raw = response.content.find(b => b.type === 'text')?.text || '{}';
    let result: any;
    try {
      result = JSON.parse(raw);
    } catch {
      result = { conjecture: text, domain: 'general', domains: [], assumptions: [], proof_goal: text, verification_strategy: 'none', sympy_expressions: [], difficulty: 'medium', related_concepts: [] };
    }

    res.json({ result });
  } catch (err: any) {
    console.error('Autoformalize route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as autoformalizeRouter };
