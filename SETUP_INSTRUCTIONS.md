# 🚀 Инструкции по запуску VHData Platform

## ✅ Что уже готово

- ✅ Типы данных TypeScript
- ✅ API слой (DatabaseAPI, FileAPI, RelationAPI)
- ✅ React Query хуки
- ✅ Утилиты (columnMapper, formulaEngine, sqlBuilder)
- ✅ Миграции Supabase
- ✅ Страницы Dashboard и DatabaseView
- ✅ Роутинг настроен
- ✅ Все зависимости установлены

## 📋 Шаги для запуска

### 1. Настройка Supabase

#### Вариант А: Локальная разработка (рекомендуется)

```bash
# Убедитесь, что Supabase CLI установлен
supabase --version

# Если не установлен:
# macOS
brew install supabase/tap/supabase

# Или через npm
npm install -g supabase

# Запустите локальную Supabase
supabase start

# Применить миграции
supabase db reset

# Сгенерировать типы TypeScript
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

#### Вариант Б: Использование Supabase Cloud

```bash
# Подключитесь к вашему проекту
supabase link --project-ref your-project-ref

# Применить миграции
supabase db push

# Сгенерировать типы TypeScript
supabase gen types typescript --project-id your-project-ref > src/integrations/supabase/types.ts
```

### 2. Настройка переменных окружения

Создайте файл `.env` (если еще не создан):

```env
# Для локальной разработки
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-from-supabase-start

# Для production
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

**Примечание:** После `supabase start` вы увидите `anon key` в выводе терминала.

### 3. Запуск приложения

```bash
# Установка зависимостей (если еще не установлены)
npm install

# Запуск dev сервера
npm run dev

# Приложение будет доступно на http://localhost:5173
```

## 🎯 Первый запуск

1. Откройте <http://localhost:5173>
2. Вы будете перенаправлены на `/dashboard`
3. Нажмите "Создать базу данных"
4. Заполните форму и создайте первую базу данных
5. Кликните на карточку базы данных для просмотра

## 🔧 Структура проекта

```
src/
├── types/              ✅ TypeScript типы
│   └── database.ts
├── api/                ✅ API слой
│   ├── databaseAPI.ts
│   ├── fileAPI.ts
│   └── relationAPI.ts
├── hooks/              ✅ React Query хуки
│   ├── useDatabases.ts
│   ├── useTableData.ts
│   ├── useFiles.ts
│   └── useRelations.ts
├── utils/              ✅ Утилиты
│   ├── columnMapper.ts
│   ├── formulaEngine.ts
│   └── sqlBuilder.ts
├── pages/              ✅ Страницы
│   ├── Dashboard.tsx
│   ├── DatabaseView.tsx
│   └── NotFound.tsx
└── components/         ✅ UI компоненты (shadcn/ui)

supabase/
└── migrations/         ✅ Миграции БД
    ├── 20251014100000_multiple_databases_system.sql
    └── 20251014110000_rpc_functions.sql
```

## 📊 Созданные таблицы

После применения миграций будут созданы таблицы:

- `databases` - пользовательские базы данных
- `table_schemas` - схемы колонок
- `database_relations` - связи между базами
- `upload_history` - история импортов

## 🔐 Row Level Security (RLS)

Все таблицы защищены RLS политиками:

- Пользователи видят только свои данные
- Автоматическая привязка к `user_id`

## ⚠️ Временное решение для разработки

В коде используется временный `user_id` для разработки:

```typescript
// В Dashboard.tsx и DatabaseView.tsx
setUserId('00000000-0000-0000-0000-000000000000');
```

**Для production:** Замените на реальную аутентификацию через Supabase Auth.

## 🐛 Устранение проблем

### Ошибка: "Cannot find module '@tanstack/react-query'"

```bash
npm install @tanstack/react-query
```

### Ошибка: TypeScript errors о Supabase типах

```bash
# Сгенерируйте типы заново
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Ошибка: "Failed to connect to Supabase"

```bash
# Проверьте, что Supabase запущен
supabase status

# Если нет, запустите
supabase start
```

### Миграции не применяются

```bash
# Сброс базы данных (ВНИМАНИЕ: удалит все данные)
supabase db reset

# Или применить миграции вручную
supabase migration up
```

## 📚 Следующие шаги

### Фаза 1: Базовые компоненты (В процессе)

- ✅ Dashboard со списком баз данных
- ✅ DatabaseView с таблицей данных
- 🔄 Компоненты для управления колонками
- 🔄 Редактор ячеек по типам
- 🔄 Расширенные фильтры

### Фаза 1.5: Связи и Rollups (Следующая)

- Управление связями между базами
- Rollup агрегации
- Lookup колонки
- Визуальный граф отношений

### Фаза 2: Умная загрузка файлов

- Drag & Drop импорт
- Автоматический маппинг колонок
- Валидация данных
- Предпросмотр перед импортом

### Фаза 2.5: Формулы

- Редактор формул с подсветкой
- Библиотека функций
- Валидация формул
- Автокомплит

### Фаза 3: Аналитика

- Конструктор графиков
- Сводные таблицы
- Дашборды
- Экспорт отчетов

### Фаза 4: Коллаборация

- Управление правами доступа
- Комментарии к записям
- Лента активности
- Realtime обновления

### Фаза 5: Автоматизация

- Workflow builder
- Триггеры и действия
- Расписание
- Webhooks

## 🎓 Полезные команды

```bash
# Разработка
npm run dev              # Запуск dev сервера
npm run build            # Сборка для production
npm run preview          # Предпросмотр production сборки
npm run lint             # Проверка кода

# Supabase
supabase start           # Запуск локального Supabase
supabase stop            # Остановка
supabase status          # Статус
supabase db reset        # Сброс БД и применение миграций
supabase db diff         # Показать изменения в БД
supabase gen types typescript --local  # Генерация типов

# База данных
supabase db push         # Применить миграции на remote
supabase db pull         # Скачать схему с remote
supabase migration new name  # Создать новую миграцию
```

## 📖 Документация

- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vite Docs](https://vitejs.dev/)

## 💡 Советы

1. **Используйте Supabase Studio** для просмотра данных:
   - Локально: <http://localhost:54323>
   - Production: <https://app.supabase.com>

2. **React Query DevTools** можно добавить для отладки:

   ```bash
   npm install @tanstack/react-query-devtools
   ```

3. **TypeScript строгость**: Проект использует строгую типизацию. При ошибках TypeScript проверьте сгенерированные типы Supabase.

## ✨ Готово

Ваше приложение VHData Platform готово к разработке!

Начните с создания базы данных в Dashboard и изучите возможности платформы.

---

**Разработано:** 14.10.2025  
**Прогресс:** 50% (Инфраструктура + основные страницы готовы)
