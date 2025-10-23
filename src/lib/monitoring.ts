/**
 * Performance Monitoring and Error Tracking
 *
 * Comprehensive monitoring setup using Sentry and custom metrics
 */

import * as Sentry from '@sentry/react';
import {
  useEffect,
  useCallback,
  startTransition,
} from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

// Performance metrics interface
export interface PerformanceMetrics {
  /** First Contentful Paint */
  fcp?: number;
  /** Largest Contentful Paint */
  lcp?: number;
  /** First Input Delay */
  fid?: number;
  /** Cumulative Layout Shift */
  cls?: number;
  /** Time to Interactive */
  tti?: number;
  /** Total Blocking Time */
  tbt?: number;
}

// Custom performance entry types
interface CustomPerformanceEntry {
  name: string;
  duration: number;
  startTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initializeMonitoring() {
  // Only initialize in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,

      // Performance Monitoring
      integrations: [
        // React Router integration
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes,
        }),
        // Web Vitals
        Sentry.browserTracingIntegration(),
        // Replay Sessions
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring

      // Session Replay
      replaysSessionSampleRate: 0.1, // Sample 10% of sessions
      replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors

      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'development',

      // Ignore specific errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'Network request failed',
        'Failed to fetch',
      ],

      // Before sending events
      beforeSend(event, hint) {
        // Filter out known non-issues
        if (event.exception) {
          const error = hint.originalException;
          if (error instanceof Error && error.message.includes('ResizeObserver')) {
            return null;
          }
        }
        return event;
      },

      // Custom tags
      initialScope: {
        tags: {
          app_version: import.meta.env.VITE_APP_VERSION || 'development',
        },
      },
    });
  }

  // Initialize custom performance tracking
  initializeWebVitals();
  initializeCustomMetrics();
}

/**
 * Initialize Web Vitals tracking
 */
function initializeWebVitals() {
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      reportMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // Browser doesn't support this metric
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        reportMetric('FID', fidEntry.processingStart - fidEntry.startTime);
      });
    });

    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // Browser doesn't support this metric
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          reportMetric('CLS', clsValue);
        }
      }
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // Browser doesn't support this metric
    }
  }

  // First Contentful Paint (FCP)
  window.addEventListener('load', () => {
    const perfData = window.performance.getEntriesByType('paint');
    const fcp = perfData.find((entry) => entry.name === 'first-contentful-paint');

    if (fcp) {
      reportMetric('FCP', fcp.startTime);
    }
  });
}

/**
 * Initialize custom metrics tracking
 */
function initializeCustomMetrics() {
  // Track navigation timing
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigation) {
      reportMetric('DNS', navigation.domainLookupEnd - navigation.domainLookupStart);
      reportMetric('TCP', navigation.connectEnd - navigation.connectStart);
      reportMetric('Request', navigation.responseStart - navigation.requestStart);
      reportMetric('Response', navigation.responseEnd - navigation.responseStart);
      reportMetric('DOMParsing', navigation.domInteractive - navigation.responseEnd);
      reportMetric('DOMContentLoaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
      reportMetric('LoadComplete', navigation.loadEventEnd - navigation.loadEventStart);
      reportMetric('TotalLoadTime', navigation.loadEventEnd - navigation.fetchStart);
    }
  });

  // Track long tasks (> 50ms)
  if ('PerformanceObserver' in window) {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        reportMetric('LongTask', entry.duration, {
          name: entry.name,
          startTime: entry.startTime,
        });
      }
    });

    try {
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      // Browser doesn't support longtask
    }
  }
}

/**
 * Report a metric to monitoring services
 */
function reportMetric(name: string, value: number, metadata?: Record<string, any>) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Performance] ${name}:`, value, metadata);
  }

  // Send to Sentry
  if (import.meta.env.PROD) {
    Sentry.metrics.distribution(name, value, {
      unit: 'millisecond',
      tags: metadata,
    });
  }

  // Store in localStorage for dashboard
  storeMetric(name, value, metadata);
}

/**
 * Store metric in localStorage for performance dashboard
 */
function storeMetric(name: string, value: number, metadata?: Record<string, any>) {
  const key = 'performance_metrics';
  const stored = localStorage.getItem(key);
  const metrics: Array<{ name: string; value: number; timestamp: number; metadata?: Record<string, any> }> = stored
    ? JSON.parse(stored)
    : [];

  metrics.push({
    name,
    value,
    timestamp: Date.now(),
    metadata,
  });

  // Keep only last 1000 metrics
  if (metrics.length > 1000) {
    metrics.splice(0, metrics.length - 1000);
  }

  localStorage.setItem(key, JSON.stringify(metrics));
}

/**
 * Get stored performance metrics
 */
export function getPerformanceMetrics(hours: number = 24): CustomPerformanceEntry[] {
  const key = 'performance_metrics';
  const stored = localStorage.getItem(key);

  if (!stored) return [];

  const metrics = JSON.parse(stored);
  const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

  return metrics
    .filter((m: any) => m.timestamp > cutoffTime)
    .map((m: any) => ({
      name: m.name,
      duration: m.value,
      startTime: m.timestamp,
      metadata: m.metadata,
    }));
}

/**
 * Get aggregated metrics by name
 */
export function getAggregatedMetrics(hours: number = 24): Record<string, {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p75: number;
  p95: number;
  p99: number;
}> {
  const metrics = getPerformanceMetrics(hours);
  const grouped: Record<string, number[]> = {};

  // Group by metric name
  metrics.forEach((metric) => {
    if (!grouped[metric.name]) {
      grouped[metric.name] = [];
    }
    grouped[metric.name].push(metric.duration);
  });

  // Calculate aggregations
  const result: Record<string, any> = {};

  Object.entries(grouped).forEach(([name, values]) => {
    const sorted = values.slice().sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    result[name] = {
      count: values.length,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    };
  });

  return result;
}

/**
 * Calculate percentile
 */
function percentile(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Clear stored metrics
 */
export function clearPerformanceMetrics() {
  localStorage.removeItem('performance_metrics');
}

/**
 * Track custom operation duration
 */
export function trackOperation<T>(
  name: string,
  operation: () => T | Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();

  const finish = (result: T) => {
    const duration = performance.now() - startTime;
    reportMetric(name, duration, metadata);
    return result;
  };

  try {
    const result = operation();

    if (result instanceof Promise) {
      return result.then(finish);
    }

    return Promise.resolve(finish(result));
  } catch (error) {
    const duration = performance.now() - startTime;
    reportMetric(name, duration, { ...metadata, error: true });
    throw error;
  }
}

/**
 * React Hook: Track component mount/unmount performance
 */
export function usePerformanceTracking(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      reportMetric(`Component:${componentName}`, duration);
    };
  }, [componentName]);
}

/**
 * React Hook: Track render performance
 */
export function useRenderTracking(componentName: string) {
  const renderCount = useCallback(() => {
    reportMetric(`Render:${componentName}`, 1);
  }, [componentName]);

  useEffect(() => {
    renderCount();
  });
}

/**
 * Database query performance tracker
 */
export class DatabaseQueryTracker {
  private static queries: Array<{
    query: string;
    duration: number;
    timestamp: number;
    database: string;
  }> = [];

  static trackQuery(
    database: string,
    query: string,
    duration: number
  ) {
    this.queries.push({
      database,
      query,
      duration,
      timestamp: Date.now(),
    });

    // Report metric
    reportMetric('DatabaseQuery', duration, { database, query: query.substring(0, 100) });

    // Keep only last 500 queries
    if (this.queries.length > 500) {
      this.queries.shift();
    }
  }

  static getSlowQueries(threshold: number = 100): typeof this.queries {
    return this.queries.filter((q) => q.duration > threshold);
  }

  static getAverageQueryTime(database?: string): number {
    const queries = database
      ? this.queries.filter((q) => q.database === database)
      : this.queries;

    if (queries.length === 0) return 0;

    const sum = queries.reduce((acc, q) => acc + q.duration, 0);
    return sum / queries.length;
  }

  static clear() {
    this.queries = [];
  }
}

/**
 * API request performance tracker
 */
export class APIRequestTracker {
  private static requests: Array<{
    endpoint: string;
    method: string;
    duration: number;
    status: number;
    timestamp: number;
  }> = [];

  static trackRequest(
    endpoint: string,
    method: string,
    duration: number,
    status: number
  ) {
    this.requests.push({
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now(),
    });

    // Report metric
    reportMetric('APIRequest', duration, {
      endpoint,
      method,
      status,
    });

    // Keep only last 500 requests
    if (this.requests.length > 500) {
      this.requests.shift();
    }
  }

  static getSlowRequests(threshold: number = 1000): typeof this.requests {
    return this.requests.filter((r) => r.duration > threshold);
  }

  static getFailedRequests(): typeof this.requests {
    return this.requests.filter((r) => r.status >= 400);
  }

  static getAverageResponseTime(endpoint?: string): number {
    const requests = endpoint
      ? this.requests.filter((r) => r.endpoint === endpoint)
      : this.requests;

    if (requests.length === 0) return 0;

    const sum = requests.reduce((acc, r) => acc + r.duration, 0);
    return sum / requests.length;
  }

  static clear() {
    this.requests = [];
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  static getCurrentUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1048576; // Convert to MB
    }
    return 0;
  }

  static getMemoryLimit(): number {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return memory.jsHeapSizeLimit / 1048576; // Convert to MB
    }
    return 0;
  }

  static trackMemoryUsage() {
    const usage = this.getCurrentUsage();
    const limit = this.getMemoryLimit();
    const percentage = (usage / limit) * 100;

    reportMetric('MemoryUsage', usage, {
      limit,
      percentage: percentage.toFixed(2),
    });

    return { usage, limit, percentage };
  }
}

/**
 * Export metrics for analysis
 */
export function exportMetrics(): string {
  const metrics = getPerformanceMetrics(24);
  const aggregated = getAggregatedMetrics(24);
  const slowQueries = DatabaseQueryTracker.getSlowQueries();
  const slowRequests = APIRequestTracker.getSlowRequests();
  const failedRequests = APIRequestTracker.getFailedRequests();

  const report = {
    exportedAt: new Date().toISOString(),
    summary: aggregated,
    webVitals: {
      lcp: aggregated.LCP,
      fid: aggregated.FID,
      cls: aggregated.CLS,
      fcp: aggregated.FCP,
    },
    loadTimes: {
      dns: aggregated.DNS,
      tcp: aggregated.TCP,
      total: aggregated.TotalLoadTime,
    },
    slowQueries,
    slowRequests,
    failedRequests,
    rawMetrics: metrics,
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Get performance score (0-100)
 */
export function getPerformanceScore(): number {
  const aggregated = getAggregatedMetrics(1); // Last hour
  let score = 100;

  // LCP (Largest Contentful Paint)
  if (aggregated.LCP) {
    if (aggregated.LCP.p75 > 4000) score -= 20;
    else if (aggregated.LCP.p75 > 2500) score -= 10;
  }

  // FID (First Input Delay)
  if (aggregated.FID) {
    if (aggregated.FID.p75 > 300) score -= 20;
    else if (aggregated.FID.p75 > 100) score -= 10;
  }

  // CLS (Cumulative Layout Shift)
  if (aggregated.CLS) {
    if (aggregated.CLS.p75 > 0.25) score -= 20;
    else if (aggregated.CLS.p75 > 0.1) score -= 10;
  }

  // API Response Time
  const avgApiTime = APIRequestTracker.getAverageResponseTime();
  if (avgApiTime > 2000) score -= 15;
  else if (avgApiTime > 1000) score -= 10;

  // Failed Requests
  const failedCount = APIRequestTracker.getFailedRequests().length;
  const totalRequests = APIRequestTracker['requests'].length;
  const failureRate = totalRequests > 0 ? (failedCount / totalRequests) * 100 : 0;

  if (failureRate > 5) score -= 15;
  else if (failureRate > 2) score -= 10;

  return Math.max(0, score);
}
