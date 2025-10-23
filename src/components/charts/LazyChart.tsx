/**
 * Lazy Chart Wrapper
 * Dynamically loads recharts library only when chart is rendered
 */

import { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Lazy load chart components
export const LazyLineChart = lazy(() =>
  import('recharts').then((module) => ({
    default: module.LineChart,
  }))
);

export const LazyBarChart = lazy(() =>
  import('recharts').then((module) => ({
    default: module.BarChart,
  }))
);

export const LazyPieChart = lazy(() =>
  import('recharts').then((module) => ({
    default: module.PieChart,
  }))
);

export const LazyAreaChart = lazy(() =>
  import('recharts').then((module) => ({
    default: module.AreaChart,
  }))
);

// Re-export other components for convenience
export { Line, Bar, Pie, Area, Cell } from 'recharts';
export { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Chart Wrapper with Loading State
 * Provides consistent loading experience for all charts
 */
interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
}

export function ChartWrapper({ children, height = 300, className = '' }: ChartWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className={`flex items-center justify-center ${className}`} style={{ height }}>
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * Example Usage:
 *
 * import { ChartWrapper, LazyLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from '@/components/charts/LazyChart';
 *
 * function MyComponent() {
 *   return (
 *     <ChartWrapper>
 *       <ResponsiveContainer width="100%" height={300}>
 *         <LazyLineChart data={data}>
 *           <CartesianGrid strokeDasharray="3 3" />
 *           <XAxis dataKey="name" />
 *           <YAxis />
 *           <Tooltip />
 *           <Line type="monotone" dataKey="value" stroke="#8884d8" />
 *         </LazyLineChart>
 *       </ResponsiveContainer>
 *     </ChartWrapper>
 *   );
 * }
 */
