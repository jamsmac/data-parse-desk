-- Таблица для хранения FCM токенов пользователей
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user_id, token)
);

-- Таблица для настроек уведомлений пользователя
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "databaseCloned": true,
    "importCompleted": true,
    "importFailed": true,
    "exportCompleted": true,
    "relationCreated": false,
    "quotaWarning": true,
    "systemUpdate": true,
    "collaborationInvite": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user_id)
);

-- Таблица для истории отправленных уведомлений
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  read_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для производительности
CREATE INDEX idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);
CREATE INDEX idx_user_fcm_tokens_token ON user_fcm_tokens(token);
CREATE INDEX idx_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_type ON notification_history(type);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at DESC);

-- RLS политики для FCM токенов
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own FCM tokens"
  ON user_fcm_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own FCM tokens"
  ON user_fcm_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own FCM tokens"
  ON user_fcm_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own FCM tokens"
  ON user_fcm_tokens FOR DELETE
  USING (user_id = auth.uid());

-- RLS политики для настроек уведомлений
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
  ON user_notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
  ON user_notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- RLS политики для истории уведомлений
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification history"
  ON notification_history FOR SELECT
  USING (user_id = auth.uid());

-- Функция для отправки push-уведомления
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tokens TEXT[];
  v_preferences JSONB;
  v_notification_id UUID;
  v_should_send BOOLEAN := FALSE;
BEGIN
  -- Проверяем настройки пользователя
  SELECT preferences INTO v_preferences
  FROM user_notification_preferences
  WHERE user_id = p_user_id;

  IF v_preferences IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User notification preferences not found'
    );
  END IF;

  -- Проверяем, включены ли уведомления
  IF NOT (v_preferences->>'enabled')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Notifications are disabled for this user'
    );
  END IF;

  -- Проверяем тип уведомления
  CASE p_type
    WHEN 'database_cloned' THEN
      v_should_send := (v_preferences->>'databaseCloned')::boolean;
    WHEN 'import_completed' THEN
      v_should_send := (v_preferences->>'importCompleted')::boolean;
    WHEN 'import_failed' THEN
      v_should_send := (v_preferences->>'importFailed')::boolean;
    WHEN 'export_completed' THEN
      v_should_send := (v_preferences->>'exportCompleted')::boolean;
    WHEN 'relation_created' THEN
      v_should_send := (v_preferences->>'relationCreated')::boolean;
    WHEN 'quota_warning' THEN
      v_should_send := (v_preferences->>'quotaWarning')::boolean;
    WHEN 'system_update' THEN
      v_should_send := (v_preferences->>'systemUpdate')::boolean;
    WHEN 'collaboration_invite' THEN
      v_should_send := (v_preferences->>'collaborationInvite')::boolean;
    ELSE
      v_should_send := TRUE;
  END CASE;

  IF NOT v_should_send THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Notification type is disabled for this user'
    );
  END IF;

  -- Получаем FCM токены пользователя
  SELECT array_agg(token) INTO v_tokens
  FROM user_fcm_tokens
  WHERE user_id = p_user_id
    AND updated_at > now() - interval '30 days'; -- Только активные токены

  IF v_tokens IS NULL OR array_length(v_tokens, 1) = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No FCM tokens found for user'
    );
  END IF;

  -- Сохраняем в историю
  INSERT INTO notification_history (
    user_id,
    type,
    title,
    body,
    data,
    status
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_data,
    'sent'
  )
  RETURNING id INTO v_notification_id;

  -- Здесь должен быть вызов внешнего API для отправки через FCM
  -- В реальном приложении это делается через Edge Function или внешний сервер
  -- который имеет доступ к Firebase Admin SDK

  RETURN json_build_object(
    'success', true,
    'notification_id', v_notification_id,
    'tokens_count', array_length(v_tokens, 1),
    'message', 'Notification queued for sending'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

-- Функция для массовой отправки уведомлений
CREATE OR REPLACE FUNCTION send_bulk_notification(
  p_user_ids UUID[],
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_sent_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Проверка прав (только админ может отправлять массовые уведомления)
  -- Здесь должна быть проверка роли пользователя

  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    v_result := send_push_notification(v_user_id, p_type, p_title, p_body, p_data);

    IF (v_result->>'success')::boolean THEN
      v_sent_count := v_sent_count + 1;
    ELSE
      v_failed_count := v_failed_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'sent_count', v_sent_count,
    'failed_count', v_failed_count
  );
END;
$$;

-- Функция для отметки уведомления как прочитанного
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notification_history
  SET read_at = timezone('utc', now())
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND read_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Функция для отметки уведомления как кликнутого
CREATE OR REPLACE FUNCTION mark_notification_clicked(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notification_history
  SET clicked_at = timezone('utc', now())
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND clicked_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Функция для очистки старых токенов
CREATE OR REPLACE FUNCTION cleanup_old_fcm_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM user_fcm_tokens
  WHERE updated_at < now() - interval '60 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- Триггер для автоматической отправки уведомлений при определенных событиях
CREATE OR REPLACE FUNCTION notify_on_database_clone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_original_db RECORD;
BEGIN
  -- Получаем информацию об оригинальной БД из audit_log
  IF NEW.action = 'CLONE' AND NEW.table_name = 'databases' THEN
    -- Получаем информацию об оригинальной БД
    SELECT * INTO v_original_db
    FROM databases
    WHERE id = (NEW.new_values->>'original_id')::uuid;

    -- Отправляем уведомление
    PERFORM send_push_notification(
      NEW.created_by,
      'database_cloned',
      'База данных успешно клонирована',
      format('Клонирование "%s" завершено. Скопировано %s записей.',
        v_original_db.display_name,
        COALESCE((NEW.new_values->>'rows_copied')::text, '0')
      ),
      jsonb_build_object(
        'databaseId', NEW.record_id,
        'originalDatabaseId', NEW.new_values->>'original_id',
        'rowsCopied', NEW.new_values->>'rows_copied'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Создаем триггер
CREATE TRIGGER trigger_notify_on_database_clone
  AFTER INSERT ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_database_clone();

-- Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION send_push_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_clicked TO authenticated;

-- Комментарии к таблицам
COMMENT ON TABLE user_fcm_tokens IS 'FCM токены для push-уведомлений';
COMMENT ON TABLE user_notification_preferences IS 'Настройки уведомлений пользователей';
COMMENT ON TABLE notification_history IS 'История отправленных уведомлений';