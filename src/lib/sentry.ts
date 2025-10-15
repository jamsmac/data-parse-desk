import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const SAMPLE_RATE = parseFloat(import.meta.env.VITE_SENTRY_SAMPLE_RATE || '1.0');
const TRACES_SAMPLE_RATE = parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1');

export const initSentry = () => {
  // Инициализируем Sentry только если DSN предоставлен и не в development
  if (!SENTRY_DSN || ENVIRONMENT === 'development') {
    console.info('Sentry not initialized:', ENVIRONMENT === 'development' ? 'Development mode' : 'No DSN provided');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `data-parse-desk@${APP_VERSION}`,
    
    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Sample rate для отправки событий (0.0 - 1.0)
    sampleRate: SAMPLE_RATE,
    
    // Performance traces sample rate
    tracesSampleRate: TRACES_SAMPLE_RATE,
    
    // Session Replay sample rate
    replaysSessionSampleRate: 0.1, // 10% обычных сессий
    replaysOnErrorSampleRate: 1.0, // 100% сессий с ошибками
    
    // Фильтрация ошибок
    beforeSend(event, hint) {
      // Игнорируем некоторые ошибки
      const error = hint.originalException as Error;
      
      // Игнорируем ошибки расширений браузера
      if (error?.message?.includes('chrome-extension://')) {
        return null;
      }
      
      // Игнорируем ResizeObserver loop ошибки
      if (error?.message?.includes('ResizeObserver loop')) {
        return null;
      }
      
      return event;
    },
    
    // Игнорируем определенные ошибки
    ignoreErrors: [
      // Ошибки браузера
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      // Расширения браузера
      'chrome-extension://',
      'moz-extension://',
    ],
    
    // Настройки для отладки
    debug: ENVIRONMENT === 'staging',
    
    // Транспорт
    transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  });

  // Установка пользовательского контекста (если нужно)
  Sentry.setContext('app', {
    name: 'Data Parse Desk',
    version: APP_VERSION,
  });
};

// Хелперы для работы с Sentry
export const captureException = (error: Error, context?: Record<string, unknown>) => {
  if (context) {
    Sentry.setContext('custom', context);
  }
  Sentry.captureException(error);
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

export const setUser = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};

export const clearUser = () => {
  Sentry.setUser(null);
};

export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

// Экспортируем Sentry для прямого использования
export { Sentry };
