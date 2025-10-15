/**
 * FluidButton Component
 * Fluid Aurora Design System - Кнопка с жидкой анимацией и ripple эффектом
 */

import React, { forwardRef, ButtonHTMLAttributes, useState, MouseEvent, memo, useCallback, useRef, useEffect } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export type FluidButtonVariant = 'primary' | 'secondary' | 'ghost';
export type FluidButtonSize = 'sm' | 'md' | 'lg';

export interface FluidButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  /** Дочерние элементы */
  children?: React.ReactNode;
  
  /** Вариант кнопки */
  variant?: FluidButtonVariant;
  
  /** Размер кнопки */
  size?: FluidButtonSize;
  
  /** Дополнительные CSS классы */
  className?: string;
  
  /** Disabled состояние */
  disabled?: boolean;
  
  /** Показывать ripple эффект при клике */
  ripple?: boolean;
}

interface RippleEffect {
  x: number;
  y: number;
  size: number;
  id: number;
}

/**
 * FluidButton - кнопка с жидкой анимацией и ripple эффектом
 *
 * @example
 * ```tsx
 * <FluidButton variant="primary" size="md" onClick={() => console.log('Clicked')}>
 *   Нажми меня
 * </FluidButton>
 * ```
 */
export const FluidButton = memo(forwardRef<HTMLButtonElement, FluidButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      className,
      disabled = false,
      ripple = true,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<RippleEffect[]>([]);
    const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

    // ✅ Cleanup всех таймаутов при размонтировании
    useEffect(() => {
      return () => {
        timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        timeoutsRef.current.clear();
      };
    }, []);

    // Варианты кнопок
    const variantClasses = {
      primary: [
        'bg-gradient-to-r from-cyan-500 to-purple-500',
        'text-white font-semibold',
        'shadow-lg shadow-cyan-500/50',
        'hover:shadow-xl hover:shadow-cyan-500/60',
        'hover:from-cyan-400 hover:to-purple-400',
        'active:scale-95',
      ],
      secondary: [
        'bg-white/10 backdrop-blur-md',
        'text-white font-medium',
        'border border-white/20',
        'hover:bg-white/20 hover:border-white/30',
        'shadow-lg shadow-black/10',
        'active:scale-95',
      ],
      ghost: [
        'bg-transparent',
        'text-white font-medium',
        'hover:bg-white/10',
        'active:bg-white/20',
        'active:scale-95',
      ],
    };

    // Размеры кнопок
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-5 py-2.5 text-base rounded-lg',
      lg: 'px-7 py-3.5 text-lg rounded-xl',
    };

    // Disabled стили
    const disabledClasses = 'opacity-50 cursor-not-allowed pointer-events-none';

    // Обработка клика с ripple эффектом (мемоизирована)
    const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (ripple) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = Math.max(rect.width, rect.height) * 2;

        const newRipple: RippleEffect = {
          x,
          y,
          size,
          id: Date.now(),
        };

        setRipples((prev) => [...prev, newRipple]);

        // ✅ Отслеживаем timeout
        const timeout = setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
          timeoutsRef.current.delete(timeout);
        }, 600);

        timeoutsRef.current.add(timeout);
      }

      if (onClick) {
        onClick(e);
      }
    }, [disabled, ripple, onClick]);

    // Keyboard support для accessibility
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      
      // Поддержка Enter и Space
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        
        // Создаем синтетическое событие клика для ripple в центре кнопки
        if (ripple) {
          const button = e.currentTarget;
          const rect = button.getBoundingClientRect();
          const x = rect.width / 2;
          const y = rect.height / 2;
          const size = Math.max(rect.width, rect.height) * 2;
          
          const newRipple: RippleEffect = {
            x,
            y,
            size,
            id: Date.now(),
          };

          setRipples((prev) => [...prev, newRipple]);

          // ✅ Отслеживаем timeout в keyboard handler
          const timeout = setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
            timeoutsRef.current.delete(timeout);
          }, 600);

          timeoutsRef.current.add(timeout);
        }

        // Вызываем onClick с синтетическим событием
        if (onClick) {
          onClick(e as unknown as MouseEvent<HTMLButtonElement>);
        }
      }
    };

    const combinedClasses = cn(
      // Базовые стили
      'relative overflow-hidden transition-all duration-200 ease-out',
      'focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900',
      
      // Вариант
      variantClasses[variant],
      
      // Размер
      sizeClasses[size],
      
      // Disabled
      disabled && disabledClasses,
      
      // Дополнительные классы
      className
    );

    return (
      <motion.button
        ref={ref}
        className={combinedClasses}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        whileHover={!disabled ? { scale: 1.05 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        {...props}
      >
        {/* Ripple эффекты */}
        {ripple && ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-white pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
        
        {/* Glow эффект для primary варианта */}
        {variant === 'primary' && (
          <motion.span
            className="absolute inset-0 rounded-[inherit] opacity-0 blur-xl"
            style={{
              background: 'linear-gradient(to right, rgb(6 182 212), rgb(168 85 247))',
            }}
            whileHover={{ opacity: 0.3 }}
            transition={{ duration: 0.3 }}
          />
        )}
        
        {/* Контент кнопки */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </motion.button>
    );
  }
));

FluidButton.displayName = 'FluidButton';

/**
 * FluidIconButton - кнопка-иконка с fluid эффектами
 */
export interface FluidIconButtonProps extends Omit<FluidButtonProps, 'size'> {
  /** Размер кнопки-иконки */
  size?: 'sm' | 'md' | 'lg';
  
  /** Иконка */
  icon?: React.ReactNode;
}

export const FluidIconButton = forwardRef<HTMLButtonElement, FluidIconButtonProps>(
  (
    {
      icon,
      variant = 'ghost',
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    return (
      <FluidButton
        ref={ref}
        variant={variant}
        className={cn('p-0', sizeClasses[size], className)}
        {...props}
      >
        {icon}
      </FluidButton>
    );
  }
);

FluidIconButton.displayName = 'FluidIconButton';
