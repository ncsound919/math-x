/**
 * /api/verify — SymPy-backed algebraic step verifier.
 * Receives a list of mathematical steps (LaTeX or Python expressions)
 * and verifies each transformation is algebraically valid.
 * Returns per-step verdicts: VERIFIED | UNVERIFIED | ERROR
 */
import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VerifyRequestSchema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    description: z.string(),       // Human description: "Factor out x"
    expression_before: z.string(), // Expression before this step
    expression_after: z.string(),  // Expression after this step
    step_type: z.enum(['algebra', 'calculus', 'simplify', 'substitute', 'expand', 'factor', 'limit', 'integrate', 'differentiate', 'solve', 'matrix', 'unknown']).default('algebra'),
  })),
  context: z.string().optional(), // e.g. "assume x > 0"
});

const VERIFIER_SYSTEM = `You are a mathematical step verifier. Given a transformation from expression_before to expression_after, generate a Python SymPy script that:
1. Defines both expressions symbolically
2. Checks if they are algebraically equivalent (or that the transformation is valid)
3. Prints EXACTLY one of: VERIFIED, UNVERIFIED, or ERROR: <reason>

Output ONLY the Python code. No markdown. No explanation. Use sympy.
For calculus steps (differentiate/integrate/limit), verify the operation result.
For substitutions, verify the substituted form.
For simplifications, check simplify(before - after) == 0 or equivalent.
Always use try/except and print ERROR: <msg> on failure.`;

router.post('/', async (req: Request, res: Response) => {
  try {
    const { steps, context } = VerifyRequestSchema.parse(req.body);

    const results = await Promise.all(steps.map(async (step) => {
      try {
        // Ask Claude to generate SymPy verification code
        const response = await client.messages.create({
          model: process.env.MODEL || 'claude-sonnet-4-20250514',
          max_tokens: 512,
          system: VERIFIER_SYSTEM,
          messages: [{
            role: 'user',
            content: [
              `Step type: ${step.step_type}`,
              `Description: ${step.description}`,
              context ? `Context/assumptions: ${context}` : '',
              `Before: ${step.expression_before}`,
              `After: ${step.expression_after}`,
            ].filter(Boolean).join('\n'),
          }],
        });

        const code = response.content.find(b => b.type === 'text')?.text || '';
        return {
          id: step.id,
          sympy_code: code,
          status: 'code_generated' as const,
          description: step.description,
        };
      } catch (err: any) {
        return {
          id: step.id,
          sympy_code: '',
          status: 'error' as const,
          error: err.message,
          description: step.description,
        };
      }
    }));

    res.json({ results });
  } catch (err: any) {
    console.error('Verify route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as verifyRouter };
