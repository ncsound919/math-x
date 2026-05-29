import { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary for Pyodide/WASM-dependent components.
 * Catches failures from local SymPy execution, DuckDB, or worker boot
 * and surfaces a recoverable error state instead of crashing the app.
 */
export class PyodideErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PyodideErrorBoundary] Caught error:', error, info)
    this.props.onError?.(error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          role="alert"
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
            Local math engine failed to initialize
          </p>
          {this.state.error && (
            <p style={{ margin: '0 0 0.75rem', opacity: 0.8 }}>
              {this.state.error.message}
            </p>
          )}
          <p style={{ margin: '0 0 0.75rem', opacity: 0.7, fontSize: '0.8rem' }}>
            This may happen if Pyodide or WebAssembly is blocked by your browser.
            Cloud-based verification will still work.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '4px',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
