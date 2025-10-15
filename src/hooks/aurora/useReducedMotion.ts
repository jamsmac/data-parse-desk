/**
 * useReducedMotion Hook
 * Aurora Design System - Определяет предпочтение пользователя для уменьшенной анимации
 */

import { useEffect, useState } from 'react';

/**
 * useReducedMotion - хук для определения prefers-reduced-motion
 * 
 * @returns {boolean} true если пользователь предпочитает уменьшенную анимацию
 * 
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 * 
 * return (
 *   <motion.div
 *     animate={prefersReducedMotion ? undefined : { x: 100 }}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Проверяем поддержку matchMedia
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Устанавливаем начальное значение
    setPrefersReducedMotion(mediaQuery.matches);

    // Слушаем изменения
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Используем addEventListener если доступен, иначе addListener (для старых браузеров)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback для старых браузеров
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * useAnimationConfig - хук для получения конфигурации анимаций с учетом reduced motion
 * 
 * @param {boolean} forceDisable - принудительно отключить анимации
 * @returns {object} конфигурация анимаций
 */
export function useAnimationConfig(forceDisable = false) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion && !forceDisable;

  return {
    shouldAnimate,
    duration: shouldAnimate ? 0.5 : 0.01,
    transition: shouldAnimate 
      ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
      : { duration: 0.01 },
  };
}


