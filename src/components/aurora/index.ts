// src/components/aurora/index.ts
/**
 * Aurora Design System - Main Export
 * Modern glass-morphism components with fluid animations
 */

// Core Components
export { GlassContainer } from './core/GlassContainer';
export type { GlassContainerProps } from './core/GlassContainer';

export * from './core/GlassCard';
export * from './core/FluidButton';

// Error Handling
export { ErrorBoundary, ErrorBoundaryWrapper } from './ErrorBoundary';
export type { ErrorBoundaryProps, ErrorBoundaryWrapperProps } from './ErrorBoundary';

// Layouts
export * from './layouts/GlassDialog';
export * from './layouts/AuroraContainer';

// Effects
export { AuroraBackground } from './effects/AuroraBackground';

// Animations
export * from './animations/FadeIn';
export * from './animations/StaggerChildren';

// Animated Components
export * from './animated/AnimatedList';

// Hooks (re-export for convenience)
export { useReducedMotion } from '../../hooks/aurora/useReducedMotion';
export { useTheme } from '../../hooks/aurora/useTheme';
export { useDeviceType, useIsMobile, useTouchDevice } from '../../hooks/aurora/useDeviceType';
export * from '../../hooks/aurora/useAuroraAnimation';

// Performance Detection & Optimization
export {
  detectDevicePerformance,
  getPerformanceMetrics,
  getBrowserCapabilities,
  getEffectRecommendations,
  FPSMonitor
} from '../../lib/aurora/performanceDetector';
export type {
  DevicePerformance,
  PerformanceMetrics
} from '../../lib/aurora/performanceDetector';

// Performance Provider
export {
  AuroraConfigProvider,
  useAuroraConfig,
  useConditionalEffect,
  withPerformanceCheck
} from './providers/AuroraConfigProvider';
export type { AuroraConfig } from './providers/AuroraConfigProvider';

// Lazy-loaded components
export {
  AuroraBackgroundLazy,
  AuroraContainerLazy,
  AnimatedListLazy,
  lazyWithFallback
} from './lazy';
