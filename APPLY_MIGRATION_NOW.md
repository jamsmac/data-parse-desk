# 🚀 Применить миграцию производительности СЕЙЧАС

**⚡ 2-минутное руководство по применению миграции**

---

## Метод 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ) ✅

### Шаг 1: Откройте SQL Editor (30 секунд)

1. Перейдите на https://app.supabase.com/project/uzcmaxfhfcsxzfqvaloz/sql/new
2. Вы увидите пустой SQL редактор

### Шаг 2: Скопируйте миграцию (30 секунд)

1. Откройте файл в вашем редакторе:
   `supabase/migrations/20251027100000_enable_performance_monitoring.sql`
2. Скопируйте **ВСЁ** содержимое файла (Cmd+A, Cmd+C)
3. Вставьте в SQL Editor (Cmd+V)

### Шаг 3: Запустите миграцию (30 секунд)

1. Нажмите кнопку **"Run"** (или Cmd+Enter)
2. Дождитесь выполнения (обычно 2-5 секунд)
3. Вы увидите сообщения:

```
✅ Performance monitoring enabled successfully!

Available functions:
  - get_performance_metrics() - Current metrics with status
  - get_slow_queries() - Identify slow queries
  - get_table_bloat() - Table bloat analysis
  - take_performance_snapshot() - Manual snapshot
```

### Шаг 4: Проверьте что всё работает (30 секунд)

В том же SQL Editor выполните:

```sql
-- Проверка 1: Посмотреть метрики
SELECT * FROM get_performance_metrics();

-- Проверка 2: Создать snapshot
SELECT take_performance_snapshot();

-- Проверка 3: Посмотреть созданный snapshot
SELECT * FROM performance_snapshots ORDER BY snapshot_time DESC LIMIT 1;
```

✅ **Готово!** Performance monitoring включен!

---

## Следующие шаги

1. **Запустите health check**:
   ```bash
   npm run perf:health
   ```

2. **Настройте Redis** (опционально):
   См. PERFORMANCE_START_NOW.md

3. **Обновите Edge Functions**:
   См. PERFORMANCE_IMPLEMENTATION_COMPLETE.md

---

**🎉 Миграция применена успешно!**
