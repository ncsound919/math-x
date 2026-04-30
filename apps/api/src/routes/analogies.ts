// Cross-domain structural analogy engine.
// Given an equation/concept, finds isomorphic structures in other domains.
import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a cross-domain mathematical analogy engine. Given a mathematical equation
or concept, identify 3–5 structurally isomorphic equations from different scientific domains.

For each analogy, explain:
1. The domain and physical/mathematical context
2. The corresponding variables (explicit mapping table)
3. What mathematical structure they share (the \"skeleton\")
4. Why this analogy is non-trivial or surprising
5. One concrete insight that transfers across domains

Respond ONLY with valid JSON (no markdown):
{
  "inputConcept": "...",
  "sharedStructure": "Description of the underlying mathematical skeleton",
  "analogies": [
    {
      "domain": "Physics / Biology / ...",
      "equation": "LaTeX equation string",
      "variables": { "original_var": "analogous_var" },
      "explanation": "...",
      "insight": "...",
      "nonTriviality": "low|medium|high"
    }
  ]
}`;

const Schema = z.object({
  concept: z.string().min(1),
  domain: z.string().optional(),
  maxAnalogies: z.number().int().min(2).max(6).default(4),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { concept, domain, maxAnalogies } = Schema.parse(req.body);

    const prompt = domain
      ? `Source domain: ${domain}\n\nEquation/concept: ${concept}\n\nFind ${maxAnalogies} cross-domain structural analogies.`
      : `Equation/concept: ${concept}\n\nFind ${maxAnalogies} cross-domain structural analogies.`;

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content.find(b => b.type === 'text')?.text ?? '{}';
    let result: unknown;
    try { result = JSON.parse(raw); }
    catch { result = { inputConcept: concept, sharedStructure: '', analogies: [] }; }

    res.json(result);
  } catch (err: any) {
    console.error('Analogies route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as analogiesRouter };
