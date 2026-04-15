import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { CODEGEN_SYSTEM } from '../services/prompts';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CodegenRequestSchema = z.object({
  task: z.string(),
  mode: z.string().default('compute'),
  context: z.string().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { task, mode, context } = CodegenRequestSchema.parse(req.body);

    const prompt = context
      ? `Context:\n${context}\n\nTask: ${task}`
      : `Task: ${task}`;

    const modeInstructions: Record<string, string> = {
      montecarlo: 'Generate a Monte Carlo simulation. Use numpy for vectorized random sampling. Run at least 100,000 iterations. Print the result and key statistics.',
      bayesian: 'Generate a Bayesian inference script. Show prior, likelihood, and posterior. Use numpy for computation.',
      symbolic: 'Generate a SymPy symbolic computation. Solve analytically where possible. Print both symbolic and numeric results.',
      plot: 'Generate a computation that outputs chart-ready JSON using the format: print(json.dumps({"chart": True, ...}))',
      compute: 'Compute the result numerically using numpy/scipy. Print the final answer clearly.',
      stats: 'Generate a statistical analysis using pandas and scipy.stats. Print summary statistics and key findings.',
    };

    const instruction = modeInstructions[mode] || modeInstructions.compute;

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: CODEGEN_SYSTEM,
      messages: [{ role: 'user', content: `${instruction}\n\n${prompt}` }],
    });

    const code = response.content.find(b => b.type === 'text')?.text || '';
    res.json({ code: code.trim() });
  } catch (err: any) {
    console.error('Codegen route error:', err);
    res.status(500).json({ error: err.message || 'Codegen failed' });
  }
});

export { router as codegenRouter };
