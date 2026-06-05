import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the Pyodide worker hook — WASM not available in jsdom
vi.mock('../../workers/useSymPyVerifier', () => ({
  useSymPyVerifier: () => ({
    ready: false,
    verifySteps: vi.fn(),
    verifyCode: vi.fn(),
  }),
}))

const { ProofVerifier } = await import('../ProofVerifier')

describe('ProofVerifier', () => {
  it('renders without crashing on empty content', () => {
    render(<ProofVerifier messageContent="" modeColor="var(--gold)" />)
    // Should not throw
  })

  it('renders without crashing on plain text with no math', () => {
    render(<ProofVerifier messageContent="This is a simple sentence." modeColor="var(--gold)" />)
  })

  it('does not show verify button when no extractable steps found', () => {
    render(<ProofVerifier messageContent="Let x be a variable." modeColor="var(--gold)" />)
    expect(screen.queryByRole('button', { name: /verify/i })).toBeNull()
  })

  it('shows verify button when derivation steps are present', () => {
    const content = [
      '1. x^2 - 4 = 0',
      '2. x^2 = 4',
      '3. x = ±2',
    ].join('\n')
    render(<ProofVerifier messageContent={content} modeColor="var(--gold)" />)
    const verifyBtn = screen.queryByRole('button', { name: /verify/i })
    // Button should appear for numbered derivation steps
    expect(verifyBtn).not.toBeNull()
  })

  it('shows not-ready state when Pyodide is not loaded', () => {
    const content = '1. x => 2\n2. 2 => 4'
    render(<ProofVerifier messageContent={content} modeColor="var(--gold)" />)
    // Should indicate engine not ready or be disabled
    const verifyBtn = screen.queryByRole('button', { name: /verify/i })
    if (verifyBtn) {
      expect(verifyBtn).toBeDisabled()
    }
  })
})
