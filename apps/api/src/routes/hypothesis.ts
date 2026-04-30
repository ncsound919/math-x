// Hypothesis pipeline route — structured conjecture → test → refine loop.
// Returns a testable hypothesis with Python test code for Pyodide execution.
import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HYPOTHESIS_SYSTEM = `You are a mathematical hypothesis engine. Given a mathematical statement or
observation, generate a precisely stated, falsifiable conjecture and a Python
test that checks it numerically.

Respond ONLY with valid JSON matching this schema (no markdown, no explanation):
{
  "conjecture": "Precise mathematical statement of the hypothesis",
  "nullHypothesis": "What would be true if the conjecture is false",
  "falsifiability": "How to numerically or algebraically test this",
  "testCode": "Complete Python code using numpy/sympy that tests the conjecture. MUST print a JSON object: {\\"result\\": \\"supported\\"|\\"refuted\\"|\\"inconclusive\\", \\"evidence\\": \"...\", \\"pValue\\": null|float, \\"symbolicProof\\": \"...\"}",
  "domain": "mathematical domain",
  "confidence": "low|medium|high"
}`;

const REFINEMENT_SYSTEM = `You are a mathematical hypothesis refinement engine.
Given a conjecture and its test result, either:
1. Confirm the conjecture with a brief proof sketch
2. Propose a refined, narrower conjecture that is consistent with the evidence
3. Explain why the conjecture is false and suggest an alternative

Respond in clear mathematical prose (not JSON). Include LaTeX where appropriate.`;

const RunSchema = z.object({
  statement: z.string().min(1),
  mode: z.string().optional(),
  context: z.string().optional(),
});

const RefineSchema = z.object({
  conjecture: z.string(),
  testResult: z.string(),
  verdict: z.enum(['supported', 'refuted', 'inconclusive']),
});

// POST /api/hypothesis/run — generate conjecture + test code
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { statement, mode, context } = RunSchema.parse(req.body);

    const prompt = context
      ? `Domain context:\n${context}\n\nStatement to investigate: ${statement}`
      : `Statement to investigate: ${statement}`;

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: HYPOTHESIS_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content.find(b => b.type === 'text')?.text ?? '{}';
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw); }
    catch { parsed = { conjecture: statement, testCode: 'import json\nprint(json.dumps({"result": "inconclusive", "evidence": "Parse error", "pValue": null, "symbolicProof": ""}))', falsifiability: '', nullHypothesis: '' }; }

    res.json(parsed);
  } catch (err: any) {
    console.error('Hypothesis run error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hypothesis/refine — given verdict, refine or confirm the conjecture
router.post('/refine', async (req: Request, res: Response) => {
  try {
    const { conjecture, testResult, verdict } = RefineSchema.parse(req.body);

    // Set SSE headers for streaming refinement
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const stream = client.messages.stream({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: REFINEMENT_SYSTEM,
      messages: [{
        role: 'user',
        content: `Conjecture: ${conjecture}\n\nNumerical test result: ${testResult}\n\nVerdict: ${verdict}\n\nPlease refine or confirm this hypothesis.`,
      }],
    });

    stream.on('text', (t: string) => res.write(`data: ${JSON.stringify({ delta: t })}\n\n`));
    stream.on('finalMessage', () => { res.write(`data: ${JSON.stringify({ done: true })}\n\n`); res.end(); });
    stream.on('error', (err: Error) => { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); });
    req.on('close', () => stream.abort());

  } catch (err: any) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

export { router as hypothesisRouter };
