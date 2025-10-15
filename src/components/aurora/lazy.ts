/**
 * Lazy Loading для Aurora компонентов
 * Динамическая загрузка тяжелых компонентов
 */

import React, { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { Skeleton } from './animated/Skeleton';

/**
 * Обертка для lazy loading с fallback
 */
export function lazyWithFallback<P = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode
): ComponentType<P> {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: P) {
    return React.createElement(
      Suspense,
      { fallback: fallback || React.createElement(Skeleton, { width: '100%', height: 200 }) },
      React.createElement(LazyComponent as ComponentType<P>, props)
    );
  } as ComponentType<P>;
}

/**
 * Lazy загрузка AuroraBackground
 * Используется для больших анимированных фонов
 */
export const AuroraBackgroundLazy = lazy(
  () => import('./effects/AuroraBackground').then(m => ({ default: m.AuroraBackground }))
);

/**
 * Lazy загрузка AuroraContainer
 * Для контейнеров с particles
 */
export const AuroraContainerLazy = lazy(
  () => import('./layouts/AuroraContainer').then(m => ({ default: m.AuroraContainer }))
);

/**
 * Lazy загрузка тяжелых анимаций
 */
export const AnimatedListLazy = lazy(
  () => import('./animated/AnimatedList').then(m => ({ default: m.AnimatedList }))
);

/**
 * Preload функция для предзагрузки компонентов
 * Используйте на hover или в idle time
 */
export const preloadAuroraBackground = () => {
  import('./effects/AuroraBackground');
};

export const preloadAuroraContainer = () => {
  import('./layouts/AuroraContainer');
};

export const preloadAnimatedList = () => {
  import('./animated/AnimatedList');
};

/**
 * Хук для preload в idle time
 */
export function useIdlePreload(preloadFn: () => void) {
  if (typeof window === 'undefined') return;
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadFn);
  } else {
    // Fallback для браузеров без requestIdleCallback
    setTimeout(preloadFn, 1000);
  }
}
