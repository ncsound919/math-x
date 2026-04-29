// Verified Derivation route — algebraic step-by-step verification via SymPy.
// Claude generates the derivation; each step is independently checked by SymPy for equality.
// Steps that pass get VERIFIED ✓; steps that fail or are unparseable get UNVERIFIED flags.
import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// --- Step Extraction System ---
const STEP_EXTRACTION_SYSTEM = `You are a mathematical derivation formatter.
Given any mathematical derivation or proof, extract each step as a structured JSON array.

Output ONLY a valid JSON array, no markdown, no explanation.

Each element must have:
- "step": integer (1-based)
- "description": string (human-readable description of what happened)
- "from_expr": string (the expression BEFORE this transformation, as a SymPy-parseable Python string)
- "to_expr": string (the expression AFTER this transformation, as a SymPy-parseable Python string)
- "operation": string (e.g. "expand", "factor", "substitute", "simplify", "differentiate", "integrate", "rearrange", "definition")
- "verifiable": boolean (false if step is a definition, assumption, theorem citation, or inherently non-algebraic)

Rules for SymPy-parseable expressions:
- Use ** for powers (not ^)
- Use sympy function names: sin, cos, exp, log, sqrt, Rational, pi, E
- Variables must be simple: x, y, z, n, t, a, b, c
- Do NOT include equals signs — from_expr and to_expr are separate sides
- If an expression cannot be represented in SymPy, set verifiable: false`;

// --- SymPy Verification Code Generator ---
function buildSymPyVerificationCode(steps: any[]): string {
  const verifiableSteps = steps.filter(s => s.verifiable && s.from_expr && s.to_expr);
  if (verifiableSteps.length === 0) {
    return 'import json\nprint(json.dumps({"results": []}))';
  }

  const checks = verifiableSteps.map(s => {
    const safe_from = s.from_expr.replace(/"/g, "'");
    const safe_to = s.to_expr.replace(/"/g, "'");
    return `
    try:
        from_expr = sympify("${safe_from}", locals=ns)
        to_expr = sympify("${safe_to}", locals=ns)
        diff = simplify(from_expr - to_expr)
        is_equal = diff == 0 or diff == S.Zero
        if not is_equal:
            # Try numerical check at multiple points
            free = from_expr.free_symbols | to_expr.free_symbols
            if free:
                from sympy import N, random
                test_pts = [{str(s): float(i+1) for s in free} for i in range(5)]
                numerics = [abs(float(N(from_expr.subs(pt))) - float(N(to_expr.subs(pt)))) < 1e-9 for pt in test_pts]
                is_equal = all(numerics)
        results.append({"step": ${s.step}, "verified": bool(is_equal), "method": "sympy_algebraic"})
    except Exception as e:
        results.append({"step": ${s.step}, "verified": False, "method": "error", "error": str(e)[:100]})
`;
  }).join('');

  return `
import json
from sympy import *
from sympy import sympify, simplify, S

x, y, z, n, t, a, b, c, k, m = symbols('x y z n t a b c k m')
ns = {str(s): s for s in [x, y, z, n, t, a, b, c, k, m]}
ns.update({'pi': pi, 'E': E, 'I': I, 'oo': oo})

results = []
${checks}
print(json.dumps({"results": results}))
`;
}

const VerifyRequestSchema = z.object({
  expression: z.string().min(1),
  mode: z.enum(['algebraic', 'proof', 'calculus', 'linear_algebra']).default('algebraic'),
  domain: z.string().optional(),
});

// POST /api/verify — full derivation: extract steps, generate SymPy code, run via worker
router.post('/', async (req: Request, res: Response) => {
  try {
    const { expression, mode, domain } = VerifyRequestSchema.parse(req.body);

    // 1. Ask Claude to format the derivation as structured steps
    const stepRes = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: STEP_EXTRACTION_SYSTEM,
      messages: [{ role: 'user', content: `Mode: ${mode}${domain ? ` Domain: ${domain}` : ''}\n\nDerivation to extract:\n${expression}` }],
    });

    const raw = stepRes.content.find(b => b.type === 'text')?.text || '[]';
    let steps: any[];
    try {
      steps = JSON.parse(raw);
    } catch {
      steps = [];
    }

    // 2. Generate SymPy verification code
    const sympyCode = buildSymPyVerificationCode(steps);

    // 3. Return structured response with steps + verification code for client-side Pyodide execution
    res.json({
      steps,
      sympyCode,
      numVerifiable: steps.filter(s => s.verifiable).length,
      numTotal: steps.length,
    });
  } catch (err: any) {
    console.error('Verify route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/verify/results — merge SymPy results back onto steps for rendering
router.post('/results', async (req: Request, res: Response) => {
  try {
    const { steps, sympyResults } = req.body as {
      steps: any[];
      sympyResults: { step: number; verified: boolean; method: string; error?: string }[];
    };

    const resultMap = new Map(sympyResults.map(r => [r.step, r]));

    const annotated = steps.map(s => ({
      ...s,
      verification: s.verifiable
        ? (resultMap.get(s.step) || { verified: false, method: 'not_run' })
        : { verified: null, method: 'not_verifiable' },
    }));

    const verifiedCount = annotated.filter(s => s.verification?.verified === true).length;
    const failedCount = annotated.filter(s => s.verification?.verified === false && s.verifiable).length;
    const notVerifiableCount = annotated.filter(s => !s.verifiable).length;

    res.json({
      steps: annotated,
      summary: {
        total: steps.length,
        verified: verifiedCount,
        failed: failedCount,
        not_verifiable: notVerifiableCount,
        trust_score: steps.length > 0
          ? Math.round((verifiedCount / Math.max(steps.filter(s => s.verifiable).length, 1)) * 100)
          : 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as verifyRouter };
