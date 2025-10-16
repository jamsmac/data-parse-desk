# Aurora Performance Optimization Guide

## 📋 Обзор

Система оптимизации производительности Aurora автоматически адаптирует визуальные эффекты и анимации в зависимости от возможностей устройства пользователя.

## 🎯 Основные компоненты

### 1. Performance Detector

Автоматически определяет производительность устройства на основе:

- **CPU**: Количество ядер процессора
- **Memory**: Доступная оперативная память
- **GPU**: Возможности видеокарты (через WebGL)
- **Connection**: Скорость интернет-соединения
- **User Preferences**: prefers-reduced-motion

```typescript
import { detectDevicePerformance, getPerformanceMetrics } from '@/components/aurora';

// Определить уровень производительности
const performance = detectDevicePerformance();
// Результат: 'high' | 'medium' | 'low'

// Получить детальные метрики
const metrics = getPerformanceMetrics();
console.log(metrics);
// {
//   cpuCores: 8,
//   memory: 16,
//   connection: 'fast',
//   gpu: 'high',
//   prefersReducedMotion: false
// }
```

### 2. Aurora Config Provider

Глобальный провайдер для управления настройками производительности.

```tsx
import { AuroraConfigProvider } from '@/components/aurora';

function App() {
  return (
    <AuroraConfigProvider
      autoDetect={true}           // Автоматическое определение
      minFPS={45}                 // Минимальный FPS для эффектов
      performanceLevel="high"     // Или установите вручную
    >
      <YourApp />
    </AuroraConfigProvider>
  );
}
```

### 3. FPS Monitor

Мониторинг производительности в реальном времени.

```typescript
import { FPSMonitor } from '@/components/aurora';

const monitor = new FPSMonitor();

monitor.start((fps) => {
  console.log(`Current FPS: ${fps}`);
  
  if (fps < 30) {
    // Отключить тяжелые эффекты
  }
});

// Остановить мониторинг
monitor.stop();
```

## 🚀 Использование в компонентах

### useConditionalEffect Hook

Автоматически адаптирует эффекты к производительности устройства.

```tsx
import { useConditionalEffect } from '@/components/aurora';

function MyComponent() {
  const particles = useConditionalEffect({
    high: 100,      // 100 частиц на high-end устройствах
    medium: 50,     // 50 на medium
    low: 0          // Отключено на low-end
  });

  const enableBlur = useConditionalEffect({
    high: true,
    medium: true,
    low: false
  });

  return (
    <div>
      {enableBlur && <BlurEffect />}
      <ParticleSystem count={particles} />
    </div>
  );
}
```

### useAuroraConfig Hook

Доступ к глобальным настройкам производительности.

```tsx
import { useAuroraConfig } from '@/components/aurora';

function OptimizedComponent() {
  const { performanceLevel, effectsEnabled, updateConfig } = useAuroraConfig();

  return (
    <div>
      <p>Performance: {performanceLevel}</p>
      <p>Effects: {effectsEnabled ? 'Enabled' : 'Disabled'}</p>
      
      <button onClick={() => updateConfig({ effectsEnabled: !effectsEnabled })}>
        Toggle Effects
      </button>
    </div>
  );
}
```

### withPerformanceCheck HOC

Обертка для автоматической адаптации компонентов.

```tsx
import { withPerformanceCheck } from '@/components/aurora';

const HeavyComponent = () => {
  return <ExpensiveAnimation />;
};

// Компонент будет рендериться только на high-end устройствах
const OptimizedHeavyComponent = withPerformanceCheck(HeavyComponent, {
  minPerformance: 'high'
});

// Или с кастомным fallback
const WithFallback = withPerformanceCheck(HeavyComponent, {
  minPerformance: 'medium',
  fallback: <SimplifiedVersion />
});
```

## 📦 Lazy Loading

### Базовое использование

```tsx
import { 
  AuroraBackgroundLazy,
  AuroraContainerLazy,
  AnimatedListLazy 
} from '@/components/aurora';

function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuroraBackgroundLazy gradient="aurora" />
      
      <AuroraContainerLazy particles={50}>
        <AnimatedListLazy items={data} />
      </AuroraContainerLazy>
    </Suspense>
  );
}
```

### Custom Lazy Components

```tsx
import { lazyWithFallback } from '@/components/aurora';

const HeavyChart = lazyWithFallback(
  () => import('./HeavyChart'),
  <ChartSkeleton />
);

function Dashboard() {
  return (
    <Suspense fallback={null}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

### Preloading

Загрузка компонентов в idle time для улучшения UX.

```tsx
import { lazy, Suspense } from 'react';

// В lazy.ts уже настроен автоматический preload

// Или вручную через requestIdleCallback
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    import('./HeavyComponent');
  });
}
```

## 🎨 Рекомендации по эффектам

### Автоматические рекомендации

```typescript
import { getEffectRecommendations, detectDevicePerformance } from '@/components/aurora';

const performance = detectDevicePerformance();
const recommendations = getEffectRecommendations(performance);

console.log(recommendations);
// {
//   particles: true,
//   particleCount: 100,
//   blur: true,
//   shadows: true,
//   animations: true,
//   parallax: true,
//   complexGradients: true
// }
```

### Применение рекомендаций

```tsx
function OptimizedBackground() {
  const performance = detectDevicePerformance();
  const effects = getEffectRecommendations(performance);

  return (
    <AuroraContainer
      particles={effects.particles}
      particleCount={effects.particleCount}
      gradient={effects.complexGradients ? 'nebula' : 'simple'}
    >
      {/* Content */}
    </AuroraContainer>
  );
}
```

## ⚡ Best Practices

### 1. Используйте AuroraConfigProvider на верхнем уровне

```tsx
// main.tsx или App.tsx
import { AuroraConfigProvider } from '@/components/aurora';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuroraConfigProvider autoDetect={true}>
    <App />
  </AuroraConfigProvider>
);
```

### 2. Применяйте useConditionalEffect для условных эффектов

```tsx
// ✅ Хорошо
const particleCount = useConditionalEffect({
  high: 100,
  medium: 50,
  low: 0
});

// ❌ Плохо - жестко заданное значение
const particleCount = 100;
```

### 3. Используйте Lazy loading для тяжелых компонентов

```tsx
// ✅ Хорошо
const HeavyComponent = lazyWithFallback(
  () => import('./HeavyComponent'),
  <Skeleton />
);

// ❌ Плохо - синхронный импорт
import HeavyComponent from './HeavyComponent';
```

### 4. Мониторьте FPS в development mode

```tsx
useEffect(() => {
  if (import.meta.env.DEV) {
    const monitor = new FPSMonitor();
    monitor.start((fps) => {
      console.log(`FPS: ${fps}`);
    });
    return () => monitor.stop();
  }
}, []);
```

### 5. Отключайте эффекты при низком FPS

```tsx
function AdaptiveComponent() {
  const { effectsEnabled } = useAuroraConfig();
  
  if (!effectsEnabled) {
    return <SimplifiedVersion />;
  }
  
  return <FullFeaturedVersion />;
}
```

## 📊 Уровни производительности

### High Performance (8+ баллов)

- **Все эффекты включены**
- Particles: 100
- Blur: Enabled
- Shadows: Enabled
- Animations: Full
- Parallax: Enabled
- Complex Gradients: Enabled

### Medium Performance (5-7 баллов)

- **Умеренные эффекты**
- Particles: 50
- Blur: Enabled
- Shadows: Enabled
- Animations: Simplified
- Parallax: Disabled
- Complex Gradients: Enabled

### Low Performance (< 5 баллов)

- **Минимальные эффекты**
- Particles: 0
- Blur: Disabled
- Shadows: Disabled
- Animations: Disabled
- Parallax: Disabled
- Complex Gradients: Disabled

## 🔧 Расширенная настройка

### Кастомные условия производительности

```tsx
import { useAuroraConfig } from '@/components/aurora';

function CustomPerformanceComponent() {
  const { performanceLevel } = useAuroraConfig();
  
  const getAnimationDuration = () => {
    switch (performanceLevel) {
      case 'high': return 0.3;
      case 'medium': return 0.5;
      case 'low': return 0;
    }
  };
  
  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: getAnimationDuration() }}
    >
      {/* Content */}
    </motion.div>
  );
}
```

### Динамическое управление эффектами

```tsx
function DynamicEffects() {
  const [effectsOverride, setEffectsOverride] = useState<boolean | null>(null);
  const { effectsEnabled, performanceLevel } = useAuroraConfig();
  
  const shouldShowEffects = effectsOverride ?? effectsEnabled;
  
  return (
    <div>
      <button onClick={() => setEffectsOverride(!shouldShowEffects)}>
        {shouldShowEffects ? 'Disable' : 'Enable'} Effects
      </button>
      
      {shouldShowEffects && <AdvancedEffects />}
      
      <p>Performance: {performanceLevel}</p>
    </div>
  );
}
```

## 🎯 Примеры использования

### Dashboard с адаптивными эффектами

```tsx
import {
  AuroraConfigProvider,
  useConditionalEffect,
  GlassCard,
  AnimatedListLazy
} from '@/components/aurora';

function Dashboard() {
  const particleCount = useConditionalEffect({
    high: 80,
    medium: 40,
    low: 0
  });

  const enableGlass = useConditionalEffect({
    high: true,
    medium: true,
    low: false
  });

  return (
    <AuroraContainer particles={particleCount > 0} particleCount={particleCount}>
      <div className="grid grid-cols-3 gap-4">
        {enableGlass ? (
          <GlassCard intensity="medium">
            <h2>Stats</h2>
          </GlassCard>
        ) : (
          <div className="border rounded-lg p-4">
            <h2>Stats</h2>
          </div>
        )}
      </div>
      
      <Suspense fallback={<SkeletonDashboard />}>
        <AnimatedListLazy items={dashboardItems} />
      </Suspense>
    </AuroraContainer>
  );
}
```

### Form с условной анимацией

```tsx
function OptimizedForm() {
  const enableAnimations = useConditionalEffect({
    high: true,
    medium: true,
    low: false
  });

  return (
    <form>
      {enableAnimations ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Input />
        </motion.div>
      ) : (
        <Input />
      )}
    </form>
  );
}
```

## 🔍 Debugging

### Performance Monitoring

```tsx
import { FPSMonitor, detectDevicePerformance } from '@/components/aurora';

function PerformanceDebugger() {
  const [fps, setFps] = useState(60);
  const [performance, setPerformance] = useState(detectDevicePerformance());

  useEffect(() => {
    const monitor = new FPSMonitor();
    monitor.start((currentFps) => {
      setFps(currentFps);
      
      // Автоматически понижать производительность при низком FPS
      if (currentFps < 30 && performance !== 'low') {
        setPerformance('low');
      }
    });

    return () => monitor.stop();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded">
      <p>FPS: {fps.toFixed(1)}</p>
      <p>Performance: {performance}</p>
    </div>
  );
}
```

## 📝 Checklist для оптимизации

- [ ] Установить AuroraConfigProvider на верхнем уровне приложения
- [ ] Использовать useConditionalEffect для всех тяжелых эффектов
- [ ] Применить lazy loading для больших компонентов
- [ ] Добавить FPS мониторинг в development mode
- [ ] Тестировать на устройствах разной производительности
- [ ] Проверить prefers-reduced-motion accessibility
- [ ] Оптимизировать количество particles на слабых устройствах
- [ ] Использовать withPerformanceCheck для опциональных фич
- [ ] Добавить fallback UI для lazy компонентов
- [ ] Мониторить bundle size после добавления новых эффектов

## 🎓 Дополнительные ресурсы

- [Framer Motion Performance](https://www.framer.com/motion/guide-reduce-bundle-size/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)

---

**Создано**: 15.10.2025  
**Версия**: 1.0.0  
**Статус**: ✅ Production Ready
