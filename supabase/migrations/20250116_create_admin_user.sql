-- Создание администратора с email admin@vendhub.local и паролем Vh311941990
-- ВАЖНО: Этот пароль должен быть изменен после первого входа!

-- ПРИМЕЧАНИЕ: Этот SQL НЕ РЕКОМЕНДУЕТСЯ использовать напрямую в production
-- Лучше создать пользователя через Supabase Dashboard UI

-- Проверяем, существует ли уже пользователь
DO $$
DECLARE
  user_exists boolean;
  new_user_id uuid;
BEGIN
  -- Проверяем наличие пользователя
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@vendhub.local') INTO user_exists;
  
  IF NOT user_exists THEN
    -- Генерируем новый ID
    new_user_id := gen_random_uuid();
    
    -- Создаем пользователя
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      email_change_confirm_status,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      role,
      aud,
      confirmation_token,
      is_sso_user
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@vendhub.local',
      crypt('Vh311941990', gen_salt('bf')),
      NOW(),
      0,
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Administrator","role":"admin"}',
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex'),
      false
    );
    
    -- Создаем identity
    INSERT INTO auth.identities (
      id,
      user_id,
      provider,
      provider_id,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      new_user_id,
      'email',
      new_user_id::text,
      jsonb_build_object(
        'sub', new_user_id::text,
        'email', 'admin@vendhub.local',
        'email_verified', true,
        'provider', 'email'
      ),
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Пользователь admin@vendhub.local успешно создан';
  ELSE
    RAISE NOTICE 'Пользователь admin@vendhub.local уже существует';
  END IF;
END $$;
