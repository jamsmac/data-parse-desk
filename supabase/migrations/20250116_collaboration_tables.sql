-- Миграция для добавления таблиц совместной работы
-- Создано: 2025-01-16
-- Описание: Таблицы для комментариев, активности и уведомлений

-- ============================================================================
-- 1. ТАБЛИЦА КОММЕНТАРИЕВ
-- ============================================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL,
  row_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для комментариев
CREATE INDEX IF NOT EXISTS idx_comments_database_row ON comments(database_id, row_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ============================================================================
-- 2. ТАБЛИЦА АКТИВНОСТИ
-- ============================================================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  database_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'import', 'export', 'share')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('database', 'row', 'column', 'chart', 'report')),
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для активности
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_database ON activities(database_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);

-- ============================================================================
-- 3. ТАБЛИЦА УВЕДОМЛЕНИЙ
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'mention', 'share', 'update', 'system', 'success', 'warning', 'error', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для уведомлений
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- 4. ТАБЛИЦА НАСТРОЕК УВЕДОМЛЕНИЙ
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  comment_notifications BOOLEAN DEFAULT TRUE,
  mention_notifications BOOLEAN DEFAULT TRUE,
  share_notifications BOOLEAN DEFAULT TRUE,
  update_notifications BOOLEAN DEFAULT TRUE,
  frequency TEXT DEFAULT 'instant' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. ТАБЛИЦА ПРАВ ДОСТУПА К БАЗАМ ДАННЫХ
-- ============================================================================
CREATE TABLE IF NOT EXISTS database_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(database_id, user_id)
);

-- Индексы для прав доступа
CREATE INDEX IF NOT EXISTS idx_database_permissions_database ON database_permissions(database_id);
CREATE INDEX IF NOT EXISTS idx_database_permissions_user ON database_permissions(user_id);

-- ============================================================================
-- 6. RLS (ROW LEVEL SECURITY) ПОЛИТИКИ
-- ============================================================================

-- Включаем RLS для всех таблиц
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_permissions ENABLE ROW LEVEL SECURITY;

-- Политики для комментариев
CREATE POLICY "Пользователи могут просматривать комментарии в своих базах"
  ON comments FOR SELECT
  USING (
    database_id IN (
      SELECT database_id FROM database_permissions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Пользователи могут создавать комментарии"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут редактировать свои комментарии"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои комментарии"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- Политики для активности
CREATE POLICY "Пользователи могут просматривать активность в своих базах"
  ON activities FOR SELECT
  USING (
    database_id IN (
      SELECT database_id FROM database_permissions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Система может создавать записи активности"
  ON activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политики для уведомлений
CREATE POLICY "Пользователи могут просматривать только свои уведомления"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Система может создавать уведомления"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять свои уведомления"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои уведомления"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Политики для настроек уведомлений
CREATE POLICY "Пользователи могут просматривать свои настройки"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут создавать свои настройки"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять свои настройки"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Политики для прав доступа
CREATE POLICY "Пользователи могут просматривать права доступа к своим базам"
  ON database_permissions FOR SELECT
  USING (
    user_id = auth.uid() OR 
    database_id IN (
      SELECT database_id FROM database_permissions 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Владельцы и админы могут управлять правами"
  ON database_permissions FOR ALL
  USING (
    database_id IN (
      SELECT database_id FROM database_permissions 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 7. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ TIMESTAMPS
-- ============================================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО СОЗДАНИЯ НАСТРОЕК УВЕДОМЛЕНИЙ
-- ============================================================================

-- Функция для создания настроек уведомлений для новых пользователей
CREATE OR REPLACE FUNCTION create_notification_settings_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания настроек при регистрации
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_settings_for_new_user();

-- ============================================================================
-- 9. ФУНКЦИЯ ДЛЯ ЛОГИРОВАНИЯ АКТИВНОСТИ
-- ============================================================================

-- Функция для логирования действий пользователей
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_database_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_entity_name TEXT DEFAULT NULL,
  p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activities (
    user_id,
    database_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    changes
  ) VALUES (
    p_user_id,
    p_database_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_changes
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. ФУНКЦИЯ ДЛЯ СОЗДАНИЯ УВЕДОМЛЕНИЙ
-- ============================================================================

-- Функция для создания уведомлений
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ГОТОВО!
-- ============================================================================

-- Комментарии к таблицам
COMMENT ON TABLE comments IS 'Комментарии к строкам данных в базах данных';
COMMENT ON TABLE activities IS 'Журнал активности пользователей';
COMMENT ON TABLE notifications IS 'Уведомления для пользователей';
COMMENT ON TABLE notification_settings IS 'Персональные настройки уведомлений пользователей';
COMMENT ON TABLE database_permissions IS 'Права доступа пользователей к базам данных';
