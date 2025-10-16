-- Простое создание администратора
-- Использует стандартный подход Supabase

-- Вариант 1: Если хотите использовать обычный email (например Gmail)
-- Замените 'admin@vendhub.local' на ваш реальный email

-- ВНИМАНИЕ: Используйте этот скрипт ТОЛЬКО если UI не работает!
-- Рекомендуется сначала попробовать зарегистрироваться через форму регистрации приложения

-- Создаем пользователя напрямую (ТОЛЬКО ДЛЯ РАЗРАБОТКИ!)
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  user_email text := 'admin@example.com'; -- ИЗМЕНИТЕ НА ВАШ EMAIL!
  user_password text := 'Vh311941990';
BEGIN
  -- Проверяем, не существует ли уже пользователь
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    
    -- Вставляем пользователя
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      user_email,
      crypt(user_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Administrator"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Создаем identity
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      format('{"sub":"%s","email":"%s"}', new_user_id::text, user_email)::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Пользователь % создан успешно! ID: %', user_email, new_user_id;
  ELSE
    RAISE NOTICE 'Пользователь % уже существует', user_email;
  END IF;
END $$;
