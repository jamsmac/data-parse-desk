-- Функция для клонирования базы данных
CREATE OR REPLACE FUNCTION clone_database(
  p_database_id UUID,
  p_new_name TEXT,
  p_include_data BOOLEAN DEFAULT FALSE,
  p_include_relations BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original_db RECORD;
  v_new_db RECORD;
  v_new_system_name TEXT;
  v_new_table_name TEXT;
  v_schema RECORD;
  v_relation RECORD;
  v_sql TEXT;
  v_total_rows INTEGER := 0;
  v_copied_rows INTEGER := 0;
BEGIN
  -- Проверка прав доступа
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 1. Получаем оригинальную БД
  SELECT * INTO v_original_db
  FROM databases
  WHERE id = p_database_id AND created_by = auth.uid();

  IF v_original_db IS NULL THEN
    RAISE EXCEPTION 'Database not found or access denied';
  END IF;

  -- 2. Генерируем уникальное системное имя
  v_new_system_name := v_original_db.system_name || '_copy_' ||
                       to_char(now(), 'YYYYMMDDHH24MISS');
  v_new_table_name := 'user_' || v_new_system_name;

  -- Проверяем уникальность имени
  IF EXISTS (SELECT 1 FROM databases WHERE system_name = v_new_system_name) THEN
    v_new_system_name := v_new_system_name || '_' || substr(md5(random()::text), 1, 6);
    v_new_table_name := 'user_' || v_new_system_name;
  END IF;

  -- 3. Создаем новую БД
  INSERT INTO databases (
    system_name,
    display_name,
    description,
    icon_name,
    color_hex,
    table_name,
    created_by
  )
  VALUES (
    v_new_system_name,
    COALESCE(p_new_name, v_original_db.display_name || ' (Копия)'),
    v_original_db.description,
    v_original_db.icon_name,
    v_original_db.color_hex,
    v_new_table_name,
    auth.uid()
  )
  RETURNING * INTO v_new_db;

  -- 4. Копируем схему таблицы
  FOR v_schema IN
    SELECT * FROM table_schemas
    WHERE database_id = p_database_id
    ORDER BY sort_order, id
  LOOP
    INSERT INTO table_schemas (
      database_id,
      column_name,
      data_type,
      display_name,
      is_required,
      is_unique,
      is_primary,
      default_value,
      validation_rules,
      relation_config,
      rollup_config,
      formula_config,
      lookup_config,
      sort_order
    )
    VALUES (
      v_new_db.id,
      v_schema.column_name,
      v_schema.data_type,
      v_schema.display_name,
      v_schema.is_required,
      v_schema.is_unique,
      v_schema.is_primary,
      v_schema.default_value,
      v_schema.validation_rules,
      CASE
        WHEN p_include_relations THEN v_schema.relation_config
        ELSE NULL
      END,
      CASE
        WHEN p_include_relations THEN v_schema.rollup_config
        ELSE NULL
      END,
      v_schema.formula_config,
      CASE
        WHEN p_include_relations THEN v_schema.lookup_config
        ELSE NULL
      END,
      v_schema.sort_order
    );
  END LOOP;

  -- 5. Создаем динамическую таблицу
  PERFORM create_dynamic_table(v_new_table_name);

  -- 6. Копируем данные (если указано)
  IF p_include_data THEN
    -- Получаем количество строк для прогресса
    EXECUTE format('SELECT COUNT(*) FROM %I', v_original_db.table_name) INTO v_total_rows;

    IF v_total_rows > 0 THEN
      -- Копируем данные батчами для больших таблиц
      v_sql := format(
        'INSERT INTO %I SELECT * FROM %I',
        v_new_table_name,
        v_original_db.table_name
      );
      EXECUTE v_sql;
      GET DIAGNOSTICS v_copied_rows = ROW_COUNT;
    END IF;
  END IF;

  -- 7. Копируем связи между БД (если указано)
  IF p_include_relations THEN
    FOR v_relation IN
      SELECT * FROM database_relations
      WHERE source_database_id = p_database_id
         OR target_database_id = p_database_id
    LOOP
      INSERT INTO database_relations (
        source_database_id,
        target_database_id,
        source_column,
        target_column,
        relation_type,
        relation_name,
        is_active
      )
      VALUES (
        CASE
          WHEN v_relation.source_database_id = p_database_id THEN v_new_db.id
          ELSE v_relation.source_database_id
        END,
        CASE
          WHEN v_relation.target_database_id = p_database_id THEN v_new_db.id
          ELSE v_relation.target_database_id
        END,
        v_relation.source_column,
        v_relation.target_column,
        v_relation.relation_type,
        v_relation.relation_name || ' (Копия)',
        v_relation.is_active
      );
    END LOOP;
  END IF;

  -- 8. Записываем в audit_log
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    new_values,
    created_by,
    metadata
  )
  VALUES (
    'databases',
    v_new_db.id,
    'CLONE',
    jsonb_build_object(
      'original_id', p_database_id,
      'new_name', v_new_db.display_name,
      'include_data', p_include_data,
      'include_relations', p_include_relations,
      'rows_copied', v_copied_rows
    ),
    auth.uid(),
    jsonb_build_object(
      'source_database', v_original_db.display_name,
      'total_rows', v_total_rows
    )
  );

  -- Возвращаем результат
  RETURN json_build_object(
    'success', true,
    'database', row_to_json(v_new_db),
    'rows_copied', v_copied_rows,
    'total_rows', v_total_rows
  );

EXCEPTION WHEN OTHERS THEN
  -- Откатываем изменения при ошибке
  RAISE EXCEPTION 'Clone database failed: %', SQLERRM;
END;
$$;

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION clone_database TO authenticated;

-- Создаем политику для проверки прав
CREATE POLICY "Users can clone their own databases"
  ON databases
  FOR INSERT
  USING (created_by = auth.uid());

-- Функция для получения прогресса клонирования (для больших БД)
CREATE OR REPLACE FUNCTION get_clone_progress(p_operation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
BEGIN
  SELECT * INTO v_progress
  FROM clone_operations
  WHERE id = p_operation_id
    AND user_id = auth.uid();

  IF v_progress IS NULL THEN
    RETURN json_build_object(
      'status', 'not_found'
    );
  END IF;

  RETURN json_build_object(
    'status', v_progress.status,
    'progress', v_progress.progress,
    'total_rows', v_progress.total_rows,
    'copied_rows', v_progress.copied_rows,
    'error', v_progress.error_message
  );
END;
$$;

-- Таблица для отслеживания прогресса клонирования
CREATE TABLE IF NOT EXISTS clone_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  source_database_id UUID NOT NULL REFERENCES databases(id),
  target_database_id UUID REFERENCES databases(id),
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  copied_rows INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для производительности
CREATE INDEX idx_clone_operations_user_id ON clone_operations(user_id);
CREATE INDEX idx_clone_operations_status ON clone_operations(status);

-- RLS для clone_operations
ALTER TABLE clone_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clone operations"
  ON clone_operations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create clone operations"
  ON clone_operations FOR INSERT
  WITH CHECK (user_id = auth.uid());