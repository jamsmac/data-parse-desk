/**
 * Aurora Fixes Configuration
 * Feature flags для управления исправлениями
 */

export interface AuroraFixConfig {
  /** Включить исправление */
  enabled: boolean;

  /** Описание исправления */
  description: string;

  /** Приоритет (1-5, где 1 - наивысший) */
  priority: 1 | 2 | 3 | 4 | 5;

  /** Категория */
  category: 'critical' | 'performance' | 'accessibility' | 'optional';

  /** Версия, в которой было применено */
  appliedVersion?: string;
}

export interface AuroraFixesConfig {
  /** Мемоизация компонентов */
  reactMemo: AuroraFixConfig;

  /** Cleanup в useEffect */
  useEffectCleanup: AuroraFixConfig;

  /** Поддержка prefers-reduced-motion */
  prefersReducedMotion: AuroraFixConfig;

  /** Error boundaries */
  errorBoundaries: AuroraFixConfig;

  /** Lazy loading optimization */
  lazyLoading: AuroraFixConfig;

  /** Виртуализация для больших списков */
  virtualization: AuroraFixConfig;

  /** Keyboard accessibility */
  keyboardAccessibility: AuroraFixConfig;

  /** Backdrop filter fallbacks */
  backdropFilterFallback: AuroraFixConfig;
}

/**
 * Дефолтная конфигурация исправлений
 */
export const defaultAuroraFixesConfig: AuroraFixesConfig = {
  reactMemo: {
    enabled: true,
    description: 'Добавляет React.memo ко всем Aurora компонентам для предотвращения лишних ре-рендеров',
    priority: 2,
    category: 'performance',
    appliedVersion: '1.0.0',
  },

  useEffectCleanup: {
    enabled: true,
    description: 'Добавляет cleanup функции во все useEffect с async операциями',
    priority: 1,
    category: 'critical',
    appliedVersion: '1.0.0',
  },

  prefersReducedMotion: {
    enabled: true,
    description: 'Добавляет поддержку prefers-reduced-motion для всех анимаций',
    priority: 2,
    category: 'accessibility',
    appliedVersion: '1.0.0',
  },

  errorBoundaries: {
    enabled: true,
    description: 'Добавляет ErrorBoundary компоненты для обработки ошибок',
    priority: 3,
    category: 'optional',
    appliedVersion: '1.0.0',
  },

  lazyLoading: {
    enabled: true,
    description: 'Оптимизирует lazy loading для тяжелых компонентов',
    priority: 3,
    category: 'performance',
    appliedVersion: '1.0.0',
  },

  virtualization: {
    enabled: false,
    description: 'Добавляет виртуализацию для списков с >50 элементами',
    priority: 3,
    category: 'performance',
  },

  keyboardAccessibility: {
    enabled: true,
    description: 'Добавляет поддержку клавиатуры для интерактивных элементов',
    priority: 2,
    category: 'accessibility',
    appliedVersion: '1.0.0',
  },

  backdropFilterFallback: {
    enabled: true,
    description: 'Добавляет fallback для браузеров без поддержки backdrop-filter',
    priority: 2,
    category: 'performance',
    appliedVersion: '1.0.0',
  },
};

/**
 * Получить включенные исправления
 */
export function getEnabledFixes(config: AuroraFixesConfig = defaultAuroraFixesConfig): string[] {
  return Object.entries(config)
    .filter(([_, fixConfig]) => fixConfig.enabled)
    .map(([key]) => key);
}

/**
 * Получить исправления по категории
 */
export function getFixesByCategory(
  category: AuroraFixConfig['category'],
  config: AuroraFixesConfig = defaultAuroraFixesConfig
): string[] {
  return Object.entries(config)
    .filter(([_, fixConfig]) => fixConfig.category === category && fixConfig.enabled)
    .map(([key]) => key);
}

/**
 * Получить критичные исправления
 */
export function getCriticalFixes(config: AuroraFixesConfig = defaultAuroraFixesConfig): string[] {
  return getFixesByCategory('critical', config);
}

/**
 * Проверить, применено ли исправление
 */
export function isFixApplied(
  fixName: keyof AuroraFixesConfig,
  config: AuroraFixesConfig = defaultAuroraFixesConfig
): boolean {
  return config[fixName].enabled && !!config[fixName].appliedVersion;
}

/**
 * Получить статистику исправлений
 */
export function getFixesStats(config: AuroraFixesConfig = defaultAuroraFixesConfig) {
  const allFixes = Object.values(config);
  const enabledFixes = allFixes.filter((fix) => fix.enabled);
  const appliedFixes = allFixes.filter((fix) => fix.appliedVersion);

  return {
    total: allFixes.length,
    enabled: enabledFixes.length,
    applied: appliedFixes.length,
    byCategory: {
      critical: allFixes.filter((fix) => fix.category === 'critical').length,
      performance: allFixes.filter((fix) => fix.category === 'performance').length,
      accessibility: allFixes.filter((fix) => fix.category === 'accessibility').length,
      optional: allFixes.filter((fix) => fix.category === 'optional').length,
    },
  };
}
