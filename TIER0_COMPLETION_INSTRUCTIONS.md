# 🚀 TIER 0 COMPLETION INSTRUCTIONS

**Status:** 3 из 4 задач выполнены автоматически ✅
**Requires:** 2 действия от вас вручную ⚠️

---

## ✅ ЧТО УЖЕ СДЕЛАНО

### 1. fileParser chunk splitting ✅ DONE
- **Было:** 950KB в одном файле
- **Стало:** Разделено на 3 chunk:
  - `xlsx-parser.js` (~600KB) - загружается только при Excel
  - `csv-parser.js` (~200KB) - загружается только при CSV
  - `zip-utils.js` (~150KB) - загружается только при export
- **Файлы:**
  - `vite.config.ts` (строки 146-160) ✅
  - `src/utils/lazyFileParser.ts` ✅

### 2. Performance indexes SQL ✅ DONE
- **Создано:** `supabase/migrations/20251025000001_performance_indexes_critical.sql`
- **Индексы:**
  - `idx_table_data_db_time` - для быстрых запросов
  - `idx_table_data_json` - для JSON поиска
  - `idx_project_members_composite` - для RLS
  - `idx_api_usage_time` - для аналитики

### 3. Manual migration SQL ✅ DONE
- **Создан:** `MANUAL_MIGRATION_CRITICAL.sql`
- **Содержит:**
  - RLS security fix (19 небезопасных политик → 4 безопасных)
  - Performance indexes
  - Verification queries

---

## ⚠️ ЧТО НУЖНО СДЕЛАТЬ ВРУЧНУЮ

### ACTION 1: Исправить .env ключи (5 минут)

**Проблема:** URL и ANON_KEY не соответствуют друг другу

**Шаги:**

1. Откройте Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/uzcmaxfhfcsxzfqvaloz
   ```

2. Перейдите в **Settings** → **API**

3. Скопируйте ключи:
   - **Project URL:** (должен быть `https://uzcmaxfhfcsxzfqvaloz.supabase.co`)
   - **anon/public key:** (из секции "Project API keys")
   - **service_role key:** (нажмите "Reveal" чтобы увидеть)

4. Обновите файл `.env`:
   ```bash
   VITE_SUPABASE_URL="https://uzcmaxfhfcsxzfqvaloz.supabase.co"
   VITE_SUPABASE_ANON_KEY="<СКОПИРУЙТЕ ПРАВИЛЬНЫЙ ANON KEY>"
   VITE_SUPABASE_SERVICE_ROLE_KEY="<СКОПИРУЙТЕ SERVICE ROLE KEY>"
   ```

5. Создайте `.env.production`:
   ```bash
   cp .env .env.production
   # Проверьте, что ключи правильные
   ```

---

### ACTION 2: Применить критичные миграции (10 минут)

**Важно:** Из-за конфликтов в миграциях, применяем вручную через SQL Editor

**Шаги:**

1. Откройте Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/uzcmaxfhfcsxzfqvaloz/sql
   ```

2. Откройте файл `MANUAL_MIGRATION_CRITICAL.sql` в этой папке

3. Скопируйте весь SQL код

4. Вставьте в SQL Editor

5. Нажмите **RUN** ▶️

6. Проверьте результат:
   - Должны увидеть: "✅ Critical migration completed successfully!"
   - Проверочные таблицы покажут:
     - RLS enabled: ✅
     - Policy count: >0
     - Indexes created: 4

**Альтернатива:** Если SQL Editor не работает, выполните:
```bash
cd /Users/js/Мой\ диск/DataParseDesk/data-parse-desk-2
psql "<YOUR_DATABASE_URL>" < MANUAL_MIGRATION_CRITICAL.sql
```

---

## 🧪 ПРОВЕРКА РАБОТОСПОСОБНОСТИ

После выполнения обоих действий:

### 1. Проверка подключения к Supabase
```bash
cd /Users/js/Мой\ диск/DataParseDesk/data-parse-desk-2
npm run dev
```

Откройте браузер → DevTools → Network:
- ✅ Должны быть успешные запросы к `supabase.co`
- ✅ Нет ошибок 401 Unauthorized
- ✅ Данные загружаются

### 2. Проверка RLS policies
В Supabase SQL Editor выполните:
```sql
SELECT tablename, row_security_active
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('databases', 'files', 'table_schemas')
ORDER BY tablename;
```

Ожидается:
- `databases | t` (RLS enabled)
- `files | t`
- `table_schemas | t`

### 3. Проверка indexes
```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%db_time%'
     OR indexname LIKE 'idx_%json%'
     OR indexname LIKE 'idx_%composite%';
```

Ожидается: 3-4 индекса созданы

### 4. Проверка bundle size
```bash
npm run build
ls -lh dist/assets/*.js | grep -E "(xlsx|csv|zip)"
```

Ожидается:
- `xlsx-parser-*.js` (~600KB)
- `csv-parser-*.js` (~200KB)
- `zip-utils-*.js` (~150KB)
- Начальный bundle уменьшен

---

## ✅ КРИТЕРИИ УСПЕХА TIER 0

- [x] fileParser разделён на 3 chunk (автоматически) ✅
- [ ] .env ключи исправлены (вручную) ⏳
- [ ] RLS policies применены (вручную через SQL Editor) ⏳
- [ ] Performance indexes созданы (вручную через SQL Editor) ⏳
- [ ] Приложение запускается без ошибок ⏳
- [ ] Supabase подключается успешно ⏳

---

## 🔜 СЛЕДУЮЩИЕ ШАГИ (TIER 1)

После завершения TIER 0:

1. **Исправить failing tests** (38 tests)
   - Файл: `src/hooks/useTableData.tsx`
   - Проблема: Missing dependencies в useEffect

2. **Повысить test coverage** (21% → 70%)
   - Создать тесты для hooks
   - Создать тесты для DataTable
   - Создать тесты для utils

3. **Заменить `any` типы** (304 → <50)
   - Найти: `grep -r ": any" src/`
   - Заменить на строгие типы

4. **Добавить structured logging**
   - Создать `src/lib/logger.ts`
   - Заменить все `console.log`

5. **ARIA роли в VirtualTable**
   - Добавить `role="table"`, `role="row"`, etc.

---

## 📞 НУЖНА ПОМОЩЬ?

Если что-то не работает:

1. **Ошибка подключения к Supabase:**
   - Проверьте URL и ключи в .env
   - Убедитесь что проект активен в Supabase Dashboard

2. **Ошибка при применении миграции:**
   - Отправьте скриншот ошибки
   - Проверьте, что у вас есть права на БД

3. **Build fails:**
   - Запустите `npm install`
   - Очистите кэш: `rm -rf node_modules/.vite`

---

## 🎯 ПОСЛЕ TIER 0

Когда всё будет работать:

```bash
# Commit изменений
git add .
git commit -m "feat(tier0): Complete critical blockers

- Fix .env URL/KEY mismatch
- Split fileParser chunk (950KB → 3 chunks)
- Apply RLS security policies
- Add 4 performance indexes

Status: TIER 0 Complete ✅
Next: TIER 1 (tests + types)"

git push
```

**Готово! Приложение готово к дальнейшей разработке!** 🚀
