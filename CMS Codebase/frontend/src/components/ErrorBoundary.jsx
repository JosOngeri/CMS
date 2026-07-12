import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development
    if (import.meta.env.DEV || process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    // Report error to API if api instance is provided
    if (this.props.api) {
      this.props.api.post('/logs/client-error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent
      }).catch(err => {
        // Silently fail if error reporting fails
        console.error('[ErrorBoundary] Failed to report error:', err);
      });
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetErrorBoundary: this.resetErrorBoundary
        });
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-6">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text)] mb-3">Something went wrong</h1>
            <p className="text-[var(--color-textSecondary)] mb-6">
              An unexpected error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            {(import.meta.env.DEV || process.env.NODE_ENV === 'development') && this.state.error && (
              <details className="text-left bg-[var(--color-background)] rounded-xl p-4 mb-6 text-sm">
                <summary className="font-medium text-[var(--color-text)] cursor-pointer mb-2">Error details (dev mode)</summary>
                <pre className="text-red-600 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/'}
                className="btn btn-primary gap-2"
              >
                Go to Home
              </button>
              <button
                onClick={this.resetErrorBoundary}
                className="btn btn-secondary gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary gap-2"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
