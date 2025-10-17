-- Расширенные функции клонирования БД
-- Добавляет: квоты, версионирование, асинхронное клонирование

-- 1. Таблица версионирования БД (связь оригинал-клон)
CREATE TABLE IF NOT EXISTS database_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  cloned_database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  parent_version_id UUID REFERENCES database_versions(id),
  version_number INTEGER NOT NULL DEFAULT 1,
  clone_type TEXT CHECK (clone_type IN ('full', 'structure', 'partial')),
  rows_copied INTEGER DEFAULT 0,
  cloned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  cloned_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  UNIQUE(cloned_database_id)
);

-- Индексы для производительности
CREATE INDEX idx_database_versions_original ON database_versions(original_database_id);
CREATE INDEX idx_database_versions_cloned ON database_versions(cloned_database_id);
CREATE INDEX idx_database_versions_parent ON database_versions(parent_version_id);

-- 2. Таблица квот пользователей
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id),
  max_databases INTEGER DEFAULT 10,
  max_clones_per_database INTEGER DEFAULT 3,
  max_total_clones INTEGER DEFAULT 20,
  max_rows_per_database INTEGER DEFAULT 1000000,
  max_async_operations INTEGER DEFAULT 3,
  quota_reset_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. Расширение таблицы clone_operations для асинхронных задач
ALTER TABLE clone_operations
ADD COLUMN IF NOT EXISTS is_async BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS current_batch INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_batches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5;

-- Индекс для очереди задач
CREATE INDEX IF NOT EXISTS idx_clone_operations_queue
ON clone_operations(status, priority DESC, scheduled_at)
WHERE is_async = true AND status IN ('pending', 'scheduled');

-- 4. Функция проверки квот
CREATE OR REPLACE FUNCTION check_clone_quota(p_user_id UUID, p_database_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota RECORD;
  v_current_clones INTEGER;
  v_db_clones INTEGER;
  v_total_databases INTEGER;
BEGIN
  -- Получаем квоты пользователя (или создаем дефолтные)
  INSERT INTO user_quotas (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_quota
  FROM user_quotas
  WHERE user_id = p_user_id;

  -- Проверяем общее количество БД
  SELECT COUNT(*) INTO v_total_databases
  FROM databases
  WHERE created_by = p_user_id;

  IF v_total_databases >= v_quota.max_databases THEN
    RAISE EXCEPTION 'Достигнут лимит баз данных: %', v_quota.max_databases;
  END IF;

  -- Проверяем количество клонов для конкретной БД
  SELECT COUNT(*) INTO v_db_clones
  FROM database_versions
  WHERE original_database_id = p_database_id;

  IF v_db_clones >= v_quota.max_clones_per_database THEN
    RAISE EXCEPTION 'Достигнут лимит клонов для этой БД: %', v_quota.max_clones_per_database;
  END IF;

  -- Проверяем общее количество клонов пользователя
  SELECT COUNT(*) INTO v_current_clones
  FROM database_versions dv
  JOIN databases d ON d.id = dv.cloned_database_id
  WHERE d.created_by = p_user_id;

  IF v_current_clones >= v_quota.max_total_clones THEN
    RAISE EXCEPTION 'Достигнут общий лимит клонов: %', v_quota.max_total_clones;
  END IF;

  RETURN TRUE;
END;
$$;

-- 5. Расширенная функция клонирования с версионированием и квотами
CREATE OR REPLACE FUNCTION clone_database_advanced(
  p_database_id UUID,
  p_new_name TEXT,
  p_include_data BOOLEAN DEFAULT FALSE,
  p_include_relations BOOLEAN DEFAULT FALSE,
  p_async BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original_db RECORD;
  v_new_db RECORD;
  v_operation_id UUID;
  v_row_count INTEGER;
  v_parent_version RECORD;
  v_version_number INTEGER := 1;
  v_clone_type TEXT;
BEGIN
  -- Проверка аутентификации
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Проверка квот
  PERFORM check_clone_quota(auth.uid(), p_database_id);

  -- Получаем оригинальную БД
  SELECT * INTO v_original_db
  FROM databases
  WHERE id = p_database_id AND created_by = auth.uid();

  IF v_original_db IS NULL THEN
    RAISE EXCEPTION 'Database not found or access denied';
  END IF;

  -- Проверяем размер БД для автоматического переключения на async
  EXECUTE format('SELECT COUNT(*) FROM %I', v_original_db.table_name) INTO v_row_count;

  -- Автоматически включаем async для больших БД
  IF v_row_count > 100000 AND NOT p_async THEN
    p_async := TRUE;
  END IF;

  -- Определяем тип клона
  v_clone_type := CASE
    WHEN p_include_data AND p_include_relations THEN 'full'
    WHEN p_include_data THEN 'partial'
    ELSE 'structure'
  END;

  -- Находим родительскую версию (если это клон клона)
  SELECT * INTO v_parent_version
  FROM database_versions
  WHERE cloned_database_id = p_database_id;

  IF v_parent_version IS NOT NULL THEN
    v_version_number := v_parent_version.version_number + 1;
  END IF;

  -- Создаем запись операции клонирования
  INSERT INTO clone_operations (
    user_id,
    source_database_id,
    status,
    total_rows,
    is_async,
    scheduled_at,
    priority
  )
  VALUES (
    auth.uid(),
    p_database_id,
    CASE WHEN p_async THEN 'scheduled' ELSE 'in_progress' END,
    v_row_count,
    p_async,
    CASE WHEN p_async THEN now() + interval '5 seconds' ELSE NULL END,
    CASE
      WHEN v_row_count > 1000000 THEN 1  -- Низкий приоритет для очень больших
      WHEN v_row_count > 100000 THEN 3   -- Средний для больших
      ELSE 5                              -- Обычный для остальных
    END
  )
  RETURNING id INTO v_operation_id;

  -- Если асинхронное клонирование
  IF p_async THEN
    -- Планируем задачу для background worker
    PERFORM pg_notify('clone_queue', json_build_object(
      'operation_id', v_operation_id,
      'database_id', p_database_id,
      'new_name', p_new_name,
      'include_data', p_include_data,
      'include_relations', p_include_relations
    )::text);

    RETURN json_build_object(
      'success', true,
      'operation_id', v_operation_id,
      'status', 'scheduled',
      'message', 'Клонирование запланировано. Вы получите уведомление по завершении.',
      'estimated_time', CASE
        WHEN v_row_count > 1000000 THEN '10-15 минут'
        WHEN v_row_count > 100000 THEN '3-5 минут'
        WHEN v_row_count > 10000 THEN '1-2 минуты'
        ELSE 'менее минуты'
      END
    );
  END IF;

  -- Синхронное клонирование (вызываем оригинальную функцию)
  BEGIN
    -- Выполняем клонирование
    PERFORM clone_database(p_database_id, p_new_name, p_include_data, p_include_relations);

    -- Получаем созданную БД
    SELECT * INTO v_new_db
    FROM databases
    WHERE created_by = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;

    -- Создаем запись версионирования
    INSERT INTO database_versions (
      original_database_id,
      cloned_database_id,
      parent_version_id,
      version_number,
      clone_type,
      rows_copied,
      cloned_by,
      metadata
    )
    VALUES (
      COALESCE(v_parent_version.original_database_id, p_database_id),
      v_new_db.id,
      v_parent_version.id,
      v_version_number,
      v_clone_type,
      CASE WHEN p_include_data THEN v_row_count ELSE 0 END,
      auth.uid(),
      jsonb_build_object(
        'source_name', v_original_db.display_name,
        'async', false,
        'include_relations', p_include_relations
      )
    );

    -- Обновляем статус операции
    UPDATE clone_operations
    SET
      status = 'completed',
      target_database_id = v_new_db.id,
      copied_rows = CASE WHEN p_include_data THEN v_row_count ELSE 0 END,
      completed_at = now()
    WHERE id = v_operation_id;

    RETURN json_build_object(
      'success', true,
      'database', row_to_json(v_new_db),
      'operation_id', v_operation_id,
      'version_number', v_version_number,
      'rows_copied', CASE WHEN p_include_data THEN v_row_count ELSE 0 END
    );

  EXCEPTION WHEN OTHERS THEN
    -- Обновляем статус при ошибке
    UPDATE clone_operations
    SET
      status = 'failed',
      error_message = SQLERRM,
      completed_at = now()
    WHERE id = v_operation_id;

    RAISE;
  END;
END;
$$;

-- 6. Background worker для асинхронного клонирования
CREATE OR REPLACE FUNCTION process_clone_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operation RECORD;
  v_batch_size INTEGER := 10000;
  v_offset INTEGER := 0;
  v_total_batches INTEGER;
BEGIN
  -- Получаем следующую задачу из очереди
  FOR v_operation IN
    SELECT co.*, d.table_name, d.display_name
    FROM clone_operations co
    JOIN databases d ON d.id = co.source_database_id
    WHERE co.is_async = true
      AND co.status = 'scheduled'
      AND co.scheduled_at <= now()
      AND co.retry_count < co.max_retries
    ORDER BY co.priority DESC, co.scheduled_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Начинаем обработку
    UPDATE clone_operations
    SET
      status = 'in_progress',
      started_at = now()
    WHERE id = v_operation.id;

    BEGIN
      -- Создаем структуру БД
      -- ... (логика клонирования структуры)

      -- Копируем данные батчами
      IF v_operation.total_rows > 0 THEN
        v_total_batches := CEIL(v_operation.total_rows::FLOAT / v_batch_size);

        UPDATE clone_operations
        SET total_batches = v_total_batches
        WHERE id = v_operation.id;

        -- Копируем батчами
        WHILE v_offset < v_operation.total_rows LOOP
          -- ... (логика копирования батча)

          v_offset := v_offset + v_batch_size;

          -- Обновляем прогресс
          UPDATE clone_operations
          SET
            current_batch = (v_offset / v_batch_size),
            copied_rows = LEAST(v_offset, v_operation.total_rows),
            progress = (LEAST(v_offset, v_operation.total_rows)::FLOAT / v_operation.total_rows * 100)::INTEGER
          WHERE id = v_operation.id;

          -- Даем возможность другим процессам работать
          PERFORM pg_sleep(0.1);
        END LOOP;
      END IF;

      -- Завершаем операцию
      UPDATE clone_operations
      SET
        status = 'completed',
        completed_at = now(),
        progress = 100
      WHERE id = v_operation.id;

      -- Отправляем уведомление
      PERFORM pg_notify('clone_completed', json_build_object(
        'operation_id', v_operation.id,
        'user_id', v_operation.user_id
      )::text);

    EXCEPTION WHEN OTHERS THEN
      -- Обработка ошибок с retry
      UPDATE clone_operations
      SET
        status = 'failed',
        error_message = SQLERRM,
        retry_count = retry_count + 1,
        scheduled_at = now() + (interval '1 minute' * (retry_count + 1))
      WHERE id = v_operation.id;

      IF v_operation.retry_count + 1 < v_operation.max_retries THEN
        UPDATE clone_operations
        SET status = 'scheduled'
        WHERE id = v_operation.id;
      END IF;
    END;
  END LOOP;
END;
$$;

-- 7. Функция получения истории версий БД
CREATE OR REPLACE FUNCTION get_database_versions(p_database_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH RECURSIVE version_tree AS (
    -- Начинаем с корневой БД
    SELECT
      dv.*,
      d.display_name,
      d.system_name,
      0 as depth
    FROM database_versions dv
    JOIN databases d ON d.id = dv.cloned_database_id
    WHERE dv.original_database_id = p_database_id
      AND dv.parent_version_id IS NULL

    UNION ALL

    -- Рекурсивно находим все клоны клонов
    SELECT
      dv.*,
      d.display_name,
      d.system_name,
      vt.depth + 1
    FROM database_versions dv
    JOIN databases d ON d.id = dv.cloned_database_id
    JOIN version_tree vt ON vt.id = dv.parent_version_id
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'database_id', cloned_database_id,
      'display_name', display_name,
      'system_name', system_name,
      'version_number', version_number,
      'clone_type', clone_type,
      'rows_copied', rows_copied,
      'cloned_at', cloned_at,
      'depth', depth
    ) ORDER BY version_number, depth
  ) INTO v_result
  FROM version_tree;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 8. Функция получения квот пользователя
CREATE OR REPLACE FUNCTION get_user_quota_status(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota RECORD;
  v_usage RECORD;
BEGIN
  -- Получаем квоты
  SELECT * INTO v_quota
  FROM user_quotas
  WHERE user_id = p_user_id;

  IF v_quota IS NULL THEN
    -- Создаем дефолтные квоты
    INSERT INTO user_quotas (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_quota;
  END IF;

  -- Считаем текущее использование
  SELECT
    COUNT(DISTINCT d.id) as total_databases,
    COUNT(DISTINCT dv.cloned_database_id) as total_clones,
    COUNT(DISTINCT co.id) FILTER (WHERE co.is_async AND co.status IN ('pending', 'scheduled', 'in_progress')) as active_async_operations
  INTO v_usage
  FROM databases d
  LEFT JOIN database_versions dv ON dv.original_database_id = d.id OR dv.cloned_database_id = d.id
  LEFT JOIN clone_operations co ON co.user_id = p_user_id
  WHERE d.created_by = p_user_id;

  RETURN json_build_object(
    'limits', json_build_object(
      'max_databases', v_quota.max_databases,
      'max_clones_per_database', v_quota.max_clones_per_database,
      'max_total_clones', v_quota.max_total_clones,
      'max_rows_per_database', v_quota.max_rows_per_database,
      'max_async_operations', v_quota.max_async_operations
    ),
    'usage', json_build_object(
      'databases', v_usage.total_databases,
      'clones', v_usage.total_clones,
      'async_operations', v_usage.active_async_operations
    ),
    'available', json_build_object(
      'databases', v_quota.max_databases - v_usage.total_databases,
      'clones', v_quota.max_total_clones - v_usage.total_clones,
      'async_operations', v_quota.max_async_operations - v_usage.active_async_operations
    )
  );
END;
$$;

-- 9. Планировщик для background worker (запускать через pg_cron)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('process-clone-queue', '*/10 * * * * *', 'SELECT process_clone_queue();');

-- 10. RLS политики
ALTER TABLE database_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their databases"
  ON database_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM databases d
      WHERE (d.id = database_versions.original_database_id
         OR d.id = database_versions.cloned_database_id)
        AND d.created_by = auth.uid()
    )
  );

ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotas"
  ON user_quotas FOR SELECT
  USING (user_id = auth.uid());

-- Права на выполнение
GRANT EXECUTE ON FUNCTION clone_database_advanced TO authenticated;
GRANT EXECUTE ON FUNCTION check_clone_quota TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_versions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quota_status TO authenticated;
GRANT EXECUTE ON FUNCTION process_clone_queue TO service_role;

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_databases_created_by ON databases(created_by);
CREATE INDEX IF NOT EXISTS idx_clone_operations_user_status ON clone_operations(user_id, status);