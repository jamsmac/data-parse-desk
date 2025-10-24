# Quick Start: Applying Migration Fixes

## 🎯 Что было сделано

✅ Исправлены все критические проблемы в миграциях
✅ Добавлена защита от циклических зависимостей
✅ Созданы DOWN миграции для отката
✅ Добавлен мониторинг производительности
✅ Создана полная документация

## 📋 Быстрый старт (5 шагов)

### Шаг 1: Проверьте изменения

```bash
# Посмотрите последний коммит
git log --oneline -1

# Должно быть:
# 2bbbf60 fix: Critical database migration fixes and improvements
```

### Шаг 2: Прочитайте документацию

📖 **Обязательно прочитайте:**
- [MIGRATION_FIXES_SUMMARY.md](./MIGRATION_FIXES_SUMMARY.md) - Полный отчет
- [supabase/migrations/README.md](./supabase/migrations/README.md) - Руководство по миграциям

### Шаг 3: Тест на Staging

```bash
# 1. Переключитесь на staging
export SUPABASE_URL="your-staging-url"
export SUPABASE_ANON_KEY="your-staging-key"

# 2. Примените миграцию
supabase db push

# Или вручную:
psql -h staging-host -U postgres -d postgres \
  -f supabase/migrations/20251026000001_fix_critical_issues.sql
```

### Шаг 4: Протестируйте функции

```sql
-- Тест 1: Попытка создать циклическую связь
BEGIN;
  INSERT INTO database_relations (source_database_id, target_database_id, relation_type, relation_name)
  VALUES ('db-a', 'db-b', 'one_to_many', 'test_relation');

  -- Это должно выдать ошибку:
  INSERT INTO database_relations (source_database_id, target_database_id, relation_type, relation_name)
  VALUES ('db-b', 'db-a', 'one_to_many', 'reverse_relation');
  -- ❌ ERROR: Circular relation detected
ROLLBACK;

-- Тест 2: Проверка мониторинга
SELECT * FROM get_slow_queries_report(1000, 24);
SELECT * FROM get_table_sizes();
SELECT * FROM get_unused_indexes();

-- Тест 3: JSONB валидация
UPDATE databases
SET column_config = '{"type": "test", "valid": true}'
WHERE id = (SELECT id FROM databases LIMIT 1);
-- ✅ Должно работать

UPDATE databases
SET column_config = '["invalid", "array"]'
WHERE id = (SELECT id FROM databases LIMIT 1);
-- ❌ Должна быть ошибка
```

### Шаг 5: Production Deploy

```bash
# 1. ОБЯЗАТЕЛЬНЫЙ BACKUP!
pg_dump -h production-host -U postgres -d postgres \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Примените миграцию
psql -h production-host -U postgres -d postgres \
  -f supabase/migrations/20251026000001_fix_critical_issues.sql

# 3. Проверьте, что все работает
psql -h production-host -U postgres -d postgres -c \
  "SELECT * FROM get_table_sizes() LIMIT 5;"

# 4. Настройте мониторинг
# См. раздел "Мониторинг" ниже
```

## 🔧 Что нового в миграции

### 1. Защита от циклов

```sql
-- Новые функции:
check_circular_relations(source_id, target_id) -> boolean
check_circular_formulas(db_id, column_name, deps[]) -> boolean

-- Автоматические триггеры:
trigger_prevent_circular_relations
trigger_prevent_circular_formulas
```

### 2. JSONB валидация

```sql
-- Новые валидаторы:
validate_column_config(config jsonb) -> boolean
validate_relation_config(config jsonb) -> boolean
validate_formula_config(config jsonb) -> boolean

-- Новые CHECK constraints на таблицах:
databases.column_config
table_schemas.relation_config
table_schemas.formula_config
```

### 3. Мониторинг производительности

```sql
-- Новая таблица:
query_performance_log

-- Новые функции:
log_query_performance(name, time_ms, ...) -> uuid
get_slow_queries_report(min_ms, hours) -> table
get_table_sizes() -> table
get_unused_indexes() -> table
```

### 4. Консолидация файлов

```sql
-- Добавлены колонки в files:
file_type (upload, database_file, attachment, export)
source_type (manual, api, webhook, scheduled, integration)
parent_file_id (для версионирования)

-- Функция миграции:
migrate_database_files_to_files() -> integer
```

## 📊 Мониторинг

### Ежедневно

```sql
-- Проверка медленных запросов
SELECT
  query_name,
  avg_execution_ms,
  execution_count,
  last_execution
FROM get_slow_queries_report(1000, 24)
ORDER BY avg_execution_ms DESC
LIMIT 10;
```

### Еженедельно

```sql
-- Размеры таблиц
SELECT * FROM get_table_sizes()
WHERE total_size > '100 MB'
ORDER BY total_size DESC;

-- Неиспользуемые индексы
SELECT * FROM get_unused_indexes()
WHERE index_size > '10 MB'
ORDER BY index_size DESC;
```

### Настройка алертов

```sql
-- Создайте pg_cron задачу для мониторинга
SELECT cron.schedule(
  'slow-queries-alert',
  '0 9 * * *',  -- Каждый день в 9:00
  $$
    SELECT log_query_performance(
      'daily_slow_queries_check',
      0,
      (SELECT COUNT(*) FROM get_slow_queries_report(2000, 24))
    );
  $$
);
```

## 🚨 Откат (если что-то пошло не так)

### Вариант 1: DOWN миграция

```bash
# Откатить последние изменения
psql -h host -U postgres -d database \
  -f supabase/migrations/20251026000001_fix_critical_issues_DOWN.sql
```

### Вариант 2: Восстановление из backup

```bash
# Восстановить из backup
psql -h host -U postgres -d database < backup_TIMESTAMP.sql
```

### Вариант 3: Schema Versions

```sql
-- Посмотреть доступные версии
SELECT * FROM get_schema_version_history(project_id)
ORDER BY version_number DESC;

-- Откатиться на предыдущую версию
SELECT set_current_schema_version('previous-version-id');
```

## ✅ Чеклист применения

### Pre-Deploy
- [ ] Прочитана документация [MIGRATION_FIXES_SUMMARY.md](./MIGRATION_FIXES_SUMMARY.md)
- [ ] Прочитана [supabase/migrations/README.md](./supabase/migrations/README.md)
- [ ] Проверен git log и последний коммит

### Staging
- [ ] Создан backup staging БД
- [ ] Применена миграция на staging
- [ ] Протестированы circular dependency checks
- [ ] Протестирована JSONB validation
- [ ] Проверены функции мониторинга
- [ ] Проверена работа существующего функционала
- [ ] Проведено нагрузочное тестирование

### Production
- [ ] Создан backup production БД (ОБЯЗАТЕЛЬНО!)
- [ ] Уведомлена команда о деплое
- [ ] Применена миграция
- [ ] Проверены основные функции
- [ ] Настроен мониторинг производительности
- [ ] Проверены логи на ошибки
- [ ] План отката готов и проверен

### Post-Deploy (в течение 24 часов)
- [ ] Мониторинг медленных запросов
- [ ] Проверка размеров таблиц
- [ ] Анализ использования индексов
- [ ] Сбор фидбека от пользователей

## 📞 Помощь

### Документация
- **Полный отчет:** [MIGRATION_FIXES_SUMMARY.md](./MIGRATION_FIXES_SUMMARY.md)
- **Руководство:** [supabase/migrations/README.md](./supabase/migrations/README.md)

### Частые вопросы

**Q: Как проверить, что миграция применена?**
```sql
SELECT version FROM supabase_migrations.schema_migrations
WHERE version = '20251026000001';
```

**Q: Как узнать, работают ли новые функции?**
```sql
-- Должны вернуть результат без ошибок
SELECT check_circular_relations('id1', 'id2');
SELECT * FROM get_slow_queries_report(1000, 1);
SELECT * FROM get_table_sizes() LIMIT 1;
```

**Q: Что делать, если миграция упала с ошибкой?**
1. Проверьте логи: `tail -f /var/log/postgresql/postgresql.log`
2. Откатите изменения: `psql -f *_DOWN.sql`
3. Восстановите из backup: `psql < backup.sql`
4. Создайте issue с логом ошибки

**Q: Можно ли применить только часть изменений?**
Нет, миграция должна применяться целиком. Но вы можете:
- Закомментировать ненужные PART в SQL файле
- Применить миграцию вручную по частям

## 🎉 Готово!

После успешного применения миграции:

✅ Защита от циклических зависимостей работает
✅ JSONB данные валидируются
✅ Мониторинг производительности настроен
✅ Система готова к production нагрузке

Следующие шаги:
1. Настроить автоматический мониторинг
2. Создать dashboard с метриками
3. Настроить алерты на медленные запросы

---

**Создано:** 2025-10-26
**Версия:** 1.0
**Статус:** ✅ Ready for deployment
