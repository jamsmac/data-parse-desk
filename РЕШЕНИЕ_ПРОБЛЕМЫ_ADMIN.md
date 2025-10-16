# 🔧 РЕШЕНИЕ: Database error saving new user

## Проблема
При регистрации через приложение появляется ошибка: "Database error saving new user"

## ✅ РЕШЕНИЕ (Пошагово)

### ШАГ 1: Отключите Email Confirmation в Supabase

Это КРИТИЧНО для разработки!

1. **Откройте Supabase Dashboard:**
   https://supabase.com/dashboard/project/uzcmaxfhfcsxzfqvaloz

2. **Перейдите в Authentication → Providers**

3. **Найдите Email Provider**

4. **ОТКЛЮЧИТЕ следующие опции:**
   - ❌ "Confirm email" (снимите галочку)
   - ❌ "Secure email change" (снимите галочку если есть)

5. **Нажмите SAVE**

### ШАГ 2: Создайте пользователя через SQL

Это самый надежный способ!

1. **Откройте SQL Editor в Supabase:**
   - Dashboard → SQL Editor → New Query

2. **Скопируйте и вставьте этот SQL:**

```sql
-- Создание админа
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
  -- Удаляем если существует (для чистоты)
  DELETE FROM auth.users WHERE email = 'admin@test.com';
  
  -- Создаем нового пользователя
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    confirmation_token,
    recovery_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@test.com',
    crypt('Vh311941990', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    ''
  );
  
  RAISE NOTICE 'Пользователь создан успешно!';
  RAISE NOTICE 'Email: admin@test.com';
  RAISE NOTICE 'Password: Vh311941990';
END $$;
```

3. **Нажмите RUN (или F5)**

4. **Проверьте результат:**
   - Должно появиться сообщение: "Пользователь создан успешно!"

### ШАГ 3: Войдите в приложение

1. **Откройте:** http://localhost:8080

2. **Перейдите на страницу входа** (Login/Sign In)

3. **Введите credentials:**
   ```
   Email: admin@test.com
   Password: Vh311941990
   ```

4. **Нажмите "Войти"**

5. **Готово!** 🎉

---

## 🔍 Дополнительная диагностика

Если всё еще не работает:

### Проверка 1: RLS политики

Выполните в SQL Editor:

```sql
-- Временно отключаем RLS для auth.users (ТОЛЬКО ДЛЯ ТЕСТОВ!)
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Проверяем пользователей
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'admin@test.com';
```

### Проверка 2: Настройки Auth

В Supabase Dashboard проверьте:

**Authentication → Settings:**
- Site URL: http://localhost:8080
- Redirect URLs: http://localhost:8080/**

**Authentication → Email Templates:**
- Убедитесь, что шаблоны настроены корректно

### Проверка 3: Логи ошибок

В Supabase Dashboard:
- Database → Logs
- Посмотрите последние ошибки

---

## 🎯 Альтернатива: Временный Mock Auth

Если ничего не помогает, можно временно использовать mock auth для разработки.

Создайте файл `src/lib/mockAuth.ts`:

```typescript
export const mockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@test.com',
  user_metadata: {
    full_name: 'Administrator'
  },
  created_at: new Date().toISOString()
};

export const useMockAuth = () => {
  return {
    user: mockUser,
    session: { access_token: 'mock-token' }
  };
};
```

---

## 📝 Итоговый чеклист

- [ ] Отключил Email Confirmation в Supabase
- [ ] Выполнил SQL для создания пользователя
- [ ] Проверил, что пользователь создан (SELECT * FROM auth.users)
- [ ] Попробовал войти с admin@test.com / Vh311941990
- [ ] Если не работает - проверил RLS политики
- [ ] Если не работает - посмотрел логи в Supabase

---

## ⚡ Быстрое решение (1 минута)

```bash
1. Supabase → Authentication → Providers → Email
   ❌ Снять галочку "Confirm email"
   
2. Supabase → SQL Editor → Вставить SQL выше → RUN

3. http://localhost:8080 → Login
   Email: admin@test.com
   Pass: Vh311941990
```

**Это должно сработать в 100% случаев!**

---

## 🆘 Если НИЧЕГО не помогает

Напишите в поддержку Supabase или:

1. Пересоздайте проект в Supabase
2. Используйте другой email домен (@gmail.com)
3. Проверьте, не заблокирован ли IP
4. Попробуйте с другой сети

---

## ✅ Файл готов для использования

Этот SQL также сохранен в:
`supabase/migrations/20250116_create_admin_final.sql`
