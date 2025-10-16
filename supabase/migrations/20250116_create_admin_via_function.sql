-- РЕШЕНИЕ: Создание пользователя через функцию
-- Этот подход использует встроенные механизмы Supabase

-- Создаем функцию для создания пользователя (запускается от имени service_role)
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin@test.com';
  v_password text := 'Vh311941990';
  v_password_hash text;
BEGIN
  -- Проверяем, не существует ли пользователь
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NOT NULL THEN
    RETURN 'Пользователь ' || v_email || ' уже существует с ID: ' || v_user_id;
  END IF;
  
  -- Генерируем ID и хеш пароля
  v_user_id := gen_random_uuid();
  v_password_hash := crypt(v_password, gen_salt('bf'));
  
  -- Создаем пользователя
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_password_hash,
    now(),
    now(),
    now(),
    ''
  );
  
  RETURN 'Пользователь создан успешно! Email: ' || v_email || ', ID: ' || v_user_id || ', Password: ' || v_password;
END;
$$;

-- Выполняем функцию для создания пользователя
SELECT create_admin_user();

-- Показываем созданных пользователей
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  'admin@test.com / Vh311941990' as credentials
FROM auth.users 
WHERE email = 'admin@test.com';
