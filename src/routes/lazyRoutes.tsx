/**
 * Lazy Loaded Routes
 * Оптимизация: code splitting для уменьшения initial bundle
 */

import { lazy } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Lazy load всех страниц для уменьшения initial bundle
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const DatabaseView = lazy(() => import('@/pages/DatabaseView'));
export const Analytics = lazy(() => import('@/pages/Analytics'));
export const Reports = lazy(() => import('@/pages/Reports'));
export const LoginPage = lazy(() => import('@/pages/LoginPage'));
export const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
export const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
export const NotFound = lazy(() => import('@/pages/NotFound'));

// Fallback компонент для lazy loading
export const LazyLoadFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" text="Загрузка страницы..." />
  </div>
);
