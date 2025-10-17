/**
 * Code Splitting Utilities
 * Утилиты для оптимизации bundle size через code-splitting
 */

import { lazy, ComponentType, Suspense } from 'react';

// Lazy loading для страниц
export const LazyDashboard = lazy(() => import('../pages/Dashboard'));
export const LazyDatabaseView = lazy(() => import('../pages/DatabaseView'));
export const LazyAnalytics = lazy(() => import('../pages/Analytics'));
export const LazyReports = lazy(() => import('../pages/Reports'));
export const LazyLoginPage = lazy(() => import('../pages/LoginPage'));
export const LazyRegisterPage = lazy(() => import('../pages/RegisterPage'));
export const LazyProfilePage = lazy(() => import('../pages/ProfilePage'));

// Lazy loading для тяжелых компонентов
export const LazyDataTable = lazy(() => import('../components/DataTable'));
export const LazyChartBuilder = lazy(() => import('../components/charts/ChartBuilder'));
export const LazyPivotTable = lazy(() => import('../components/charts/PivotTable'));
export const LazyDashboardBuilder = lazy(() => import('../components/charts/DashboardBuilder'));
export const LazyReportBuilder = lazy(() => import('../components/reports/ReportBuilder'));
export const LazyPDFExporter = lazy(() => import('../components/reports/PDFExporter'));

// Lazy loading для Aurora компонентов
export const LazyAuroraBackground = lazy(() => import('../components/aurora/effects/AuroraBackground'));
export const LazyAnimatedList = lazy(() => import('../components/aurora/animated/AnimatedList'));
export const LazyRelationshipGraph = lazy(() => import('../components/relations/RelationshipGraph'));

// Lazy loading для утилит
export const LazyFormulaEngine = lazy(() => import('../utils/formulaEngine'));
export const LazyMLMapper = lazy(() => import('../utils/mlMapper'));
export const LazyAdvancedValidation = lazy(() => import('../utils/advancedValidation'));

// Функция для создания lazy компонента с fallback
export function createLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ComponentType<unknown>
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: Record<string, unknown>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Preloading стратегии
export class PreloadManager {
  private static preloadedComponents = new Set<string>();
  
  /**
   * Предзагрузка компонента
   */
  static async preloadComponent(componentName: string, importFn: () => Promise<ComponentType<unknown>>) {
    if (this.preloadedComponents.has(componentName)) {
      return;
    }
    
    try {
      await importFn();
      this.preloadedComponents.add(componentName);
    } catch (error) {
      console.warn(`Failed to preload component ${componentName}:`, error);
    }
  }
  
  /**
   * Предзагрузка критичных компонентов
   */
  static async preloadCriticalComponents() {
    const criticalComponents = [
      { name: 'DataTable', importFn: () => import('../components/DataTable') },
      { name: 'DatabaseView', importFn: () => import('../pages/DatabaseView') },
      { name: 'FileImportDialog', importFn: () => import('../components/import/FileImportDialog') },
    ];
    
    await Promise.all(
      criticalComponents.map(comp => 
        this.preloadComponent(comp.name, comp.importFn)
      )
    );
  }
  
  /**
   * Предзагрузка на основе пользовательских действий
   */
  static async preloadOnHover(componentName: string, importFn: () => Promise<ComponentType<unknown>>) {
    // Предзагружаем при наведении мыши
    const preloadHandler = () => {
      this.preloadComponent(componentName, importFn);
      // Удаляем обработчик после предзагрузки
      document.removeEventListener('mouseenter', preloadHandler);
    };
    
    document.addEventListener('mouseenter', preloadHandler);
  }
  
  /**
   * Предзагрузка на основе роута
   */
  static async preloadForRoute(route: string) {
    const routeComponents: Record<string, () => Promise<ComponentType<unknown>>> = {
      '/dashboard': () => import('../pages/Dashboard'),
      '/database': () => import('../pages/DatabaseView'),
      '/analytics': () => import('../pages/Analytics'),
      '/reports': () => import('../pages/Reports'),
    };
    
    const importFn = routeComponents[route];
    if (importFn) {
      await this.preloadComponent(route, importFn);
    }
  }
}

// Bundle analyzer утилиты
export class BundleAnalyzer {
  /**
   * Анализ размера bundle
   */
  static analyzeBundleSize() {
    if (typeof window === 'undefined') return null;
    
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    const analysis = {
      scripts: scripts.map(script => ({
        src: script.getAttribute('src'),
        size: this.estimateScriptSize(script as HTMLScriptElement),
      })),
      styles: styles.map(style => ({
        href: style.getAttribute('href'),
        size: this.estimateStyleSize(style as HTMLLinkElement),
      })),
      totalEstimatedSize: 0,
    };
    
    analysis.totalEstimatedSize = [
      ...analysis.scripts,
      ...analysis.styles,
    ].reduce((total, asset) => total + asset.size, 0);
    
    return analysis;
  }
  
  /**
   * Оценка размера скрипта
   */
  private static estimateScriptSize(script: HTMLScriptElement): number {
    // Базовая оценка на основе URL
    const src = script.src;
    if (src.includes('vendor') || src.includes('chunk')) {
      return 100 * 1024; // 100KB для vendor chunks
    }
    return 50 * 1024; // 50KB для остальных
  }
  
  /**
   * Оценка размера стилей
   */
  private static estimateStyleSize(style: HTMLLinkElement): number {
    const href = style.href;
    if (href.includes('vendor') || href.includes('chunk')) {
      return 50 * 1024; // 50KB для vendor styles
    }
    return 20 * 1024; // 20KB для остальных
  }
  
  /**
   * Рекомендации по оптимизации
   */
  static getOptimizationRecommendations() {
    const analysis = this.analyzeBundleSize();
    if (!analysis) return [];
    
    const recommendations = [];
    
    if (analysis.totalEstimatedSize > 1024 * 1024) { // > 1MB
      recommendations.push({
        type: 'warning',
        message: 'Bundle size exceeds 1MB. Consider code-splitting.',
        action: 'Implement lazy loading for non-critical components',
      });
    }
    
    const largeScripts = analysis.scripts.filter(script => script.size > 200 * 1024);
    if (largeScripts.length > 0) {
      recommendations.push({
        type: 'info',
        message: `Found ${largeScripts.length} large scripts. Consider splitting.`,
        action: 'Split large vendor chunks into smaller pieces',
      });
    }
    
    return recommendations;
  }
}

// Tree shaking утилиты
export class TreeShakingOptimizer {
  /**
   * Проверка неиспользуемых импортов
   */
  static checkUnusedImports() {
    // В production это будет выполняться на этапе сборки
    // Placeholder для будущей реализации
    return;
  }
  
  /**
   * Оптимизация импортов
   */
  static optimizeImports() {
    // Рекомендации по оптимизации импортов
    return {
      useNamedImports: 'Use named imports instead of default imports where possible',
      avoidWildcardImports: 'Avoid wildcard imports (*) to enable better tree shaking',
      separateVendorChunks: 'Separate vendor libraries into their own chunks',
      useDynamicImports: 'Use dynamic imports for large optional dependencies',
    };
  }
}

// Performance monitoring для code-splitting
export class CodeSplittingMonitor {
  private static loadTimes = new Map<string, number>();
  
  /**
   * Отслеживание времени загрузки компонентов
   */
  static trackComponentLoad(componentName: string, loadTime: number) {
    this.loadTimes.set(componentName, loadTime);
  }
  
  /**
   * Получение статистики загрузки
   */
  static getLoadStatistics() {
    const times = Array.from(this.loadTimes.values());
    return {
      averageLoadTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxLoadTime: Math.max(...times),
      minLoadTime: Math.min(...times),
      totalComponents: times.length,
    };
  }
  
  /**
   * Проверка производительности code-splitting
   */
  static validatePerformance() {
    const stats = this.getLoadStatistics();
    const issues = [];
    
    if (stats.averageLoadTime > 1000) {
      issues.push(`Average component load time is ${stats.averageLoadTime}ms (target: <1000ms)`);
    }
    
    if (stats.maxLoadTime > 3000) {
      issues.push(`Slowest component load time is ${stats.maxLoadTime}ms (target: <3000ms)`);
    }
    
    return {
      passed: issues.length === 0,
      issues,
      statistics: stats,
    };
  }
}

// Экспорт всех утилит
export {
  PreloadManager,
  BundleAnalyzer,
  TreeShakingOptimizer,
  CodeSplittingMonitor,
};