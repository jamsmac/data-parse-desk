/**
 * FadeIn Animation Component
 * Aurora Design System - Анимация появления с затуханием
 */

import React from 'react';
import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  /** Дочерние элементы */
  children: React.ReactNode;
  
  /** Направление появления */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  
  /** Задержка анимации (мс) */
  delay?: number;
  
  /** Длительность анимации (мс) */
  duration?: number;
  
  /** Расстояние смещения (px) */
  distance?: number;
  
  /** Анимировать только при первом появлении */
  once?: boolean;
  
  /** Дополнительные CSS классы */
  className?: string;

  /** Использовать viewport detection */
  viewport?: boolean;
}

/**
 * FadeIn - компонент для плавного появления элементов
 * 
 * @example
 * ```tsx
 * <FadeIn direction="up" delay={200}>
 *   <h1>Появляющийся заголовок</h1>
 * </FadeIn>
 * ```
 */
export const FadeIn: React.FC<FadeInProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 500,
  distance = 20,
  once = true,
  className,
  viewport = true,
  ...props
}) => {
  // Определяем начальные позиции в зависимости от направления
  const getDirectionOffset = () => {
    switch (direction) {
      case 'up':
        return { y: distance, x: 0 };
      case 'down':
        return { y: -distance, x: 0 };
      case 'left':
        return { x: distance, y: 0 };
      case 'right':
        return { x: -distance, y: 0 };
      case 'none':
        return { x: 0, y: 0 };
      default:
        return { y: distance, x: 0 };
    }
  };

  const offset = getDirectionOffset();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      ...offset,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: duration / 1000,
        delay: delay / 1000,
        ease: [0.4, 0, 0.2, 1], // cubic-bezier easing
      },
    },
  };

  const viewportOptions = viewport
    ? {
        once,
        margin: '-50px',
      }
    : undefined;

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView={viewport ? 'visible' : undefined}
      animate={!viewport ? 'visible' : undefined}
      viewport={viewportOptions}
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  );
};

FadeIn.displayName = 'FadeIn';


