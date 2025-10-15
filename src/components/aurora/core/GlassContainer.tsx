import React from 'react';
import { cn } from '@/lib/utils';

export interface GlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Интенсивность glass эффекта
   * @default 'medium'
   */
  intensity?: 'light' | 'medium' | 'strong';
  
  /**
   * Вариант стиля границы
   * @default 'medium'
   */
  borderVariant?: 'light' | 'medium' | 'strong';
  
  /**
   * Размер blur эффекта
   * @default 'md'
   */
  blur?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  
  /**
   * Включить эффект hover
   * @default false
   */
  hover?: boolean;
  
  /**
   * Градиент фона (опционально)
   */
  gradient?: 'primary' | 'secondary' | 'dark' | 'ocean' | 'sunset' | 'forest' | 'nebula';
  
  /**
   * Включить тень
   * @default true
   */
  shadow?: boolean;
  
  /**
   * Размер тени
   * @default 'md'
   */
  shadowSize?: 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Анимация появления
   */
  animation?: 'fade-in' | 'scale-in' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'bounce-in';
  
  /**
   * Включить glow эффект
   */
  glow?: 'cyan' | 'purple' | 'pink' | 'none';
  
  /**
   * Дети компонента
   */
  children?: React.ReactNode;
}

/**
 * GlassContainer - базовый компонент для создания glass-morphism эффекта
 * 
 * @example
 * ```tsx
 * <GlassContainer intensity="strong" blur="lg" hover>
 *   <h2>Заголовок</h2>
 *   <p>Содержимое с glass эффектом</p>
 * </GlassContainer>
 * ```
 */
export const GlassContainer = React.forwardRef<HTMLDivElement, GlassContainerProps>(
  (
    {
      intensity = 'medium',
      borderVariant = 'medium',
      blur = 'md',
      hover = false,
      gradient,
      shadow = true,
      shadowSize = 'md',
      animation,
      glow = 'none',
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Классы для интенсивности glass эффекта
    const intensityClasses = {
      light: 'bg-white/[0.03]',
      medium: 'bg-white/[0.05]',
      strong: 'bg-white/[0.08]',
    };

    // Классы для границ
    const borderClasses = {
      light: 'border border-white/[0.05]',
      medium: 'border border-white/[0.1]',
      strong: 'border border-white/[0.15]',
    };

    // Классы для blur
    const blurClasses = {
      xs: 'backdrop-blur-xs',
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl',
      '2xl': 'backdrop-blur-2xl',
      '3xl': 'backdrop-blur-3xl',
    };

    // Классы для теней
    const shadowClasses = shadow
      ? {
          sm: 'shadow-[0_2px_8px_rgba(31,38,135,0.1)]',
          md: 'shadow-[0_8px_32px_rgba(31,38,135,0.15)]',
          lg: 'shadow-[0_16px_48px_rgba(31,38,135,0.2)]',
          xl: 'shadow-[0_24px_64px_rgba(31,38,135,0.25)]',
        }[shadowSize]
      : '';

    // Классы для градиентов
    const gradientClasses = gradient
      ? {
          primary: 'aurora-primary',
          secondary: 'aurora-secondary',
          dark: 'aurora-dark',
          ocean: 'aurora-ocean',
          sunset: 'aurora-sunset',
          forest: 'aurora-forest',
          nebula: 'aurora-nebula',
        }[gradient]
      : '';

    // Классы для анимаций
    const animationClasses = animation
      ? {
          'fade-in': 'animate-fade-in',
          'scale-in': 'animate-scale-in',
          'slide-up': 'animate-slide-up',
          'slide-down': 'animate-slide-down',
          'slide-left': 'animate-slide-left',
          'slide-right': 'animate-slide-right',
          'bounce-in': 'animate-bounce-in',
        }[animation]
      : '';

    // Классы для glow эффекта
    const glowClasses = glow !== 'none'
      ? {
          cyan: 'animate-glow',
          purple: 'animate-glow-purple',
          pink: 'animate-glow-pink',
        }[glow]
      : '';

    // Hover эффекты
    const hoverClasses = hover
      ? 'transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.2] hover:shadow-[0_12px_40px_rgba(31,38,135,0.2)] hover:scale-[1.02]'
      : 'transition-all duration-300';

    return (
      <div
        ref={ref}
        className={cn(
          // Базовые стили
          'rounded-xl overflow-hidden',
          // Glass эффект
          intensityClasses[intensity],
          borderClasses[borderVariant],
          blurClasses[blur],
          // Дополнительные эффекты
          shadowClasses,
          gradientClasses,
          animationClasses,
          glowClasses,
          hoverClasses,
          // Пользовательские классы
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassContainer.displayName = 'GlassContainer';

export default GlassContainer;
