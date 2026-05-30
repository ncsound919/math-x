/**
 * useSymPyVerifier — SymPy step verification hook.
 * Previously spawned a third independent Pyodide runtime.
 * Now uses the shared PyodideWorkerManager (SymPy is in the base package set).
 */
import { useState, useEffect, useCallback } from 'react'
import { getPyodideManager } from './PyodideWorkerManager'

export type VerificationStatus = 'pending' | 'verifying' | 'VERIFIED' | 'UNVERIFIED' | 'ERROR' | 'skipped'

export interface VerifyResult {
  id: string
  status: VerificationStatus
  error?: string
  sympy_code?: string
}

export function useSymPyVerifier() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const manager = getPyodideManager()
    if (manager.isReady()) {
      setReady(true)
      return
    }
    // SymPy is in the base package set — ready as soon as Pyodide boots
    manager.run('from sympy import symbols; pass')
      .then(() => setReady(true))
      .catch(() => {/* will surface as ERROR on first verify call */})
  }, [])

  /**
   * Execute a SymPy verification script and return the raw stdout string.
   * The script is expected to print 'VERIFIED', 'UNVERIFIED', or 'ERROR: ...'
   */
  const verifyCode = useCallback(async (id: string, code: string): Promise<string> => {
    if (!ready) return 'ERROR: verifier not ready'
    try {
      return await getPyodideManager().run(code)
    } catch (err) {
      return `ERROR: ${String(err)}`
    }
  }, [ready])

  /**
   * Full pipeline: fetch SymPy code from API, execute locally, return verdicts.
   */
  const verifySteps = useCallback(async (
    steps: Array<{
      id: string
      description: string
      expression_before: string
      expression_after: string
      step_type?: string
    }>,
    context?: string,
  ): Promise<VerifyResult[]> => {
    // 1. Ask API to generate SymPy verification code for each step
    const apiRes = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps, context }),
    })
    const { results: codeResults } = await apiRes.json()

    // 2. Execute each piece of code locally — in parallel where possible
    const verdicts = await Promise.all(
      (codeResults as Array<{ id: string; status?: string; sympy_code?: string; error?: string }>)
        .map(async (r): Promise<VerifyResult> => {
          if (r.status === 'error' || !r.sympy_code) {
            return { id: r.id, status: 'ERROR', error: r.error ?? 'No code generated' }
          }

          const verdict = await verifyCode(r.id, r.sympy_code)
          let status: VerificationStatus = 'UNVERIFIED'
          if (verdict.startsWith('VERIFIED'))    status = 'VERIFIED'
          else if (verdict.startsWith('ERROR'))  status = 'ERROR'

          return {
            id: r.id,
            status,
            error: status === 'ERROR' ? verdict : undefined,
            sympy_code: r.sympy_code,
          }
        })
    )

    return verdicts
  }, [verifyCode, ready])

  return { ready, verifySteps, verifyCode }
}
