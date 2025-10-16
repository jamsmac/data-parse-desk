# 📋 Список незагруженных, но нужных функций

**Дата анализа**: 16 октября 2025
**Статус**: Готовы к использованию, но не интегрированы

---

## 🎯 Executive Summary

В проекте есть **множество готовых функций**, которые реализованы, но **не используются** в текущей версии. Эти функции представляют собой **фазы 1.5-5** из roadmap и готовы к активации.

---

## 1️⃣ Utils - Утилиты (0% использование)

### 📊 rollupCalculator.ts
**Статус**: ❌ Не используется (0 импортов)
**Назначение**: Вычисление Rollup агрегаций для связанных данных

#### Экспортируемые функции:
- `calculateRollup()` - вычисляет агрегацию (sum, avg, count, min, max) по связанным записям
- `performAggregation()` - выполняет агрегацию над массивом значений
- `validateRollupConfig()` - валидирует конфигурацию rollup

**Пример использования**:
```typescript
import { calculateRollup } from '@/utils/rollupCalculator';

const totalSales = await calculateRollup(
  {
    relation_column_id: 'orders_relation',
    target_column: 'amount',
    aggregation: 'sum'
  },
  relationValue
);
```

**Когда нужно**: Фаза 1.5 - Relations & Rollups

---

### 🔗 relationResolver.ts
**Статус**: ❌ Не используется (0 импортов)
**Назначение**: Резолвинг связанных данных между таблицами

#### Экспортируемые функции:
- `resolveRelation()` - получает связанные записи по IDs
- `resolveRelationSingle()` - получает одну связанную запись
- `resolveLookup()` - выполняет lookup из связанной таблицы
- `batchResolveRelations()` - batch резолвинг для производительности

**Пример использования**:
```typescript
import { resolveRelation } from '@/utils/relationResolver';

const relatedOrders = await resolveRelation(
  targetDatabaseId,
  ['order-1', 'order-2', 'order-3'],
  'customer_name' // display field
);
```

**Когда нужно**: Фаза 1.5 - Relations & Rollups

---

### 🔍 sqlBuilder.ts
**Статус**: ❌ Не используется (0 импортов)
**Назначение**: Построение SQL запросов для фильтрации и сортировки

#### Экспортируемые функции:
- `buildQuery()` - строит Supabase query с фильтрами и сортировкой
- `buildFilterClause()` - создает WHERE условия
- `buildJoinClause()` - создает JOIN операции
- `buildAggregateQuery()` - строит GROUP BY запросы
- `buildPaginationQuery()` - добавляет LIMIT/OFFSET

**Пример использования**:
```typescript
import { buildQuery } from '@/utils/sqlBuilder';

const query = buildQuery({
  tableName: 'user_sales_2024',
  filters: [
    { column: 'status', operator: 'eq', value: 'completed' },
    { column: 'amount', operator: 'gt', value: 1000 }
  ],
  sorting: { column: 'created_at', order: 'desc' },
  pagination: { page: 0, pageSize: 50 }
});
```

**Когда нужно**: Фаза 2 - Advanced Filtering

---

### 🤖 mlMapper.ts
**Статус**: ❌ Не используется (0 импортов)
**Назначение**: ML-подобный автоматический маппинг колонок

#### Экспортируемый класс:
- `MLMapper` - интеллектуальный маппер с эвристиками

#### Методы класса:
- `analyzeColumn()` - анализирует колонку (тип, паттерны, уникальность)
- `suggestMappings()` - предлагает маппинги с confidence score
- `learnFromHistory()` - учится на прошлых маппингах
- `findSimilarColumns()` - находит похожие колонки

**Пример использования**:
```typescript
import { MLMapper } from '@/utils/mlMapper';

const mapper = new MLMapper();
const suggestions = mapper.suggestMappings(
  sourceColumns,
  targetSchema,
  sampleData
);

// [
//   { sourceColumn: 'Customer Name', targetColumn: 'name', confidence: 0.95 },
//   { sourceColumn: 'Email Address', targetColumn: 'email', confidence: 0.92 }
// ]
```

**Когда нужно**: Фаза 2 - Smart Import

---

### ✅ advancedValidation.ts
**Статус**: ⚠️ Частично используется (1 импорт)
**Назначение**: Расширенная валидация данных

#### Экспортируемый класс:
- `AdvancedValidator` - валидатор с множественными правилами

#### Методы:
- `validate()` - валидирует данные по схеме
- `validateRow()` - валидирует одну строку
- `validateUniqueness()` - проверяет уникальность
- `validateReferences()` - проверяет ссылочную целостность
- `validateFormat()` - проверяет форматы (email, phone, url, date)

**Пример использования**:
```typescript
import { AdvancedValidator } from '@/utils/advancedValidation';

const validator = new AdvancedValidator();
const result = validator.validate(importData, schema);

// {
//   isValid: false,
//   errors: [{ row: 5, column: 'email', message: 'Invalid email format' }],
//   warnings: [{ row: 10, column: 'phone', message: 'Unusual phone format' }],
//   stats: { totalRows: 100, validRows: 85, errorRows: 5, warningRows: 10 }
// }
```

**Когда нужно**: Фаза 2 - Smart Import

---

### 💾 mappingMemory.ts
**Статус**: ⚠️ Частично используется (1 импорт)
**Назначение**: Запоминание маппингов для повторного использования

#### Экспортируемые функции:
- `saveMappingHistory()` - сохраняет маппинг в историю
- `getMappingHistory()` - получает историю маппингов
- `suggestFromHistory()` - предлагает маппинг на основе истории
- `clearMappingHistory()` - очищает историю

**Пример использования**:
```typescript
import { saveMappingHistory, suggestFromHistory } from '@/utils/mappingMemory';

// После успешного импорта
await saveMappingHistory(databaseId, fileName, mappings);

// При следующем импорте похожего файла
const suggestions = await suggestFromHistory(databaseId, newFileName);
```

**Когда нужно**: Фаза 2 - Smart Import

---

### 📤 exportData.ts
**Статус**: ⚠️ Частично используется
**Назначение**: Экспорт данных в различные форматы

#### Экспортируемые функции:
- `exportToCSV()` - экспорт в CSV
- `exportToExcel()` - экспорт в Excel с форматированием
- `exportToJSON()` - экспорт в JSON
- `exportToPDF()` - экспорт в PDF (если реализовано)

**Пример использования**:
```typescript
import { exportToExcel } from '@/utils/exportData';

await exportToExcel(
  filteredData,
  visibleColumns,
  'Sales_Report_2024.xlsx'
);
```

**Когда нужно**: Уже нужно сейчас! (Фаза 1)

---

## 2️⃣ Hooks - React Hooks (0-25% использование)

### 📁 useFiles.ts
**Статус**: ❌ Не используется (0% coverage)
**Назначение**: Управление файлами и импортами

#### Экспортируемые hooks:
- `useFiles(databaseId)` - получает список файлов для БД
- `useFileUpload()` - загрузка файла
- `useFileHistory()` - история импортов
- `useFilePreview()` - предпросмотр файла

**Пример использования**:
```typescript
import { useFiles } from '@/hooks/useFiles';

const { files, uploadFile, deleteFile, isLoading } = useFiles(databaseId);

// Загрузка файла
await uploadFile(file, mappings);

// История импортов
const history = files.filter(f => f.status === 'completed');
```

**Когда нужно**: Фаза 1-2 - File Management

---

### 📊 useTableData.ts
**Статус**: ❌ Не используется (0% coverage)
**Назначение**: Работа с данными таблицы

#### Экспортируемые hooks:
- `useTableData(databaseId)` - получение данных с фильтрацией
- `useTableMutations()` - CRUD операции над строками
- `useTableFilters()` - управление фильтрами
- `useTableSorting()` - управление сортировкой

**Пример использования**:
```typescript
import { useTableData } from '@/hooks/useTableData';

const {
  data,
  isLoading,
  filters,
  setFilters,
  sorting,
  setSorting,
  pagination,
  setPagination
} = useTableData(databaseId);
```

**Когда нужно**: Уже нужно сейчас! (Фаза 1)

---

### 🔗 useRelations.ts
**Статус**: ❌ Не используется (0% coverage)
**Назначение**: Управление связями между таблицами

#### Экспортируемые hooks:
- `useRelations(databaseId)` - получение связей
- `useCreateRelation()` - создание связи
- `useResolveRelation()` - резолвинг связанных данных
- `useRelationGraph()` - граф связей

**Пример использования**:
```typescript
import { useRelations } from '@/hooks/useRelations';

const { relations, createRelation, deleteRelation } = useRelations(databaseId);

await createRelation({
  sourceDatabaseId,
  targetDatabaseId,
  relationType: 'one_to_many'
});
```

**Когда нужно**: Фаза 1.5 - Relations

---

## 3️⃣ Components - Компоненты (частично реализованы)

### 📊 Charts & Analytics Components
**Местоположение**: `src/components/charts/`

#### Нереализованные компоненты:
- `ChartBuilder.tsx` - конструктор графиков
- `PivotTable.tsx` - pivot таблицы
- `DataVisualization.tsx` - визуализация данных

**Когда нужно**: Фаза 3 - Analytics

---

### 📝 Reports Components
**Местоположение**: `src/components/reports/`

#### Частично реализованные:
- `ReportTemplate.tsx` - шаблоны отчетов (есть, но не используется)
- `ScheduledReports.tsx` - запланированные отчеты (есть, но не активен)
- `PDFExporter.tsx` - экспорт в PDF (есть, но не подключен)

**Когда нужно**: Фаза 3 - Reports

---

### 👥 Collaboration Components
**Местоположение**: `src/components/collaboration/`

#### Реализованные, но не активные:
- `CommentsPanel.tsx` - панель комментариев
- `ActivityFeed.tsx` - лента активности
- `UserManagement.tsx` - управление пользователями
- `RoleEditor.tsx` - редактор ролей
- `PermissionsMatrix.tsx` - матрица прав
- `NotificationCenter.tsx` - центр уведомлений

**Когда нужно**: Фаза 4 - Collaboration

---

## 4️⃣ API Functions (частично используются)

### Реализованные, но неактивные функции:

#### analyticsAPI.ts
- `getChartData()` - данные для графиков
- `getPivotData()` - данные для pivot
- `getAggregatedData()` - агрегированные данные

#### automationAPI.ts
- `createSchedule()` - создание расписания
- `createWorkflow()` - создание workflow
- `createWebhook()` - создание webhook

**Когда нужно**: Фазы 3-5

---

## 📋 Приоритизация активации

### 🔴 Высокий приоритет (активировать сейчас)
1. **exportData.ts** - нужен для экспорта данных
2. **useTableData.ts** - критичен для работы с данными
3. **useFiles.ts** - нужен для управления файлами
4. **advancedValidation.ts** - улучшит качество импорта

### 🟡 Средний приоритет (следующий спринт)
1. **relationResolver.ts** + **rollupCalculator.ts** - Фаза 1.5
2. **mlMapper.ts** + **mappingMemory.ts** - Фаза 2
3. **sqlBuilder.ts** - расширенная фильтрация
4. **useRelations.ts** - работа со связями

### 🟢 Низкий приоритет (будущие фазы)
1. Reports components - Фаза 3
2. Analytics components - Фаза 3
3. Collaboration components - Фаза 4
4. Automation APIs - Фаза 5

---

## 🎯 План активации (Quick Wins)

### Неделя 1: Базовые функции
- [ ] Интегрировать `exportData.ts` в DatabaseView
- [ ] Активировать `useTableData.ts` для фильтрации
- [ ] Подключить `advancedValidation.ts` к импорту

### Неделя 2: Smart Import
- [ ] Активировать `mlMapper.ts` в ColumnMapper
- [ ] Подключить `mappingMemory.ts` для истории
- [ ] Добавить `useFiles.ts` для управления файлами

### Неделя 3: Relations (Фаза 1.5)
- [ ] Интегрировать `relationResolver.ts`
- [ ] Подключить `rollupCalculator.ts`
- [ ] Активировать `useRelations.ts`

---

## 📊 Статистика

```
Всего утилит: 10
- Используются: 3 (30%)
- Не используются: 7 (70%)

Всего hooks: 5
- Используются: 1 (20%)
- Не используются: 4 (80%)

Всего компонентов (collaboration, reports): ~15
- Используются: 0 (0%)
- Не используются: 15 (100%)

Общий % неиспользуемых функций: ~75%
```

---

## 💡 Рекомендации

### Немедленно
1. **Экспорт данных** - пользователи ожидают возможность экспортировать
2. **Фильтрация таблиц** - базовая функциональность
3. **Валидация импорта** - предотвратит ошибки

### Ближайшее будущее
1. **ML Mapper** - значительно улучшит UX импорта
2. **Relations** - ключевая фича для Notion-like experience
3. **Rollups** - важно для бизнес-аналитики

### Долгосрочно
1. **Аналитика** - когда будет достаточно данных
2. **Коллаборация** - для team plans
3. **Автоматизация** - для advanced users

---

**Вывод**: У проекта есть **огромный потенциал роста** - ~75% готовых функций ждут активации! Рекомендуется активировать их постепенно, по приоритетам, после production запуска.

---

**Дата составления**: 16.10.2025
**Автор**: Claude Code Analysis Team
**Следующий review**: После активации первых 3-4 функций
