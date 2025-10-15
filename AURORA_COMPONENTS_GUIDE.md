# Fluid Aurora Components Guide

Руководство по использованию ключевых компонентов Fluid Aurora дизайн-системы.

## Содержание

1. [GlassCard](#glasscard)
2. [FluidButton](#fluidbutton)
3. [AuroraContainer](#auroracontainer)
4. [Примеры использования](#примеры-использования)

---

## GlassCard

Компонент карточки с эффектом glass morphism и анимациями.

### Расположение

```
src/components/aurora/core/GlassCard.tsx
```

### Props

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `variant` | `'default' \| 'elevated' \| 'interactive'` | `'default'` | Вариант карточки |
| `intensity` | `'light' \| 'medium' \| 'strong'` | `'medium'` | Интенсивность glass эффекта |
| `className` | `string` | - | Дополнительные CSS классы |
| `animated` | `boolean` | `true` | Включить анимацию появления |
| `animationDelay` | `number` | `0` | Задержка анимации (мс) |
| `onClick` | `() => void` | - | Callback при клике (для interactive) |

### Варианты

#### Default

Базовая стеклянная карточка без дополнительных эффектов.

```tsx
<GlassCard variant="default" intensity="medium">
  <GlassCardHeader>
    <GlassCardTitle>Заголовок</GlassCardTitle>
    <GlassCardDescription>Описание карточки</GlassCardDescription>
  </GlassCardHeader>
  <GlassCardContent>
    Контент карточки
  </GlassCardContent>
</GlassCard>
```

#### Elevated

Карточка с тенью и hover эффектом подъема (translateY: -4px).

```tsx
<GlassCard variant="elevated" intensity="strong">
  <h3>Приподнятая карточка</h3>
  <p>При наведении поднимается вверх</p>
</GlassCard>
```

#### Interactive

Интерактивная карточка с эффектом свечения при наведении.

```tsx
<GlassCard 
  variant="interactive" 
  intensity="medium"
  onClick={() => console.log('Clicked!')}
>
  <h3>Кликабельная карточка</h3>
  <p>Нажми на меня!</p>
</GlassCard>
```

### Интенсивность

- **light**: `bg-white/5 backdrop-blur-sm` - минимальный эффект
- **medium**: `bg-white/10 backdrop-blur-md` - сбалансированный эффект
- **strong**: `bg-white/20 backdrop-blur-lg` - максимальный эффект

### Дочерние компоненты

```tsx
<GlassCard>
  <GlassCardHeader>
    <GlassCardTitle gradient>Градиентный заголовок</GlassCardTitle>
    <GlassCardDescription>Описание</GlassCardDescription>
  </GlassCardHeader>
  
  <GlassCardContent>
    Основной контент
  </GlassCardContent>
  
  <GlassCardFooter>
    <button>Действие</button>
  </GlassCardFooter>
</GlassCard>
```

### Особенности реализации

- ✅ Использует `backdrop-filter` для glass morphism эффекта
- ✅ Hover анимация через `transform: translateY(-4px)` для elevated/interactive
- ✅ Эффект свечения при наведении для interactive варианта
- ✅ Framer Motion анимации для плавного появления
- ✅ Полная типизация TypeScript

---

## FluidButton

Кнопка с жидкой анимацией и ripple эффектом при клике.

### Расположение

```
src/components/aurora/core/FluidButton.tsx
```

### Props

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | Вариант кнопки |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Размер кнопки |
| `disabled` | `boolean` | `false` | Заблокирована ли кнопка |
| `ripple` | `boolean` | `true` | Показывать ripple эффект |
| `onClick` | `(e) => void` | - | Обработчик клика |

### Варианты

#### Primary

Градиентная кнопка с эффектом свечения.

```tsx
<FluidButton variant="primary" size="md">
  Основное действие
</FluidButton>
```

**Стили:**

- Градиентный фон: cyan-500 → purple-500
- Тень с cyan свечением
- Hover: scale(1.05) + усиление свечения
- Active: scale(0.95)

#### Secondary

Стеклянная кнопка с backdrop blur.

```tsx
<FluidButton variant="secondary" size="lg">
  Второстепенное действие
</FluidButton>
```

**Стили:**

- `bg-white/10 backdrop-blur-md`
- Граница `border-white/20`
- Hover: увеличение прозрачности

#### Ghost

Прозрачная кнопка без фона.

```tsx
<FluidButton variant="ghost" size="sm">
  Текстовая кнопка
</FluidButton>
```

### Размеры

```tsx
// Small
<FluidButton size="sm">Малая</FluidButton>
// px-3 py-1.5 text-sm rounded-md

// Medium (default)
<FluidButton size="md">Средняя</FluidButton>
// px-5 py-2.5 text-base rounded-lg

// Large
<FluidButton size="lg">Большая</FluidButton>
// px-7 py-3.5 text-lg rounded-xl
```

### Ripple эффект

```tsx
// Ripple включен (по умолчанию)
<FluidButton ripple>
  Кнопка с ripple
</FluidButton>

// Отключить ripple
<FluidButton ripple={false}>
  Без ripple
</FluidButton>
```

### FluidIconButton

Специальная версия для кнопок-иконок.

```tsx
import { FluidIconButton } from '@/components/aurora';
import { Settings } from 'lucide-react';

<FluidIconButton 
  icon={<Settings size={20} />}
  variant="ghost"
  size="md"
/>
```

### Особенности реализации

- ✅ Ripple эффект с динамическим расчетом позиции клика
- ✅ Градиентный фон с анимированным glow для primary
- ✅ Framer Motion для hover и tap анимаций
- ✅ Disabled состояние с opacity + pointer-events-none
- ✅ Focus ring для accessibility

---

## AuroraContainer

Контейнер с градиентным фоном, particle эффектами и параллаксом.

### Расположение

```
src/components/aurora/layouts/AuroraContainer.tsx
```

### Props

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `particles` | `boolean` | `false` | Включить particle эффекты |
| `particleCount` | `number` | `50` | Количество частиц |
| `parallax` | `boolean` | `false` | Параллакс при скролле |
| `parallaxIntensity` | `number` | `0.5` | Интенсивность (0-1) |
| `gradient` | `boolean` | `true` | Градиентный overlay |
| `gradientType` | `'aurora' \| 'nebula' \| 'ocean' \| 'sunset'` | `'aurora'` | Тип градиента |

### Типы градиентов

#### Aurora

Cyan → Purple → Pink с радиальным распределением сверху.

```tsx
<AuroraContainer gradientType="aurora">
  <h1>Aurora градиент</h1>
</AuroraContainer>
```

#### Nebula

Indigo → Purple → Pink от центра.

```tsx
<AuroraContainer gradientType="nebula">
  <h1>Космическая туманность</h1>
</AuroraContainer>
```

#### Ocean

Blue → Cyan → Teal снизу.

```tsx
<AuroraContainer gradientType="ocean">
  <h1>Океанские волны</h1>
</AuroraContainer>
```

#### Sunset

Orange → Red → Purple справа сверху.

```tsx
<AuroraContainer gradientType="sunset">
  <h1>Закат</h1>
</AuroraContainer>
```

### Particle эффекты

```tsx
<AuroraContainer 
  particles
  particleCount={100}
>
  <h1>Контент с частицами</h1>
</AuroraContainer>
```

**Характеристики частиц:**

- Размер: 1-4px (случайный)
- Анимация: плавающее движение вверх-вниз
- Opacity: пульсация 0.3 → 0.6
- Duration: 10-20 секунд (случайный)

### Параллакс скроллинг

```tsx
<AuroraContainer 
  parallax
  parallaxIntensity={0.8}
>
  <section>
    <h1>Параллакс контент</h1>
  </section>
</AuroraContainer>
```

**Эффекты:**

- `y`: движение фона при скролле
- `opacity`: затухание при скролле (1 → 0.6)
- Intensity: множитель для силы эффекта

### AuroraSection

Облегченная версия для секций внутри страницы.

```tsx
<AuroraSection gradient parallax>
  <h2>Секция с эффектами</h2>
  <p>Контент секции</p>
</AuroraSection>
```

### Особенности реализации

- ✅ Двухслойный градиент для глубины
- ✅ Анимированное вращение и масштабирование фона
- ✅ Динамическая генерация частиц с useEffect
- ✅ Framer Motion для параллакса через useScroll
- ✅ Затемнение для читаемости контента

---

## Примеры использования

### Пример 1: Карточка профиля

```tsx
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/aurora';

function ProfileCard() {
  return (
    <GlassCard variant="elevated" intensity="medium">
      <GlassCardHeader>
        <GlassCardTitle gradient>
          Джон Доу
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <p>Разработчик полного цикла</p>
        <p>Специализация: React, TypeScript</p>
      </GlassCardContent>
    </GlassCard>
  );
}
```

### Пример 2: Кнопки действий

```tsx
import { FluidButton } from '@/components/aurora';

function ActionButtons() {
  return (
    <div className="flex gap-4">
      <FluidButton 
        variant="primary" 
        onClick={() => console.log('Сохранено')}
      >
        Сохранить
      </FluidButton>
      
      <FluidButton 
        variant="secondary"
        onClick={() => console.log('Отменено')}
      >
        Отмена
      </FluidButton>
      
      <FluidButton 
        variant="ghost"
        ripple={false}
      >
        Подробнее
      </FluidButton>
    </div>
  );
}
```

### Пример 3: Landing page

```tsx
import { AuroraContainer, GlassCard, FluidButton } from '@/components/aurora';

function LandingPage() {
  return (
    <AuroraContainer 
      particles 
      particleCount={80}
      parallax
      gradientType="aurora"
    >
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-6xl font-bold text-center mb-8">
          Добро пожаловать
        </h1>
        
        <div className="grid grid-cols-3 gap-6 mt-12">
          <GlassCard variant="interactive" intensity="medium">
            <h3>Функция 1</h3>
            <p>Описание функции</p>
          </GlassCard>
          
          <GlassCard variant="interactive" intensity="medium">
            <h3>Функция 2</h3>
            <p>Описание функции</p>
          </GlassCard>
          
          <GlassCard variant="interactive" intensity="medium">
            <h3>Функция 3</h3>
            <p>Описание функции</p>
          </GlassCard>
        </div>
        
        <div className="text-center mt-12">
          <FluidButton variant="primary" size="lg">
            Начать работу
          </FluidButton>
        </div>
      </div>
    </AuroraContainer>
  );
}
```

### Пример 4: Интерактивный дашборд

```tsx
import { GlassCard, FluidButton, FluidIconButton } from '@/components/aurora';
import { Settings, Download } from 'lucide-react';

function Dashboard() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Дашборд</h1>
        <div className="flex gap-2">
          <FluidIconButton 
            icon={<Settings />} 
            variant="ghost"
          />
          <FluidButton variant="primary" size="sm">
            <Download className="mr-2" size={16} />
            Экспорт
          </FluidButton>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <GlassCard 
            key={i}
            variant="elevated" 
            intensity="medium"
            animated
            animationDelay={i * 100}
          >
            <h3 className="text-xl font-semibold">Метрика {i}</h3>
            <p className="text-3xl mt-2">1,234</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
```

---

## Рекомендации по использованию

### Performance

1. **Particle эффекты**: Используйте не более 50-80 частиц для оптимальной производительности
2. **Backdrop blur**: Может влиять на производительность на слабых устройствах - используйте с умом
3. **Parallax**: Интенсивность 0.3-0.7 обеспечивает баланс между эффектом и производительностью

### Accessibility

1. **FluidButton** имеет встроенный focus ring
2. Используйте `aria-label` для FluidIconButton
3. GlassCard поддерживает все стандартные HTML атрибуты

### Темная тема

Все компоненты оптимизированы для темного фона:

- Используйте на фоне `bg-gray-900` или темнее
- Для светлого фона нужна адаптация цветов

---

## Миграция со старых компонентов

### Из layouts/GlassCard в core/GlassCard

```tsx
// Старый вариант (layouts)
import { GlassCard } from '@/components/aurora/layouts/GlassCard';
<GlassCard intensity="medium" hover="float">

// Новый вариант (core)
import { GlassCard } from '@/components/aurora';
<GlassCard variant="elevated" intensity="medium">
```

**Изменения:**

- `hover="float"` → `variant="elevated"`
- `hover="glow"` → `variant="interactive"`
- Prop `gradient` удален (используйте `GlassCardTitle gradient`)

---

## Заключение

Fluid Aurora компоненты предоставляют современный, красивый и производительный способ создания UI с glass-morphism эффектами. Все компоненты полностью типизированы, поддерживают анимации и оптимизированы для production использования.

**Созданные компоненты:**

- ✅ GlassCard (src/components/aurora/core/GlassCard.tsx)
- ✅ FluidButton (src/components/aurora/core/FluidButton.tsx)  
- ✅ AuroraContainer (src/components/aurora/layouts/AuroraContainer.tsx)

**Статус:** Готово к использованию в production.
