# Fluid Aurora Animations Guide

Полное руководство по анимационным компонентам и эффектам Fluid Aurora дизайн-системы.

## Содержание

1. [useAuroraAnimation Hook](#useauroraanimation-hook)
2. [AnimatedList](#animatedlist)
3. [Skeleton Loading](#skeleton-loading)
4. [Примеры интеграции](#примеры-интеграции)

---

## useAuroraAnimation Hook

Хук для создания анимационных вариантов Framer Motion с готовыми пресетами.

### Расположение

```
src/hooks/aurora/useAuroraAnimation.ts
```

### Основной хук

```typescript
import { useAuroraAnimation } from '@/components/aurora';

const variants = useAuroraAnimation({
  preset: 'fadeInUp',
  direction: 'bottom',
  duration: 0.5,
  delay: 0,
  easing: 'easeOut',
  distance: 30,
});
```

### Пресеты анимаций

#### 1. fadeInUp

Плавное появление с движением вверх.

```tsx
import { motion } from 'framer-motion';
import { useAuroraAnimation } from '@/components/aurora';

function Component() {
  const variants = useAuroraAnimation({ preset: 'fadeInUp' });
  
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      Контент
    </motion.div>
  );
}
```

#### 2. slideIn

Скольжение с указанного направления.

```tsx
const variants = useAuroraAnimation({
  preset: 'slideIn',
  direction: 'left', // 'top' | 'bottom' | 'left' | 'right'
  distance: 50,
});
```

#### 3. glow

Появление с эффектом свечения и blur.

```tsx
const variants = useAuroraAnimation({
  preset: 'glow',
  duration: 0.6,
});
```

#### 4. float

Плавающая анимация (бесконечная).

```tsx
const variants = useAuroraAnimation({
  preset: 'float',
  duration: 2,
});
```

### Параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `preset` | `AnimationPreset` | `'fadeInUp'` | Тип анимации |
| `direction` | `AnimationDirection` | `'top'` | Направление движения |
| `duration` | `number` | `0.5` | Длительность (сек) |
| `delay` | `number` | `0` | Задержка (сек) |
| `easing` | `AnimationEasing` | `'easeOut'` | Тип easing |
| `distance` | `number` | `30` | Дистанция движения (px) |

### Типы Easing

- `'linear'` - линейная анимация
- `'easeIn'` - ускорение в конце
- `'easeOut'` - замедление в конце  
- `'easeInOut'` - ускорение в начале и замедление в конце
- `'spring'` - пружинная анимация

### Дополнительные хуки

#### useStaggerContainer

Создает контейнер для stagger анимации списков.

```tsx
import { motion } from 'framer-motion';
import { useStaggerContainer } from '@/components/aurora';

function List() {
  const containerVariants = useStaggerContainer(0.1); // задержка между элементами
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* дочерние элементы */}
    </motion.div>
  );
}
```

#### useStaggerItem

Создает вариант для элемента списка.

```tsx
import { useStaggerItem } from '@/components/aurora';

const itemVariants = useStaggerItem({
  direction: 'bottom',
  duration: 0.3,
});
```

#### useShimmerAnimation

Shimmer эффект для loading состояний.

```tsx
import { useShimmerAnimation } from '@/components/aurora';

const shimmerVariants = useShimmerAnimation();

// Использование
<motion.div
  className="bg-gradient-to-r from-transparent via-white/20 to-transparent"
  variants={shimmerVariants}
  animate="shimmer"
/>
```

#### usePulseAnimation

Пульсация для loading индикаторов.

```tsx
import { usePulseAnimation } from '@/components/aurora';

const pulseVariants = usePulseAnimation(1.5); // duration

<motion.div variants={pulseVariants} animate="pulse" />
```

#### useShakeAnimation

Встряхивание для ошибок.

```tsx
import { useShakeAnimation } from '@/components/aurora';

const shakeVariants = useShakeAnimation();

<motion.div variants={shakeVariants} animate="shake" />
```

---

## AnimatedList

Компонент для анимированных списков с stagger эффектом и intersection observer.

### Расположение

```
src/components/aurora/animated/AnimatedList.tsx
```

### Базовое использование

```tsx
import { AnimatedList } from '@/components/aurora';

function MyList() {
  return (
    <AnimatedList direction="bottom" stagger={0.1}>
      <div>Элемент 1</div>
      <div>Элемент 2</div>
      <div>Элемент 3</div>
    </AnimatedList>
  );
}
```

### Props

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `direction` | `AnimationDirection` | `'bottom'` | Направление анимации |
| `stagger` | `number` | `0.1` | Задержка между элементами (сек) |
| `duration` | `number` | `0.3` | Длительность анимации |
| `useInView` | `boolean` | `true` | Использовать intersection observer |
| `threshold` | `number` | `0.1` | Порог видимости для observer |
| `rootMargin` | `string` | `'-50px'` | Отступ для observer |
| `once` | `boolean` | `true` | Анимировать только один раз |

### AnimatedGrid

Сеточная версия AnimatedList.

```tsx
import { AnimatedGrid } from '@/components/aurora';

<AnimatedGrid columns={3} gap="md" stagger={0.05}>
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
  <Card>4</Card>
  <Card>5</Card>
  <Card>6</Card>
</AnimatedGrid>
```

**Props:**

- `columns`: `1 | 2 | 3 | 4 | 5 | 6` - количество колонок
- `gap`: `'sm' | 'md' | 'lg'` - расстояние между элементами
- Все props от `AnimatedList`

### AnimatedListItem

Отдельный элемент с анимацией для большего контроля.

```tsx
import { AnimatedListItem } from '@/components/aurora';

<AnimatedListItem direction="left" duration={0.5} delay={0.2}>
  <Card>Контент</Card>
</AnimatedListItem>
```

### Примеры

#### Список карточек

```tsx
import { AnimatedList, GlassCard } from '@/components/aurora';

function CardList({ items }) {
  return (
    <AnimatedList 
      direction="bottom" 
      stagger={0.08}
      useInView
      once
    >
      {items.map((item) => (
        <GlassCard key={item.id} variant="elevated">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </GlassCard>
      ))}
    </AnimatedList>
  );
}
```

#### Сетка продуктов

```tsx
import { AnimatedGrid, GlassCard } from '@/components/aurora';

function ProductGrid({ products }) {
  return (
    <AnimatedGrid 
      columns={4} 
      gap="lg"
      direction="bottom"
      stagger={0.05}
    >
      {products.map((product) => (
        <GlassCard key={product.id} variant="interactive">
          <img src={product.image} alt={product.name} />
          <h4>{product.name}</h4>
          <p>${product.price}</p>
        </GlassCard>
      ))}
    </AnimatedGrid>
  );
}
```

---

## Skeleton Loading

Компоненты для loading состояний с shimmer эффектом.

### Расположение

```
src/components/aurora/animated/Skeleton.tsx
```

### Базовый Skeleton

```tsx
import { Skeleton } from '@/components/aurora';

<Skeleton width={200} height={20} variant="rectangular" />
<Skeleton width={48} height={48} variant="circular" />
<Skeleton width="100%" height={100} variant="rounded" />
```

### Варианты

- `rectangular` - прямоугольник с rounded-md
- `circular` - круг
- `rounded` - прямоугольник с rounded-lg
- `text` - для текстовых строк (высота = 1em)

### Props

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `width` | `string \| number` | - | Ширина |
| `height` | `string \| number` | - | Высота |
| `variant` | `SkeletonVariant` | `'rectangular'` | Форма |
| `shimmer` | `boolean` | `true` | Shimmer анимация |
| `pulse` | `boolean` | `false` | Pulse анимация |

### SkeletonText

Текстовый skeleton с несколькими строками.

```tsx
import { SkeletonText } from '@/components/aurora';

<SkeletonText lines={4} lastLineWidth={70} />
```

### SkeletonCard

Полноценная карточка skeleton.

```tsx
import { SkeletonCard } from '@/components/aurora';

<SkeletonCard 
  avatar 
  lines={3} 
  actions 
/>
```

**Props:**

- `avatar` - показать аватар
- `lines` - количество строк текста
- `actions` - показать кнопки действий

### SkeletonTable

Skeleton для таблиц.

```tsx
import { SkeletonTable } from '@/components/aurora';

<SkeletonTable 
  rows={10} 
  columns={5} 
  header 
/>
```

### SkeletonDashboard

Комплексный skeleton для dashboard.

```tsx
import { SkeletonDashboard } from '@/components/aurora';

<SkeletonDashboard 
  stats={4} 
  chart 
/>
```

### Примеры использования

#### Loading состояние для списка

```tsx
import { SkeletonCard } from '@/components/aurora';

function UserList({ loading, users }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} avatar lines={2} actions={false} />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

#### Loading для таблицы данных

```tsx
import { SkeletonTable } from '@/components/aurora';

function DataTable({ loading, data }) {
  if (loading) {
    return <SkeletonTable rows={10} columns={6} header />;
  }
  
  return <Table data={data} />;
}
```

---

## Примеры интеграции

### Пример 1: Анимированный Dashboard

```tsx
import { 
  AnimatedGrid, 
  GlassCard, 
  SkeletonDashboard,
  useAuroraAnimation 
} from '@/components/aurora';
import { motion } from 'framer-motion';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  
  const headerVariants = useAuroraAnimation({
    preset: 'slideIn',
    direction: 'top',
  });

  if (loading) {
    return <SkeletonDashboard stats={4} chart />;
  }

  return (
    <div className="space-y-8">
      {/* Анимированный заголовок */}
      <motion.div
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-4xl font-bold">Dashboard</h1>
      </motion.div>

      {/* Анимированная сетка статистики */}
      <AnimatedGrid columns={4} gap="lg" stagger={0.1}>
        {stats.map((stat) => (
          <GlassCard key={stat.id} variant="elevated">
            <h3>{stat.title}</h3>
            <p className="text-3xl font-bold">{stat.value}</p>
          </GlassCard>
        ))}
      </AnimatedGrid>
    </div>
  );
}
```

### Пример 2: Список с фильтрацией

```tsx
import { 
  AnimatedList, 
  GlassCard, 
  FluidButton,
  SkeletonCard 
} from '@/components/aurora';
import { AnimatePresence } from 'framer-motion';

function FilteredList() {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  
  const filteredItems = items.filter(item => 
    filter === 'all' || item.category === filter
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Фильтры */}
      <div className="flex gap-2 mb-6">
        <FluidButton 
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          Все
        </FluidButton>
        <FluidButton 
          variant={filter === 'active' ? 'primary' : 'secondary'}
          onClick={() => setFilter('active')}
        >
          Активные
        </FluidButton>
      </div>

      {/* Анимированный список */}
      <AnimatePresence mode="popLayout">
        <AnimatedList direction="bottom" stagger={0.05}>
          {filteredItems.map((item) => (
            <GlassCard key={item.id} variant="interactive">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </GlassCard>
          ))}
        </AnimatedList>
      </AnimatePresence>
    </div>
  );
}
```

### Пример 3: Форма с валидацией

```tsx
import { 
  GlassCard, 
  FluidButton,
  useShakeAnimation 
} from '@/components/aurora';
import { motion } from 'framer-motion';

function LoginForm() {
  const [error, setError] = useState(false);
  const shakeVariants = useShakeAnimation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login();
    } catch (err) {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <GlassCard variant="elevated" intensity="strong">
      <motion.form
        onSubmit={handleSubmit}
        animate={error ? 'shake' : 'normal'}
        variants={shakeVariants}
      >
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        
        <FluidButton type="submit" variant="primary">
          Войти
        </FluidButton>
        
        {error && (
          <p className="text-red-400 mt-2">
            Неверные учетные данные
          </p>
        )}
      </motion.form>
    </GlassCard>
  );
}
```

### Пример 4: Infinite Scroll с Loading

```tsx
import { 
  AnimatedList, 
  SkeletonCard,
  GlassCard 
} from '@/components/aurora';
import { useInfiniteQuery } from '@tanstack/react-query';

function InfiniteList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <AnimatedList direction="bottom" stagger={0.05}>
        {items.map((item) => (
          <GlassCard key={item.id} variant="elevated">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </GlassCard>
        ))}
      </AnimatedList>

      {/* Loading indicator */}
      {isFetchingNextPage && (
        <div className="mt-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} avatar={false} lines={2} />
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasNextPage && !isFetchingNextPage && (
        <FluidButton 
          onClick={() => fetchNextPage()}
          variant="secondary"
          className="mt-4"
        >
          Загрузить ещё
        </FluidButton>
      )}
    </div>
  );
}
```

---

## Best Practices

### Performance

1. **Используйте `once={true}`** для списков, которые не должны анимироваться повторно
2. **Ограничьте stagger** до 0.05-0.1 секунд для больших списков
3. **Предпочитайте transform** вместо изменения layout properties
4. **Используйте AnimatePresence** для выхода элементов из DOM

### Accessibility

1. **Используйте `prefers-reduced-motion`** через useReducedMotion хук
2. **Не делайте анимации слишком быстрыми** (минимум 0.2s)
3. **Предоставляйте альтернативу** для пользователей с motion sickness

### UX

1. **Stagger должен быть едва заметным** (0.05-0.1s)
2. **Loading skeleton должен повторять структуру** реального контента
3. **Используйте easeOut** для появления и easeIn для исчезновения
4. **Shimmer эффект** лучше pulse для loading состояний

---

## Заключение

Анимационные компоненты Fluid Aurora предоставляют мощный и гибкий инструментарий для создания плавных, производительных анимаций в вашем приложении.

**Созданные компоненты:**

- ✅ useAuroraAnimation + вспомогательные хуки
- ✅ AnimatedList, AnimatedGrid, AnimatedListItem
- ✅ Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonDashboard

**Все компоненты:**

- Полностью типизированы
- Оптимизированы для production
- Поддерживают accessibility
- Интегрированы с Framer Motion

Статус: **Production Ready** 🚀
