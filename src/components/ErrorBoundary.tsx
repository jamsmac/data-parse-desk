/**
 * Global Error Boundary - Catches React errors and displays fallback UI
 * Integrates with Sentry for error tracking
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Send to Sentry in production
    if (typeof window !== 'undefined' && window.Sentry && import.meta.env.PROD) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        level: 'error',
        tags: {
          errorBoundary: true,
        },
      });
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error boundary state
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reload the page
   */
  reloadPage = (): void => {
    window.location.reload();
  };

  /**
   * Go to home page
   */
  goHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.resetError
        );
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                Что-то пошло не так
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Произошла непредвиденная ошибка. Мы уже уведомлены и работаем над исправлением.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-4 rounded-lg bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error Details (Development Only)
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p className="font-mono text-xs break-all">
                        {this.state.error.toString()}
                      </p>
                      {this.state.errorInfo && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold">
                            Component Stack
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap text-xs">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <Button
                onClick={this.resetError}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Попробовать снова
              </Button>

              <Button
                onClick={this.reloadPage}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Перезагрузить страницу
              </Button>

              <Button
                onClick={this.goHome}
                variant="ghost"
                className="w-full"
                size="lg"
              >
                <Home className="mr-2 h-4 w-4" />
                На главную
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Если проблема повторяется,{' '}
                <a
                  href="mailto:support@dateparsedesk.com"
                  className="text-blue-600 hover:text-blue-500"
                >
                  свяжитесь с поддержкой
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for Error Boundary with hooks support
 */
export function ErrorBoundaryWrapper({
  children,
  onError,
}: {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}): ReactNode {
  return (
    <ErrorBoundary onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for specific sections (smaller scope)
 */
export function SectionErrorBoundary({
  children,
  sectionName,
}: {
  children: ReactNode;
  sectionName: string;
}): ReactNode {
  return (
    <ErrorBoundary
      fallback={(error, errorInfo, reset) => (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Ошибка в секции: {sectionName}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {error.message}
              </p>
              <div className="mt-3">
                <Button
                  onClick={reset}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Попробовать снова
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Async boundary for handling async errors in components
 */
export function AsyncBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}): ReactNode {
  return (
    <ErrorBoundary
      fallback={(error, errorInfo, reset) =>
        fallback || (
          <div className="flex flex-col items-center justify-center p-8">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <p className="mt-2 text-sm text-gray-600">
              Не удалось загрузить данные
            </p>
            <Button onClick={reset} size="sm" className="mt-4">
              Попробовать снова
            </Button>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}
