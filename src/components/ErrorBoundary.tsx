import { Component, type ReactNode, type ErrorInfo } from 'react'
import { STORAGE_KEYS } from '../lib/constants'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary component to catch and handle React errors gracefully.
 * Prevents the entire application from crashing when a component fails.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-full flex-col items-center justify-center bg-zinc-900 p-8 text-zinc-50">
          <div className="max-w-md text-center">
            <div className="mb-4 text-6xl">💥</div>
            <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
            <p className="mb-4 text-sm text-zinc-400">
              An error occurred in the workflow editor. This has been logged for debugging.
            </p>

            {this.state.error && (
              <div className="mb-4 rounded-lg bg-zinc-800 p-4 text-left">
                <p className="mb-2 text-xs font-medium text-red-400">Error:</p>
                <pre className="overflow-auto text-xs text-zinc-300">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Canvas-specific error boundary with specialised recovery options.
 */
export class CanvasErrorBoundary extends ErrorBoundary {
  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center bg-zinc-900 p-8 text-zinc-50">
          <div className="max-w-md text-center">
            <div className="mb-4 text-6xl">🎨</div>
            <h2 className="mb-2 text-xl font-semibold">Canvas Error</h2>
            <p className="mb-4 text-sm text-zinc-400">
              The workflow canvas encountered an error. Your workflow data may still be recoverable.
            </p>

            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
              >
                Reset Canvas
              </button>
              <button
                onClick={() => {
                  // Try to recover autosave
                  const autosave = localStorage.getItem(STORAGE_KEYS.AUTOSAVE)
                  if (autosave) {
                    console.log('Autosave data found:', autosave)
                    alert('Autosave data found in console. Please copy it before reloading.')
                  }
                  window.location.reload()
                }}
                className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600"
              >
                Recover & Reload
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
