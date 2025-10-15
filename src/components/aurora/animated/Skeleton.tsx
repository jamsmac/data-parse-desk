/**
 * Skeleton Component
 * Loading компоненты с shimmer эффектом
 */

import React, { forwardRef, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  /** Ширина skeleton */
  width?: string | number;
  
  /** Высота skeleton */
  height?: string | number;
  
  /** Вариант формы */
  variant?: 'rectangular' | 'circular' | 'rounded' | 'text';
  
  /** Включить shimmer анимацию */
  shimmer?: boolean;
  
  /** Включить pulse анимацию */
  pulse?: boolean;
  
  /** Дополнительные CSS классы */
  className?: string;
  
  /** Style объект */
  style?: React.CSSProperties;
  
  /** Aria-label для описания loading контента */
  ariaLabel?: string;
}

/**
 * Skeleton - базовый компонент для loading состояний
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width,
      height,
      variant = 'rectangular',
      shimmer = true,
      pulse = false,
      className,
      style,
      ariaLabel = 'Loading content',
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      rectangular: 'rounded-md',
      circular: 'rounded-full',
      rounded: 'rounded-lg',
      text: 'rounded',
    };

    const combinedStyles = {
      width,
      height: variant === 'text' ? '1em' : height,
      ...style,
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative overflow-hidden bg-white/10',
          variantClasses[variant],
          className
        )}
        style={combinedStyles}
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label={ariaLabel}
        animate={pulse ? 'pulse' : undefined}
        variants={
          pulse
            ? {
                pulse: {
                  opacity: [0.5, 1, 0.5],
                  transition: {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                },
              }
            : undefined
        }
      >
        {shimmer && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}
      </motion.div>
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * SkeletonText - текстовый skeleton
 */
export interface SkeletonTextProps extends Omit<SkeletonProps, 'variant'> {
  /** Количество строк */
  lines?: number;
  
  /** Ширина последней строки (процент) */
  lastLineWidth?: number;
}

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  (
    {
      lines = 3,
      lastLineWidth = 70,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div 
        ref={ref} 
        className={cn('space-y-2', className)}
        role="status"
        aria-busy="true"
        aria-label="Loading text content"
      >
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            width={index === lines - 1 ? `${lastLineWidth}%` : '100%'}
            height="1em"
            {...props}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

/**
 * SkeletonCard - skeleton для карточки
 */
export interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Показать аватар */
  avatar?: boolean;
  
  /** Количество строк текста */
  lines?: number;
  
  /** Показать кнопки */
  actions?: boolean;
  
  className?: string;
}

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    {
      avatar = true,
      lines = 3,
      actions = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-medium rounded-xl p-6 space-y-4',
          className
        )}
        role="status"
        aria-busy="true"
        aria-label="Loading card content"
        {...props}
      >
        {/* Header with avatar */}
        {avatar && (
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="40%" height="1.2em" />
              <Skeleton variant="text" width="60%" height="0.9em" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-2">
          <SkeletonText lines={lines} />
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex gap-2 pt-2">
            <Skeleton variant="rounded" width={80} height={36} />
            <Skeleton variant="rounded" width={80} height={36} />
          </div>
        )}
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

/**
 * SkeletonTable - skeleton для таблицы
 */
export interface SkeletonTableProps extends HTMLAttributes<HTMLDivElement> {
  /** Количество строк */
  rows?: number;
  
  /** Количество колонок */
  columns?: number;
  
  /** Показать заголовок */
  header?: boolean;
  
  className?: string;
}

export const SkeletonTable = forwardRef<HTMLDivElement, SkeletonTableProps>(
  (
    {
      rows = 5,
      columns = 4,
      header = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('space-y-3', className)}
        role="status"
        aria-busy="true"
        aria-label="Loading table data"
        {...props}
      >
        {/* Header */}
        {header && (
          <div className="flex gap-4 pb-2 border-b border-white/10">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={`header-${i}`}
                variant="text"
                width={`${100 / columns}%`}
                height="1.2em"
              />
            ))}
          </div>
        )}

        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                variant="text"
                width={`${100 / columns}%`}
                height="1em"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
);

SkeletonTable.displayName = 'SkeletonTable';

/**
 * SkeletonDashboard - skeleton для dashboard
 */
export interface SkeletonDashboardProps extends HTMLAttributes<HTMLDivElement> {
  /** Количество stat карточек */
  stats?: number;
  
  /** Показать график */
  chart?: boolean;
  
  className?: string;
}

export const SkeletonDashboard = forwardRef<HTMLDivElement, SkeletonDashboardProps>(
  (
    {
      stats = 4,
      chart = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('space-y-6', className)}
        role="status"
        aria-busy="true"
        aria-label="Loading dashboard"
        {...props}
      >
        {/* Stats Grid */}
        <div className={cn('grid gap-4', `grid-cols-${Math.min(stats, 4)}`)}>
          {Array.from({ length: stats }).map((_, i) => (
            <div
              key={`stat-${i}`}
              className="glass-medium rounded-xl p-6 space-y-2"
            >
              <Skeleton variant="text" width="60%" height="0.9em" />
              <Skeleton variant="text" width="40%" height="2em" />
            </div>
          ))}
        </div>

        {/* Chart */}
        {chart && (
          <div className="glass-medium rounded-xl p-6">
            <Skeleton variant="rectangular" width="100%" height={300} />
          </div>
        )}

        {/* Table */}
        <div className="glass-medium rounded-xl p-6">
          <SkeletonTable rows={5} columns={4} />
        </div>
      </div>
    );
  }
);

SkeletonDashboard.displayName = 'SkeletonDashboard';
