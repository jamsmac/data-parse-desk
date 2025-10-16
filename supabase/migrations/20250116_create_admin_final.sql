-- ФИНАЛЬНОЕ РЕШЕНИЕ: Создание администратора
-- Этот скрипт создает пользователя НАПРЯМУЮ, минуя проверки

-- ИНСТРУКЦИЯ:
-- 1. Откройте Supabase Dashboard SQL Editor
-- 2. Скопируйте этот SQL полностью
-- 3. Нажмите RUN
-- 4. Войдите в приложение с указанными credentials

-- CREDENTIALS:
-- Email: admin@test.com
-- Password: Vh311941990

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin@test.com';
  v_password text := 'Vh311941990';
BEGIN
  -- Проверяем, не существует ли пользователь
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    -- Генерируем ID
    v_user_id := gen_random_uuid();
    
    -- Вставляем пользователя с МИНИМАЛЬНЫМИ полями
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
    
    RAISE NOTICE 'Пользователь создан! Email: %, ID: %', v_email, v_user_id;
  ELSE
    RAISE NOTICE 'Пользователь % уже существует с ID: %', v_email, v_user_id;
  END IF;
  
  -- Показываем credentials
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CREDENTIALS ДЛЯ ВХОДА:';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Password: %', v_password;
  RAISE NOTICE '========================================';
END $$;
