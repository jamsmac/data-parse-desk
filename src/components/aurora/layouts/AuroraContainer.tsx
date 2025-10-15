/**
 * AuroraContainer Component
 * Fluid Aurora Design System - Контейнер с градиентным фоном и эффектами
 */

import React, { forwardRef, HTMLAttributes, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/aurora/useDeviceType';
import { useReducedMotion } from '@/hooks/aurora/useReducedMotion';

export interface AuroraContainerProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  /** Дочерние элементы */
  children?: React.ReactNode;
  
  /** Дополнительные CSS классы */
  className?: string;
  
  /** Включить particle эффекты */
  particles?: boolean;
  
  /** Количество частиц */
  particleCount?: number;
  
  /** Включить параллакс при скролле */
  parallax?: boolean;
  
  /** Интенсивность параллакса (0-1) */
  parallaxIntensity?: number;
  
  /** Показать градиентный overlay */
  gradient?: boolean;
  
  /** Тип градиента */
  gradientType?: 'aurora' | 'nebula' | 'ocean' | 'sunset';
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

/**
 * AuroraContainer - контейнер с градиентным фоном и эффектами
 * 
 * @example
 * ```tsx
 * <AuroraContainer particles parallax gradientType="aurora">
 *   <h1>Контент</h1>
 * </AuroraContainer>
 * ```
 */
export const AuroraContainer = forwardRef<HTMLDivElement, AuroraContainerProps>(
  (
    {
      children,
      className,
      particles = false,
      particleCount = 50,
      parallax = false,
      parallaxIntensity = 0.5,
      gradient = true,
      gradientType = 'aurora',
      ...props
    },
    ref
  ) => {
    const [particleElements, setParticleElements] = useState<Particle[]>([]);
    const { scrollYProgress } = useScroll();
    
    // Определяем мобильное устройство и prefers-reduced-motion
    const isMobile = useIsMobile();
    const prefersReducedMotion = useReducedMotion();
    
    // Отключаем тяжелые эффекты на мобильных или если пользователь предпочитает меньше анимаций
    const enableParallax = parallax && !isMobile && !prefersReducedMotion;
    const enableParticles = particles && !prefersReducedMotion;
    const enableAnimations = !prefersReducedMotion;

    // Параллакс эффект
    const y = useTransform(
      scrollYProgress,
      [0, 1],
      [0, enableParallax ? -100 * parallaxIntensity : 0]
    );

    const opacity = useTransform(
      scrollYProgress,
      [0, 0.5, 1],
      [1, 0.8, 0.6]
    );

    // Генерация частиц
    useEffect(() => {
      if (enableParticles) {
        const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          duration: Math.random() * 10 + 10,
          delay: Math.random() * 5,
        }));
        setParticleElements(newParticles);
      }
    }, [enableParticles, particleCount]);

    // Градиенты
    const gradients = {
      aurora: [
        'from-cyan-500/20 via-purple-500/20 to-pink-500/20',
        'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]',
      ],
      nebula: [
        'from-indigo-900/30 via-purple-900/30 to-pink-900/30',
        'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]',
      ],
      ocean: [
        'from-blue-600/20 via-cyan-500/20 to-teal-400/20',
        'bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))]',
      ],
      sunset: [
        'from-orange-500/20 via-red-500/20 to-purple-600/20',
        'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]',
      ],
    };

    const combinedClasses = cn(
      'relative min-h-screen overflow-hidden',
      className
    );

    return (
      <motion.div
        ref={ref}
        className={combinedClasses}
        style={enableParallax ? { y, opacity } : undefined}
        {...props}
      >
        {/* Градиентный фон */}
        {gradient && (
          <div className="absolute inset-0 -z-10" aria-hidden="true">
            <motion.div
              className={cn(
                'absolute inset-0',
                gradients[gradientType]
              )}
              animate={enableAnimations ? {
                scale: [1, 1.1, 1],
                rotate: [0, 5, 0],
              } : undefined}
              transition={enableAnimations ? {
                duration: 20,
                repeat: Infinity,
                ease: 'easeInOut',
              } : undefined}
            />
            
            {/* Дополнительный слой для глубины */}
            <motion.div
              className={cn(
                'absolute inset-0 opacity-50',
                gradients[gradientType]
              )}
              animate={enableAnimations ? {
                scale: [1.1, 1, 1.1],
                rotate: [5, 0, 5],
              } : undefined}
              transition={enableAnimations ? {
                duration: 25,
                repeat: Infinity,
                ease: 'easeInOut',
              } : undefined}
            />
          </div>
        )}

        {/* Particle эффекты */}
        {enableParticles && (
          <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            {particleElements.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full bg-white/30 blur-sm"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: particle.size,
                  height: particle.size,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, Math.random() * 20 - 10, 0],
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  delay: particle.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Затемнение для лучшей читаемости контента */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900 -z-5" aria-hidden="true" />

        {/* Контент */}
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    );
  }
);

AuroraContainer.displayName = 'AuroraContainer';

/**
 * AuroraSection - секция с Aurora эффектами
 */
export interface AuroraSectionProps extends Omit<HTMLMotionProps<'section'>, 'ref'> {
  children?: React.ReactNode;
  className?: string;
  gradient?: boolean;
  parallax?: boolean;
}

export const AuroraSection = forwardRef<HTMLElement, AuroraSectionProps>(
  (
    {
      children,
      className,
      gradient = false,
      parallax = false,
      ...props
    },
    ref
  ) => {
    const { scrollYProgress } = useScroll();
    
    const y = useTransform(
      scrollYProgress,
      [0, 1],
      [0, parallax ? -50 : 0]
    );

    return (
      <motion.section
        ref={ref}
        className={cn(
          'relative py-20 px-4',
          gradient && 'bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent',
          className
        )}
        style={parallax ? { y } : undefined}
        {...props}
      >
        {children}
      </motion.section>
    );
  }
);

AuroraSection.displayName = 'AuroraSection';
