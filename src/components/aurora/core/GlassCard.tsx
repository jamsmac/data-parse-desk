/**
 * GlassCard Component
 * Fluid Aurora Design System - Компонент карточки с glass-morphism эффектом
 */

import React, { forwardRef, HTMLAttributes, useState, useEffect } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getBrowserCapabilities } from '@/lib/aurora/performanceDetector';

export type GlassCardVariant = 'default' | 'elevated' | 'interactive';
export type GlassCardIntensity = 'light' | 'medium' | 'strong';

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  /** Дочерние элементы */
  children?: React.ReactNode;
  
  /** Вариант карточки */
  variant?: GlassCardVariant;
  
  /** Интенсивность glass эффекта */
  intensity?: GlassCardIntensity;
  
  /** Дополнительные CSS классы */
  className?: string;
  
  /** Включить анимацию появления */
  animated?: boolean;
  
  /** Задержка анимации (мс) */
  animationDelay?: number;
  
  /** Callback при клике (для interactive варианта) */
  onClick?: () => void;
  
  /** Aria-label для interactive варианта */
  ariaLabel?: string;
}

/**
 * GlassCard - базовый компонент карточки с эффектом glass morphism
 * 
 * @example
 * ```tsx
 * <GlassCard variant="elevated" intensity="medium">
 *   <h2>Заголовок</h2>
 *   <p>Контент карточки</p>
 * </GlassCard>
 * ```
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      variant = 'default',
      intensity = 'medium',
      className,
      animated = true,
      animationDelay = 0,
      onClick,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    // Проверка поддержки backdrop-filter
    const [supportsBackdrop, setSupportsBackdrop] = useState(true);
    
    useEffect(() => {
      const capabilities = getBrowserCapabilities();
      setSupportsBackdrop(capabilities.backdropFilter);
    }, []);

    // Классы glass эффекта по интенсивности
    const intensityClasses = {
      light: supportsBackdrop 
        ? 'bg-white/5 backdrop-blur-sm border-white/10'
        : 'bg-white/20 border-white/10', // Fallback без blur
      medium: supportsBackdrop
        ? 'bg-white/10 backdrop-blur-md border-white/20'
        : 'bg-white/30 border-white/20', // Fallback без blur
      strong: supportsBackdrop
        ? 'bg-white/20 backdrop-blur-lg border-white/30'
        : 'bg-white/40 border-white/30', // Fallback без blur
    };

    // Классы в зависимости от варианта
    const variantClasses = {
      default: '',
      elevated: 'shadow-xl shadow-black/20',
      interactive: 'cursor-pointer',
    };

    // Hover эффекты для разных вариантов
    const hoverClasses = {
      default: 'hover:bg-white/15 hover:border-white/30',
      elevated: 'hover:bg-white/15 hover:border-white/30 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30',
      interactive: 'hover:bg-white/15 hover:border-white/30 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    };

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

    // Keyboard support для interactive варианта
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (variant === 'interactive' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick?.();
      }
    };

    const combinedClasses = cn(
      // Базовые стили
      'rounded-xl p-6 border transition-all duration-300 ease-out',
      
      // Glass morphism
      intensityClasses[intensity],
      
      // Variant стили
      variantClasses[variant],
      
      // Hover эффекты
      hoverClasses[variant],
      
      // Интерактивная карточка - дополнительные эффекты
      variant === 'interactive' && [
        'relative overflow-hidden',
        'before:absolute before:inset-0 before:bg-gradient-to-br before:from-cyan-500/0 before:to-purple-500/0',
        'before:transition-all before:duration-300',
        'hover:before:from-cyan-500/10 hover:before:to-purple-500/10',
        'focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900',
      ],
      
      // Дополнительные классы
      className
    );

    const cardProps = {
      ref,
      className: combinedClasses,
      onClick: variant === 'interactive' ? onClick : undefined,
      onKeyDown: variant === 'interactive' ? handleKeyDown : undefined,
      role: variant === 'interactive' ? 'button' : undefined,
      tabIndex: variant === 'interactive' ? 0 : undefined,
      'aria-label': variant === 'interactive' ? ariaLabel : undefined,
      ...props,
    };

    if (animated) {
      return (
        <motion.div
          {...cardProps}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={animationVariants}
          whileHover={
            variant === 'elevated' || variant === 'interactive'
              ? { y: -4 }
              : undefined
          }
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        {...cardProps}
        whileHover={
          variant === 'elevated' || variant === 'interactive'
            ? { y: -4 }
            : undefined
        }
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
        className={cn('flex flex-col space-y-1.5 pb-4', className)}
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
          'text-2xl font-semibold leading-none tracking-tight',
          gradient && 'bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent',
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
      className={cn('text-sm text-gray-400', className)}
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
      <div ref={ref} className={cn('pt-0', className)} {...props}>
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
        className={cn('flex items-center pt-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCardFooter.displayName = 'GlassCardFooter';
