import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CODEGEN_SYSTEM = `You are a Python code generator for mathematical and scientific computation.

Your code MUST end with a single print(json.dumps({...})) call using this EXACT output schema:

{
  "stdout": "<any human-readable summary>",
  "chart": {
    "type": "line|scatter|surface|heatmap|histogram|pie|violin|bar",
    "data": [ /* Plotly trace objects */ ],
    "layout": { "title": "...", "xaxis": {}, "yaxis": {} }
  },
  "table": {
    "columns": ["col1", "col2"],
    "rows": [[val1, val2], ...]
  }
}

"chart" and "table" are optional — include only when relevant.
Always import json at the top. Use numpy, scipy, sympy as needed.
For charts: build data as plain Python dicts (not Plotly Figure objects).

Example for a sine plot:
  import json, numpy as np
  x = np.linspace(0, 2*np.pi, 200).tolist()
  y = np.sin(x).tolist()
  print(json.dumps({
    "stdout": "Plotted sin(x) over [0, 2π]",
    "chart": {
      "type": "line",
      "data": [{"x": x, "y": y, "mode": "lines", "name": "sin(x)"}],
      "layout": {"title": "sin(x)"}
    }
  }))

Named scalar constants should be top-level assignments on their own lines:
  omega = 2.5
  n = 100
This enables the parameter slider UI to detect and expose them.`;

const CodegenRequestSchema = z.object({
  task: z.string(),
  mode: z.string(),
  context: z.string().optional(),
  domain: z.string().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { task, mode, context, domain } = CodegenRequestSchema.parse(req.body);

    const domainCtx = domain ? `\nActive domain: ${domain}` : '';
    const contextBlock = context?.trim()
      ? `\n\nRelevant context:\n${context.slice(0, 1500)}`
      : '';

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: CODEGEN_SYSTEM,
      messages: [{
        role: 'user',
        content: `Mode: ${mode}${domainCtx}\nTask: ${task}${contextBlock}\n\nGenerate Python code now. Output ONLY the code — no markdown fences, no explanation.`,
      }],
    });

    const code = response.content.find(b => b.type === 'text')?.text?.trim() || '';
    res.json({ code });
  } catch (err: any) {
    console.error('Codegen error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as codegenRouter };
