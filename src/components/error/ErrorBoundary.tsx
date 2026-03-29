import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { getSentry } from '../../lib/monitoring/sentry';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryState>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showFeedback?: boolean;
  level?: 'page' | 'component' | 'critical';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  lastEventId?: string;
}

export class ErrorBoundary extends Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      const sentry = getSentry();

      // Set error boundary context
      sentry.setContext('errorBoundary', {
        level: this.props.level || 'component',
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      });

      // Capture the error
      const errorId = sentry.captureException(error, {
        component: 'error-boundary',
        action: 'component_error',
      });

      this.setState({ errorId, lastEventId: errorId });

      // Call custom error handler if provided
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }

      console.error('Error caught by boundary:', error, errorInfo);
    } catch (sentryError) {
      console.error('Failed to report error to Sentry:', sentryError);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  handleFeedback = () => {
    try {
      const sentry = getSentry();
      sentry.showUserFeedback({
        formTitle: 'Report this Error',
        subtitle: 'Help us fix this issue by providing more details',
        successMessage:
          'Thank you! Your feedback helps us improve the platform.',
      });
    } catch (error) {
      console.error('Failed to show feedback widget:', error);
    }
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent {...this.state} />;
      }

      // Default error UI based on level
      return this.renderDefaultErrorUI();
    }

    return this.props.children;
  }

  private renderDefaultErrorUI() {
    const { level = 'component', showFeedback = true } = this.props;
    const { error, errorId } = this.state;

    if (level === 'critical') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
            <div className="mb-4 text-6xl">😵</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Something went seriously wrong
            </h1>
            <p className="mb-6 text-gray-600">
              A critical error occurred. Please refresh the page or try again
              later.
            </p>
            {error && (
              <details className="mb-6 rounded bg-gray-50 p-3 text-left text-sm">
                <summary className="cursor-pointer font-medium">
                  Error Details
                </summary>
                <pre className="mt-2 overflow-auto text-xs">{error.stack}</pre>
              </details>
            )}
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Refresh Page
              </button>
              {showFeedback && (
                <button
                  onClick={this.handleFeedback}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Report Issue
                </button>
              )}
            </div>
            {errorId && (
              <p className="mt-4 text-xs text-gray-500">Error ID: {errorId}</p>
            )}
          </div>
        </div>
      );
    }

    if (level === 'page') {
      return (
        <div className="flex min-h-96 items-center justify-center p-8">
          <div className="w-full max-w-lg text-center">
            <div className="mb-4 text-5xl">🚧</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Page temporarily unavailable
            </h2>
            <p className="mb-6 text-gray-600">
              We're experiencing some technical difficulties with this page.
            </p>
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="mr-3 rounded-md bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.history.back()}
                className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                Go Back
              </button>
            </div>
            {showFeedback && (
              <button
                onClick={this.handleFeedback}
                className="mx-auto mt-4 block text-sm text-blue-600 underline hover:text-blue-800"
              >
                Report this issue
              </button>
            )}
          </div>
        </div>
      );
    }

    // Component level error
    return (
      <div className="rounded-lg border-2 border-dashed border-red-200 bg-red-50 p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Component Error
            </h3>
            <p className="mt-1 text-sm text-red-700">
              This component encountered an error and couldn't render properly.
            </p>
            {error && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-600">
                  Show error details
                </summary>
                <pre className="mt-1 overflow-auto text-xs text-red-600">
                  {error['message']}
                </pre>
              </details>
            )}
            <div className="mt-3 flex space-x-2">
              <button
                onClick={this.handleReset}
                className="rounded bg-red-100 px-2 py-1 text-xs text-red-800 transition-colors hover:bg-red-200"
              >
                Retry
              </button>
              {showFeedback && (
                <button
                  onClick={this.handleFeedback}
                  className="px-2 py-1 text-xs text-red-600 underline hover:text-red-800"
                >
                  Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// HOC wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component['name']})`;
  return WrappedComponent;
}

// Specific error boundaries for different parts of the app
export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary level="critical" showFeedback={true}>
    {children}
  </ErrorBoundary>
);

export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary level="page" showFeedback={true}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary level="component" showFeedback={false}>
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
