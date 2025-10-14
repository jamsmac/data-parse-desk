# 🚀 VHData - Быстрый старт

## Текущий статус проекта

✅ **Фаза 1: Готова к использованию**
- Миграция БД создана
- Типы определены
- Архитектура спроектирована
- Документация написана

⏳ **Следующий шаг: Реализация компонентов**

---

## 📦 Что уже реализовано

### База данных
- ✅ Полная миграция со всеми таблицами
- ✅ Триггеры и функции
- ✅ Row Level Security
- ✅ Индексы для производительности
- ✅ Seed data для миграции существующих orders

### TypeScript
- ✅ Все основные типы определены
- ✅ Типы для всех 5 фаз проекта

### Документация
- ✅ README с полным описанием
- ✅ План реализации всех фаз
- ✅ Этот QuickStart guide

---

## 🛠️ Установка и настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте URL и anon key
3. Создайте `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Запуск миграций

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое `supabase/migrations/20251014100000_multiple_databases_system.sql`
3. Вставьте и выполните

Миграция создаст:
- 5 новых таблиц (databases, table_schemas, files, audit_log, database_relations)
- Триггеры для аудита
- Политики безопасности
- Запись для существующей таблицы orders

### 4. Запуск проекта

```bash
npm run dev
```

Откройте http://localhost:5173

---

## 📁 Следующие шаги для разработки

### Критичные файлы для создания (Фаза 1)

#### 1. API Layer
Создать в `src/api/`:

**databaseAPI.ts** (~500 строк)
- getAllDatabases()
- getDatabaseById()
- createDatabase()
- updateDatabase()
- deleteDatabase()
- getTableData()
- insertTableRow()
- updateTableRow()

**fileAPI.ts** (~400 строк)
- uploadFile()
- autoMapColumns()
- importFileData()
- getUploadHistory()

#### 2. React Hooks
Создать в `src/hooks/`:

**useDatabases.ts** (~200 строк)
- useDatabases() - query всех БД
- useDatabase(id) - query одной БД
- useCreateDatabase() - mutation
- useUpdateDatabase() - mutation
- useDeleteDatabase() - mutation

**useTableData.ts** (~200 строк)
- useTableData(query) - данные таблицы
- useInsertRow() - вставка
- useUpdateRow() - обновление

**useFiles.ts** (~150 строк)
- useFiles() - список файлов
- useImportFile() - импорт

#### 3. Utils
Создать в `src/utils/`:

**columnMapper.ts** (~400 строк)
- detectColumnMappings() - AI маппинг
- validateMappings()
- applyMapping()

#### 4. Pages
Создать в `src/pages/`:

**Dashboard.tsx** (~300 строк)
- Список БД
- Статистика
- Создание новой БД

**DatabaseView.tsx** (~400 строк)
- Просмотр данных
- Фильтры
- Загрузка файлов

#### 5. Components
Создать в `src/components/`:

**DatabaseCard.tsx** - карточка БД
**DatabaseFormDialog.tsx** - форма БД
**UploadFileDialog.tsx** - загрузка файла
**ColumnMapper.tsx** - маппинг колонок
**IconPicker.tsx** - выбор иконки
**ColorPicker.tsx** - выбор цвета
**EmptyState.tsx** - пустое состояние
**LoadingSpinner.tsx** - загрузка

#### 6. Updates
Обновить:
- `src/App.tsx` - добавить роуты
- `src/components/Header.tsx` - навигация

---

## 🎯 MVP для запуска (минимум)

Чтобы система заработала, нужно:

1. ✅ Миграция (уже есть)
2. ✅ Типы (уже есть)
3. ⏳ databaseAPI.ts
4. ⏳ useDatabases.ts
5. ⏳ Dashboard.tsx
6. ⏳ DatabaseFormDialog.tsx
7. ⏳ Обновить App.tsx

**Итого**: ~5 файлов для базовой работы

---

## 📊 Текущая архитектура (что работает)

```
✅ База данных (Supabase)
   ├── databases (таблица)
   ├── table_schemas (таблица)
   ├── files (таблица)
   ├── audit_log (таблица)
   └── orders (существующая, мигрирована)

✅ TypeScript типы
   └── src/types/database.ts

✅ Существующие компоненты
   ├── DataTable.tsx (работает)
   ├── FiltersBar.tsx (работает)
   ├── SummaryPanel.tsx (работает)
   └── UploadZone.tsx (работает)

⏳ Нужно создать
   ├── API слой
   ├── React hooks
   ├── Новые страницы
   └── Новые компоненты
```

---

## 🔨 Как продолжить разработку

### Вариант 1: Постепенно (рекомендуется)

1. Создать databaseAPI.ts
2. Создать useDatabases.ts
3. Создать простой Dashboard.tsx
4. Протестировать
5. Добавить остальные компоненты

### Вариант 2: Все сразу

1. Скопировать весь код из FULL_IMPLEMENTATION_PLAN.md
2. Создать все файлы
3. Исправить ошибки линтера
4. Запустить

---

## 🐛 Troubleshooting

### Ошибка: "Failed to connect to Supabase"
- Проверьте .env.local
- Убедитесь что URL и ключ правильные

### Ошибка: "Table not found"
- Запустите миграцию
- Проверьте что tables созданы в Supabase

### Ошибка: "Permission denied"
- Проверьте RLS policies
- В MVP они открыты (для всех true)

---

## 📚 Дополнительные ресурсы

- [Полный план](FULL_IMPLEMENTATION_PLAN.md) - детали всех фаз
- [README](README.md) - общее описание
- [Supabase Docs](https://supabase.com/docs) - документация БД
- [shadcn/ui](https://ui.shadcn.com) - UI компоненты

---

## 💡 Полезные команды

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Просмотр продакшн версии
npm run preview

# Проверка кода
npm run lint

# Установка нового UI компонента
npx shadcn-ui@latest add [component-name]
```

---

## ✅ Checklist для запуска

- [ ] npm install выполнен
- [ ] .env.local создан с правильными ключами
- [ ] Миграция запущена в Supabase
- [ ] Таблицы видны в Supabase Dashboard
- [ ] npm run dev запускается без ошибок
- [ ] Браузер открывается на localhost:5173

---

**Готово к разработке! 🚀**

Следующий шаг: Создать файлы из секции "Критичные файлы для создания"

