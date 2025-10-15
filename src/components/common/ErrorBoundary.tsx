import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  GlassCard, 
  GlassCardContent, 
  GlassCardDescription, 
  GlassCardHeader, 
  GlassCardTitle,
  AuroraBackground
} from '@/components/aurora';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку в консоль для разработки
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Отправляем ошибку в Sentry
    captureException(error, {
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Вызываем пользовательский обработчик, если он предоставлен
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Если предоставлен пользовательский fallback, используем его
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Иначе показываем стандартный UI ошибки
      return (
        <AuroraBackground variant="nebula" intensity="medium">
          <div className="min-h-screen flex items-center justify-center p-4">
            <GlassCard 
              className="max-w-2xl w-full border-destructive/50" 
              intensity="strong"
              animated={true}
            >
              <GlassCardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <GlassCardTitle className="text-2xl" gradient={true}>
                      Что-то пошло не так
                    </GlassCardTitle>
                    <GlassCardDescription>
                      Произошла непредвиденная ошибка в приложении
                    </GlassCardDescription>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
              {/* Информация об ошибке в development */}
              {import.meta.env.DEV && this.state.error && (
                <div className="space-y-2">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-mono text-red-800 mb-2">
                      <strong>Ошибка:</strong> {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <details className="text-xs text-red-700">
                        <summary className="cursor-pointer font-semibold mb-2">
                          Component Stack
                        </summary>
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Сообщение для пользователя */}
              <div className="text-sm text-gray-600">
                <p className="mb-2">
                  Мы уже получили уведомление об этой ошибке и работаем над её исправлением.
                </p>
                <p>
                  Вы можете попробовать обновить страницу или вернуться на главную.
                </p>
              </div>

              {/* Действия */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button onClick={this.handleReset} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Попробовать снова
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  На главную
                </Button>
              </div>

              {/* Дополнительная информация */}
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Если проблема повторяется, пожалуйста, свяжитесь с поддержкой.
                </p>
              </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </AuroraBackground>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
