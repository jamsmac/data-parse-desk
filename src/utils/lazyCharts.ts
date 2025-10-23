/**
 * Lazy Chart Components
 * Dynamically imports heavy chart library only when needed
 * Reduces initial bundle size by ~400KB
 */

// Type definitions for lazy-loaded recharts
export type RechartsModule = typeof import('recharts');

// Cache for loaded library
let rechartsCache: RechartsModule | null = null;

/**
 * Lazy load Recharts library
 * Only loads when charts need to be rendered
 */
export async function loadRecharts(): Promise<RechartsModule> {
  if (rechartsCache) {
    return rechartsCache;
  }

  console.log('[LazyLoad] Loading Recharts library...');
  const recharts = await import('recharts');
  rechartsCache = recharts;
  console.log('[LazyLoad] Recharts library loaded successfully');
  return recharts;
}

/**
 * Preload charts for better UX
 * Call this when user navigates to analytics pages
 */
export async function preloadCharts(): Promise<void> {
  try {
    console.log('[LazyLoad] Preloading charts...');
    await loadRecharts();
    console.log('[LazyLoad] Charts preloaded successfully');
  } catch (error) {
    console.error('[LazyLoad] Error preloading charts:', error);
  }
}

/**
 * Clear charts cache (useful for testing)
 */
export function clearChartsCache(): void {
  rechartsCache = null;
  console.log('[LazyLoad] Charts cache cleared');
}

/**
 * Get library size estimation for logging
 */
export function getChartLibrarySizeEstimation() {
  return {
    recharts: '~400KB',
    description: 'Loaded on-demand when viewing analytics/charts',
  };
}
