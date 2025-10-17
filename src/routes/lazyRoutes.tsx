/**
 * Lazy Loaded Routes
 * Оптимизация: code splitting для уменьшения initial bundle
 */

import { lazy } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Core pages - load quickly
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const DatabaseView = lazy(() => import('@/pages/DatabaseView'));

// Heavy pages with charts - separate chunks with prefetch
export const Analytics = lazy(() =>
  import(/* webpackChunkName: "analytics", webpackPrefetch: true */ '@/pages/Analytics')
);
export const Reports = lazy(() =>
  import(/* webpackChunkName: "reports", webpackPrefetch: true */ '@/pages/Reports')
);

// Auth pages - bundle together
export const LoginPage = lazy(() =>
  import(/* webpackChunkName: "auth" */ '@/pages/LoginPage')
);
export const RegisterPage = lazy(() =>
  import(/* webpackChunkName: "auth" */ '@/pages/RegisterPage')
);
export const ProfilePage = lazy(() =>
  import(/* webpackChunkName: "auth" */ '@/pages/ProfilePage')
);

// Settings - separate chunk
export const Settings = lazy(() =>
  import(/* webpackChunkName: "settings" */ '@/pages/Settings')
);

// Error page - small, load quickly
export const NotFound = lazy(() => import('@/pages/NotFound'));

// Fallback компонент для lazy loading
export const LazyLoadFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" text="Загрузка страницы..." />
  </div>
);
