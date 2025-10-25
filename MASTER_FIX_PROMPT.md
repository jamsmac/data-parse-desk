# 🤖 MASTER FIX PROMPT - DataParseDesk 2.0 to 100%

**Используй этот промпт с Claude или ChatGPT для автоматизации исправлений**

---

## 🎯 УНИВЕРСАЛЬНЫЙ ПРОМПТ ДЛЯ ВСЕХ ФАЗ

```markdown
# ЗАДАЧА: Улучшить DataParseDesk 2.0 до 100% готовности

Ты - Senior Full-Stack Engineer с экспертизой в React, TypeScript, Supabase, и production-grade разработке.

## КОНТЕКСТ

Проект: DataParseDesk 2.0 - Universal Data Management Platform
Текущий статус: 76/100
Цель: 95+/100 (production-ready)
Кодовая база: React 18 + TypeScript 5 + Vite 7 + Supabase

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ (из MASTER_ANALYSIS_REPORT_2025.md)

1. **Type Safety Crisis** - 435 instances of `any` across 121 files
2. **DatabaseContext God Object** - 723 lines, 40+ state variables
3. **Test Coverage Gap** - Only 38 tests for 231+ components
4. **No CI/CD** - Manual deployments, no automated testing
5. **Console.log Pollution** - 364 console statements
6. **Missing 2FA** - Not implemented yet
7. **No Monitoring** - Sentry configured but not enabled
8. **No API Layer** - 51+ direct Supabase calls in components

## ТВОЯ ЗАДАЧА

Я буду давать тебе конкретные задачи из ACTION_PLAN_TO_100_PERCENT.md.
Для каждой задачи ты должен:

1. **Проанализировать** текущее состояние кода
2. **Предложить решение** с конкретными шагами
3. **Написать код** (или помочь мне написать)
4. **Создать тесты** для нового кода
5. **Обновить документацию** если нужно

## ПРИНЦИПЫ РАБОТЫ

- ✅ **Type Safety First** - Никаких `any`, только строгие типы
- ✅ **Test-Driven** - Тесты перед или вместе с кодом
- ✅ **SOLID Principles** - Чистая архитектура
- ✅ **DRY** - Не повторяйся
- ✅ **KISS** - Держи это просто
- ✅ **YAGNI** - Не делай то, что не нужно

## ФОРМАТ ОТВЕТА

Для каждой задачи используй этот формат:

### 1. АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ
[Что сейчас есть, что не так]

### 2. ПРЕДЛОЖЕННОЕ РЕШЕНИЕ
[Что нужно сделать, почему именно так]

### 3. ПОШАГОВЫЙ ПЛАН
1. Шаг 1
2. Шаг 2
3. ...

### 4. КОД
```typescript
// Файл: путь/к/файлу.ts
// Описание: что делает этот код

[Полный код с комментариями]
```

### 5. ТЕСТЫ
```typescript
// Файл: путь/к/файлу.test.ts
// Описание: что тестируется

[Полные тесты]
```

### 6. МИГРАЦИЯ
[Если нужно, как мигрировать существующий код]

### 7. ПРОВЕРКА
[Как проверить, что все работает]

## ГОТОВНОСТЬ

Я готов! Дай мне первую задачу из ACTION_PLAN_TO_100_PERCENT.md, и я начну работу.

Напомни мне:
- Какую фазу мы выполняем (Phase 1-6)
- Какую конкретную задачу
- Есть ли специфические требования

Поехали! 🚀
```

---

## 🔧 СПЕЦИАЛИЗИРОВАННЫЕ ПРОМПТЫ ПО ФАЗАМ

### PHASE 1: CRITICAL FIXES

#### Промпт 1.1: CI/CD Pipeline Setup

```markdown
# ЗАДАЧА: Настроить CI/CD Pipeline для DataParseDesk 2.0

## КОНТЕКСТ
Проект на GitHub, используем Vite + React + TypeScript.
Нужен полный CI/CD pipeline для автоматизации тестов и деплоя.

## ТРЕБОВАНИЯ

1. **GitHub Actions Workflow** для:
   - Lint (ESLint)
   - Type-check (TypeScript)
   - Tests (Vitest)
   - Build
   - Deployment (Vercel/Netlify)

2. **Lighthouse CI** для performance monitoring

3. **Branch Protection** правила

4. **Status Checks** перед merge

## ОЖИДАЕМЫЕ ФАЙЛЫ

Создай:
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.lighthouserc.json`
- Обнови `README.md` с badges

## ДОПОЛНИТЕЛЬНО

- Оптимизируй для скорости (кэширование зависимостей)
- Parallel jobs где возможно
- Fail fast если critical checks не проходят
- Notify в Slack при ошибках (опционально)

Начинай!
```

#### Промпт 1.2: Enable Sentry

```markdown
# ЗАДАЧА: Включить Sentry для Error Tracking

## КОНТЕКСТ
Sentry уже настроен в коде (`lib/sentry.ts`), но DSN пустой.
Нужно полностью активировать error tracking и performance monitoring.

## ТРЕБОВАНИЯ

1. **Конфигурация Sentry**:
   - Правильная инициализация
   - Source maps upload
   - Release tracking
   - Environment tags

2. **Error Boundaries**:
   - Обновить существующие boundaries
   - Добавить Sentry reporting
   - User feedback forms

3. **Performance Monitoring**:
   - Transaction tracking
   - Custom instrumentation
   - Web Vitals reporting

4. **Documentation**:
   - Как получить DSN
   - Как настроить alerts
   - Troubleshooting guide

## ФАЙЛЫ ДЛЯ ОБНОВЛЕНИЯ

- `src/lib/sentry.ts`
- `src/lib/errorBoundary.tsx`
- `.env.example`
- `vite.config.ts` (source maps)
- `docs/MONITORING.md` (создать)

Начинай!
```

---

### PHASE 2: TYPE SAFETY

#### Промпт 2.1: Fix DatabaseContext Types

```markdown
# ЗАДАЧА: Исправить типы в DatabaseContext

## КОНТЕКСТ
Файл: `src/contexts/DatabaseContext.tsx` (723 строки)
Проблема: 40+ instances of `any`, нет proper типов для state

## ТЕКУЩЕЕ СОСТОЯНИЕ
```typescript
const [data, setData] = useState<any>(null)
const [schema, setSchema] = useState<any[]>([])
const updateRow = (row: any) => { ... }
```

## ТРЕБУЕМОЕ СОСТОЯНИЕ

Создай строгие типы для:
1. TableData
2. TableSchema
3. DatabaseState
4. DatabaseOperations
5. FilterState
6. SortState
7. PaginationState

## ПОДХОД

1. **Создай файл типов** `src/types/database.ts`
2. **Используй generics** для гибкости
3. **Добавь type guards** для runtime validation
4. **Обнови DatabaseContext** использовать новые типы
5. **Добавь JSDoc** для документации

## ДОПОЛНИТЕЛЬНО

- Используй Zod для runtime validation
- Создай тесты для type guards
- Обнови все компоненты, использующие context

Начинай! Покажи мне структуру типов сначала.
```

#### Промпт 2.2: Create Type Definitions

```markdown
# ЗАДАЧА: Создать полный набор type definitions

## КОНТЕКСТ
Нужно создать comprehensive type system для всего проекта.

## СТРУКТУРА

Создай следующие файлы в `src/types/`:

1. **api.ts** - API responses and requests
   - Supabase responses
   - Edge Function requests/responses
   - Error types

2. **database.ts** - Database entities
   - Projects
   - Databases
   - TableData
   - TableSchema
   - Relations

3. **ui.ts** - UI component props
   - Common props (className, children, etc.)
   - Form props
   - Table props
   - Modal props

4. **form.ts** - Form types
   - Form values
   - Form errors
   - Validation schemas

5. **guards.ts** - Type guards
   - Runtime type checking functions
   - Utility type predicates

6. **utils.ts** - Utility types
   - Result<T, E>
   - Option<T>
   - AsyncResult<T, E>
   - Pagination<T>

## ТРЕБОВАНИЯ

- Все типы должны быть строгими (no `any`)
- Используй generics для переиспользования
- Добавь JSDoc комментарии
- Создай примеры использования в комментариях

## ПРИМЕР СТРУКТУРЫ

```typescript
// src/types/api.ts
export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

// Type guard
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}
```

Начинай с api.ts! Покажи мне полную структуру.
```

---

### PHASE 3: ARCHITECTURE REFACTORING

#### Промпт 3.1: Split DatabaseContext

```markdown
# ЗАДАЧА: Разделить DatabaseContext на 3 focused contexts

## ТЕКУЩАЯ ПРОБЛЕМА
DatabaseContext.tsx - 723 строки, 40+ state variables, все смешано:
- Data (table_data, schema)
- UI state (filters, sorting, pagination)
- Operations (CRUD, async actions)

## РЕШЕНИЕ

Создать 3 отдельных contexts:

### 1. DatabaseDataContext
**Ответственность:** Только данные и loading states
**State:**
```typescript
interface DatabaseDataState {
  tables: TableData[]
  schemas: TableSchema[]
  relations: DatabaseRelation[]
  loading: boolean
  error: Error | null
}
```

### 2. DatabaseUIContext
**Ответственность:** UI state и user preferences
**State:**
```typescript
interface DatabaseUIState {
  filters: FilterConfig[]
  sorting: SortConfig | null
  pagination: PaginationConfig
  selectedRows: string[]
  viewMode: 'table' | 'kanban' | 'calendar' | 'gallery'
}
```

### 3. DatabaseOperationsContext
**Ответственность:** Async operations и mutations
**Operations:**
```typescript
interface DatabaseOperations {
  createTable: (data: CreateTableInput) => Promise<Result<Table>>
  updateRow: (id: string, data: unknown) => Promise<Result<void>>
  deleteRows: (ids: string[]) => Promise<Result<void>>
  importData: (file: File) => Promise<Result<ImportResult>>
}
```

## ТРЕБОВАНИЯ

1. **Создать новые contexts** (не удалять старый пока)
2. **Мигрировать по одной странице** за раз
3. **Добавить тесты** для каждого context
4. **Создать combined provider** для удобства
5. **Написать migration guide** для команды

## СТРУКТУРА ФАЙЛОВ

```
src/contexts/database/
├── DatabaseDataContext.tsx
├── DatabaseUIContext.tsx
├── DatabaseOperationsContext.tsx
├── DatabaseProvider.tsx (combined)
├── index.ts (exports)
└── __tests__/
    ├── DatabaseDataContext.test.tsx
    ├── DatabaseUIContext.test.tsx
    └── DatabaseOperationsContext.test.tsx
```

## МИГРАЦИЯ

Покажи step-by-step план миграции:
1. Какие компоненты мигрировать первыми
2. Как избежать breaking changes
3. Как тестировать каждый шаг

Начинай! Покажи мне DatabaseDataContext сначала.
```

#### Промпт 3.2: Create API Abstraction Layer

```markdown
# ЗАДАЧА: Создать API abstraction layer

## ТЕКУЩАЯ ПРОБЛЕМА
51+ direct Supabase calls scattered across components:
```typescript
// В компоненте
const { data } = await supabase.from('table_data').select('*')
```

## РЕШЕНИЕ

Создать централизованный API layer с type-safe методами.

## СТРУКТУРА

```
src/api/
├── base.ts          # Base client с error handling
├── tableData.ts     # Table data operations
├── databases.ts     # Database operations
├── projects.ts      # Project operations
├── auth.ts          # Authentication
├── storage.ts       # File storage
├── ai.ts            # AI Edge Functions
├── payments.ts      # Stripe operations
├── webhooks.ts      # Webhook operations
└── index.ts         # Exports
```

## ТРЕБОВАНИЯ

### 1. Base Client
```typescript
// src/api/base.ts
import { SupabaseClient } from '@supabase/supabase-js'

export class ApiClient {
  constructor(private supabase: SupabaseClient) {}

  async query<T>(
    fn: (client: SupabaseClient) => Promise<T>
  ): Promise<Result<T>> {
    try {
      const result = await fn(this.supabase)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: this.parseError(error) }
    }
  }

  private parseError(error: unknown): ApiError {
    // Intelligent error parsing
  }
}
```

### 2. Domain-specific APIs
```typescript
// src/api/tableData.ts
export class TableDataApi {
  constructor(private client: ApiClient) {}

  async getAll(databaseId: string): Promise<Result<TableRow[]>> {
    return this.client.query(async (supabase) => {
      const { data, error } = await supabase
        .from('table_data')
        .select('*')
        .eq('database_id', databaseId)

      if (error) throw error
      return data
    })
  }

  async getById(id: string): Promise<Result<TableRow>> {
    // ...
  }

  async create(data: CreateTableRowInput): Promise<Result<TableRow>> {
    // ...
  }

  async update(id: string, data: UpdateTableRowInput): Promise<Result<TableRow>> {
    // ...
  }

  async delete(id: string): Promise<Result<void>> {
    // ...
  }
}
```

### 3. React Hook Integration
```typescript
// src/hooks/useTableData.ts
export function useTableData(databaseId: string) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['tableData', databaseId],
    queryFn: () => api.tableData.getAll(databaseId)
  })

  const createRow = useMutation({
    mutationFn: (data: CreateTableRowInput) => api.tableData.create(data),
    onSuccess: () => queryClient.invalidateQueries(['tableData', databaseId])
  })

  return { data, error, isLoading, createRow }
}
```

## МИГРАЦИЯ

1. Создать API layer (не трогать существующий код)
2. Мигрировать 1 компонент как proof-of-concept
3. Тестировать thoroughly
4. Мигрировать остальные компоненты
5. Удалить прямые Supabase calls

Начинай! Покажи мне base.ts и tableData.ts.
```

---

### PHASE 4: TEST COVERAGE

#### Промпт 4.1: Component Tests

```markdown
# ЗАДАЧА: Написать comprehensive component tests

## КОНТЕКСТ
Текущее покрытие: ~30%
Цель: >80%
Фреймворк: Vitest + Testing Library

## ПРИОРИТЕТНЫЕ КОМПОНЕНТЫ (TOP 10)

1. DatabaseView - main page
2. DataTable - core table component
3. FilterBar - filtering logic
4. ColumnManager - column operations
5. ImportDialog - import flow
6. ExportDialog - export flow
7. FormulaEditor - formula logic
8. RelationPicker - relation logic
9. AIAssistantPanel - AI features
10. PaymentFlow - payment logic

## ТРЕБОВАНИЯ К ТЕСТАМ

### 1. Happy Path
```typescript
describe('DatabaseView', () => {
  it('should load and display data', async () => {
    render(<DatabaseView databaseId="123" />)

    await waitFor(() => {
      expect(screen.getByText(/database name/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
```

### 2. Error States
```typescript
it('should show error message when data fails to load', async () => {
  mockApi.tableData.getAll.mockRejectedValue(new Error('Failed'))

  render(<DatabaseView databaseId="123" />)

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

### 3. Loading States
```typescript
it('should show loading spinner while fetching', () => {
  render(<DatabaseView databaseId="123" />)

  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
})
```

### 4. User Interactions
```typescript
it('should filter data when user applies filter', async () => {
  render(<DatabaseView databaseId="123" />)

  const filterButton = screen.getByRole('button', { name: /filter/i })
  await userEvent.click(filterButton)

  const filterInput = screen.getByLabelText(/filter by name/i)
  await userEvent.type(filterInput, 'test')

  const applyButton = screen.getByRole('button', { name: /apply/i })
  await userEvent.click(applyButton)

  await waitFor(() => {
    expect(screen.getByText(/test/i)).toBeInTheDocument()
  })
})
```

### 5. Accessibility
```typescript
import { axe } from 'vitest-axe'

it('should not have accessibility violations', async () => {
  const { container } = render(<DatabaseView databaseId="123" />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## ДЛЯ КАЖДОГО КОМПОНЕНТА

Напиши тесты для:
1. ✅ Render (компонент рендерится без ошибок)
2. ✅ Props (правильно обрабатывает props)
3. ✅ State (state changes работают)
4. ✅ Events (user interactions)
5. ✅ Error handling (edge cases)
6. ✅ Loading states
7. ✅ Accessibility

## ФОРМАТ

Для каждого компонента создай файл:
```
src/components/[category]/__tests__/[Component].test.tsx
```

Начинай с DatabaseView! Покажи мне полный test suite.
```

#### Промпт 4.2: Integration Tests

```markdown
# ЗАДАЧА: Создать integration tests для critical flows

## КОНТЕКСТ
Нужно протестировать end-to-end сценарии с реальными (мокнутыми) API calls.

## КРИТИЧЕСКИЕ ФЛОУ (TOP 10)

### 1. Authentication Flow
```typescript
// src/tests/integration/auth.test.ts
describe('Authentication Flow', () => {
  it('should allow user to register, verify email, and login', async () => {
    // 1. Register
    const registerData = {
      email: 'test@example.com',
      password: 'SecurePass123!'
    }
    const registerResult = await api.auth.register(registerData)
    expect(registerResult.success).toBe(true)

    // 2. Verify email (mock)
    await mockEmailVerification(registerData.email)

    // 3. Login
    const loginResult = await api.auth.login(registerData)
    expect(loginResult.success).toBe(true)
    expect(loginResult.data.user).toBeDefined()
  })

  it('should handle login errors gracefully', async () => {
    const result = await api.auth.login({
      email: 'wrong@example.com',
      password: 'wrong'
    })

    expect(result.success).toBe(false)
    expect(result.error.code).toBe('invalid_credentials')
  })
})
```

### 2. Project & Database Creation
```typescript
describe('Project & Database Flow', () => {
  it('should create project, then database, then add data', async () => {
    // 1. Create project
    const project = await api.projects.create({
      name: 'Test Project',
      icon: '📊',
      color: '#3B82F6'
    })
    expect(project.success).toBe(true)

    // 2. Create database in project
    const database = await api.databases.create({
      project_id: project.data.id,
      name: 'Test Database',
      icon: '📋'
    })
    expect(database.success).toBe(true)

    // 3. Add schema columns
    const schema = await api.tableSchemas.createMany([
      { column_name: 'name', column_type: 'text' },
      { column_name: 'age', column_type: 'number' }
    ])
    expect(schema.success).toBe(true)

    // 4. Add data
    const row = await api.tableData.create({
      database_id: database.data.id,
      data: { name: 'John', age: 30 }
    })
    expect(row.success).toBe(true)
  })
})
```

### 3. Data Import Flow
### 4. Formula Engine
### 5. Relations & Lookups
### 6. Export Flow
### 7. Payment Flow
### 8. Webhook Triggers
### 9. AI Schema Generation
### 10. Collaboration Features

## ТРЕБОВАНИЯ

1. **Setup/Teardown**
```typescript
beforeEach(async () => {
  await setupTestDatabase()
  await seedTestData()
})

afterEach(async () => {
  await cleanupTestDatabase()
})
```

2. **Mock External Services**
```typescript
vi.mock('@/api/ai', () => ({
  generateSchema: vi.fn().mockResolvedValue({
    success: true,
    data: mockSchema
  })
}))
```

3. **Real-world Scenarios**
- Test with realistic data
- Test edge cases
- Test error recovery
- Test performance (large datasets)

Начинай с Authentication Flow! Покажи полный test file.
```

---

### PHASE 5: CODE QUALITY

#### Промпт 5.1: Replace Console.log

```markdown
# ЗАДАЧА: Заменить все console.log на logger utility

## ТЕКУЩАЯ ПРОБЛЕМА
364 console.log statements across 85 files
Проблемы:
- Logs в production
- Нет контроля уровней
- Возможная утечка sensitive data
- Debugging noise

## РЕШЕНИЕ

Использовать centralized logger utility с levels.

## LOGGER UTILITY

```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
  userId?: string
}

class Logger {
  private static instance: Logger
  private logLevel: LogLevel

  constructor() {
    this.logLevel = import.meta.env.VITE_LOG_LEVEL || 'info'
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, { ...context, error: error?.message, stack: error?.stack })
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId()
    }

    // Development: Console
    if (import.meta.env.DEV) {
      const color = this.getColor(level)
      console.log(
        `%c[${level.toUpperCase()}] ${message}`,
        `color: ${color}`,
        context || ''
      )
    }

    // Production: Send to logging service
    if (import.meta.env.PROD) {
      this.sendToLoggingService(entry)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }
    return levels[level] >= levels[this.logLevel]
  }

  private getColor(level: LogLevel): string {
    const colors = {
      debug: '#6B7280',
      info: '#3B82F6',
      warn: '#F59E0B',
      error: '#EF4444'
    }
    return colors[level]
  }

  private getCurrentUserId(): string | undefined {
    // Get from auth context
    return undefined
  }

  private sendToLoggingService(entry: LogEntry): void {
    // Send to Sentry, LogRocket, etc.
    if (entry.level === 'error') {
      window.Sentry?.captureException(entry.context?.error || entry.message)
    }
  }
}

export const logger = Logger.getInstance()
```

## MIGRATION SCRIPT

Создай скрипт для автоматической замены:

```bash
#!/bin/bash
# scripts/replace-console-log.sh

# Find all console.log
grep -r "console.log" src --include="*.ts" --include="*.tsx" > console-log-locations.txt

# For each file, replace console.log with logger
while IFS= read -r file; do
  sed -i 's/console\.log/logger.debug/g' "$file"
  sed -i 's/console\.warn/logger.warn/g' "$file"
  sed -i 's/console\.error/logger.error/g' "$file"
  sed -i 's/console\.info/logger.info/g' "$file"

  # Add import at top of file
  # (need more sophisticated script for this)
done < console-log-locations.txt
```

## ТРЕБОВАНИЯ

1. Заменить все console.log → logger.debug
2. Заменить все console.warn → logger.warn
3. Заменить все console.error → logger.error
4. Добавить import logger в каждый файл
5. Обновить .env.example с VITE_LOG_LEVEL
6. Добавить ESLint rule: "no-console": "error"
7. Написать тесты для logger
8. Документировать usage в README

Начинай! Покажи мне полный logger.ts и migration plan.
```

---

### PHASE 6: PRODUCTION HARDENING

#### Промпт 6.1: Monitoring Setup

```markdown
# ЗАДАЧА: Настроить comprehensive monitoring

## КОМПОНЕНТЫ

### 1. Sentry (Error Tracking)
- Полная конфигурация
- Source maps upload
- Release tracking
- Custom tags и context

### 2. UptimeRobot (Uptime Monitoring)
- HTTP monitors для критических endpoints
- Alerts в Slack/Email
- Public status page

### 3. Web Vitals (Performance Monitoring)
- Collect Core Web Vitals
- Send to analytics
- Set up alerts

### 4. Log Aggregation
- Централизованное логирование
- Search и filtering
- Retention policies

## РЕАЛИЗАЦИЯ

### Sentry Setup
```typescript
// src/lib/sentry.ts (полная версия)
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('Sentry DSN not configured')
    return
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT,

    integrations: [
      new BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          import.meta.env.VITE_SUPABASE_URL
        ],
      }),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    tracesSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_SAMPLE_RATE || '0.1'
    ),

    replaysSessionSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_REPLAY_SESSION_RATE || '0.1'
    ),

    replaysOnErrorSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_REPLAY_ERROR_RATE || '1.0'
    ),

    beforeSend(event, hint) {
      // Filter sensitive data
      if (event.request) {
        delete event.request.cookies
        delete event.request.headers?.Authorization
      }
      return event
    },

    ignoreErrors: [
      // Ignore common browser errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  })

  // Set user context
  Sentry.setUser({
    id: getCurrentUserId(),
    email: getCurrentUserEmail(),
  })

  // Set tags
  Sentry.setTag('app_version', import.meta.env.VITE_APP_VERSION)
  Sentry.setTag('build_time', import.meta.env.VITE_BUILD_TIME)
}
```

### Web Vitals
```typescript
// src/utils/reportWebVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

interface WebVitalsMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
}

export function reportWebVitals(onReport: (metric: WebVitalsMetric) => void) {
  getCLS(onReport)
  getFID(onReport)
  getFCP(onReport)
  getLCP(onReport)
  getTTFB(onReport)
}

// Usage in main.tsx
reportWebVitals((metric) => {
  // Send to analytics
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_rating: metric.rating,
      metric_delta: metric.delta,
    })
  }

  // Send to Sentry
  Sentry.captureMessage(`Web Vital: ${metric.name}`, {
    level: 'info',
    extra: metric,
  })
})
```

## DASHBOARD

Создай monitoring dashboard с:
1. Error rate (last 24h, 7d, 30d)
2. Response time (p50, p95, p99)
3. Uptime percentage
4. Core Web Vitals trends
5. Active users
6. API usage

Используй Grafana или аналог.

Начинай! Покажи мне полную Sentry setup и monitoring dashboard spec.
```

---

## 🎯 ИСПОЛЬЗОВАНИЕ МАСТЕР-ПРОМПТОВ

### Как работать с промптами:

1. **Выбери фазу** из ACTION_PLAN_TO_100_PERCENT.md
2. **Найди соответствующий промпт** выше
3. **Скопируй промпт** и вставь в Claude/ChatGPT
4. **Следуй инструкциям** AI
5. **Проверяй код** перед commit
6. **Тестируй** каждое изменение
7. **Повторяй** для следующей задачи

### Best Practices:

✅ **DO:**
- Читай весь ответ AI перед реализацией
- Тестируй каждое изменение
- Делай небольшие commits
- Проси AI объяснить если не понятно
- Используй AI для code review

❌ **DON'T:**
- Копируй код слепо без понимания
- Пропускай тесты
- Делай большие изменения за раз
- Игнорируй warnings AI
- Забывай обновлять документацию

---

## 📞 FEEDBACK LOOP

После каждой фазы:

1. **Review результаты** с командой
2. **Update** ACTION_PLAN если нужно
3. **Adjust** timeline если нужно
4. **Document** learnings
5. **Celebrate** progress! 🎉

---

**Используй эти промпты как foundation. Адаптируй под свои нужды. Удачи! 🚀**

---

*Эти промпты созданы для максимальной автоматизации процесса улучшения качества кода. Claude и ChatGPT отлично справляются с такими структурированными задачами.*
