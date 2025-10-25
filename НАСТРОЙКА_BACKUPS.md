# 💾 НАСТРОЙКА АВТОМАТИЧЕСКИХ BACKUPS

**Время:** 10 минут
**Сложность:** Очень лёгкая
**Статус:** ⚠️ Требует доступа к Supabase Dashboard
**Приоритет:** 🔴 Критичный

---

## 🎯 ЗАЧЕМ НУЖНЫ BACKUPS

Автоматические бэкапы защищают от:
- 🔥 Случайного удаления данных
- 🐛 Багов в коде, портящих данные
- 💥 Hardware failures
- 🔐 Ransomware атак
- 👤 Человеческих ошибок

**Recovery Time Objective (RTO):** < 1 час
**Recovery Point Objective (RPO):** < 24 часа

---

## 📋 ШАГ ЗА ШАГОМ - SUPABASE DASHBOARD

### Шаг 1: Войти в Supabase (1 минута)

1. Открыть https://app.supabase.com
2. Войти в аккаунт
3. Выбрать проект: `uzcmaxfhfcsxzfqvaloz`

---

### Шаг 2: Открыть настройки Database (30 секунд)

1. В левом меню: **Settings** (⚙️)
2. Выбрать: **Database**
3. Scroll вниз до секции **"Database Backups"**

---

### Шаг 3: Включить Point-in-Time Recovery (PITR) (2 минуты)

**⚠️ ВАЖНО:** PITR доступен только на платных планах (Pro и выше)

#### Если на Free плане:
- Automatic daily backups (бесплатно)
- 7 days retention
- Restore через Support ticket

#### Если на Pro плане ($25/месяц):
1. Найти секцию **"Point-in-Time Recovery"**
2. Нажать **"Enable PITR"**
3. Настройки:
   - **Retention:** 7 days (можно до 30 days)
   - **Schedule:** Continuous (каждые 5 минут)
4. Нажать **"Enable"**

**Cost:** Включено в Pro план

---

### Шаг 4: Настроить Daily Backups (Free план) (3 минуты)

#### На Free плане (автоматически):
```
✅ Frequency: Ежедневно
✅ Time: ~03:00 UTC
✅ Retention: 7 дней
✅ Storage: Supabase S3
✅ Restore: Через Dashboard или Support
```

#### На Pro плане (настраиваемо):
1. **Backup Schedule:**
   - **Frequency:** Daily
   - **Time:** 03:00 UTC (когда мало пользователей)
   - **Days to keep:** 7-30 дней

2. **Backup Types:**
   - ✅ Full backup: Ежедневно
   - ✅ WAL archives: Continuous (PITR)

3. Нажать **"Update settings"**

---

### Шаг 5: Протестировать Backup (опционально) (5 минут)

#### A. Создать тестовые данные:
```sql
-- В SQL Editor
CREATE TABLE test_backup (
  id SERIAL PRIMARY KEY,
  data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO test_backup (data)
VALUES ('Test backup data at ' || NOW());
```

#### B. Подождать backup (или создать вручную):
1. Settings → Database → Backups
2. Нажать **"Create backup now"** (Pro план)
3. Подождать ~1-5 минут

#### C. Удалить тестовые данные:
```sql
DROP TABLE test_backup;
```

#### D. Восстановить:
1. Settings → Database → Backups
2. Найти последний backup
3. Нажать **"Restore"**
4. Выбрать **"Restore to new project"** (безопаснее)
5. Проверить что `test_backup` таблица есть

#### E. Очистить:
```sql
-- В restored project
DROP TABLE test_backup;

-- Можно удалить test project если не нужен
```

---

## ✅ КОНФИГУРАЦИЯ ПО ПЛАНАМ

### Free Plan ($0/месяц)
```
Backups: Ежедневно
Retention: 7 дней
PITR: ❌ Нет
Manual backups: ❌ Нет
Restore: Через support ticket
Recovery time: 1-24 часа
```

### Pro Plan ($25/месяц)
```
Backups: Ежедневно + continuous
Retention: До 30 дней
PITR: ✅ Да (5 min granularity)
Manual backups: ✅ Да
Restore: Через Dashboard
Recovery time: < 1 час
```

### Enterprise
```
Backups: Кастомизируемо
Retention: До 90+ дней
PITR: ✅ Да
Geo-redundancy: ✅ Да
Dedicated support: ✅ Да
```

---

## 🔄 ПРОЦЕДУРА RESTORE

### Вариант 1: Point-in-Time Recovery (Pro план)

1. **Settings → Database → Point-in-Time Recovery**
2. Выбрать дату и время:
   ```
   Date: 2025-10-25
   Time: 13:00:00 UTC
   ```
3. Выбрать destination:
   - **New project** (безопаснее, рекомендуется)
   - **Replace current** (опасно!)
4. Нажать **"Start recovery"**
5. Подождать 5-30 минут
6. Проверить restored data
7. Если OK → Switch DNS to new project
8. Если ошибка → Keep original project

---

### Вариант 2: Daily Backup Restore (Free план)

1. **Settings → Database → Backups**
2. Найти нужный backup по дате:
   ```
   2025-10-24 03:00 UTC
   ```
3. Нажать **"..."** → **"Restore"**
4. Выбрать:
   - **Restore to new project** (рекомендуется)
5. Нажать **"Restore backup"**
6. Подождать 10-60 минут
7. Проверить data
8. Migrate если нужно

---

### Вариант 3: Manual SQL Dump (для локального тестирования)

```bash
# Export database
pg_dump "postgresql://postgres:[password]@db.uzcmaxfhfcsxzfqvaloz.supabase.co:5432/postgres" > backup.sql

# Import to local
psql -d local_database < backup.sql

# Import back to Supabase (если нужно)
psql "postgresql://postgres:[password]@db.uzcmaxfhfcsxzfqvaloz.supabase.co:5432/postgres" < backup.sql
```

---

## 📊 МОНИТОРИНГ BACKUPS

### Проверять регулярно:

#### Ежедневно (автоматически):
- ✅ Backup completed successfully
- ✅ Size is reasonable (~expected)
- ✅ No errors in logs

#### Еженедельно (вручную):
1. Settings → Database → Backups
2. Проверить что backup есть за последние 7 дней
3. Проверить размер backup (должен быть стабилен)

#### Ежемесячно (тест восстановления):
1. Создать test restore
2. Проверить что данные OK
3. Удалить test project

---

## 🚨 EMERGENCY RESTORE PROCEDURE

### Если production БД повреждена:

#### 1. НЕМЕДЛЕННО:
```
⏸️  STOP all deployments
⏸️  DISABLE write access (если возможно)
⏸️  NOTIFY team
```

#### 2. ОЦЕНИТЬ УЩЕРБ:
```sql
-- Проверить количество записей
SELECT count(*) FROM projects;
SELECT count(*) FROM databases;
SELECT count(*) FROM dynamic_data;

-- Проверить последние изменения
SELECT * FROM projects
ORDER BY updated_at DESC LIMIT 10;
```

#### 3. РЕШИТЬ СТРАТЕГИЮ:
- **Если данные частично OK:** Point-in-time recovery
- **Если данные полностью повреждены:** Full backup restore
- **Если unsure:** Consult with team

#### 4. ВОССТАНОВИТЬ:
```
1. Create new project from backup
2. Verify data integrity
3. Update connection strings
4. Re-deploy application
5. Monitor for issues
```

#### 5. POST-MORTEM:
```
- Документировать что произошло
- Найти root cause
- Создать prevention план
- Update monitoring
```

---

## 💰 COST ANALYSIS

### Free Plan
```
Backups: Включено
PITR: Нет
Storage: Включено (до лимитов)
Total: $0/месяц
```

### Pro Plan
```
Base: $25/месяц
PITR: Включено
Extra storage: ~$0.125/GB/месяц
Примерная стоимость для 10GB БД: ~$26-27/месяц
```

**Рекомендация:**
- **Для dev/testing:** Free plan OK
- **Для production:** Pro plan ОБЯЗАТЕЛЬНО

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ BACKUP СТРАТЕГИИ

### 1. Off-site Backups (дополнительно)

Создать cron job для ежедневного export:

```bash
#!/bin/bash
# backup-to-s3.sh

DATE=$(date +%Y%m%d)
pg_dump "postgresql://..." > "backup_${DATE}.sql"
gzip "backup_${DATE}.sql"
aws s3 cp "backup_${DATE}.sql.gz" s3://your-bucket/backups/
```

**Schedule:**
```bash
# Crontab: Ежедневно в 04:00
0 4 * * * /path/to/backup-to-s3.sh
```

---

### 2. Multi-region Replication (Enterprise)

Для критичных приложений:
- Primary: US East
- Replica: EU West
- Failover: Автоматический

---

### 3. Schema Version Control

Всегда храните миграции в git:
```
✅ supabase/migrations/ - все миграции
✅ Version control
✅ Можно recreate БД с нуля
```

---

## ✅ CHECKLIST

### Initial Setup:
- [ ] Войти в Supabase Dashboard
- [ ] Открыть Settings → Database
- [ ] Проверить что daily backups enabled (Free план)
- [ ] (Pro план) Включить PITR
- [ ] Настроить retention period
- [ ] Протестировать restore на test project

### Regular Maintenance:
- [ ] Еженедельная проверка backup status
- [ ] Ежемесячное тестирование restore
- [ ] Quarterly disaster recovery drill
- [ ] Документировать процедуру restore

### Emergency Prep:
- [ ] Команда знает процедуру restore
- [ ] Контакты Supabase support сохранены
- [ ] Emergency runbook создан
- [ ] Backup monitoring настроен

---

## 🆘 TROUBLESHOOTING

### Backup не создаётся:

1. **Проверить storage limits:**
   - Settings → Usage
   - Если exceeded → Upgrade план

2. **Проверить health:**
   - Settings → General → Project health
   - Resolve any issues

3. **Contact support:**
   - Help → Support
   - Описать проблему

---

### Restore failed:

1. **Проверить error message**
2. **Попробовать другой backup**
3. **Contact Supabase support** (Priority support на Pro+)
4. **Use manual pg_dump** как fallback

---

## 📞 SUPPORT CONTACTS

### Supabase Support:
- **Email:** support@supabase.io
- **Discord:** https://discord.supabase.com
- **Docs:** https://supabase.com/docs
- **Status:** https://status.supabase.com

### Emergency (Pro/Enterprise):
- **Priority support ticket**
- **Response time:** < 1 hour (Pro), < 15 min (Enterprise)

---

## 🎓 BEST PRACTICES

### DO:
- ✅ Enable automatic backups
- ✅ Test restore monthly
- ✅ Document procedures
- ✅ Monitor backup success
- ✅ Use PITR для production (Pro план)
- ✅ Keep backups for 30+ days if possible

### DON'T:
- ❌ Rely only on Supabase backups
- ❌ Never test restore
- ❌ Restore directly to production без testing
- ❌ Ignore backup failures
- ❌ Skip documentation

---

## ✨ ГОТОВО!

После выполнения всех шагов:

✅ Daily backups enabled
✅ (Pro) PITR enabled
✅ Retention настроен
✅ Restore протестирован
✅ Team знает процедуру
✅ Emergency plan готов

**Следующий шаг:** Тестирование integration tests (см. ТЕСТЫ_СТАТУС.md)

---

**Время выполнения:** 10 минут
**Сложность:** ⭐☆☆☆☆ Очень лёгкая
**Приоритет:** 🔴 Критичный для production

