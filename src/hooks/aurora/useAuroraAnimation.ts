/**
 * useAuroraAnimation Hook
 * Предоставляет пресеты анимаций для Aurora компонентов
 */

import { Variants } from 'framer-motion';
import { useReducedMotion } from './useReducedMotion';

export type AnimationPreset = 'fadeInUp' | 'slideIn' | 'glow' | 'float';
export type AnimationDirection = 'top' | 'bottom' | 'left' | 'right';
export type AnimationEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';

export interface AuroraAnimationOptions {
  /** Preset анимации */
  preset?: AnimationPreset;
  
  /** Направление для slideIn */
  direction?: AnimationDirection;
  
  /** Длительность анимации (секунды) */
  duration?: number;
  
  /** Задержка перед началом (секунды) */
  delay?: number;
  
  /** Тип easing */
  easing?: AnimationEasing;
  
  /** Stagger для списков (секунды) */
  stagger?: number;
  
  /** Дистанция для движения (пиксели) */
  distance?: number;
}

const easingMap = {
  linear: [0, 0, 1, 1] as [number, number, number, number],
  easeIn: [0.4, 0, 1, 1] as [number, number, number, number],
  easeOut: [0, 0, 0.2, 1] as [number, number, number, number],
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: undefined,
};

/**
 * Хук для создания анимационных вариантов Framer Motion
 * Автоматически учитывает prefers-reduced-motion
 */
export function useAuroraAnimation(options: AuroraAnimationOptions = {}): Variants {
  const prefersReducedMotion = useReducedMotion();
  
  const {
    preset = 'fadeInUp',
    direction = 'top',
    duration = 0.5,
    delay = 0,
    easing = 'easeOut',
    distance = 30,
  } = options;

  // Если пользователь предпочитает меньше анимаций, возвращаем простые fade
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: { duration: 0.15 }
      },
      exit: { 
        opacity: 0,
        transition: { duration: 0.15 }
      },
    };
  }

  const getTransition = () => {
    if (easing === 'spring') {
      return {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
        delay,
      };
    }

    return {
      duration,
      delay,
      ease: easingMap[easing],
    };
  };

  const presetVariants: Record<AnimationPreset, Variants> = {
    fadeInUp: {
      hidden: {
        opacity: 0,
        y: distance,
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: getTransition(),
      },
      exit: {
        opacity: 0,
        y: -distance,
        transition: { duration: duration * 0.5 },
      },
    },

    slideIn: {
      hidden: {
        opacity: 0,
        ...(direction === 'top' && { y: -distance }),
        ...(direction === 'bottom' && { y: distance }),
        ...(direction === 'left' && { x: -distance }),
        ...(direction === 'right' && { x: distance }),
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: getTransition(),
      },
      exit: {
        opacity: 0,
        ...(direction === 'top' && { y: distance }),
        ...(direction === 'bottom' && { y: -distance }),
        ...(direction === 'left' && { x: distance }),
        ...(direction === 'right' && { x: -distance }),
        transition: { duration: duration * 0.5 },
      },
    },

    glow: {
      hidden: {
        opacity: 0,
        scale: 0.95,
        filter: 'blur(4px)',
      },
      visible: {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        transition: getTransition(),
      },
      exit: {
        opacity: 0,
        scale: 0.95,
        filter: 'blur(4px)',
        transition: { duration: duration * 0.5 },
      },
    },

    float: {
      hidden: {
        opacity: 0,
        y: distance,
      },
      visible: {
        opacity: 1,
        y: [distance, 0, -5, 0],
        transition: {
          ...getTransition(),
          y: {
            duration: duration * 2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          },
        },
      },
      exit: {
        opacity: 0,
        y: -distance,
        transition: { duration: duration * 0.5 },
      },
    },
  };

  return presetVariants[preset];
}

/**
 * Создает stagger контейнер для анимации списков
 * Автоматически учитывает prefers-reduced-motion
 */
export function useStaggerContainer(stagger: number = 0.1): Variants {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { duration: 0.15 },
      },
      exit: {
        opacity: 0,
        transition: { duration: 0.15 },
      },
    };
  }
  
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: stagger * 0.5,
        staggerDirection: -1,
      },
    },
  };
}

/**
 * Создает элемент списка для stagger анимации
 * Автоматически учитывает prefers-reduced-motion
 */
export function useStaggerItem(options: Omit<AuroraAnimationOptions, 'stagger'> = {}): Variants {
  const prefersReducedMotion = useReducedMotion();
  
  const {
    direction = 'top',
    duration = 0.3,
    easing = 'easeOut',
    distance = 20,
  } = options;

  // Если пользователь предпочитает меньше анимаций, возвращаем простые fade
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { duration: 0.15 },
      },
      exit: {
        opacity: 0,
        transition: { duration: 0.15 },
      },
    };
  }

  const getTransition = () => {
    if (easing === 'spring') {
      return {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      };
    }

    return {
      duration,
      ease: easingMap[easing],
    };
  };

  return {
    hidden: {
      opacity: 0,
      ...(direction === 'top' && { y: -distance }),
      ...(direction === 'bottom' && { y: distance }),
      ...(direction === 'left' && { x: -distance }),
      ...(direction === 'right' && { x: distance }),
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: getTransition(),
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: duration * 0.5 },
    },
  };
}

/**
 * Shimmer loading анимация
 */
export function useShimmerAnimation(): Variants {
  return {
    shimmer: {
      backgroundPosition: ['200% 0', '-200% 0'],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  };
}

/**
 * Пульсация для loading состояний
 */
export function usePulseAnimation(duration: number = 1.5): Variants {
  return {
    pulse: {
      opacity: [0.5, 1, 0.5],
      scale: [1, 1.02, 1],
      transition: {
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };
}

/**
 * Встряхивание для ошибок
 */
export function useShakeAnimation(): Variants {
  return {
    shake: {
      x: [0, -10, 10, -10, 10, 0],
      transition: {
        duration: 0.5,
        ease: 'easeInOut',
      },
    },
  };
}
