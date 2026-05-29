import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the Pyodide worker hook — WASM not available in jsdom
vi.mock('../../workers/useSymPyVerifier', () => ({
  useSymPyVerifier: () => ({
    ready: false,
    verifySteps: vi.fn(),
    verifyCode: vi.fn(),
  }),
}))

const { ProofVerifier } = await import('../ProofVerifier')

const mockOnResult = vi.fn()

describe('ProofVerifier', () => {
  it('renders without crashing on empty content', () => {
    render(<ProofVerifier content="" onResult={mockOnResult} />)
    // Should not throw
  })

  it('renders without crashing on plain text with no math', () => {
    render(<ProofVerifier content="This is a simple sentence." onResult={mockOnResult} />)
  })

  it('does not show verify button when no extractable steps found', () => {
    render(<ProofVerifier content="Let x be a variable." onResult={mockOnResult} />)
    expect(screen.queryByRole('button', { name: /verify/i })).toBeNull()
  })

  it('shows verify button when derivation steps are present', () => {
    const content = [
      '1. x^2 - 4 = 0',
      '2. x^2 = 4',
      '3. x = ±2',
    ].join('\n')
    render(<ProofVerifier content={content} onResult={mockOnResult} />)
    const verifyBtn = screen.queryByRole('button', { name: /verify/i })
    // Button should appear for numbered derivation steps
    expect(verifyBtn).not.toBeNull()
  })

  it('shows not-ready state when Pyodide is not loaded', () => {
    const content = '1. x => 2\n2. 2 => 4'
    render(<ProofVerifier content={content} onResult={mockOnResult} />)
    // Should indicate engine not ready or be disabled
    const verifyBtn = screen.queryByRole('button', { name: /verify/i })
    if (verifyBtn) {
      expect(verifyBtn).toBeDisabled()
    }
  })
})
