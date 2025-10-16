/**
 * GlassCard Component
 * Aurora Design System - Основной компонент карточки с glass-morphism эффектом
 */

import React, { forwardRef, HTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export type GlassIntensity = 'subtle' | 'medium' | 'strong';
export type GlassHoverEffect = 'none' | 'float' | 'glow' | 'scale' | 'shimmer';
export type GlassVariant = 'default' | 'aurora' | 'nebula';

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  /** Дочерние элементы */
  children?: React.ReactNode;
  
  /** Интенсивность glass эффекта */
  intensity?: GlassIntensity;
  
  /** Hover эффект */
  hover?: GlassHoverEffect;
  
  /** Вариант цветовой схемы */
  variant?: GlassVariant;
  
  /** Добавить градиентный border */
  gradient?: boolean;
  
  /** Дополнительные CSS классы */
  className?: string;
  
  /** Включить анимацию появления */
  animated?: boolean;
  
  /** Задержка анимации (мс) */
  animationDelay?: number;
}

/**
 * GlassCard - базовый компонент карточки с эффектом стеклянного морфизма
 * 
 * @example
 * ```tsx
 * <GlassCard intensity="medium" hover="float">
 *   <h2>Заголовок</h2>
 *   <p>Контент карточки</p>
 * </GlassCard>
 * ```
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      intensity = 'medium',
      hover = 'float',
      variant = 'default',
      gradient = false,
      className,
      animated = true,
      animationDelay = 0,
      ...props
    },
    ref
  ) => {
    // Классы glass эффекта
    const glassClasses = {
      subtle: 'glass-subtle',
      medium: 'glass-medium',
      strong: 'glass-strong',
    };

    // Классы hover эффектов
    const hoverClasses = {
      none: '',
      float: 'glass-hover-float',
      glow: 'glass-hover-glow',
      scale: 'glass-hover-scale',
      shimmer: 'glass-hover-shimmer',
    };

    // Вариант стиля
    const variantClasses = {
      default: '',
      aurora: 'glass-aurora',
      nebula: 'glass-nebula',
    };

    // Gradient border эффект
    const gradientBorderClass = gradient
      ? 'relative before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-br before:from-fluid-cyan before:to-fluid-purple before:-z-10'
      : '';

    // Анимация появления
    const animationVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.5,
          delay: animationDelay / 1000,
          ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
        },
      },
    };

    const combinedClasses = cn(
      // Базовые стили
      'rounded-lg p-6 transition-all duration-300',
      
      // Glass эффект
      variant === 'default'
        ? glassClasses[intensity]
        : variantClasses[variant],
      
      // Hover эффект
      hoverClasses[hover],
      
      // Gradient border
      gradientBorderClass,
      
      // Дополнительные классы
      className
    );

    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={combinedClasses}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={animationVariants}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={combinedClasses}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

/**
 * GlassCardHeader - заголовок карточки
 */
export interface GlassCardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const GlassCardHeader = forwardRef<HTMLDivElement, GlassCardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 pb-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCardHeader.displayName = 'GlassCardHeader';

/**
 * GlassCardTitle - заголовок карточки
 */
export interface GlassCardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export const GlassCardTitle = forwardRef<HTMLParagraphElement, GlassCardTitleProps>(
  ({ children, className, gradient = false, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          "text-2xl font-semibold leading-none tracking-tight",
          gradient && "bg-gradient-to-r from-fluid-cyan to-fluid-purple bg-clip-text text-transparent",
          className
        )}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

GlassCardTitle.displayName = 'GlassCardTitle';

/**
 * GlassCardDescription - описание карточки
 */
export interface GlassCardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
  className?: string;
}

export const GlassCardDescription = forwardRef<
  HTMLParagraphElement,
  GlassCardDescriptionProps
>(({ children, className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
});

GlassCardDescription.displayName = 'GlassCardDescription';

/**
 * GlassCardContent - контент карточки
 */
export interface GlassCardContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const GlassCardContent = forwardRef<HTMLDivElement, GlassCardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("pt-0", className)} {...props}>
        {children}
      </div>
    );
  }
);

GlassCardContent.displayName = 'GlassCardContent';

/**
 * GlassCardFooter - футер карточки
 */
export interface GlassCardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const GlassCardFooter = forwardRef<HTMLDivElement, GlassCardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center pt-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCardFooter.displayName = 'GlassCardFooter';
