/**
 * Advanced Monitoring System
 * Расширенная система мониторинга для VHData
 */

import { captureException, captureMessage, addBreadcrumb } from './sentry';

// Типы метрик
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface UserAction {
  action: string;
  component: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ErrorMetric {
  error: string;
  component: string;
  stack?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Класс для сбора метрик
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: PerformanceMetric[] = [];
  private userActions: UserAction[] = [];
  private errors: ErrorMetric[] = [];
  private isEnabled: boolean = true;

  private constructor() {
    this.isEnabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_MONITORING === 'true';
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Записывает метрику производительности
   */
  recordMetric(name: string, value: number, unit: string = 'ms', tags?: Record<string, string>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Отправляем в Sentry
    captureMessage(`Metric: ${name} = ${value}${unit}`, 'info', {
      extra: { metric, tags },
    });

    // Ограничиваем размер массива
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  /**
   * Записывает действие пользователя
   */
  recordUserAction(action: string, component: string, metadata?: Record<string, unknown>): void {
    if (!this.isEnabled) return;

    const userAction: UserAction = {
      action,
      component,
      timestamp: Date.now(),
      metadata,
    };

    this.userActions.push(userAction);

    // Добавляем breadcrumb в Sentry
    addBreadcrumb({
      message: `${component}: ${action}`,
      category: 'user-action',
      level: 'info',
      data: metadata,
    });

    // Ограничиваем размер массива
    if (this.userActions.length > 1000) {
      this.userActions = this.userActions.slice(-500);
    }
  }

  /**
   * Записывает ошибку
   */
  recordError(error: string, component: string, severity: ErrorMetric['severity'] = 'medium', stack?: string): void {
    if (!this.isEnabled) return;

    const errorMetric: ErrorMetric = {
      error,
      component,
      stack,
      timestamp: Date.now(),
      severity,
    };

    this.errors.push(errorMetric);

    // Отправляем в Sentry
    const sentryLevel = severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : 'warning';
    captureMessage(`Error in ${component}: ${error}`, sentryLevel, {
      extra: { errorMetric, stack },
    });

    // Ограничиваем размер массива
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-500);
    }
  }

  /**
   * Получает все метрики
   */
  getMetrics(): {
    performance: PerformanceMetric[];
    userActions: UserAction[];
    errors: ErrorMetric[];
  } {
    return {
      performance: [...this.metrics],
      userActions: [...this.userActions],
      errors: [...this.errors],
    };
  }

  /**
   * Получает метрики за период
   */
  getMetricsForPeriod(startTime: number, endTime: number): {
    performance: PerformanceMetric[];
    userActions: UserAction[];
    errors: ErrorMetric[];
  } {
    const filterByTime = <T extends { timestamp: number }>(items: T[]) =>
      items.filter(item => item.timestamp >= startTime && item.timestamp <= endTime);

    return {
      performance: filterByTime(this.metrics),
      userActions: filterByTime(this.userActions),
      errors: filterByTime(this.errors),
    };
  }

  /**
   * Очищает все метрики
   */
  clearMetrics(): void {
    this.metrics = [];
    this.userActions = [];
    this.errors = [];
  }

  /**
   * Экспортирует метрики в JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }
}

// Класс для мониторинга производительности
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observer: PerformanceObserver | null = null;
  private metricsCollector: MetricsCollector;

  private constructor() {
    this.metricsCollector = MetricsCollector.getInstance();
    this.initPerformanceObserver();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Инициализирует Performance Observer
   */
  private initPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            this.metricsCollector.recordMetric(
              entry.name,
              entry.duration,
              'ms',
              { type: 'performance-measure' }
            );
          } else if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordNavigationMetrics(navEntry);
          } else if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordResourceMetrics(resourceEntry);
          }
        });
      });

      // Наблюдаем за различными типами метрик
      this.observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    } catch (error) {
      console.warn('Failed to initialize Performance Observer:', error);
    }
  }

  /**
   * Записывает метрики навигации
   */
  private recordNavigationMetrics(entry: PerformanceNavigationTiming): void {
    const metrics = [
      { name: 'dom-content-loaded', value: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart },
      { name: 'load-complete', value: entry.loadEventEnd - entry.loadEventStart },
      { name: 'first-byte', value: entry.responseStart - entry.requestStart },
      { name: 'dom-interactive', value: entry.domInteractive - entry.navigationStart },
    ];

    metrics.forEach(({ name, value }) => {
      if (value > 0) {
        this.metricsCollector.recordMetric(name, value, 'ms', { type: 'navigation' });
      }
    });
  }

  /**
   * Записывает метрики ресурсов
   */
  private recordResourceMetrics(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.requestStart;
    const size = entry.transferSize || 0;
    
    this.metricsCollector.recordMetric(
      'resource-load',
      duration,
      'ms',
      {
        type: 'resource',
        resource: entry.name,
        size: size.toString(),
      }
    );
  }

  /**
   * Начинает измерение производительности
   */
  startMeasure(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * Заканчивает измерение производительности
   */
  endMeasure(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  }

  /**
   * Измеряет время выполнения функции
   */
  async measureFunction<T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    this.startMeasure(name);
    try {
      const result = await fn();
      return result;
    } finally {
      this.endMeasure(name);
    }
  }

  /**
   * Получает Web Vitals метрики
   */
  getWebVitals(): Promise<{
    CLS: number;
    FID: number;
    FCP: number;
    LCP: number;
    TTFB: number;
  }> {
    return new Promise((resolve) => {
      const vitals: any = {};
      let completed = 0;

      const checkComplete = () => {
        completed++;
        if (completed >= 5) {
          resolve(vitals);
        }
      };

      // CLS (Cumulative Layout Shift)
      if ('web-vitals' in window) {
        import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
          getCLS((metric) => { vitals.CLS = metric.value; checkComplete(); });
          getFID((metric) => { vitals.FID = metric.value; checkComplete(); });
          getFCP((metric) => { vitals.FCP = metric.value; checkComplete(); });
          getLCP((metric) => { vitals.LCP = metric.value; checkComplete(); });
          getTTFB((metric) => { vitals.TTFB = metric.value; checkComplete(); });
        });
      } else {
        // Fallback если web-vitals не установлен
        setTimeout(() => {
          vitals.CLS = 0;
          vitals.FID = 0;
          vitals.FCP = 0;
          vitals.LCP = 0;
          vitals.TTFB = 0;
          resolve(vitals);
        }, 1000);
      }
    });
  }

  /**
   * Останавливает мониторинг
   */
  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Класс для мониторинга ошибок
export class ErrorMonitor {
  private static instance: ErrorMonitor;
  private metricsCollector: MetricsCollector;

  private constructor() {
    this.metricsCollector = MetricsCollector.getInstance();
    this.initErrorHandling();
  }

  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  /**
   * Инициализирует обработку ошибок
   */
  private initErrorHandling(): void {
    // Глобальные ошибки JavaScript
    window.addEventListener('error', (event) => {
      this.recordError(
        event.error?.message || event.message,
        'global',
        'high',
        event.error?.stack
      );
    });

    // Необработанные Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(
        event.reason?.message || String(event.reason),
        'promise',
        'medium',
        event.reason?.stack
      );
    });

    // React Error Boundary (если используется)
    if (typeof window !== 'undefined') {
      (window as any).__REACT_ERROR_BOUNDARY__ = (error: Error, errorInfo: any) => {
        this.recordError(
          error.message,
          'react-boundary',
          'high',
          error.stack
        );
      };
    }
  }

  /**
   * Записывает ошибку
   */
  recordError(error: string, component: string, severity: ErrorMetric['severity'] = 'medium', stack?: string): void {
    this.metricsCollector.recordError(error, component, severity, stack);
  }

  /**
   * Получает статистику ошибок
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    recent: ErrorMetric[];
  } {
    const { errors } = this.metricsCollector.getMetrics();
    
    const bySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byComponent = errors.reduce((acc, error) => {
      acc[error.component] = (acc[error.component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recent = errors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      total: errors.length,
      bySeverity,
      byComponent,
      recent,
    };
  }
}

// Хуки для React компонентов
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();
  const metricsCollector = MetricsCollector.getInstance();

  return {
    startMeasure: monitor.startMeasure.bind(monitor),
    endMeasure: monitor.endMeasure.bind(monitor),
    measureFunction: monitor.measureFunction.bind(monitor),
    recordMetric: metricsCollector.recordMetric.bind(metricsCollector),
    recordUserAction: metricsCollector.recordUserAction.bind(metricsCollector),
    getWebVitals: monitor.getWebVitals.bind(monitor),
  };
}

export function useErrorMonitor() {
  const monitor = ErrorMonitor.getInstance();

  return {
    recordError: monitor.recordError.bind(monitor),
    getErrorStats: monitor.getErrorStats.bind(monitor),
  };
}

// Экспорт синглтонов
export const metricsCollector = MetricsCollector.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();
export const errorMonitor = ErrorMonitor.getInstance();

// Автоматическая инициализация в production
if (import.meta.env.PROD) {
  performanceMonitor.getWebVitals().then((vitals) => {
    Object.entries(vitals).forEach(([name, value]) => {
      metricsCollector.recordMetric(name, value, 'ms', { type: 'web-vital' });
    });
  });
}