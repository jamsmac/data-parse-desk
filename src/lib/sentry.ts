/**
 * Sentry Configuration for Production Error Monitoring
 * Provides comprehensive error tracking, performance monitoring, and user feedback
 */

import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry monitoring
 * Call this at the app entry point (main.tsx)
 */
export function initSentry() {
  // Only initialize in production or staging
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_SENTRY === "true") {
    Sentry.init({
      // DSN from environment variable - NEVER commit the actual DSN
      dsn: import.meta.env.VITE_SENTRY_DSN,

      // Environment configuration
      environment: import.meta.env.MODE || "production",

      // Integrations for better error context
      integrations: [
        // Browser tracing is now included by default in @sentry/react
        // Replay for session recording (optional) - disabled for now
        // Replay integration is not available in this version
        // To enable: install @sentry/replay separately
      ],

      // Performance Monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in production, 100% in dev

      // Session tracking
      autoSessionTracking: true,

      // Release tracking for better error grouping
      release: import.meta.env.VITE_APP_VERSION || "unknown",

      // Error filtering
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_SENTRY !== "true") {
          return null;
        }

        // Filter out non-error events
        if (event.exception) {
          const error = hint.originalException;

          // Filter out network errors that are expected
          if (error?.message?.includes("Network request failed")) {
            return null;
          }

          // Filter out user-cancelled requests
          if (error?.name === "AbortError") {
            return null;
          }

          // Filter out known third-party errors
          if (error?.message?.includes("ResizeObserver loop limit exceeded")) {
            return null;
          }
        }

        // Sanitize sensitive data
        if (event.request?.cookies) {
          delete event.request.cookies;
        }

        if (event.user) {
          // Only keep user ID, remove PII
          event.user = { id: event.user.id };
        }

        return event;
      },

      // Breadcrumb filtering
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === "console" && breadcrumb.level === "debug") {
          return null;
        }

        // Don't log sensitive form data
        if (breadcrumb.category === "ui.input" && breadcrumb.message?.includes("password")) {
          return null;
        }

        return breadcrumb;
      },

      // Configure what to include in error reports
      attachStacktrace: true,
      maxBreadcrumbs: 50,

      // User feedback dialog options
      beforeSendFeedback(feedback) {
        // Add additional context
        feedback.tags = {
          ...feedback.tags,
          page: window.location.pathname,
        };
        return feedback;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        "top.GLOBALS",
        // Facebook related errors
        "fb_xd_fragment",
        // Chrome extensions
        /extensions\//i,
        /^chrome:\/\//i,
        // Other plugins
        /plugin\.js/i,
        // Network errors (handled separately)
        "NetworkError",
        "Failed to fetch",
      ],

      // Don't capture errors from these URLs
      denyUrls: [
        // Chrome extensions
        /extensions\//i,
        /^chrome:\/\//i,
        // Firefox extensions
        /^moz-extension:\/\//i,
        // Safari extensions
        /^safari-extension:\/\//i,
      ],
    });
  }
}

/**
 * Set user context for better error tracking
 */
export function setSentryUser(user: { id: string; email?: string; username?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture custom events
 */
export function captureEvent(message: string, level: Sentry.SeverityLevel = "info", extra?: any) {
  Sentry.captureMessage(message, {
    level,
    extra,
  });
}

/**
 * Capture exceptions with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("additional_context", context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(message: string, data?: any) {
  Sentry.addBreadcrumb({
    message,
    category: "user-action",
    level: "info",
    data,
    timestamp: Date.now(),
  });
}

/**
 * Performance monitoring span (replaces startTransaction in Sentry v8+)
 */
export function startTransaction(name: string, op: string = "navigation") {
  return Sentry.startSpan({ name, op }, (span) => span);
}

/**
 * Create error boundary component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Create profiler component for performance monitoring
 */
export const SentryProfiler = Sentry.Profiler;

/**
 * Show user feedback dialog
 */
export function showReportDialog(options?: Sentry.ReportDialogOptions) {
  const client = Sentry.getClient();
  const scope = client?.getScope();
  const user = scope?.getUser();

  Sentry.showReportDialog({
    ...options,
    user: user || undefined,
    title: "Произошла ошибка",
    subtitle: "Наша команда была уведомлена.",
    subtitle2: "Если вы хотите помочь, расскажите нам, что произошло.",
    labelName: "Имя",
    labelEmail: "Email",
    labelComments: "Что произошло?",
    labelClose: "Закрыть",
    labelSubmit: "Отправить",
    errorGeneric: "Произошла ошибка при отправке отчета. Попробуйте позже.",
    errorFormEntry: "Некоторые поля не были заполнены правильно. Проверьте данные и попробуйте снова.",
    successMessage: "Ваш отчет был отправлен. Спасибо!",
  });
}

// Re-export Sentry for direct usage if needed
export { Sentry };