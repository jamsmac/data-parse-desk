/**
 * AuroraBackground Component
 * Aurora Design System - Динамический градиентный фон с эффектом северного сияния
 */

import React, { useEffect, useRef, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type AuroraVariant = 'aurora' | 'nebula' | 'ocean' | 'sunset' | 'forest';
export type AuroraIntensity = 'subtle' | 'medium' | 'strong';

export interface AuroraBackgroundProps {
  /** Дочерние элементы */
  children?: React.ReactNode;
  
  /** Вариант цветовой схемы */
  variant?: AuroraVariant;
  
  /** Интенсивность эффекта */
  intensity?: AuroraIntensity;
  
  /** Скорость анимации (0.1 - 5) */
  speed?: number;
  
  /** Включить parallax эффект */
  parallax?: boolean;
  
  /** Дополнительные CSS классы */
  className?: string;
  
  /** Включить анимацию */
  animated?: boolean;
}

// Цветовые схемы для разных вариантов
const colorSchemes: Record<AuroraVariant, string[]> = {
  aurora: [
    'rgba(102, 126, 234, 0.3)',  // purple
    'rgba(118, 75, 162, 0.3)',   // violet
    'rgba(240, 147, 251, 0.3)',  // pink
  ],
  nebula: [
    'rgba(240, 147, 251, 0.3)',  // pink
    'rgba(245, 87, 108, 0.3)',   // rose
    'rgba(118, 75, 162, 0.3)',   // violet
  ],
  ocean: [
    'rgba(0, 119, 190, 0.3)',    // blue
    'rgba(0, 201, 255, 0.3)',    // cyan
    'rgba(17, 153, 142, 0.3)',   // teal
  ],
  sunset: [
    'rgba(255, 107, 107, 0.3)',  // red
    'rgba(255, 217, 61, 0.3)',   // yellow
    'rgba(245, 87, 108, 0.3)',   // rose
  ],
  forest: [
    'rgba(17, 153, 142, 0.3)',   // teal
    'rgba(56, 239, 125, 0.3)',   // green
    'rgba(102, 126, 234, 0.3)',  // blue
  ],
};

/**
 * AuroraBackground - Фоновый компонент с анимированными градиентами
 *
 * @example
 * ```tsx
 * <AuroraBackground variant="aurora" intensity="medium">
 *   <div>Ваш контент</div>
 * </AuroraBackground>
 * ```
 */
export const AuroraBackground: React.FC<AuroraBackgroundProps> = memo(({
  children,
  variant = 'aurora',
  intensity = 'medium',
  speed = 1,
  parallax = true,
  className,
  animated = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Определяем, мобильное ли устройство
  const [isMobile, setIsMobile] = useState(false);

  // Получаем цвета для выбранного варианта
  const colors = colorSchemes[variant];

  // Интенсивность blur эффекта
  const blurIntensity = {
    subtle: 40,
    medium: 60,
    strong: 80,
  }[intensity];

  // Размер градиентных сфер
  const sphereSize = {
    subtle: '400px',
    medium: '600px',
    strong: '800px',
  }[intensity];

  // Определяем мобильное устройство и управляем видимостью
  useEffect(() => {
    setIsMounted(true);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Отслеживание видимости страницы для остановки анимаций
  useEffect(() => {
    if (!animated) return;

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [animated]);

  // Parallax эффект при движении мыши (только на десктопе)
  useEffect(() => {
    if (!parallax || !animated || isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [parallax, animated, isMobile]);

  // Не показываем анимации до монтирования (SSR compatibility)
  if (!isMounted) {
    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Фоновый слой */}
      <div className="absolute inset-0 bg-background" />

      {/* Градиентные сферы */}
      <div className="absolute inset-0" style={{ filter: `blur(${blurIntensity}px)` }}>
        {/* Sphere 1 */}
        <motion.div
          className="absolute rounded-full opacity-50"
          style={{
            width: sphereSize,
            height: sphereSize,
            background: `radial-gradient(circle, ${colors[0]} 0%, transparent 70%)`,
            top: '-10%',
            left: '-10%',
          }}
          animate={animated && isVisible ? {
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          } : undefined}
          transition={{
            duration: 20 / speed,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Sphere 2 */}
        <motion.div
          className="absolute rounded-full opacity-50"
          style={{
            width: sphereSize,
            height: sphereSize,
            background: `radial-gradient(circle, ${colors[1]} 0%, transparent 70%)`,
            top: '50%',
            right: '-10%',
          }}
          animate={animated && isVisible ? {
            x: [0, -80, 0],
            y: [0, -60, 0],
            scale: [1, 1.15, 1],
          } : undefined}
          transition={{
            duration: 25 / speed,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Sphere 3 */}
        <motion.div
          className="absolute rounded-full opacity-50"
          style={{
            width: sphereSize,
            height: sphereSize,
            background: `radial-gradient(circle, ${colors[2]} 0%, transparent 70%)`,
            bottom: '-10%',
            left: '30%',
          }}
          animate={animated && isVisible ? {
            x: [0, 60, 0],
            y: [0, -80, 0],
            scale: [1, 1.2, 1],
          } : undefined}
          transition={{
            duration: 30 / speed,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Parallax overlay (если включен и не мобильное устройство) */}
      {parallax && animated && !isMobile && isVisible && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${50 + mousePosition.x / 10}% ${
              50 + mousePosition.y / 10
            }%, rgba(255,255,255,0.03) 0%, transparent 50%)`,
          }}
          animate={{
            x: mousePosition.x,
            y: mousePosition.y,
          }}
          transition={{
            type: 'spring',
            stiffness: 50,
            damping: 15,
          }}
        />
      )}

      {/* Контент */}
      <div className="relative z-10">{children}</div>
    </div>
  );
});

AuroraBackground.displayName = 'AuroraBackground';


