# 🎨 Aurora Visual Design Guide

> **Полное руководство по визуальным эффектам Aurora Design System**

---

## 🌈 Color Palette

### Fluid Colors (HSL)

```css
/* Основные цвета Aurora */
--fluid-cyan: 180 70% 60%;      /* #33CCCC - Яркий голубой */
--fluid-purple: 260 80% 70%;    /* #A78BFA - Мягкий фиолетовый */
--fluid-pink: 330 80% 70%;      /* #F093FB - Розовый */
--fluid-blue: 220 80% 65%;      /* #667EEA - Синий */
--fluid-violet: 280 70% 75%;    /* #C084FC - Фиолетовый */
--fluid-rose: 340 80% 70%;      /* #FB7185 - Роза */
```

### Nebula Colors (HSL)

```css
/* Космические цвета */
--nebula-blue: 210 60% 50%;     /* #3366CC - Глубокий синий */
--nebula-purple: 270 50% 60%;   /* #8866DD - Темно-фиолетовый */
--nebula-pink: 310 50% 60%;     /* #CC66AA - Темно-розовый */
--nebula-violet: 250 50% 70%;   /* #9988EE - Светло-фиолетовый */
```

---

## 🎭 Visual Examples

### 1. Aurora Background Variants

#### Subtle (Default для Dashboard)

```tsx
<AuroraBackground variant="aurora" intensity="subtle">
  {/* Контент */}
</AuroraBackground>
```

**Эффект:** Мягкий градиент, едва заметный, не отвлекает от контента
**Использование:** Main pages, dashboards, content-heavy pages

#### Medium

```tsx
<AuroraBackground variant="aurora" intensity="medium">
  {/* Контент */}
</AuroraBackground>
```

**Эффект:** Заметный градиент, привлекает внимание
**Использование:** Landing pages, hero sections

#### Strong

```tsx
<AuroraBackground variant="aurora" intensity="strong">
  {/* Контент */}
</AuroraBackground>
```

**Эффект:** Яркий, насыщенный градиент
**Использование:** Hero sections, splash screens, marketing pages

---

### 2. Aurora Color Schemes

#### 🌟 Aurora (Purple-Blue)

```tsx
<AuroraBackground variant="aurora">
```

**Цвета:** Фиолетовый → Синий → Розовый
**Настроение:** Премиум, высокотехнологичный, современный
**Подходит для:** Dashboard, analytics, tech products

#### 🌌 Nebula (Pink-Purple)

```tsx
<AuroraBackground variant="nebula">
```

**Цвета:** Розовый → Фиолетовый → Темно-розовый
**Настроение:** Креативный, космический, мистический
**Подходит для:** Creative tools, design apps, social platforms

#### 🌊 Ocean (Blue-Cyan)

```tsx
<AuroraBackground variant="ocean">
```

**Цвета:** Голубой → Синий → Бирюзовый
**Настроение:** Спокойный, профессиональный, доверительный
**Подходит для:** Business apps, finance, medical

#### 🌅 Sunset (Orange-Pink)

```tsx
<AuroraBackground variant="sunset">
```

**Цвета:** Оранжевый → Розовый → Красный
**Настроение:** Энергичный, теплый, дружелюбный
**Подходит для:** Social apps, lifestyle, entertainment

#### 🌲 Forest (Green-Blue)

```tsx
<AuroraBackground variant="forest">
```

**Цвета:** Зеленый → Изумрудный → Синий
**Настроение:** Природный, успокаивающий, эко
**Подходит для:** Health apps, eco products, wellness

---

### 3. GlassCard Variants

#### Intensity Levels

```tsx
// Subtle - легкое размытие
<GlassCard intensity="subtle">
  <p>Почти прозрачный, минимальный blur</p>
</GlassCard>

// Medium (Default) - баланс
<GlassCard intensity="medium">
  <p>Оптимальный баланс прозрачности и читаемости</p>
</GlassCard>

// Strong - максимальное размытие
<GlassCard intensity="strong">
  <p>Сильный blur, акцент на контент</p>
</GlassCard>
```

#### Hover Effects

```tsx
// Float - поднимается на hover
<GlassCard hover="float">
  <p>Поднимется на -5px при наведении</p>
</GlassCard>

// Glow - светится
<GlassCard hover="glow">
  <p>Появляется glowing shadow</p>
</GlassCard>

// Scale - увеличивается
<GlassCard hover="scale">
  <p>Масштабируется до 1.02</p>
</GlassCard>

// None - без эффекта
<GlassCard hover="none">
  <p>Статичная карточка</p>
</GlassCard>
```

#### Color Variants

```tsx
// Default - стандартный glass
<GlassCard variant="default">

// Aurora - с фиолетовым градиентом
<GlassCard variant="aurora">

// Dark - темный фон
<GlassCard variant="dark">

// Primary - акцентный цвет темы
<GlassCard variant="primary">

// Secondary - вторичный цвет
<GlassCard variant="secondary">
```

---

### 4. Animation Components

#### FadeIn Directions

```tsx
// Сверху вниз
<FadeIn direction="down" duration={600}>
  <h1>Заголовок появляется сверху</h1>
</FadeIn>

// Снизу вверх (default)
<FadeIn direction="up">
  <p>Контент появляется снизу</p>
</FadeIn>

// Слева направо
<FadeIn direction="left" delay={200}>
  <div>Элемент въезжает слева</div>
</FadeIn>

// Справа налево
<FadeIn direction="right" delay={400}>
  <div>Элемент въезжает справа</div>
</FadeIn>

// Без движения, только fade
<FadeIn direction="none">
  <div>Просто появляется</div>
</FadeIn>
```

#### Stagger Children

```tsx
// Последовательное появление карточек
<StaggerChildren staggerDelay={100} delayChildren={200}>
  {items.map(item => (
    <div key={item.id}>
      {/* Каждый элемент появится с задержкой 100ms */}
      {item.content}
    </div>
  ))}
</StaggerChildren>
```

**Timing:**

- `delayChildren={200}` - задержка перед началом
- `staggerDelay={100}` - интервал между элементами

**Эффект:**

- Первый элемент: 200ms
- Второй элемент: 300ms
- Третий элемент: 400ms
- И так далее...

---

## 🎨 CSS Utilities

### Glass Morphism Classes

```html
<!-- Базовые glass классы -->
<div class="glass">Default glass effect</div>
<div class="glass-subtle">Легкий glass</div>
<div class="glass-medium">Средний glass</div>
<div class="glass-strong">Сильный glass</div>

<!-- Glass с градиентами -->
<div class="glass-aurora">Фиолетовый gradient glass</div>
<div class="glass-nebula">Розовый gradient glass</div>

<!-- Hover эффекты -->
<div class="glass-hover-float">Float on hover</div>
<div class="glass-hover-glow">Glow on hover</div>
<div class="glass-hover-scale">Scale on hover</div>
<div class="glass-hover-shimmer">Shimmer effect</div>

<!-- UI Components -->
<input class="glass-input" placeholder="Glass input">
<button class="glass-button">Glass button</button>
<span class="glass-badge">Badge</span>
<div class="glass-card">Card</div>
<div class="glass-panel">Panel</div>
```

### Text Gradients

```html
<!-- Gradient текст -->
<h1 class="text-gradient-primary">
  Primary gradient text
</h1>

<h2 class="text-gradient-secondary">
  Secondary gradient text
</h2>

<h3 class="text-gradient-success">
  Success gradient text
</h3>

<h4 class="text-gradient-warning">
  Warning gradient text
</h4>
```

### Background Gradients

```html
<!-- Aurora градиенты -->
<div class="bg-aurora-primary">Primary aurora</div>
<div class="bg-aurora-secondary">Secondary aurora</div>
<div class="bg-aurora-success">Success aurora</div>
<div class="bg-aurora-warning">Warning aurora</div>
<div class="bg-aurora-danger">Danger aurora</div>
<div class="bg-aurora-info">Info aurora</div>
```

### Shadows

```html
<!-- Тени -->
<div class="shadow-glass">Glass shadow</div>
<div class="shadow-float">Float shadow</div>
<div class="shadow-glow">Glow shadow</div>
```

### Animations

```html
<!-- CSS анимации -->
<div class="animate-float">Float up/down</div>
<div class="animate-float-slow">Slow float</div>
<div class="animate-pulse-glow">Pulsing glow</div>
<div class="animate-shimmer">Shimmer effect</div>
<div class="animate-aurora-flow">Aurora flow</div>
<div class="animate-scale-in">Scale in</div>
<div class="animate-slide-up">Slide up</div>
<div class="animate-fade-in">Fade in</div>
```

---

## 📐 Layout Patterns

### Hero Section

```tsx
<AuroraBackground variant="aurora" intensity="strong">
  <div className="container mx-auto px-4 py-32">
    <FadeIn direction="up" duration={800}>
      <h1 className="text-6xl font-bold text-gradient-primary mb-4">
        Welcome to VHData
      </h1>
      <p className="text-xl text-muted-foreground mb-8">
        Manage your data like a pro
      </p>
      <Button size="lg" className="glass-button">
        Get Started
      </Button>
    </FadeIn>
  </div>
</AuroraBackground>
```

### Dashboard Grid

```tsx
<AuroraBackground variant="aurora" intensity="subtle">
  <div className="container mx-auto px-4 py-8">
    <StaggerChildren staggerDelay={100}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <GlassCard key={item.id} hover="float" intensity="medium">
            <GlassCardHeader>
              <GlassCardTitle>{item.title}</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              {item.content}
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>
    </StaggerChildren>
  </div>
</AuroraBackground>
```

### Feature Cards

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <FadeIn direction="up" delay={0}>
    <GlassCard variant="aurora" hover="glow">
      <div className="p-6">
        <div className="w-12 h-12 bg-aurora-primary rounded-lg mb-4" />
        <h3 className="text-xl font-bold mb-2">Feature 1</h3>
        <p className="text-muted-foreground">Description</p>
      </div>
    </GlassCard>
  </FadeIn>

  <FadeIn direction="up" delay={200}>
    <GlassCard variant="aurora" hover="glow">
      <div className="p-6">
        <div className="w-12 h-12 bg-aurora-secondary rounded-lg mb-4" />
        <h3 className="text-xl font-bold mb-2">Feature 2</h3>
        <p className="text-muted-foreground">Description</p>
      </div>
    </GlassCard>
  </FadeIn>

  <FadeIn direction="up" delay={400}>
    <GlassCard variant="aurora" hover="glow">
      <div className="p-6">
        <div className="w-12 h-12 bg-aurora-success rounded-lg mb-4" />
        <h3 className="text-xl font-bold mb-2">Feature 3</h3>
        <p className="text-muted-foreground">Description</p>
      </div>
    </GlassCard>
  </FadeIn>
</div>
```

### Modal/Dialog

```tsx
<Dialog>
  <DialogContent className="glass-modal">
    <DialogHeader>
      <DialogTitle className="text-gradient-primary">
        Glass Modal
      </DialogTitle>
      <DialogDescription>
        Beautiful glass morphism dialog
      </DialogDescription>
    </DialogHeader>
    
    <div className="py-4">
      <Input className="glass-input" placeholder="Glass input" />
    </div>
    
    <DialogFooter>
      <Button variant="outline" className="glass-button">
        Cancel
      </Button>
      <Button className="bg-aurora-primary">
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🎯 Best Practices

### 1. Performance

✅ **DO:**

```tsx
// Используйте reduced motion hook
const prefersReducedMotion = useReducedMotion();

// Lazy load heavy effects
const AuroraBackground = lazy(() => import('@/components/aurora/effects/AuroraBackground'));
```

❌ **DON'T:**

```tsx
// Не используйте слишком много blur на mobile
<div className="backdrop-blur-3xl"> // Слишком тяжело!
```

### 2. Accessibility

✅ **DO:**

```tsx
// Проверяйте контраст текста на glass background
<GlassCard>
  <p className="text-foreground font-medium"> // Хороший контраст
    Readable text
  </p>
</GlassCard>
```

❌ **DON'T:**

```tsx
// Не используйте низкоконтрастный текст
<GlassCard intensity="strong">
  <p className="text-muted-foreground/30"> // Плохой контраст!
```

### 3. Composition

✅ **DO:**

```tsx
// Комбинируйте эффекты разумно
<AuroraBackground intensity="subtle">
  <GlassCard intensity="medium" hover="float">
    <FadeIn>
      {/* Контент */}
    </FadeIn>
  </GlassCard>
</AuroraBackground>
```

❌ **DON'T:**

```tsx
// Не перегружайте страницу эффектами
<AuroraBackground intensity="strong">
  <AuroraBackground intensity="strong"> // Вложенные!
    <GlassCard variant="aurora" hover="glow">
      <div className="animate-float animate-pulse-glow animate-shimmer">
        // Слишком много!
      </div>
    </GlassCard>
  </AuroraBackground>
</AuroraBackground>
```

### 4. Responsive

✅ **DO:**

```tsx
// Упрощайте на mobile
<GlassCard 
  intensity="medium"
  className="md:glass-strong" // Full effect только на desktop
>
```

❌ **DON'T:**

```tsx
// Не используйте тяжелые эффекты везде
<AuroraBackground intensity="strong"> // На mobile будет лагать
```

---

## 🎨 Color Combinations

### Professional (Business)

```tsx
<AuroraBackground variant="ocean">
  <GlassCard variant="default" intensity="medium">
    {/* Синий + neutral glass */}
  </GlassCard>
</AuroraBackground>
```

### Creative (Design/Art)

```tsx
<AuroraBackground variant="nebula">
  <GlassCard variant="aurora" intensity="subtle">
    {/* Розовый/фиолетовый + aurora glass */}
  </GlassCard>
</AuroraBackground>
```

### Energetic (Social/Entertainment)

```tsx
<AuroraBackground variant="sunset">
  <GlassCard variant="primary" intensity="light">
    {/* Оранжевый/розовый + bright glass */}
  </GlassCard>
</AuroraBackground>
```

### Calm (Health/Wellness)

```tsx
<AuroraBackground variant="forest">
  <GlassCard variant="default" intensity="subtle">
    {/* Зеленый + minimal glass */}
  </GlassCard>
</AuroraBackground>
```

---

## 📊 Typography with Aurora

### Gradient Headings

```tsx
<h1 className="text-5xl font-bold bg-gradient-to-r from-fluid-cyan to-fluid-purple bg-clip-text text-transparent">
  Gradient Heading
</h1>

<h2 className="text-4xl font-bold text-gradient-primary">
  Primary Gradient
</h2>

<h3 className="text-3xl font-semibold text-gradient-secondary">
  Secondary Gradient
</h3>
```

### Body Text on Glass

```tsx
<GlassCard intensity="medium">
  <p className="text-foreground font-medium">
    High contrast body text
  </p>
  <p className="text-muted-foreground">
    Muted secondary text
  </p>
  <p className="text-sm text-muted-foreground/80">
    Small descriptive text
  </p>
</GlassCard>
```

---

## 🌟 Special Effects

### Shimmer Loading

```html
<div class="glass-card aurora-animate-shimmer">
  <div class="h-20 w-full bg-muted/20 rounded" />
</div>
```

### Pulsing Glow

```html
<div class="glass-card animate-pulse-glow">
  Important notification
</div>
```

### Floating Elements

```html
<div class="glass-card animate-float">
  <Icon className="w-16 h-16" />
</div>
```

---

## 🎯 Use Cases

### Dashboard → `aurora` + `subtle`

```tsx
<AuroraBackground variant="aurora" intensity="subtle">
```

**Почему:** Профессионально, не отвлекает

### Landing Page → `nebula` + `strong`

```tsx
<AuroraBackground variant="nebula" intensity="strong">
```

**Почему:** Wow-эффект, запоминающийся

### Admin Panel → `ocean` + `subtle`

```tsx
<AuroraBackground variant="ocean" intensity="subtle">
```

**Почему:** Деловой, спокойный

### Marketing → `sunset` + `medium`

```tsx
<AuroraBackground variant="sunset" intensity="medium">
```

**Почему:** Энергичный, привлекательный

---

## 🎨 Quick Reference

| Component | Prop | Values | Default |
|-----------|------|--------|---------|
| `AuroraBackground` | `variant` | aurora, nebula, ocean, sunset, forest | aurora |
| | `intensity` | subtle, medium, strong | medium |
| `GlassCard` | `intensity` | subtle, medium, strong | medium |
| | `hover` | float, glow, scale, none | none |
| | `variant` | default, aurora, dark, primary, secondary | default |
| `FadeIn` | `direction` | up, down, left, right, none | up |
| | `duration` | number (ms) | 500 |
| | `delay` | number (ms) | 0 |
| `StaggerChildren` | `staggerDelay` | number (ms) | 100 |
| | `delayChildren` | number (ms) | 0 |

---

**✨ Используйте эту палитру для создания современных, красивых интерфейсов!**
