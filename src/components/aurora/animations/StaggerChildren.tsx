/**
 * StaggerChildren Animation Component
 * Aurora Design System - Последовательная анимация дочерних элементов
 */

import React, { memo } from 'react';
import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/aurora/useReducedMotion';

export interface StaggerChildrenProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  /** Дочерние элементы */
  children: React.ReactNode;

  /** Задержка между элементами (мс) */
  staggerDelay?: number;

  /** Начальная задержка (мс) */
  initialDelay?: number;

  /** Длительность анимации каждого элемента (мс) */
  duration?: number;

  /** Анимировать только при первом появлении */
  once?: boolean;

  /** Дополнительные CSS классы */
  className?: string;
}

/**
 * StaggerChildren - компонент для последовательной анимации дочерних элементов
 *
 * @example
 * ```tsx
 * <StaggerChildren staggerDelay={100}>
 *   <div>Элемент 1</div>
 *   <div>Элемент 2</div>
 *   <div>Элемент 3</div>
 * </StaggerChildren>
 * ```
 */
export const StaggerChildren: React.FC<StaggerChildrenProps> = memo(({
  children,
  staggerDelay = 100,
  initialDelay = 0,
  duration = 500,
  once = true,
  className,
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: prefersReducedMotion ? 0 : initialDelay / 1000,
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay / 1000,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.01 : duration / 1000,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  // Оборачиваем каждого ребенка в motion.div с itemVariants
  const wrappedChildren = React.Children.map(children, (child, index) => (
    <motion.div key={index} variants={itemVariants}>
      {child}
    </motion.div>
  ));

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-50px' }}
      variants={containerVariants}
      {...props}
    >
      {wrappedChildren}
    </motion.div>
  );
});

StaggerChildren.displayName = 'StaggerChildren';


