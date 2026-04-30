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
  requiresChart: z.boolean().optional(),
});

// Plotly JSON contract that all chart code must follow
const CHART_CONTRACT = `
IMPORTANT — your code MUST print JSON in this exact shape:
  print(json.dumps({
    "chart": {
      "data": [ ...valid Plotly trace dicts... ],
      "layout": { "title": "...", "template": "plotly_dark" }
    }
  }))

Valid trace examples:
  {"type": "scatter", "x": [...], "y": [...], "name": "label"}
  {"type": "surface",  "z": [[...]], "colorscale": "Viridis"}
  {"type": "histogram", "x": [...], "nbinsx": 50}
  {"type": "heatmap",   "z": [[...]], "colorscale": "RdBu"}
  {"type": "bar",       "x": [...], "y": [...]}
`;

const modeInstructions: Record<string, string> = {
  montecarlo:
    'Generate a Monte Carlo simulation. Use numpy vectorised sampling (≥100 000 iterations). ' +
    'Print mean, variance, and 95% CI. ' + CHART_CONTRACT,

  bayesian:
    'Generate a Bayesian inference script showing prior, likelihood, and posterior. ' + CHART_CONTRACT,

  symbolic:
    'Generate a SymPy symbolic computation. Solve analytically where possible. ' +
    'Print both symbolic and numeric results as plain text — NO chart needed.',

  plot:
    'Generate a Python computation whose ONLY output is Plotly JSON. ' + CHART_CONTRACT,

  compute:
    'Compute the result numerically with numpy/scipy. Print the final answer and key stats. ' +
    'If a chart would help, include one: ' + CHART_CONTRACT,

  stats:
    'Generate a statistical analysis with pandas and scipy.stats. Print summary stats. ' + CHART_CONTRACT,

  dataset:
    'Analyse the dataset. Print descriptive statistics, null counts, and correlation matrix. ' + CHART_CONTRACT,
};

router.post('/', async (req: Request, res: Response) => {
  try {
    const { task, mode, context, requiresChart } = CodegenRequestSchema.parse(req.body);

    const instruction = modeInstructions[mode] ?? modeInstructions.compute;
    const chartHint = requiresChart ? '\n\nA chart IS required for this task.' : '';
    const prompt = context
      ? `Context:\n${context}\n\nTask: ${task}${chartHint}`
      : `Task: ${task}${chartHint}`;

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: CODEGEN_SYSTEM,
      messages: [{ role: 'user', content: `${instruction}\n\n${prompt}` }],
    });

    const raw = response.content.find(b => b.type === 'text')?.text || '';
    // Strip markdown code fences if Claude wrapped the code
    const code = raw.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim();
    res.json({ code });
  } catch (err: any) {
    console.error('Codegen route error:', err);
    res.status(500).json({ error: err.message || 'Codegen failed' });
  }
});

export { router as codegenRouter };
