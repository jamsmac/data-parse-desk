import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry() {
  // Only initialize in production or when explicitly enabled
  const isDev = import.meta.env.DEV;
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDsn) {
    if (!isDev) {
      console.warn('Sentry DSN not configured');
    }
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,

    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring sample rate
    // 0.1 = 10% of transactions sent to Sentry
    tracesSampleRate: isDev ? 1.0 : 0.1,

    // Session Replay sample rate
    // 0.1 = 10% of sessions will be recorded
    replaysSessionSampleRate: isDev ? 1.0 : 0.1,

    // Replay on error sample rate
    // If error occurs, capture replay
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Ignore common errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // Supabase auth expected errors
      'Invalid Refresh Token',
      'Auth session missing',
    ],

    // Filter out localhost and dev URLs
    beforeSend(event, hint) {
      // Don't send events in development
      if (isDev) {
        console.log('Sentry event (dev):', event);
        return null;
      }

      // Filter out errors from browser extensions
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'stack' in error) {
          const stack = (error as Error).stack || '';
          if (
            stack.includes('extensions/') ||
            stack.includes('chrome-extension://') ||
            stack.includes('moz-extension://')
          ) {
            return null;
          }
        }
      }

      return event;
    },

    // Set user context
    beforeBreadcrumb(breadcrumb) {
      // Don't log console messages in breadcrumbs
      if (breadcrumb.category === 'console') {
        return null;
      }
      return breadcrumb;
    },
  });
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email?: string } | null) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

export { Sentry };
