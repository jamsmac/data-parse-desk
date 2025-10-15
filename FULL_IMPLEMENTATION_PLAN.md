# 🚀 VHData - Полный план реализации всех фаз

## ✅ Статус: Миграция БД и типы созданы
>
> Новая спецификация Notion-подобных сценариев описана в `docs/NOTION_ARCHITECTURE.md` и должна учитываться при планировании фаз 1.5–4.5.

---

## 📋 ФАЗА 1: Система множественных баз данных (3 недели)

### Создано

- ✅ Миграция базы данных (20251014100000_multiple_databases_system.sql)
- ✅ TypeScript типы (src/types/database.ts)

### Нужно создать

#### API Layer (src/api/)

1. **databaseAPI.ts** - CRUD для databases, table_schemas, динамические таблицы
2. **fileAPI.ts** - Загрузка файлов, импорт данных, маппинг колонок

#### Hooks (src/hooks/)

3. **useDatabases.ts** - React Query хуки для databases
4. **useTableData.ts** - Хуки для работы с данными таблиц  
5. **useFiles.ts** - Хуки для файлов и импорта

#### Utils (src/utils/)

6. **columnMapper.ts** - Интеллектуальное сопоставление колонок (Levenshtein distance)

#### Pages (src/pages/)

7. **Dashboard.tsx** - Главная страница с карточками БД
8. **DatabaseView.tsx** - Просмотр данных конкретной БД

#### Components (src/components/)

9. **DatabaseCard.tsx** - Карточка базы данных
10. **DatabaseFormDialog.tsx** - Форма создания/редактирования БД
11. **UploadFileDialog.tsx** - Диалог загрузки файла
12. **ColumnMapper.tsx** - Визуальный маппер колонок
13. **IconPicker.tsx** - Выбор иконки
14. **ColorPicker.tsx** - Выбор цвета
15. **EmptyState.tsx** - Пустые состояния
16. **LoadingSpinner.tsx** - Индикаторы загрузки

#### Updates (обновления существующих)

17. **App.tsx** - Добавить роуты /dashboard, /database/:id
18. **Header.tsx** - Добавить навигацию, кнопку "Назад"

---

## 📋 ФАЗА 1.5: Relations & Rollups (2 недели)

### Таблицы (уже в миграции)

- ✅ database_relations

### Нужно создать

#### Components

1. **RelationColumnEditor.tsx** - Настройка связей между БД
2. **RollupColumnEditor.tsx** - Настройка rollup агрегаций
3. **LookupColumnEditor.tsx** - Настройка lookup полей
4. **RelationshipGraph.tsx** - Визуальный граф связей между БД
5. **RelationPicker.tsx** - Выбор связанных записей

#### API Extensions

6. **relationAPI.ts** - CRUD для связей
7. Update **databaseAPI.ts** - Добавить поддержку relation/rollup/lookup колонок

#### Utils

8. **relationResolver.ts** - Резолвинг связанных данных
9. **rollupCalculator.ts** - Вычисление rollup агрегаций

---

## 📋 ФАЗА 2: Интеллектуальная загрузка (2 недели)

### Компоненты

1. **SmartColumnMapper.tsx** - ML-powered маппинг с обучением
2. **MappingHistory.tsx** - История маппингов пользователя
3. **ValidationPreview.tsx** - Превью валидации перед импортом
4. **ErrorReport.tsx** - Детальный отчет об ошибках импорта

### Utils

5. **mlMapper.ts** - ML алгоритм для автомаппинга
6. **mappingMemory.ts** - Запоминание паттернов маппинга
7. **advancedValidation.ts** - Продвинутая валидация данных

---

## 📋 ФАЗА 2.5: Формулы и вычисления (2 недели)

### Components

1. **FormulaColumnEditor.tsx** - Редактор формул с автодополнением, подсветкой синтаксиса и предпросмотром
2. **FormulaDependencyGraph.tsx** - Отображение зависимостей между формулами и колонками
3. **FormulaErrorPanel.tsx** - Мониторинг и отладка ошибок вычислений

### Utils / Backend

4. **formulaRuntime.ts** - Выполнение формул, операции с зависимостями, кеширование
5. **formulaValidator.ts** - Проверка типов, циклических зависимостей, совместимости с relation/rollup
6. **formulaScheduler.ts** - Инкрементальное пересчитывание формул при изменении данных

### Infrastructure

7. Обновление `table_schemas` для хранения `formula_config`
8. Добавление materialized кэшей для тяжёлых формул
9. Логи и аналитика времени выполнения формул

---

## 📋 ФАЗА 3: Расширенная аналитика (3-4 недели)

### Components - Charts

1. **ChartBuilder.tsx** - Конструктор графиков drag-and-drop
2. **PivotTable.tsx** - Сводная таблица
3. **ChartGallery.tsx** - Галерея типов графиков
4. **DashboardBuilder.tsx** - Конструктор дашбордов

### Components - Reports  

5. **ReportBuilder.tsx** - Конструктор отчетов
6. **ReportTemplate.tsx** - Шаблоны отчетов
7. **PDFExporter.tsx** - Экспорт в PDF
8. **ScheduledReports.tsx** - Настройка расписания отчетов

### Pages

9. **Analytics.tsx** - Страница аналитики
10. **Reports.tsx** - Страница отчетов

---

## 📋 ФАЗА 4: Коллаборация (3 недели)

### Auth & Users

1. Интеграция Supabase Auth
2. **LoginPage.tsx** - Страница входа
3. **RegisterPage.tsx** - Регистрация
4. **ProfilePage.tsx** - Профиль пользователя

### Collaboration

5. **CommentsPanel.tsx** - Комментарии к записям
6. **ActivityFeed.tsx** - Лента активности
7. **UserManagement.tsx** - Управление пользователями
8. **RoleEditor.tsx** - Редактор ролей
9. **PermissionsMatrix.tsx** - Матрица прав доступа

### Notifications

10. **NotificationCenter.tsx** - Центр уведомлений
11. **EmailSettings.tsx** - Настройки email
12. **NotificationPreferences.tsx** - Настройки уведомлений

### Updates к миграциям

13. **RLS policies** - Обновить политики безопасности под аутентификацию

---

## 📋 ФАЗА 5: Автоматизация (4 недели)

### Scheduled Tasks

1. **ScheduleManager.tsx** - Управление расписаниями
2. **CronEditor.tsx** - Редактор cron выражений
3. **AutoImport.tsx** - Автоматический импорт из URL/FTP/Google Drive

### Workflows

4. **WorkflowBuilder.tsx** - Конструктор workflow визуальный
5. **TriggerEditor.tsx** - Настройка триггеров
6. **ActionEditor.tsx** - Настройка действий
7. **ConditionBuilder.tsx** - Конструктор условий

### Integrations

8. **WebhookManager.tsx** - Управление webhooks
9. **APIExplorer.tsx** - REST API explorer
10. **IntegrationHub.tsx** - Хаб интеграций

### Backend

11. **webhookAPI.ts** - Webhook endpoints
12. **schedulerAPI.ts** - Планировщик задач
13. **workflowEngine.ts** - Движок выполнения workflow

---

## 📋 ДОПОЛНИТЕЛЬНЫЕ КОМПОНЕНТЫ

### UI Components (Shared)

1. **DataGrid.tsx** - Продвинутая таблица с виртуализацией
2. **FilterBuilder.tsx** - Конструктор сложных фильтров
3. **SearchBar.tsx** - Умная поисковая строка
4. **BulkActions.tsx** - Массовые операции
5. **ExportDialog.tsx** - Универсальный диалог экспорта

### Utils

6. **sqlBuilder.ts** - Динамический SQL builder
7. **queryOptimizer.ts** - Оптимизация запросов
8. **cacheManager.ts** - Управление кэшем
9. **errorHandler.ts** - Централизованная обработка ошибок

---

## 🗄️ ДОПОЛНИТЕЛЬНЫЕ МИГРАЦИИ

### Phase 1.5

```sql
-- Расширение для relation колонок
ALTER TABLE table_schemas ADD COLUMN relation_config JSONB;
ALTER TABLE table_schemas ADD COLUMN rollup_config JSONB;
ALTER TABLE table_schemas ADD COLUMN formula_config JSONB;
```

### Phase 4

```sql
-- Таблицы для auth и collaboration
CREATE TABLE users (...);
CREATE TABLE roles (...);
CREATE TABLE permissions (...);
CREATE TABLE comments (...);
CREATE TABLE notifications (...);
```

### Phase 5

```sql
-- Автоматизация
CREATE TABLE scheduled_tasks (...);
CREATE TABLE workflows (...);
CREATE TABLE webhooks (...);
CREATE TABLE api_keys (...);
```

---

## 📊 ОЦЕНКА ОБЪЕМА РАБОТЫ

| Фаза | Файлов | Строк кода | Недель |
|------|--------|------------|--------|
| 1 | 18 | ~6,000 | 3 |
| 1.5 | 9 | ~3,000 | 2 |
| 2 | 7 | ~2,000 | 2 |
| 3 | 10 | ~4,000 | 4 |
| 4 | 13 | ~3,500 | 3 |
| 5 | 13 | ~4,000 | 4 |
| **ИТОГО** | **70** | **~22,500** | **18** |

---

## 🎯 ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### Критичные (должны быть)

1. ✅ Миграция БД
2. ✅ Типы
3. ⏳ API слой (databaseAPI, fileAPI)
4. ⏳ Хуки (useDatabases, useTableData, useFiles)
5. ⏳ Страницы (Dashboard, DatabaseView)
6. ⏳ Базовые компоненты (Card, Dialog, Mapper)

### Важные (значительно улучшают UX)

7. Relations & Rollups
8. Графики и аналитика
9. Умный маппинг

### Желательные (можно в следующих версиях)

10. Коллаборация
11. Автоматизация
12. Advanced workflows

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

Сейчас создаю файлы в порядке приоритета:

1. API слой для работы с БД
2. React хуки
3. Основные страницы
4. UI компоненты
5. Затем переход к следующим фазам

**Цель**: Полностью рабочая система со всеми фазами!
