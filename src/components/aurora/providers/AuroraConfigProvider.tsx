/**
 * Aurora Config Provider
 * Контекст для управления настройками производительности Aurora
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  detectDevicePerformance,
  getEffectRecommendations,
  FPSMonitor,
  getBrowserCapabilities,
  DevicePerformance,
} from '@/lib/aurora/performanceDetector';

export interface AuroraConfig {
  /** Уровень производительности устройства */
  performance: DevicePerformance;
  
  /** Включить/выключить эффекты */
  particles: boolean;
  particleCount: number;
  blur: boolean;
  shadows: boolean;
  animations: boolean;
  parallax: boolean;
  complexGradients: boolean;
  
  /** Возможности браузера */
  capabilities: ReturnType<typeof getBrowserCapabilities>;
  
  /** Мануальное переопределение настроек */
  override?: Partial<AuroraConfig>;
}

interface AuroraConfigContextValue {
  config: AuroraConfig;
  setConfig: React.Dispatch<React.SetStateAction<AuroraConfig>>;
  updatePerformance: (performance: DevicePerformance) => void;
  toggleEffect: (effect: keyof Omit<AuroraConfig, 'performance' | 'capabilities' | 'override'>) => void;
}

const AuroraConfigContext = createContext<AuroraConfigContextValue | undefined>(undefined);

export interface AuroraConfigProviderProps {
  children: ReactNode;
  /** Начальная конфигурация (переопределяет автоопределение) */
  initialConfig?: Partial<AuroraConfig>;
  /** Включить FPS мониторинг для динамической адаптации */
  enableFPSMonitoring?: boolean;
  /** Порог FPS для понижения качества */
  fpsThreshold?: number;
}

export function AuroraConfigProvider({
  children,
  initialConfig,
  enableFPSMonitoring = false,
  fpsThreshold = 30,
}: AuroraConfigProviderProps) {
  const [config, setConfig] = useState<AuroraConfig>(() => {
    const performance = detectDevicePerformance();
    const recommendations = getEffectRecommendations(performance);
    const capabilities = getBrowserCapabilities();

    return {
      performance,
      ...recommendations,
      capabilities,
      ...initialConfig,
    };
  });

  // FPS мониторинг
  useEffect(() => {
    if (!enableFPSMonitoring) return;

    const monitor = new FPSMonitor();
    let lowFPSCount = 0;

    monitor.start((fps) => {
      // Если FPS низкий 3 раза подряд, понижаем качество
      if (fps < fpsThreshold) {
        lowFPSCount++;
        if (lowFPSCount >= 3 && config.performance !== 'low') {
          console.warn(`[Aurora] Low FPS detected (${fps.toFixed(1)}), reducing effects`);
          updatePerformance('medium');
          lowFPSCount = 0;
        }
      } else {
        lowFPSCount = 0;
      }
    });

    return () => monitor.stop();
  }, [enableFPSMonitoring, fpsThreshold, config.performance]);

  // Слушаем изменения prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        updatePerformance('low');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const updatePerformance = (performance: DevicePerformance) => {
    const recommendations = getEffectRecommendations(performance);
    setConfig((prev) => ({
      ...prev,
      performance,
      ...recommendations,
    }));
  };

  const toggleEffect = (effect: keyof Omit<AuroraConfig, 'performance' | 'capabilities' | 'override'>) => {
    setConfig((prev) => ({
      ...prev,
      [effect]: !prev[effect],
    }));
  };

  const value: AuroraConfigContextValue = {
    config,
    setConfig,
    updatePerformance,
    toggleEffect,
  };

  return (
    <AuroraConfigContext.Provider value={value}>
      {children}
    </AuroraConfigContext.Provider>
  );
}

/**
 * Хук для доступа к Aurora конфигурации
 */
export function useAuroraConfig() {
  const context = useContext(AuroraConfigContext);
  if (!context) {
    throw new Error('useAuroraConfig must be used within AuroraConfigProvider');
  }
  return context;
}

/**
 * Хук для условного рендеринга эффектов
 */
export function useConditionalEffect(effectName: keyof Omit<AuroraConfig, 'performance' | 'capabilities' | 'override'>) {
  const { config } = useAuroraConfig();
  return config[effectName];
}

/**
 * HOC для условного рендеринга компонентов с эффектами
 */
export function withPerformanceCheck<P extends object>(
  Component: React.ComponentType<P>,
  effectName: keyof Omit<AuroraConfig, 'performance' | 'capabilities' | 'override'>,
  Fallback?: React.ComponentType<P>
) {
  return function PerformanceCheckedComponent(props: P) {
    const enabled = useConditionalEffect(effectName);
    
    if (!enabled && Fallback) {
      return <Fallback {...props} />;
    }
    
    if (!enabled) {
      return null;
    }
    
    return <Component {...props} />;
  };
}
