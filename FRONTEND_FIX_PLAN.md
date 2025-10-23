# FRONTEND FIX PLAN - Data Parse Desk 2.0
## План исправления критических ошибок и доработок

**Дата создания:** 23 октября 2025
**Статус:** В работе
**Приоритет:** КРИТИЧЕСКИЙ

---

## EXECUTIVE SUMMARY

На основе Frontend Architecture Audit выявлено **5 критических блокеров** и **15 высокоприоритетных задач**.

**Цель:** Довести приложение до Production-Ready состояния за 3 недели.

**Подход:** Итеративный - сначала критические блокеры, затем высокий приоритет.

---

## PHASE 1: КРИТИЧЕСКИЕ БЛОКЕРЫ (Неделя 1)

### 🔴 BLOCKER 1: Разделение fileParser chunk (950KB → 3 chunks)

**Проблема:**
- Один chunk fileParser-D0p44q0m.js весит 950KB (263KB gzipped)
- Замедляет загрузку на 2-3 секунды на медленных соединениях
- Все библиотеки парсинга (xlsx, papaparse, jszip) в одном файле

**Решение:**
1. Разделить на 3 отдельных chunk в vite.config.ts
2. Использовать динамические импорты в lazyFileParser.ts
3. Проверить что lazy loading работает корректно

**Файлы для изменения:**
- `vite.config.ts` (строки 146-152)
- `src/utils/lazyFileParser.ts` (уже частично реализовано)
- `src/components/import/UploadFileDialog.tsx` (использование lazy import)

**Критерий успеха:**
- ✅ xlsx-parser.js: ~600KB (загружается только при выборе Excel)
- ✅ csv-parser.js: ~200KB (загружается только при выборе CSV)
- ✅ zip-utils.js: ~150KB (загружается только при экспорте/архивировании)
- ✅ Начальный bundle уменьшен на 950KB
- ✅ Build проходит без ошибок
- ✅ Import функционал работает корректно

**Оценка времени:** 2-3 часа

---

### 🔴 BLOCKER 2: Добавление ARIA ролей в VirtualTable

**Проблема:**
- Скрин-ридеры не могут понять структуру таблицы
- Отсутствуют role="table", role="row", role="gridcell"
- Нарушение WCAG 2.1 Level AA

**Решение:**
1. Добавить role="table" на контейнер
2. Добавить role="rowgroup" для групп строк
3. Добавить role="row" на каждую строку
4. Добавить role="gridcell" или role="cell" на каждую ячейку
5. Добавить aria-label для описания таблицы
6. Добавить aria-rowcount и aria-colcount для виртуализированных таблиц

**Файлы для изменения:**
- `src/components/common/VirtualTable.tsx` (строки 30-78)
- `src/components/DataTable.tsx` (если там тоже используется виртуализация)

**Критерий успеха:**
- ✅ VirtualTable имеет корректные ARIA роли
- ✅ Скрин-ридер правильно объявляет структуру таблицы
- ✅ Тест с NVDA/VoiceOver проходит успешно
- ✅ axe DevTools не показывает ошибок

**Оценка времени:** 1-2 часа

---

### 🔴 BLOCKER 3: Мониторинг размера bundle

**Проблема:**
- Нет автоматической проверки размера bundle при коммитах
- Риск регрессии (случайное увеличение размера)
- Нет алертов при превышении лимита

**Решение:**
1. Установить пакет bundlesize
2. Настроить лимиты для каждого типа чанков
3. Добавить pre-commit hook
4. Добавить проверку в CI/CD (GitHub Actions)

**Файлы для изменения:**
- `package.json` (добавить bundlesize конфигурацию)
- `.github/workflows/ci.yml` (добавить шаг проверки)
- Создать `.bundlesizerc.json`

**Критерий успеха:**
- ✅ bundlesize установлен и настроен
- ✅ Лимиты установлены: main chunks <400KB gzipped
- ✅ CI/CD падает при превышении лимита
- ✅ npm run build:check показывает текущие размеры

**Оценка времени:** 1 час

---

### 🔴 BLOCKER 4: aria-label на интерактивных элементах

**Проблема:**
- ButtonCell, ExportButton, UploadZone не имеют aria-label
- Скрин-ридеры не могут описать назначение кнопок
- Иконки без текста недоступны

**Решение:**
1. Добавить aria-label на все кнопки с иконками
2. Добавить aria-hidden="true" на декоративные иконки
3. Добавить visually-hidden текст где необходимо

**Файлы для изменения:**
- `src/components/cells/ButtonCell.tsx` (строка 82-91)
- `src/components/database/ExportButton.tsx` (строка 119-143)
- `src/components/import/UploadZone.tsx` (строка 54-60)
- Другие компоненты с иконками без текста

**Критерий успеха:**
- ✅ Все кнопки имеют описательный aria-label
- ✅ Декоративные иконки скрыты от скрин-ридеров
- ✅ axe DevTools не показывает ошибок "button has no accessible name"

**Оценка времени:** 30 минут

---

### 🔴 BLOCKER 5: Skip navigation links

**Проблема:**
- Пользователи клавиатуры должны Tab-ом проходить всю навигацию каждый раз
- Нет ссылки "Skip to main content"

**Решение:**
1. Добавить skip link в начало Header
2. Стилизовать: скрыт по умолчанию, видим при focus
3. Добавить id="main-content" на основной контент

**Файлы для изменения:**
- `src/components/layout/Header.tsx` или главный layout
- `src/index.css` (стили для .sr-only и focus:not-sr-only)

**Критерий успеха:**
- ✅ Skip link работает при Tab
- ✅ При клике переходит к основному контенту
- ✅ Visible при фокусе, скрыт обычно

**Оценка времени:** 30 минут

---

## PHASE 2: ВЫСОКИЙ ПРИОРИТЕТ (Неделя 2-3)

### 🟡 HIGH 1: DatabaseContext для устранения props drilling

**Проблема:**
- DatabaseView передает 13+ callback props в DataTable
- Props drilling на 2-3 уровня вглубь
- Сложно тестировать и поддерживать

**Решение:**
1. Создать DatabaseContext с типами
2. Создать DatabaseProvider с state и actions
3. Создать useDatabaseContext hook
4. Рефакторить DatabaseView и DataTable для использования контекста

**Файлы для создания/изменения:**
- Создать: `src/contexts/DatabaseContext.tsx`
- Изменить: `src/pages/DatabaseView.tsx`
- Изменить: `src/components/DataTable.tsx`

**Критерий успеха:**
- ✅ DatabaseContext создан с полными типами
- ✅ DatabaseView использует Provider
- ✅ DataTable использует useDatabaseContext
- ✅ Количество props уменьшено с 13+ до 2-3
- ✅ Функционал работает идентично

**Оценка времени:** 4-6 часов

---

### 🟡 HIGH 2: Тестирование критических hooks (5 штук)

**Проблема:**
- 0 тестов для 19 custom hooks
- Невозможно безопасно рефакторить
- Высокий риск регрессии

**Решение:**
Написать тесты для 5 критических hooks:

1. **useTableData** - самый сложный hook
   - Тест загрузки данных
   - Тест фильтрации
   - Тест сортировки
   - Тест пагинации
   - Тест обработки ошибок

2. **useKeyboardNavigation** - навигация по таблице
   - Тест arrow keys
   - Тест Tab/Shift+Tab
   - Тест Enter/Escape
   - Тест Ctrl+A/C/V

3. **useUndoRedo** - Command pattern
   - Тест undo/redo операций
   - Тест истории
   - Тест лимита истории

4. **useViewPreferences** - пользовательские настройки
   - Тест сохранения preferences
   - Тест загрузки из localStorage
   - Тест обновления

5. **useOffline** - offline sync
   - Тест queue добавления
   - Тест sync при reconnect
   - Тест обработки конфликтов

**Файлы для создания:**
- `src/hooks/__tests__/useTableData.test.ts`
- `src/hooks/__tests__/useKeyboardNavigation.test.tsx`
- `src/hooks/__tests__/useUndoRedo.test.ts`
- `src/hooks/__tests__/useViewPreferences.test.ts`
- `src/hooks/__tests__/useOffline.test.ts`

**Критерий успеха:**
- ✅ Каждый hook имеет 5-10 тестов
- ✅ Покрытие hooks: 80%+
- ✅ Все тесты проходят
- ✅ npm run test работает без ошибок

**Оценка времени:** 12-15 часов (2-3 часа на hook)

---

### 🟡 HIGH 3: Тестирование критических компонентов (10 штук)

**Проблема:**
- 0 тестов для 150+ компонентов
- Нет уверенности в UI поведении

**Решение:**
Написать тесты для 10 критических компонентов:

1. **ButtonCell** - кнопка в ячейке таблицы
2. **RatingCell** - рейтинг в ячейке
3. **UserCell** - пользователь с аватаром
4. **CellEditor** - редактор ячейки
5. **FilterBuilder** - конструктор фильтров
6. **UploadZone** - зона загрузки файлов
7. **DataPreviewTable** - превью данных
8. **ColumnMapper** - маппинг колонок
9. **EmptyState** - пустое состояние
10. **ActionBar** - панель действий

**Файлы для создания:**
- `src/components/cells/__tests__/ButtonCell.test.tsx`
- `src/components/cells/__tests__/RatingCell.test.tsx`
- `src/components/cells/__tests__/UserCell.test.tsx`
- `src/components/database/__tests__/CellEditor.test.tsx`
- `src/components/database/__tests__/FilterBuilder.test.tsx`
- `src/components/import/__tests__/UploadZone.test.tsx`
- `src/components/import/__tests__/DataPreviewTable.test.tsx`
- `src/components/import/__tests__/ColumnMapper.test.tsx`
- `src/components/common/__tests__/EmptyState.test.tsx`
- `src/components/database/__tests__/ActionBar.test.tsx`

**Критерий успеха:**
- ✅ Каждый компонент имеет 3-5 тестов
- ✅ Тесты покрывают рендеринг, props, события
- ✅ Покрытие компонентов: 60%+
- ✅ Все тесты проходят

**Оценка времени:** 8-10 часов (~1 час на компонент)

---

### 🟡 HIGH 4: Сокращение `any` типов на 50%

**Проблема:**
- 304 использования `: any` в 95 файлах
- Слабая типобезопасность
- Плохой IntelliSense

**Решение:**
Систематически заменить `any` на proper types в приоритетных файлах:

**Приоритет 1 (Критические компоненты):**
1. `src/components/DataTable.tsx` - Record<string, any> → proper RowData
2. `src/utils/formulaEngine.ts` - any → typed context
3. `src/components/database/CellEditor.tsx` - any → union types

**Приоритет 2 (Утилиты):**
4. `src/utils/parseData.ts`
5. `src/utils/columnMapper.ts`
6. `src/utils/sqlBuilder.ts`

**Приоритет 3 (Hooks):**
7. `src/hooks/useTableData.ts`
8. `src/hooks/useViewPreferences.ts`
9. `src/hooks/useAIChat.ts`

**Стратегия замены:**
```typescript
// ❌ Было
const data: any = ...;

// ✅ Стало
type CellValue = string | number | boolean | null | Date;
interface RowData {
  [columnId: string]: CellValue;
}
const data: RowData = ...;
```

**Критерий успеха:**
- ✅ Количество `any` снижено с 304 до <150
- ✅ Критические файлы имеют 0 `any`
- ✅ TypeScript компилируется без ошибок
- ✅ npm run type-check проходит

**Оценка времени:** 10-12 часов (постепенно, не блокирующе)

---

### 🟡 HIGH 5: Разделение DataTable на подкомпоненты

**Проблема:**
- DataTable.tsx содержит 733 строки
- Слишком много ответственности
- Сложно поддерживать и тестировать

**Решение:**
Разделить на 5 компонентов:

1. **DataTableContainer.tsx** (~150 строк)
   - Управление состоянием
   - Обработка событий
   - Координация дочерних компонентов

2. **DataTableVirtualized.tsx** (~200 строк)
   - Логика виртуального скроллинга
   - Рендеринг видимых строк
   - Оптимизация производительности

3. **DataTableKeyboard.tsx** (~150 строк)
   - Обработка клавиатурных событий
   - Управление фокусом
   - Навигация

4. **DataTableToolbar.tsx** (~100 строк)
   - Фильтры
   - Поиск
   - Bulk actions

5. **DataTableRow.tsx** (~100 строк)
   - Рендеринг одной строки
   - Обработка кликов
   - Выделение

**Файлы для создания/изменения:**
- Создать: `src/components/database/data-table/DataTableContainer.tsx`
- Создать: `src/components/database/data-table/DataTableVirtualized.tsx`
- Создать: `src/components/database/data-table/DataTableKeyboard.tsx`
- Создать: `src/components/database/data-table/DataTableToolbar.tsx`
- Создать: `src/components/database/data-table/DataTableRow.tsx`
- Изменить: `src/components/DataTable.tsx` (стать re-export контейнера)

**Критерий успеха:**
- ✅ DataTable разделен на 5 файлов
- ✅ Каждый файл <200 строк
- ✅ Функционал работает идентично
- ✅ Код легче тестировать
- ✅ Build успешен, тесты проходят

**Оценка времени:** 8-10 часов

---

### 🟡 HIGH 6: Live region announcements

**Проблема:**
- Асинхронные операции не объявляются скрин-ридерам
- Генерация схемы, экспорт, импорт происходят "тихо"

**Решение:**
1. Создать компонент LiveAnnouncer
2. Создать hook useAnnounce для удобного использования
3. Добавить announcements в ключевые места

**Файлы для создания/изменения:**
- Создать: `src/components/accessibility/LiveAnnouncer.tsx`
- Создать: `src/hooks/useAnnounce.ts`
- Изменить: `src/components/schema-generator/SchemaGeneratorDialog.tsx`
- Изменить: `src/components/import/UploadFileDialog.tsx`
- Изменить: `src/components/database/ExportButton.tsx`

**Критерий успеха:**
- ✅ LiveAnnouncer создан с aria-live="polite"
- ✅ useAnnounce hook работает
- ✅ Ключевые операции объявляются
- ✅ Скрин-ридер корректно читает статусы

**Оценка времени:** 2-3 часа

---

### 🟡 HIGH 7: Semantic HTML landmarks

**Проблема:**
- Нет <main>, <nav>, <section> тегов
- Структура страницы неясна для assistive tech

**Решение:**
1. Обернуть навигацию в <nav>
2. Добавить <main id="main-content"> для основного контента
3. Использовать <section> для логических блоков
4. Добавить aria-label для множественных nav/section

**Файлы для изменения:**
- `src/App.tsx` или главный layout
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/pages/DatabaseView.tsx`

**Критерий успеха:**
- ✅ Используются semantic HTML5 теги
- ✅ Один <main> на странице
- ✅ Навигация в <nav>
- ✅ Логические секции в <section>

**Оценка времени:** 2-3 часа

---

## PHASE 3: СРЕДНИЙ ПРИОРИТЕТ (Недели 4-6)

### 🟢 MEDIUM 1: Разделение UploadFileDialog

**Файл:** `src/components/import/UploadFileDialog.tsx` (615 строк)

**Решение:** Разделить на 4 компонента:
1. UploadDialogContainer
2. FileUploadStep
3. ColumnMappingStep
4. PreviewStep

**Оценка времени:** 6-8 часов

---

### 🟢 MEDIUM 2: Разделение SchemaGeneratorDialog

**Файл:** `src/components/schema-generator/SchemaGeneratorDialog.tsx` (682 строки)

**Решение:** Разделить на подкомпоненты по шагам wizard

**Оценка времени:** 6-8 часов

---

### 🟢 MEDIUM 3: Увеличение test coverage до 70%

**Текущее:** 21%
**Цель:** 70%

**Решение:**
- Добавить тесты для оставшихся hooks
- Тесты для 20 дополнительных компонентов
- Integration тесты для критических флоу

**Оценка времени:** 30-40 часов

---

### 🟢 MEDIUM 4: NotificationContext

**Решение:** Централизовать управление toast уведомлениями

**Оценка времени:** 3-4 часа

---

### 🟢 MEDIUM 5: ThemeContext

**Решение:** Централизовать управление темой (сейчас next-themes)

**Оценка времени:** 2-3 часа

---

## ИТОГОВЫЙ TIMELINE

### Неделя 1: Критические блокеры
- [ ] День 1-2: Разделение fileParser chunk (3 часа)
- [ ] День 2: ARIA роли в VirtualTable (2 часа)
- [ ] День 3: Bundle size monitoring (1 час)
- [ ] День 3: aria-label на кнопках (30 мин)
- [ ] День 3: Skip navigation (30 мин)
- [ ] День 4-5: Тестирование и проверка всех fixes

**Итого Week 1:** ~8-10 часов работы

**Deliverable:** Production-ready build без блокеров ✅

---

### Неделя 2-3: Высокий приоритет

**Week 2:**
- [ ] День 1-2: DatabaseContext (6 часов)
- [ ] День 3-4: Тесты для 5 hooks (12 часов)
- [ ] День 5: Тесты для 5 компонентов (5 часов)

**Week 3:**
- [ ] День 1-2: Разделение DataTable (10 часов)
- [ ] День 2-3: Тесты для 5 компонентов (5 часов)
- [ ] День 3: Live region announcements (3 часа)
- [ ] День 4: Semantic landmarks (3 часа)
- [ ] День 5: Сокращение any (4 часа)

**Итого Week 2-3:** ~48 часов работы

**Deliverable:**
- ✅ Test coverage 50%+
- ✅ Улучшенная архитектура
- ✅ A11y compliance 90%+

---

### Недели 4-6: Средний приоритет (опционально)

**По мере необходимости:**
- Разделение крупных компонентов
- Увеличение coverage до 70%
- Дополнительные контексты
- Документация компонентов

**Итого Week 4-6:** ~60-80 часов работы

**Deliverable:** Полностью оптимизированное приложение ✅

---

## КРИТЕРИИ УСПЕХА

### После Phase 1 (Week 1):
- ✅ Initial bundle <300KB gzipped
- ✅ No critical A11y issues
- ✅ Bundle size monitoring active
- ✅ Lighthouse score 85+
- ✅ Can deploy to PRODUCTION

### После Phase 2 (Week 2-3):
- ✅ Test coverage 50%+
- ✅ No props drilling in critical components
- ✅ A11y compliance 90%+
- ✅ `any` usage reduced by 30-40%
- ✅ Main components <400 lines

### После Phase 3 (Week 4-6):
- ✅ Test coverage 70%+
- ✅ A11y compliance 100% (WCAG AA)
- ✅ `any` usage <100 instances
- ✅ All components <300 lines
- ✅ Full documentation

---

## РИСКИ И МИТИГАЦИЯ

### Риск 1: Регрессия функционала при рефакторинге
**Митигация:**
- Писать тесты ДО рефакторинга
- Использовать feature flags для больших изменений
- Тестировать на staging после каждого изменения

### Риск 2: Недостаток времени
**Митигация:**
- Фокус на Phase 1 (критические блокеры) в первую очередь
- Phase 2 и 3 можно делать итеративно
- Приоритизировать по impact/effort матрице

### Риск 3: Конфликты при параллельной работе
**Митигация:**
- Работать по одной задаче за раз
- Делать small commits
- Регулярно мерджить с main

---

## МЕТРИКИ ДЛЯ ОТСЛЕЖИВАНИЯ

Создать dashboard с метриками:

```bash
# Bundle size
npm run build && du -sh dist/

# Test coverage
npm run test:coverage

# TypeScript errors
npm run type-check

# A11y issues
npm run build && lighthouse dist/index.html --only-categories=accessibility

# any count
grep -r ": any" src/ | wc -l
```

**Автоматизировать:**
- Pre-commit hooks для type-check
- CI/CD для bundle size и coverage
- Weekly report по метрикам

---

## СЛЕДУЮЩИЕ ШАГИ

1. ✅ Утвердить план
2. ✅ Начать Phase 1 немедленно
3. ✅ Создать tracking issue для каждой задачи
4. ✅ Настроить мониторинг метрик
5. ✅ Еженедельные check-in по прогрессу

---

**Статус:** ГОТОВ К ИСПОЛНЕНИЮ 🚀
**Приоритет:** КРИТИЧЕСКИЙ
**Owner:** Frontend Team
**Timeline:** 3 недели (до production-ready) + 3 недели (полная оптимизация)

