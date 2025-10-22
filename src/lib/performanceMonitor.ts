/**
 * Performance Monitoring Utilities
 * Track and report performance metrics
 */

import { logger } from './logger';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 500;
  private timers: Map<string, number> = new Map();

  private constructor() {
    // Singleton
    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Observe long tasks
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Log tasks longer than 50ms
            this.recordMetric('long-task', entry.duration, {
              entryType: entry.entryType,
              startTime: entry.startTime,
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask', 'measure'] });
    } catch (error) {
      // PerformanceObserver not supported
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End timing and record metric
   */
  endTimer(name: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      logger.warn(`Timer "${name}" was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);
    this.recordMetric(name, duration, metadata);

    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations
    if (duration > 1000) {
      logger.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`, metadata);
    }
  }

  /**
   * Measure async function execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure sync function execution time
   */
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(name, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Get metrics by name
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Get average duration for a metric
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get statistics for a metric
   */
  getStatistics(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
  } {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, median: 0 };
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const min = durations[0];
    const max = durations[count - 1];
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const median = durations[Math.floor(count / 2)];

    return { count, min, max, avg, median };
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Get Web Vitals
   */
  getWebVitals(): {
    FCP?: number;
    LCP?: number;
    FID?: number;
    CLS?: number;
    TTFB?: number;
  } {
    const vitals: any = {};

    try {
      // First Contentful Paint
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        vitals.FCP = fcpEntry.startTime;
      }

      // Largest Contentful Paint
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.LCP = lastEntry.startTime;
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });

      // Time to First Byte
      const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
      if (navigationEntry) {
        vitals.TTFB = navigationEntry.responseStart - navigationEntry.requestStart;
      }
    } catch (error) {
      logger.debug('Web Vitals not available', { error });
    }

    return vitals;
  }

  /**
   * Report metrics summary
   */
  reportSummary(): void {
    const summary: Record<string, any> = {};
    const uniqueNames = new Set(this.metrics.map((m) => m.name));

    uniqueNames.forEach((name) => {
      summary[name] = this.getStatistics(name);
    });

    logger.info('Performance Summary', {
      summary,
      totalMetrics: this.metrics.length,
      webVitals: this.getWebVitals(),
    });
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        summary: Object.fromEntries(
          Array.from(new Set(this.metrics.map((m) => m.name))).map((name) => [
            name,
            this.getStatistics(name),
          ])
        ),
        webVitals: this.getWebVitals(),
      },
      null,
      2
    );
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience function
export function measurePerformance<T>(name: string, fn: () => T): T {
  return performanceMonitor.measureSync(name, fn);
}

export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measureAsync(name, fn);
}
