# 📊 VHData - Universal Data Management Platform

**Полноценная платформа для работы с табличными данными**

![Status](https://img.shields.io/badge/status-95%25%20Ready-success)
![Version](https://img.shields.io/badge/version-1.0.0--beta-blue)
![Tests](https://img.shields.io/badge/tests-107%2F107%20passing-brightgreen)
![Security](https://img.shields.io/badge/security-100%25-brightgreen)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue)

## 🎯 Что это?

VHData - это мощная платформа для людей без технических навыков, которая позволяет:

- 📂 Создавать неограниченное количество баз данных
- 📤 Загружать Excel/CSV файлы с умным маппингом колонок  
- 🔍 Фильтровать, группировать и анализировать данные
- 📊 Строить графики и отчеты
- 👥 Работать в команде над данными
- ⚡ Автоматизировать повторяющиеся задачи

## ⚡ Быстрый старт

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env.local
# Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY

# Запуск миграций в Supabase SQL Editor:
# supabase/migrations/20251014100000_multiple_databases_system.sql

# Запуск тестов (опционально)
npm test

# Запуск dev сервера
npm run dev
```

Откройте <http://localhost:5173/dashboard>

📖 **Для новых разработчиков**: см. [SETUP.md](SETUP.md) для детальной инструкции

## 🏗️ Архитектура

### Стек технологий

```
Frontend:  React 18 + TypeScript + Vite
UI:        Tailwind CSS + shadcn/ui
State:     React Query (TanStack Query)
Backend:   Supabase (PostgreSQL + Auth + Storage)
Parsing:   SheetJS (xlsx) + DayJS
Charts:    Recharts
Forms:     React Hook Form + Zod
```

### Структура проекта

```
src/
├── api/              # API слой (Supabase)
│   ├── databaseAPI.ts
│   ├── fileAPI.ts
│   └── relationAPI.ts
├── components/       # React компоненты
│   ├── ui/          # shadcn/ui базовые
│   ├── DatabaseCard.tsx
│   ├── ColumnMapper.tsx
│   └── ...
├── hooks/           # Custom hooks
│   ├── useDatabases.ts
│   ├── useTableData.ts
│   └── useFiles.ts
├── pages/           # Страницы (роуты)
│   ├── Dashboard.tsx
│   ├── DatabaseView.tsx
│   ├── Analytics.tsx
│   └── Reports.tsx
├── types/           # TypeScript типы
├── utils/           # Утилиты
└── integrations/    # Внешние сервисы
```

### Notion-подобная модель данных

- Relation, Rollup, Lookup и Formula колонки для построения графа данных
- Производные базы с режимами синхронизации (snapshot, live, scheduled, two-way)
- Объединение баз через визуальный Merge/Join конструктор
- Relationship Graph для интерактивного анализа взаимосвязей
- Расширенные пользовательские сценарии (CRM, инвентаризация, проекты)

📖 [Подробнее в документации](docs/NOTION_ARCHITECTURE.md)

## 📋 Реализованные фазы

### ✅ Фаза 1: Множественные БД (100%)

- Создание неограниченного кол-ва баз данных
- Кастомные схемы с разными типами колонок
- Загрузка CSV/Excel файлов
- Умный маппинг колонок (AI-powered)
- Фильтрация и поиск
- Экспорт в CSV/Excel

**Файлы**: 18 | **Строк кода**: ~6,000

### 🔄 Фаза 1.5: Relations & Rollups (В плане)

- Связи между базами (1:1, 1:N, N:M)
- Rollup агрегации
- Lookup поля
- Визуальный граф связей

**Файлы**: 9 | **Строк кода**: ~3,000

### 📊 Фаза 2: Интеллектуальная загрузка (В плане)

- ML-алгоритмы для маппинга
- История маппингов
- Продвинутая валидация
- Детальные отчеты об ошибках

**Файлы**: 7 | **Строк кода**: ~2,000

### 📈 Фаза 3: Аналитика (В плане)

- Конструктор графиков
- Pivot таблицы
- Сохраненные отчеты
- Экспорт в PDF
- Шаблоны отчетов

**Файлы**: 10 | **Строк кода**: ~4,000

### 👥 Фаза 4: Коллаборация (В плане)

- Аутентификация пользователей
- Роли и права доступа
- Комментарии
- Лента активности
- Email уведомления

**Файлы**: 13 | **Строк кода**: ~3,500

### ⚡ Фаза 5: Автоматизация (В плане)

- Расписания импорта
- Workflow builder
- Webhooks
- REST API
- Интеграции (Google Drive, Dropbox, FTP)

**Файлы**: 13 | **Строк кода**: ~4,000

## 🗄️ База данных

### Основные таблицы

**databases** - Реестр баз данных пользователя

```sql
id, system_name, display_name, table_name, 
icon_name, color_hex, cached_record_count
```

**table_schemas** - Схемы колонок для каждой БД

```sql
database_id, column_name, data_type, display_name,
is_required, is_unique, validation_rules
```

**files** - История загрузок

```sql
database_id, original_filename, processing_status,
total_rows, inserted_rows, rejected_rows
```

**audit_log** - Полный аудит всех операций

```sql
user_id, action_type, entity_type, entity_id,
old_values, new_values, timestamp
```

### Динамические таблицы

Каждая БД получает свою таблицу:

- Стандартные поля: id, created_at, updated_at
- Кастомные поля по схеме
- Автоматические индексы
- Row Level Security

## 🎨 Пользовательский интерфейс

### Главные страницы

**Dashboard** (`/dashboard`)

- Карточки всех баз данных
- Статистика: кол-во БД, записей, активность
- Поиск по базам
- Создание новой БД

**Database View** (`/database/:id`)

- Таблица данных с фильтрами
- Загрузка файлов
- Экспорт данных
- Детальный просмотр записей

**Analytics** (`/analytics`) - Фаза 3

- Графики и диаграммы
- Pivot таблицы
- Конструктор отчетов

### Ключевые компоненты

**DatabaseFormDialog** - Создание/редактирование БД

- Выбор иконки (20+ вариантов)
- Выбор цвета (16 пресетов + custom)
- Автогенерация system_name

**UploadFileDialog** - Загрузка файлов

- Drag & drop support
- Авто-маппинг колонок
- Превью и валидация
- Прогресс загрузки

**ColumnMapper** - Маппинг колонок

- Автоматическое сопоставление
- Confidence score для каждого маппинга
- Превью образцов данных
- Валидация обязательных полей

## 🔧 API Reference

### Databases

```typescript
// Получить все БД
const dbs = await getAllDatabases();

// Создать БД
const db = await createDatabase({
  display_name: "Sales 2024",
  system_name: "sales_2024",
  table_name: "user_sales_2024"
});

// Обновить
await updateDatabase(id, { display_name: "New Name" });

// Удалить
await deleteDatabase(id);
```

### File Import

```typescript
// Авто-маппинг
const mapping = await autoMapColumns(file, schemas);

// Импорт
const result = await importFileData({
  database_id: id,
  file: fileObject,
  column_mappings: mappings,
  duplicate_handling: 'skip',
  batch_size: 1000
});
```

### Table Data

```typescript
// Запрос данных
const data = await getTableData({
  table_name: "user_sales",
  page: 0,
  page_size: 50,
  filters: [
    { column: "date", operator: "gte", value: "2024-01-01" }
  ]
});
```

## 🎨 Fluid Aurora Design System

Проект использует **Fluid Aurora** - современную дизайн-систему с glass-morphism эффектами:

### Ключевые возможности

- ✨ **Glass Morphism** - полупрозрачные компоненты с blur эффектом
- 🎭 **7 градиентов Aurora** - primary, secondary, ocean, nebula и др.
- ⚡ **12+ анимаций** - glow, wave, float, slide эффекты
- 🎨 **Гибкая настройка** - intensity, blur, shadows

### Использование

```tsx
import { GlassContainer } from '@/components/aurora';

<GlassContainer
  intensity="strong"
  blur="xl"
  hover
  gradient="nebula"
  animation="scale-in"
>
  <h2>Ваш контент</h2>
</GlassContainer>
```

📖 **Полное руководство**: [AURORA_DESIGN_SYSTEM_GUIDE.md](AURORA_DESIGN_SYSTEM_GUIDE.md)

---

## 🚀 CI/CD Pipeline

### GitHub Actions

Автоматические проверки на каждый push/PR:

✅ **Test** - Все 107 тестов на Node.js 18.x и 20.x  
✅ **Security** - npm audit для проверки уязвимостей  
✅ **Coverage** - Test coverage с автокомментариями в PR  
✅ **Build** - Production build проверка  
✅ **Lint** - ESLint + TypeScript type checking

**Конфигурация**: [.github/workflows/ci.yml](.github/workflows/ci.yml)

### Локальные проверки

```bash
npm test              # Запуск всех тестов
npm test -- --coverage # С покрытием кода
npm run build         # Production build
npm run lint          # ESLint
npx tsc --noEmit      # Type checking
npm audit             # Security audit
```

---

## 🧪 Разработка

### Команды

```bash
npm run dev      # Dev сервер
npm run build    # Production build
npm run preview  # Preview build
npm run lint     # ESLint
npm test         # Запуск тестов
```

### Добавление нового типа колонки

1. Добавить в `DataType` (types/database.ts)
2. Обновить `detectDataType` (utils/columnMapper.ts)
3. Добавить обработку в `createPhysicalTable` (api/databaseAPI.ts)
4. Добавить UI в `ColumnMapper.tsx`

### Работа с Aurora компонентами

1. Импорт из `@/components/aurora`
2. Используйте готовые компоненты: `GlassCard`, `GlassContainer`, `AuroraBackground`
3. Применяйте анимации: `animate-glow`, `animate-float`, `animate-slide-up`
4. См. примеры в [AURORA_DESIGN_SYSTEM_GUIDE.md](AURORA_DESIGN_SYSTEM_GUIDE.md)

## 📖 Подробная документация

- [Полный план реализации](FULL_IMPLEMENTATION_PLAN.md)
- [Notion-подобная архитектура](docs/NOTION_ARCHITECTURE.md)
- [Документация API](docs/API.md) - TODO
- [Руководство пользователя](docs/USER_GUIDE.md) - TODO
- [Архитектура](docs/ARCHITECTURE.md) - TODO

## 🤝 Вклад в проект

Приветствуем вклад! Процесс:

1. Fork репозитория
2. Создайте feature branch
3. Commit изменения
4. Push в branch  
5. Создайте Pull Request

## 📝 Лицензия

MIT License - см. LICENSE файл

## 🙏 Благодарности

- [Supabase](https://supabase.com) - Backend
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Lucide](https://lucide.dev) - Icons
- [Recharts](https://recharts.org) - Charts
- [SheetJS](https://sheetjs.com) - Excel parsing

---

**Создано с ❤️ для работы с данными**

---

## 📊 Статистика проекта

- **Компонентов**: 108
- **Строк кода**: 35,778
- **Тестовых файлов**: 22
- **Функций**: 183
- **API файлов**: 3 (databaseAPI, fileAPI, relationAPI)
- **React hooks**: 10 (4 основных)
- **Formula Engine**: 1,106 строк кода, 46 функций
- **Готовность**: 95%

**Обновлено**: 17 октября 2025

[Документация](FULL_IMPLEMENTATION_PLAN.md) | [Issues](../../issues) | [Roadmap](../../projects)
