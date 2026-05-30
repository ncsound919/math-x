/**
 * Verification utilities shared between the API's /verify route and the web's
 * useSymPyVerifier / DerivationVerifier hooks.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DerivationStep {
  step: number;
  description: string;
  from_expr: string;
  to_expr: string;
  operation: string;
  verifiable: boolean;
}

export interface AnnotatedStep extends DerivationStep {
  verification: {
    verified: boolean | null;
    method: string;
    error?: string;
  };
}

export interface VerificationSummary {
  total: number;
  verified: number;
  failed: number;
  not_verifiable: number;
  trust_score: number;
}

// ---------------------------------------------------------------------------
// Step parsing
// ---------------------------------------------------------------------------

/**
 * Parse a derivation step list from an unstructured assistant response.
 * Looks for numbered lines with arrow-style transitions (→, =>, \to, \Rightarrow).
 * Returns at most `maxSteps` steps (default: 12).
 *
 * This is a best-effort heuristic. The API route uses Claude to produce
 * properly structured JSON; this parser is a fallback for ad-hoc content.
 */
export function parseVerifySteps(
  content: string,
  maxSteps = 12,
): DerivationStep[] {
  const steps: DerivationStep[] = [];
  const lines = content.split('\n');
  const arrowPat = /(.+?)\s*(?:=>|\\Rightarrow|\\to|\u2192)\s*(.+)/;
  const numberedPat = /^(?:Step\s+)?\d+[.:)\s]/i;

  for (let i = 0; i < lines.length && steps.length < maxSteps; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 5) continue;
    const isNumbered = numberedPat.test(line);
    if (!isNumbered && !line.includes('$') && !line.includes('=')) continue;

    const arrowMatch = line.match(arrowPat);
    if (arrowMatch) {
      steps.push({
        step: steps.length + 1,
        description: line.replace(/[$\\]/g, '').slice(0, 80),
        from_expr: arrowMatch[1].replace(/`/g, '').trim(),
        to_expr:   arrowMatch[2].replace(/`/g, '').trim(),
        operation: inferOperation(line),
        verifiable: true,
      });
    }
  }
  return steps;
}

function inferOperation(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('integrat') || t.includes('\\int'))  return 'integrate';
  if (t.includes('differentiat') || t.includes("d/dx")) return 'differentiate';
  if (t.includes('limit') || t.includes('\\lim'))     return 'limit';
  if (t.includes('factor'))                            return 'factor';
  if (t.includes('expand'))                            return 'expand';
  if (t.includes('substit'))                           return 'substitute';
  if (t.includes('simplif'))                           return 'simplify';
  return 'algebra';
}

// ---------------------------------------------------------------------------
// Trust score computation
// ---------------------------------------------------------------------------

/**
 * Compute a verification summary from an annotated step list.
 */
export function computeSummary(steps: AnnotatedStep[]): VerificationSummary {
  const verifiable     = steps.filter(s => s.verifiable);
  const verified       = steps.filter(s => s.verification?.verified === true);
  const failed         = steps.filter(s => s.verification?.verified === false && s.verifiable);
  const not_verifiable = steps.filter(s => !s.verifiable);

  const trust_score =
    verifiable.length > 0
      ? Math.round((verified.length / verifiable.length) * 100)
      : 0;

  return {
    total:           steps.length,
    verified:        verified.length,
    failed:          failed.length,
    not_verifiable:  not_verifiable.length,
    trust_score,
  };
}

// ---------------------------------------------------------------------------
// SymPy code generation
// ---------------------------------------------------------------------------

/**
 * Generate a self-contained Python script that checks each verifiable step
 * for algebraic equality using SymPy, then prints a JSON result array.
 *
 * The generated code is safe to execute in Pyodide (browser WASM) or a
 * standard Python environment.
 */
export function buildSymPyVerificationCode(steps: DerivationStep[]): string {
  const verifiable = steps.filter(s => s.verifiable && s.from_expr && s.to_expr);

  if (verifiable.length === 0) {
    return 'import json\nprint(json.dumps({"results": []}))';
  }

  const checks = verifiable.map(s => {
    const safeFrom = s.from_expr.replace(/"/g, "'");
    const safeTo   = s.to_expr.replace(/"/g, "'");
    return `
    try:
        from_expr = sympify("${safeFrom}", locals=ns)
        to_expr   = sympify("${safeTo}",   locals=ns)
        diff      = simplify(from_expr - to_expr)
        is_equal  = diff == 0 or diff == S.Zero
        if not is_equal:
            free = from_expr.free_symbols | to_expr.free_symbols
            if free:
                test_pts = [{str(sym): float(i+1) for sym in free} for i in range(5)]
                numerics = [
                    abs(float(N(from_expr.subs(pt))) - float(N(to_expr.subs(pt)))) < 1e-9
                    for pt in test_pts
                ]
                is_equal = all(numerics)
        results.append({"step": ${s.step}, "verified": bool(is_equal), "method": "sympy_algebraic"})
    except Exception as e:
        results.append({"step": ${s.step}, "verified": False, "method": "error", "error": str(e)[:100]})
`;
  });

  return `
import json
from sympy import *
from sympy import sympify, simplify, S, N

x, y, z, n, t, a, b, c, k, m = symbols('x y z n t a b c k m')
ns = {str(s): s for s in [x, y, z, n, t, a, b, c, k, m]}
ns.update({'pi': pi, 'E': E, 'I': I, 'oo': oo})

results = []
${checks.join('')}
print(json.dumps({"results": results}))
`.trimStart();
}
