/**
 * Performance Testing Utilities
 * Инструменты для тестирования производительности VHData
 */

import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface FileParsingMetrics extends PerformanceMetrics {
  fileSize: number;
  rowsProcessed: number;
  rowsPerSecond: number;
  memoryPeak: number;
}

export interface DashboardLoadMetrics extends PerformanceMetrics {
  componentsLoaded: number;
  dataSize: number;
  renderTime: number;
  hydrationTime: number;
}

export interface RollupMetrics extends PerformanceMetrics {
  recordCount: number;
  rollupType: string;
  calculationTime: number;
  cacheHit: boolean;
}

class PerformanceTester {
  private metrics: PerformanceMetrics[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_PERFORMANCE_TESTS === 'true';
  }

  /**
   * Измерить время выполнения функции
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, unknown>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    if (!this.isEnabled) {
      const result = await fn();
      return { result, metrics: this.createEmptyMetrics(operation) };
    }

    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await fn();
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      const metrics: PerformanceMetrics = {
        operation,
        duration: endTime - startTime,
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        timestamp: Date.now(),
        metadata,
      };

      this.metrics.push(metrics);
      return { result, metrics };
    } catch (error) {
      const endTime = performance.now();
      const metrics: PerformanceMetrics = {
        operation: `${operation}_ERROR`,
        duration: endTime - startTime,
        memoryUsage: process.memoryUsage(),
        timestamp: Date.now(),
        metadata: { ...metadata, error: error instanceof Error ? error.message : 'Unknown error' },
      };
      
      this.metrics.push(metrics);
      throw error;
    }
  }

  /**
   * Тестирование парсинга больших файлов
   */
  async testFileParsing(
    file: File,
    parser: (file: File) => Promise<unknown[]>
  ): Promise<FileParsingMetrics> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const data = await parser(file);
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const metrics: FileParsingMetrics = {
      operation: 'file_parsing',
      duration: endTime - startTime,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
      },
      timestamp: Date.now(),
      fileSize: file.size,
      rowsProcessed: data.length,
      rowsPerSecond: data.length / ((endTime - startTime) / 1000),
      memoryPeak: endMemory.heapUsed,
      metadata: {
        fileName: file.name,
        fileType: file.type,
      },
    };

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * Тестирование загрузки Dashboard
   */
  async testDashboardLoad(
    loadFunction: () => Promise<{ components: number; dataSize: number }>
  ): Promise<DashboardLoadMetrics> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const { components, dataSize } = await loadFunction();
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const metrics: DashboardLoadMetrics = {
      operation: 'dashboard_load',
      duration: endTime - startTime,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
      },
      timestamp: Date.now(),
      componentsLoaded: components,
      dataSize,
      renderTime: endTime - startTime,
      hydrationTime: 0, // Будет измерено отдельно
    };

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * Тестирование Rollup вычислений
   */
  async testRollupCalculation(
    recordCount: number,
    rollupType: string,
    calculationFunction: () => Promise<unknown>
  ): Promise<RollupMetrics> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const result = await calculationFunction();
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const metrics: RollupMetrics = {
      operation: 'rollup_calculation',
      duration: endTime - startTime,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
      },
      timestamp: Date.now(),
      recordCount,
      rollupType,
      calculationTime: endTime - startTime,
      cacheHit: false, // Будет определяться логикой кэширования
    };

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * Получить все метрики
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Получить метрики по операции
   */
  getMetricsByOperation(operation: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.operation === operation);
  }

  /**
   * Очистить метрики
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Экспорт метрик в JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Создать пустые метрики для отключенного режима
   */
  private createEmptyMetrics(operation: string): PerformanceMetrics {
    return {
      operation,
      duration: 0,
      memoryUsage: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Проверить, соответствует ли производительность требованиям
   */
  validatePerformance(metrics: PerformanceMetrics): {
    passed: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let passed = true;

    // Проверка времени выполнения
    if (metrics.operation === 'file_parsing' && metrics.duration > 10000) {
      issues.push(`File parsing took ${metrics.duration}ms (max: 10000ms)`);
      passed = false;
    }

    if (metrics.operation === 'dashboard_load' && metrics.duration > 3000) {
      issues.push(`Dashboard load took ${metrics.duration}ms (max: 3000ms)`);
      passed = false;
    }

    if (metrics.operation === 'rollup_calculation' && metrics.duration > 1000) {
      issues.push(`Rollup calculation took ${metrics.duration}ms (max: 1000ms)`);
      passed = false;
    }

    // Проверка использования памяти
    if (metrics.memoryUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      issues.push(`High memory usage: ${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`);
      passed = false;
    }

    return { passed, issues };
  }
}

// Экспорт синглтона
export const performanceTester = new PerformanceTester();

// Экспорт типов
export type { PerformanceMetrics, FileParsingMetrics, DashboardLoadMetrics, RollupMetrics };