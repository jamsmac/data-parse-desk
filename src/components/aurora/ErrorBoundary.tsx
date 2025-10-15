/**
 * ErrorBoundary Component
 * Aurora Design System - Универсальный компонент для обработки ошибок
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from './core/GlassCard';
import { FluidButton } from './core/FluidButton';

export interface ErrorBoundaryProps {
  /** Дочерние элементы */
  children: ReactNode;

  /** Кастомный fallback UI */
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode);

  /** Callback при возникновении ошибки */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /** Показывать подробности ошибки (для разработки) */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - компонент для обработки ошибок в React приложениях
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку
    console.error('Aurora ErrorBoundary caught an error:', error, errorInfo);

    // Обновляем state с информацией об ошибке
    this.setState({
      errorInfo,
    });

    // Вызываем callback, если он предоставлен
    this.props.onError?.(error, errorInfo);

    // В production можно отправить ошибку в сервис мониторинга
    // Например, Sentry, LogRocket, и т.д.
    if (process.env.NODE_ENV === 'production') {
      // reportToSentry(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (!hasError) {
      return children;
    }

    // Если предоставлен кастомный fallback
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(error!, errorInfo!, this.handleReset);
      }
      return fallback;
    }

    // Дефолтный UI с Aurora дизайном
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard variant="elevated" intensity="medium" className="max-w-2xl w-full">
          <GlassCardHeader>
            <GlassCardTitle gradient>
              Что-то пошло не так
            </GlassCardTitle>
            <GlassCardDescription>
              Произошла ошибка при отображении компонента. Мы уже работаем над исправлением.
            </GlassCardDescription>
          </GlassCardHeader>

          <GlassCardContent className="space-y-4">
            {showDetails && error && (
              <div className="space-y-3">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                  <h3 className="text-sm font-semibold text-red-400 mb-2">
                    Сообщение об ошибке:
                  </h3>
                  <p className="text-sm text-red-300 font-mono">
                    {error.message}
                  </p>
                </div>

                {error.stack && (
                  <details className="rounded-lg bg-gray-500/10 border border-gray-500/20 p-4">
                    <summary className="text-sm font-semibold text-gray-400 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </details>
                )}

                {errorInfo?.componentStack && (
                  <details className="rounded-lg bg-gray-500/10 border border-gray-500/20 p-4">
                    <summary className="text-sm font-semibold text-gray-400 cursor-pointer">
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <FluidButton variant="primary" onClick={this.handleReset}>
                Попробовать снова
              </FluidButton>
              <FluidButton variant="secondary" onClick={() => window.location.reload()}>
                Перезагрузить страницу
              </FluidButton>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }
}

/**
 * Функциональная обертка ErrorBoundary с хуками
 * Использует React.lazy для легковесного fallback
 */
export interface ErrorBoundaryWrapperProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  /** Дочерние элементы */
  children: ReactNode;

  /** Минимальный fallback UI */
  minimal?: boolean;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  minimal = false,
  ...props
}) => {
  const minimalFallback = minimal ? (
    <div className="p-4 border border-red-300 rounded-lg bg-red-50 dark:bg-red-900/20">
      <h3 className="text-red-800 dark:text-red-200 font-semibold">
        Что-то пошло не так
      </h3>
      <p className="text-red-600 dark:text-red-300 text-sm mt-1">
        Компонент временно недоступен. Мы уже работаем над исправлением.
      </p>
    </div>
  ) : undefined;

  return (
    <ErrorBoundary fallback={minimalFallback} {...props}>
      {children}
    </ErrorBoundary>
  );
};

ErrorBoundaryWrapper.displayName = 'ErrorBoundaryWrapper';
