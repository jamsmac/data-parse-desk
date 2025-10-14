-- RPC функции для работы с databases и table_schemas

-- Функция создания базы данных
CREATE OR REPLACE FUNCTION create_database(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_database_id UUID;
  v_table_name TEXT;
  v_result JSONB;
BEGIN
  -- Создаем запись в databases
  INSERT INTO databases (name, description, icon, color, user_id)
  VALUES (p_name, p_description, p_icon, p_color, p_user_id)
  RETURNING id INTO v_database_id;
  
  -- Создаем динамическую таблицу для данных
  v_table_name := 'data_' || REPLACE(v_database_id::TEXT, '-', '_');
  
  EXECUTE format('
    CREATE TABLE %I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )', v_table_name);
  
  -- Включаем RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table_name);
  
  -- Возвращаем созданную запись
  SELECT row_to_json(d.*)::JSONB INTO v_result
  FROM databases d
  WHERE d.id = v_database_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция получения баз данных пользователя
CREATE OR REPLACE FUNCTION get_user_databases(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(d.*) ORDER BY d.created_at DESC), '[]'::JSON)::JSONB INTO v_result
  FROM databases d
  WHERE d.user_id = p_user_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция получения одной базы данных
CREATE OR REPLACE FUNCTION get_database(p_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT row_to_json(d.*)::JSONB INTO v_result
  FROM databases d
  WHERE d.id = p_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция обновления базы данных
CREATE OR REPLACE FUNCTION update_database(
  p_id UUID,
  p_updates JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE databases
  SET
    name = COALESCE((p_updates->>'name')::TEXT, name),
    description = COALESCE((p_updates->>'description')::TEXT, description),
    icon = COALESCE((p_updates->>'icon')::TEXT, icon),
    color = COALESCE((p_updates->>'color')::TEXT, color),
    updated_at = NOW()
  WHERE id = p_id;
  
  SELECT row_to_json(d.*)::JSONB INTO v_result
  FROM databases d
  WHERE d.id = p_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция удаления базы данных
CREATE OR REPLACE FUNCTION delete_database(p_id UUID)
RETURNS VOID AS $$
DECLARE
  v_table_name TEXT;
BEGIN
  v_table_name := 'data_' || REPLACE(p_id::TEXT, '-', '_');
  
  -- Удаляем динамическую таблицу
  EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', v_table_name);
  
  -- Удаляем схемы колонок
  DELETE FROM table_schemas WHERE database_id = p_id;
  
  -- Удаляем саму базу данных
  DELETE FROM databases WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Функция создания схемы колонки
CREATE OR REPLACE FUNCTION create_table_schema(
  p_database_id UUID,
  p_column_name TEXT,
  p_column_type TEXT,
  p_is_required BOOLEAN DEFAULT FALSE,
  p_default_value JSONB DEFAULT NULL,
  p_relation_config JSONB DEFAULT NULL,
  p_rollup_config JSONB DEFAULT NULL,
  p_formula_config JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_schema_id UUID;
  v_table_name TEXT;
  v_sql_type TEXT;
  v_position INT;
  v_result JSONB;
BEGIN
  -- Получаем следующую позицию
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_position
  FROM table_schemas
  WHERE database_id = p_database_id;
  
  -- Создаем запись в table_schemas
  INSERT INTO table_schemas (
    database_id, column_name, column_type, is_required, 
    default_value, position, relation_config, rollup_config, formula_config
  )
  VALUES (
    p_database_id, p_column_name, p_column_type, p_is_required,
    p_default_value, v_position, p_relation_config, p_rollup_config, p_formula_config
  )
  RETURNING id INTO v_schema_id;
  
  -- Добавляем колонку в динамическую таблицу
  v_table_name := 'data_' || REPLACE(p_database_id::TEXT, '-', '_');
  
  -- Определяем SQL тип на основе column_type
  v_sql_type := CASE p_column_type
    WHEN 'text' THEN 'TEXT'
    WHEN 'number' THEN 'NUMERIC'
    WHEN 'date' THEN 'TIMESTAMPTZ'
    WHEN 'boolean' THEN 'BOOLEAN'
    WHEN 'select' THEN 'TEXT'
    WHEN 'multi_select' THEN 'TEXT[]'
    WHEN 'email' THEN 'TEXT'
    WHEN 'url' THEN 'TEXT'
    WHEN 'phone' THEN 'TEXT'
    WHEN 'file' THEN 'JSONB'
    WHEN 'relation' THEN 'UUID'
    WHEN 'rollup' THEN 'JSONB'
    WHEN 'formula' THEN 'TEXT'
    WHEN 'lookup' THEN 'TEXT'
    ELSE 'TEXT'
  END;
  
  EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', 
    v_table_name, p_column_name, v_sql_type);
  
  -- Возвращаем созданную схему
  SELECT row_to_json(ts.*)::JSONB INTO v_result
  FROM table_schemas ts
  WHERE ts.id = v_schema_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция получения схем колонок
CREATE OR REPLACE FUNCTION get_table_schemas(p_database_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(ts.*) ORDER BY ts.position), '[]'::JSON)::JSONB INTO v_result
  FROM table_schemas ts
  WHERE ts.database_id = p_database_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция обновления схемы колонки
CREATE OR REPLACE FUNCTION update_table_schema(
  p_id UUID,
  p_updates JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE table_schemas
  SET
    column_name = COALESCE((p_updates->>'column_name')::TEXT, column_name),
    column_type = COALESCE((p_updates->>'column_type')::TEXT, column_type),
    is_required = COALESCE((p_updates->>'is_required')::BOOLEAN, is_required),
    default_value = COALESCE(p_updates->'default_value', default_value),
    relation_config = COALESCE(p_updates->'relation_config', relation_config),
    rollup_config = COALESCE(p_updates->'rollup_config', rollup_config),
    formula_config = COALESCE(p_updates->'formula_config', formula_config),
    updated_at = NOW()
  WHERE id = p_id;
  
  SELECT row_to_json(ts.*)::JSONB INTO v_result
  FROM table_schemas ts
  WHERE ts.id = p_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция удаления схемы колонки
CREATE OR REPLACE FUNCTION delete_table_schema(p_id UUID)
RETURNS VOID AS $$
DECLARE
  v_database_id UUID;
  v_column_name TEXT;
  v_table_name TEXT;
BEGIN
  SELECT database_id, column_name INTO v_database_id, v_column_name
  FROM table_schemas
  WHERE id = p_id;
  
  v_table_name := 'data_' || REPLACE(v_database_id::TEXT, '-', '_');
  
  -- Удаляем колонку из динамической таблицы
  EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I', 
    v_table_name, v_column_name);
  
  -- Удаляем схему
  DELETE FROM table_schemas WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Функция переупорядочивания колонок
CREATE OR REPLACE FUNCTION reorder_columns(
  p_database_id UUID,
  p_column_order JSONB
) RETURNS VOID AS $$
DECLARE
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_column_order)
  LOOP
    UPDATE table_schemas
    SET position = (v_item->>'position')::INT
    WHERE id = (v_item->>'id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Функция получения данных таблицы
CREATE OR REPLACE FUNCTION get_table_data(
  p_database_id UUID,
  p_filters JSONB DEFAULT '{}'::JSONB,
  p_sorting JSONB DEFAULT NULL,
  p_pagination JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_table_name TEXT;
  v_sql TEXT;
  v_result JSONB;
  v_total INT;
BEGIN
  v_table_name := 'data_' || REPLACE(p_database_id::TEXT, '-', '_');
  
  -- Базовый запрос
  v_sql := format('SELECT * FROM %I WHERE 1=1', v_table_name);
  
  -- TODO: Добавить фильтры, сортировку и пагинацию
  
  -- Получаем общее количество
  EXECUTE format('SELECT COUNT(*) FROM %I', v_table_name) INTO v_total;
  
  -- Получаем данные
  EXECUTE format('SELECT COALESCE(json_agg(t.*), ''[]''::JSON)::JSONB FROM (%s) t', v_sql) INTO v_result;
  
  RETURN jsonb_build_object('data', v_result, 'total', v_total);
END;
$$ LANGUAGE plpgsql;

-- Функция вставки строки
CREATE OR REPLACE FUNCTION insert_table_row(
  p_database_id UUID,
  p_row_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_table_name TEXT;
  v_columns TEXT;
  v_values TEXT;
  v_result JSONB;
BEGIN
  v_table_name := 'data_' || REPLACE(p_database_id::TEXT, '-', '_');
  
  -- Формируем списки колонок и значений
  SELECT 
    string_agg(quote_ident(key), ', '),
    string_agg(quote_literal(value), ', ')
  INTO v_columns, v_values
  FROM jsonb_each_text(p_row_data);
  
  -- Вставляем строку
  EXECUTE format('INSERT INTO %I (%s) VALUES (%s) RETURNING to_jsonb(%I.*)',
    v_table_name, v_columns, v_values, v_table_name) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция обновления строки
CREATE OR REPLACE FUNCTION update_table_row(
  p_database_id UUID,
  p_row_id UUID,
  p_updates JSONB
) RETURNS JSONB AS $$
DECLARE
  v_table_name TEXT;
  v_set_clause TEXT;
  v_result JSONB;
BEGIN
  v_table_name := 'data_' || REPLACE(p_database_id::TEXT, '-', '_');
  
  -- Формируем SET clause
  SELECT string_agg(
    format('%I = %L', key, value),
    ', '
  ) INTO v_set_clause
  FROM jsonb_each_text(p_updates);
  
  -- Обновляем строку
  EXECUTE format('UPDATE %I SET %s, updated_at = NOW() WHERE id = %L RETURNING to_jsonb(%I.*)',
    v_table_name, v_set_clause, p_row_id, v_table_name) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция удаления строки
CREATE OR REPLACE FUNCTION delete_table_row(
  p_database_id UUID,
  p_row_id UUID
) RETURNS VOID AS $$
DECLARE
  v_table_name TEXT;
BEGIN
  v_table_name := 'data_' || REPLACE(p_database_id::TEXT, '-', '_');
  
  EXECUTE format('DELETE FROM %I WHERE id = %L', v_table_name, p_row_id);
END;
$$ LANGUAGE plpgsql;

-- Функция массовой вставки строк
CREATE OR REPLACE FUNCTION bulk_insert_table_rows(
  p_database_id UUID,
  p_rows JSONB
) RETURNS JSONB AS $$
DECLARE
  v_table_name TEXT;
  v_row JSONB;
  v_results JSONB := '[]'::JSONB;
  v_result JSONB;
BEGIN
  v_table_name := 'data_' || REPLACE(p_database_id::TEXT, '-', '_');
  
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_result := insert_table_row(p_database_id, v_row);
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;
  
  RETURN v_results;
END;
$$ LANGUAGE plpgsql;

-- Функция массового удаления строк
CREATE OR REPLACE FUNCTION bulk_delete_table_rows(
  p_database_id UUID,
  p_row_ids JSONB
) RETURNS VOID AS $$
DECLARE
  v_table_name TEXT;
  v_row_id UUID;
BEGIN
  v_table_name := 'data_' || REPLACE(p_database_id::TEXT, '-', '_');
  
  FOR v_row_id IN SELECT (value#>>'{}')::UUID FROM jsonb_array_elements(p_row_ids)
  LOOP
    EXECUTE format('DELETE FROM %I WHERE id = %L', v_table_name, v_row_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Функция получения статистики
CREATE OR REPLACE FUNCTION get_database_stats(p_database_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_table_name TEXT;
  v_row_count INT;
  v_last_updated TIMESTAMPTZ;
BEGIN
  v_table_name := 'data_' || REPLACE(p_database_id::TEXT, '-', '_');
  
  EXECUTE format('SELECT COUNT(*) FROM %I', v_table_name) INTO v_row_count;
  EXECUTE format('SELECT MAX(updated_at) FROM %I', v_table_name) INTO v_last_updated;
  
  RETURN jsonb_build_object(
    'rowCount', COALESCE(v_row_count, 0),
    'lastUpdated', COALESCE(v_last_updated, NOW())
  );
END;
$$ LANGUAGE plpgsql;
