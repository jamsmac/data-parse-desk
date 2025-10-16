# Aurora Fixes - Руководство по использованию

Краткое руководство по использованию новых возможностей и улучшений Aurora Design System.

---

## ErrorBoundary - Обработка ошибок

### Базовое использование

```tsx
import { ErrorBoundary } from '@/components/aurora';

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### С кастомным fallback

```tsx
import { ErrorBoundary } from '@/components/aurora';

function App() {
  return (
    <ErrorBoundary
      fallback={(error, errorInfo, reset) => (
        <div>
          <h1>Ошибка: {error.message}</h1>
          <button onClick={reset}>Попробовать снова</button>
        </div>
      )}
      onError={(error, errorInfo) => {
        // Отправить в Sentry или другой сервис
        console.error('Error caught:', error);
      }}
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### Минимальная версия

```tsx
import { ErrorBoundaryWrapper } from '@/components/aurora';

function App() {
  return (
    <ErrorBoundaryWrapper minimal>
      <YourComponent />
    </ErrorBoundaryWrapper>
  );
}
```

---

## Новые NPM Scripts

### Regression тесты

Проверить, что все исправления применены корректно:

```bash
# Запустить один раз
npm run test:regression

# Запустить в watch mode
npm run test:regression:watch
```

### Полная проверка проекта

Запускает type-check, lint и regression тесты:

```bash
npm run aurora:check
```

### Откат изменений

Интерактивный скрипт для отката изменений Aurora:

```bash
npm run aurora:rollback
```

Доступные опции отката:
1. Откат к последнему коммиту
2. Откат к конкретному коммиту
3. Создать backup и откатить файлы Aurora
4. Отменить последний коммит (сохранить изменения)

---

## Aurora Fixes Configuration

### Использование конфигурации

```tsx
import {
  defaultAuroraFixesConfig,
  getEnabledFixes,
  getCriticalFixes,
  getFixesStats
} from '@/config/aurora-fixes.config';

// Получить все включенные исправления
const enabled = getEnabledFixes();
console.log('Enabled fixes:', enabled);

// Получить только критичные исправления
const critical = getCriticalFixes();
console.log('Critical fixes:', critical);

// Получить статистику
const stats = getFixesStats();
console.log('Total fixes:', stats.total);
console.log('Applied fixes:', stats.applied);
console.log('By category:', stats.byCategory);
```

### Создание кастомной конфигурации

```tsx
import { AuroraFixesConfig } from '@/config/aurora-fixes.config';

const customConfig: AuroraFixesConfig = {
  ...defaultAuroraFixesConfig,
  virtualization: {
    enabled: true, // Включаем виртуализацию
    description: 'Виртуализация для больших списков',
    priority: 2,
    category: 'performance',
  },
};
```

---

## Accessibility - prefers-reduced-motion

Все Aurora компоненты автоматически поддерживают `prefers-reduced-motion`.

### Проверка в браузере

1. **macOS**: System Preferences → Accessibility → Display → Reduce motion
2. **Windows**: Settings → Ease of Access → Display → Show animations
3. **Chrome DevTools**: Rendering → Emulate CSS media feature `prefers-reduced-motion`

### Кастомное использование

```tsx
import { useReducedMotion } from '@/components/aurora';

function MyComponent() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={prefersReducedMotion ? {} : { x: 100 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }}
    >
      Content
    </motion.div>
  );
}
```

---

## Performance Optimizations

### React.memo - Когда использовать

```tsx
import { memo } from 'react';

// ✅ Хорошо: компонент часто ре-рендерится с теми же пропсами
const ExpensiveComponent = memo(({ data }) => {
  // Тяжелые вычисления
  return <div>{data}</div>;
});

// ❌ Плохо: компонент всегда получает новые пропсы
const AlwaysChanging = memo(({ onClick }) => {
  return <button onClick={onClick}>Click</button>;
});

// ✅ Решение: мемоизировать onClick
const Parent = () => {
  const handleClick = useCallback(() => {}, []);
  return <AlwaysChanging onClick={handleClick} />;
};
```

### useCallback и useMemo

```tsx
import { useCallback, useMemo } from 'react';

function DataTable({ data }) {
  // Мемоизируем сложные вычисления
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.value - b.value);
  }, [data]);

  // Мемоизируем обработчики событий
  const handleSort = useCallback((column) => {
    console.log('Sorting by', column);
  }, []);

  return <Table data={sortedData} onSort={handleSort} />;
}
```

---

## Testing Best Practices

### Запуск тестов

```bash
# Все тесты
npm test

# Только regression
npm run test:regression

# С coverage
npm run test:coverage

# UI mode
npm run test:ui
```

### Написание своих regression тестов

```tsx
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('My Feature', () => {
  it('should have specific implementation', () => {
    const filePath = join(__dirname, '../../src/MyComponent.tsx');
    const content = readFileSync(filePath, 'utf-8');

    expect(content).toContain('expectedPattern');
  });
});
```

---

## Monitoring & Debugging

### Chrome DevTools

#### Performance Profiler
```
1. Open DevTools
2. Performance tab
3. Record
4. Interact with your app
5. Stop recording
6. Analyze frame rate, main thread activity
```

#### React DevTools Profiler
```
1. Install React DevTools
2. Profiler tab
3. Record
4. Interact with your app
5. Stop recording
6. Look for components that re-render often
```

#### Memory Leaks
```
1. Performance → Memory
2. Take heap snapshot
3. Interact with app
4. Take another snapshot
5. Compare snapshots
6. Look for detached DOM nodes, listeners
```

### Lighthouse Audit

```bash
# В Chrome DevTools
1. Lighthouse tab
2. Categories: Performance, Accessibility, Best Practices
3. Generate report
```

Целевые показатели:
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+

---

## Common Issues & Solutions

### Issue: Анимации слишком медленные

**Решение 1:** Проверить FPS
```tsx
import { FPSMonitor } from '@/components/aurora';

// В dev mode
<FPSMonitor />
```

**Решение 2:** Снизить количество анимаций
```tsx
// В aurora-fixes.config.ts
{
  prefersReducedMotion: {
    enabled: true, // Автоматически использует reduced motion
  }
}
```

### Issue: Memory leaks

**Решение:** Проверить все useEffect на наличие cleanup
```tsx
useEffect(() => {
  const listener = () => {};
  window.addEventListener('event', listener);

  // ✅ ОБЯЗАТЕЛЬНО добавить cleanup
  return () => {
    window.removeEventListener('event', listener);
  };
}, []);
```

### Issue: Bundle size слишком большой

**Решение 1:** Использовать lazy loading
```tsx
import { AuroraBackgroundLazy } from '@/components/aurora';

// Вместо
// import { AuroraBackground } from '@/components/aurora';
```

**Решение 2:** Анализ bundle
```bash
npm run build
# Откроется bundle analyzer
```

---

## Deployment Checklist

Перед деплоем в production:

- [ ] Запустить `npm run aurora:check`
- [ ] Запустить `npm run build`
- [ ] Проверить bundle size (должен быть < 1.5MB)
- [ ] Провести Lighthouse audit (scores 90+)
- [ ] Проверить в разных браузерах (Chrome, Firefox, Safari)
- [ ] Проверить на мобильных устройствах
- [ ] Проверить accessibility (keyboard navigation, screen readers)
- [ ] Проверить prefers-reduced-motion
- [ ] Тест memory leaks (Chrome DevTools)

---

## Support & Resources

### Документация
- [Aurora Design System Docs](docs/aurora)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Web Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

### Тестирование
- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)

---

**Последнее обновление:** 2025-10-15
