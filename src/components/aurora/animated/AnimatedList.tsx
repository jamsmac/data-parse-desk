/**
 * AnimatedList Component
 * Анимированный список с stagger эффектом и intersection observer
 */

import React, { forwardRef, HTMLAttributes, useRef, useEffect, useState } from 'react';
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStaggerContainer, useStaggerItem, AnimationDirection } from '@/hooks/aurora/useAuroraAnimation';

export interface AnimatedListProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  /** Дочерние элементы */
  children: React.ReactNode;
  
  /** Направление анимации */
  direction?: AnimationDirection;
  
  /** Задержка между элементами (секунды) */
  stagger?: number;
  
  /** Длительность анимации каждого элемента */
  duration?: number;
  
  /** Использовать intersection observer */
  useInView?: boolean;
  
  /** Threshold для intersection observer */
  threshold?: number;
  
  /** Margin для intersection observer */
  rootMargin?: string;
  
  /** Анимировать только один раз */
  once?: boolean;
  
  /** Дополнительные CSS классы */
  className?: string;
}

/**
 * AnimatedList - список с анимацией появления элементов
 * 
 * @example
 * ```tsx
 * <AnimatedList direction="bottom" stagger={0.1}>
 *   <div>Элемент 1</div>
 *   <div>Элемент 2</div>
 *   <div>Элемент 3</div>
 * </AnimatedList>
 * ```
 */
export const AnimatedList = forwardRef<HTMLDivElement, AnimatedListProps>(
  (
    {
      children,
      direction = 'bottom',
      stagger = 0.1,
      duration = 0.3,
      useInView = true,
      threshold = 0.1,
      rootMargin = '-50px',
      once = true,
      className,
      ...props
    },
    ref
  ) => {
    const [isInView, setIsInView] = useState(!useInView);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const containerVariants = useStaggerContainer(stagger);
    const itemVariants = useStaggerItem({ direction, duration });

    // Intersection Observer с fallback
    useEffect(() => {
      if (!useInView || !containerRef.current) return;

      // Проверка поддержки IntersectionObserver
      if (!('IntersectionObserver' in window)) {
        // Fallback: показать сразу
        setIsInView(true);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (once) {
              observer.disconnect();
            }
          } else if (!once) {
            setIsInView(false);
          }
        },
        { threshold, rootMargin }
      );

      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, [useInView, threshold, rootMargin, once]);

    // Преобразуем children в массив для анимации
    const childrenArray = React.Children.toArray(children);

    return (
      <motion.div
        ref={(node) => {
          // Combine refs
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
          if (containerRef) {
            containerRef.current = node;
          }
        }}
        className={cn('flex flex-col gap-4', className)}
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        {...props}
      >
        <AnimatePresence mode="popLayout">
          {childrenArray.map((child, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              layout
            >
              {child}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }
);

AnimatedList.displayName = 'AnimatedList';

/**
 * AnimatedGrid - сетка с анимацией появления элементов
 */
export interface AnimatedGridProps extends AnimatedListProps {
  /** Количество колонок */
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  
  /** Gap между элементами */
  gap?: 'sm' | 'md' | 'lg';
}

export const AnimatedGrid = forwardRef<HTMLDivElement, AnimatedGridProps>(
  (
    {
      children,
      columns = 3,
      gap = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const gapClasses = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    };

    const gridClasses = cn(
      'grid',
      `grid-cols-${columns}`,
      gapClasses[gap],
      className
    );

    return (
      <AnimatedList
        ref={ref}
        className={gridClasses}
        {...props}
      >
        {children}
      </AnimatedList>
    );
  }
);

AnimatedGrid.displayName = 'AnimatedGrid';

/**
 * AnimatedListItem - отдельный элемент с анимацией
 * Используйте для большего контроля над отдельными элементами
 */
export interface AnimatedListItemProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  children: React.ReactNode;
  direction?: AnimationDirection;
  duration?: number;
  delay?: number;
  className?: string;
}

export const AnimatedListItem = forwardRef<HTMLDivElement, AnimatedListItemProps>(
  (
    {
      children,
      direction = 'bottom',
      duration = 0.3,
      delay = 0,
      className,
      ...props
    },
    ref
  ) => {
    const itemVariants = useStaggerItem({ direction, duration });

    return (
      <motion.div
        ref={ref}
        className={className}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ delay }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedListItem.displayName = 'AnimatedListItem';
