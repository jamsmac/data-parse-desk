# 🚀 SETUP - Инструкция по установке

**Детальное руководство для новых разработчиков**

---

## 📋 Содержание

1. [Требования](#требования)
2. [Установка](#установка)
3. [Настройка Supabase](#настройка-supabase)
4. [Настройка окружения](#настройка-окружения)
5. [Первый запуск](#первый-запуск)
6. [Структура проекта](#структура-проекта)
7. [Работа с тестами](#работа-с-тестами)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Требования

### Обязательные

- **Node.js**: v18.x или v20.x
- **npm**: v9.x или выше
- **Git**: последняя версия

### Рекомендуемые

- **VS Code** с расширениями:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin (Volar)

### Проверка установленных версий

```bash
node --version    # должно быть v18.x или v20.x
npm --version     # v9.x+
git --version     # любая современная версия
```

---

## 📦 Установка

### 1. Клонирование репозитория

```bash
# HTTPS
git clone https://github.com/jamsmac/data-parse-desk.git

# или SSH
git clone git@github.com:jamsmac/data-parse-desk.git

# Переход в директорию
cd data-parse-desk
```

### 2. Установка зависимостей

```bash
npm install
```

**Ожидаемое время**: 2-5 минут (в зависимости от скорости интернета)

**Что будет установлено**:

- ~750 packages
- React 18, TypeScript, Vite
- Tailwind CSS, shadcn/ui
- Supabase client
- Testing libraries (Vitest, Testing Library)

---

## 🗄️ Настройка Supabase

### 1. Создание проекта

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте аккаунт или войдите
3. Нажмите "New project"
4. Заполните:
   - **Name**: VHData или любое другое
   - **Database Password**: сгенерируйте надежный пароль
   - **Region**: выберите ближайший
5. Дождитесь создания (~2 минуты)

### 2. Получение учетных данных

После создания проекта:

1. Перейдите в **Settings** → **API**
2. Скопируйте:
   - **Project URL** (URL проекта)
   - **anon/public key** (публичный ключ)

### 3. Запуск миграций

1. В Supabase Dashboard откройте **SQL Editor**
2. Нажмите **New query**
3. Откройте файл `supabase/migrations/20251014100000_multiple_databases_system.sql`
4. Скопируйте весь SQL и вставьте в редактор
5. Нажмите **Run**

Повторите для всех миграций в порядке:

- `20251014100000_multiple_databases_system.sql`
- `20251014110000_rpc_functions.sql`
- `20251014120000_rls_policies.sql`

---

## ⚙️ Настройка окружения

### 1. Создание .env файла

```bash
# Копируйте example файл
cp .env.example .env.local
```

### 2. Заполнение переменных

Откройте `.env.local` и добавьте:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: для production
VITE_SENTRY_DSN=your-sentry-dsn (опционально)
```

**⚠️ Важно**:

- Замените `your-project` и `your-anon-key-here` на реальные значения
- Файл `.env.local` не коммитится в Git (в `.gitignore`)

### 3. Проверка конфигурации

```bash
# Должны увидеть ваши переменные
cat .env.local
```

---

## 🚀 Первый запуск

### 1. Запуск тестов (опционально)

Проверьте, что все работает:

```bash
npm test
```

**Ожидаемый результат**:

```
✓ src/utils/__tests__/parseData.test.ts (6 tests)
✓ src/components/ui/__tests__/button.test.tsx (4 tests)
✓ src/components/common/__tests__/LoadingSpinner.test.tsx (3 tests)
✓ src/components/aurora/__tests__/GlassCard.test.tsx (30 tests)
✓ src/components/aurora/__tests__/Animations.test.tsx (35 tests)
✓ src/components/aurora/__tests__/AuroraBackground.test.tsx (29 tests)

Test Files  6 passed (6)
Tests  107 passed (107)
```

### 2. Запуск dev сервера

```bash
npm run dev
```

**Ожидаемый вывод**:

```
VITE v7.1.10  ready in 823 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

### 3. Открытие в браузере

Откройте [http://localhost:5173/dashboard](http://localhost:5173/dashboard)

**Что должны увидеть**:

- Dashboard с карточками баз данных
- Кнопку "Create Database"
- Если баз еще нет - EmptyState

---

## 📁 Структура проекта

```
data-parse-desk/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── public/                     # Статические файлы
├── src/
│   ├── api/                    # Supabase API calls
│   │   ├── databaseAPI.ts
│   │   ├── fileAPI.ts
│   │   └── relationAPI.ts
│   ├── components/
│   │   ├── aurora/             # Aurora Design System
│   │   │   ├── core/          # GlassContainer, etc.
│   │   │   ├── layouts/       # GlassCard, GlassDialog
│   │   │   ├── effects/       # AuroraBackground
│   │   │   └── animations/    # FadeIn, StaggerChildren
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── common/             # Общие компоненты
│   │   ├── database/           # Database-специфичные
│   │   ├── charts/             # Графики
│   │   ├── collaboration/      # Collaboration features
│   │   └── ...
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Страницы/роуты
│   │   ├── Dashboard.tsx
│   │   ├── DatabaseView.tsx
│   │   ├── LoginPage.tsx       # С Aurora
│   │   └── ...
│   ├── styles/
│   │   ├── aurora-variables.css # Aurora CSS переменные
│   │   └── aurora/             # Aurora стили
│   ├── types/                  # TypeScript типы
│   ├── utils/                  # Утилиты
│   ├── test/                   # Test setup
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   ├── migrations/             # SQL миграции
│   └── config.toml
├── .env.example                # Пример env файла
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── README.md
├── SETUP.md                    # Этот файл
└── ...

**Ключевые файлы для новых разработчиков:**
- `src/App.tsx` - главный компонент с роутингом
- `src/main.tsx` - entry point
- `src/api/` - все API вызовы к Supabase
- `src/components/aurora/` - Aurora Design System
```

---

## 🧪 Работа с тестами

### Запуск всех тестов

```bash
npm test
```

### Запуск с coverage

```bash
npm test -- --coverage
```

### Запуск конкретного теста

```bash
npm test src/components/ui/__tests__/button.test.tsx
```

### Watch mode

```bash
npm test -- --watch
```

### CI проверки локально

```bash
# Все проверки как в CI
npm test              # Тесты
npm run build         # Build
npm run lint          # Lint
npx tsc --noEmit      # Type checking
npm audit             # Security
```

---

## 🔧 Troubleshooting

### Проблема: "Cannot find module @/..."

**Причина**: TypeScript не видит path aliases

**Решение**:

```bash
# Перезапустите TypeScript сервер
# В VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Или проверьте tsconfig.json
cat tsconfig.json | grep "@"
```

### Проблема: Тесты падают

**Причина**: Устаревшие node_modules

**Решение**:

```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

### Проблема: Supabase ошибки

**Причина**: Неверные credentials или не запущены миграции

**Решение**:

1. Проверьте `.env.local`:

```bash
cat .env.local
# Убедитесь что URL и KEY корректны
```

2. Проверьте миграции в Supabase Dashboard

3. Проверьте RLS policies в Table Editor

### Проблема: Port 5173 занят

**Причина**: Другой процесс использует порт

**Решение**:

```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Или запустите на другом порту
npm run dev -- --port 3000
```

### Проблема: npm install медленно

**Причина**: Медленное соединение или проблемы с npm registry

**Решение**:

```bash
# Очистите cache
npm cache clean --force

# Используйте другой registry (опционально)
npm config set registry https://registry.npmmirror.com
```

### Проблема: Тесты проходят, но TypeScript ошибки

**Причина**: Несоответствие типов после обновлений

**Решение**:

```bash
# Проверьте типы
npx tsc --noEmit

# Если ошибки в node_modules
rm -rf node_modules
npm install
```

---

## 🎓 Следующие шаги

После успешной установки:

1. **Изучите документацию**:
   - [README.md](README.md) - общая информация
   - [AURORA_DESIGN_SYSTEM_GUIDE.md](AURORA_DESIGN_SYSTEM_GUIDE.md) - Aurora компоненты
   - [FULL_IMPLEMENTATION_PLAN.md](FULL_IMPLEMENTATION_PLAN.md) - план развития

2. **Создайте тестовую базу данных**:
   - Откройте Dashboard
   - Нажмите "Create Database"
   - Добавьте несколько колонок
   - Загрузите CSV файл

3. **Изучите код**:
   - Начните с `src/pages/Dashboard.tsx`
   - Посмотрите как работают Aurora компоненты
   - Изучите API calls в `src/api/`

4. **Попробуйте внести изменения**:
   - Создайте новую feature branch
   - Внесите изменения
   - Запустите тесты
   - Создайте PR

---

## 📚 Дополнительные ресурсы

- **Документация проекта**: См. другие MD файлы в корне
- **Supabase Docs**: <https://supabase.com/docs>
- **Vite Docs**: <https://vitejs.dev>
- **Tailwind CSS**: <https://tailwindcss.com>
- **shadcn/ui**: <https://ui.shadcn.com>

---

## 🆘 Нужна помощь?

Если возникли проблемы:

1. Проверьте [Issues](../../issues) - возможно проблема уже известна
2. Создайте новый Issue с детальным описанием
3. Укажите:
   - Версию Node.js
   - OS (macOS/Windows/Linux)
   - Полный текст ошибки
   - Шаги для воспроизведения

---

**Готово! Теперь вы готовы к разработке** 🎉
