# 🗄️ Инструкция по настройке базы данных VHData Platform

## 📋 Обзор

Этот документ содержит пошаговые инструкции по настройке базы данных Supabase для VHData Platform.

## 🚀 Быстрая настройка

### Шаг 1: Откройте Supabase Dashboard

1. Перейдите в [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект: `puavudiivxuknvtbnotv`
3. Перейдите в **SQL Editor**

### Шаг 2: Примените миграции

1. Скопируйте содержимое файла `apply_migrations.sql`
2. Вставьте в SQL Editor
3. Нажмите **RUN** (или F5)

### Шаг 3: Проверьте результат

После выполнения вы должны увидеть сообщение:
```
VHData Platform database setup completed successfully!
```

## 📊 Что будет создано

### Основные таблицы
- ✅ `databases` - реестр баз данных
- ✅ `table_schemas` - схемы колонок
- ✅ `files` - история загрузок
- ✅ `audit_log` - аудит операций
- ✅ `database_relations` - связи между БД

### Таблицы коллаборации
- ✅ `users` - пользователи
- ✅ `user_permissions` - права доступа
- ✅ `comments` - комментарии
- ✅ `activities` - активность
- ✅ `notifications` - уведомления

### RPC функции
- ✅ `create_database()` - создание БД
- ✅ `get_user_databases()` - получение БД пользователя
- ✅ `get_table_data()` - получение данных таблицы

### Безопасность
- ✅ RLS политики для всех таблиц
- ✅ Индексы для производительности
- ✅ Тестовые данные

## 🧪 Тестовые данные

Создана тестовая база данных `Sample Sales Data` с:
- 5 колонок: product_name, quantity, price, sale_date, customer_email
- 5 тестовых записей
- Готова для демонстрации

## 🔧 Проверка настройки

### 1. Проверьте таблицы

```sql
-- Список всех таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('databases', 'table_schemas', 'files', 'users');
```

### 2. Проверьте RPC функции

```sql
-- Список функций
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%database%';
```

### 3. Проверьте тестовые данные

```sql
-- Тестовая база данных
SELECT * FROM databases WHERE system_name = 'sample_sales';

-- Тестовые данные
SELECT * FROM user_sample_sales LIMIT 5;
```

## 🚨 Устранение проблем

### Ошибка: "relation does not exist"
- Убедитесь, что вы выполняете скрипт в правильном проекте
- Проверьте, что RLS включен

### Ошибка: "permission denied"
- Убедитесь, что вы используете service_role ключ
- Или выполните скрипт от имени суперпользователя

### Ошибка: "function already exists"
- Это нормально, функции будут пересозданы
- Продолжите выполнение скрипта

## 📈 Следующие шаги

После успешного применения миграций:

1. ✅ **Запустите приложение**: `npm run dev`
2. ✅ **Откройте**: http://localhost:8080
3. ✅ **Войдите**: admin@test.com / Vh311941990
4. ✅ **Проверьте**: Dashboard должен показать тестовую БД

## 🔒 Безопасность

- Все таблицы защищены RLS политиками
- Пользователи видят только свои данные
- Администраторы имеют расширенные права
- Все операции логируются в audit_log

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи в Supabase Dashboard > Logs
2. Убедитесь, что все переменные окружения настроены
3. Проверьте, что проект активен

---

**Статус**: ✅ Готово к применению  
**Время выполнения**: ~2-3 минуты  
**Совместимость**: Supabase PostgreSQL 15+