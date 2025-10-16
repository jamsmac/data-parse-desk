-- ============================================================================
-- VHData Platform - Database Setup Script
-- Применение всех миграций для настройки базы данных
-- ============================================================================

-- ============================================================================
-- 1. CORE TABLES (Multiple Databases System)
-- ============================================================================

-- TABLE: databases
CREATE TABLE IF NOT EXISTS public.databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  table_name TEXT UNIQUE NOT NULL,
  icon_name TEXT DEFAULT 'Database',
  color_hex TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  cached_record_count INTEGER DEFAULT 0,
  last_upload_date TIMESTAMP WITH TIME ZONE,
  column_config JSONB,
  widget_settings JSONB,
  created_by UUID,
  CONSTRAINT valid_system_name CHECK (system_name ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT valid_table_name CHECK (table_name ~ '^user_[a-z][a-z0-9_]*$')
);

-- TABLE: table_schemas
CREATE TABLE IF NOT EXISTS public.table_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  is_unique BOOLEAN DEFAULT false,
  is_indexed BOOLEAN DEFAULT false,
  default_value TEXT,
  validation_rules JSONB,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(database_id, column_name),
  CONSTRAINT valid_data_type CHECK (data_type IN ('text', 'number', 'date', 'datetime', 'boolean', 'json', 'relation', 'rollup', 'formula', 'lookup'))
);

-- TABLE: files
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending',
  total_rows INTEGER DEFAULT 0,
  inserted_rows INTEGER DEFAULT 0,
  rejected_rows INTEGER DEFAULT 0,
  error_message TEXT,
  column_mappings JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- TABLE: audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TABLE: database_relations
CREATE TABLE IF NOT EXISTS public.database_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  target_database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('one_to_one', 'one_to_many', 'many_to_many')),
  source_column TEXT NOT NULL,
  target_column TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- ============================================================================
-- 2. COLLABORATION TABLES
-- ============================================================================

-- TABLE: users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TABLE: user_permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write', 'admin')),
  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- TABLE: comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  row_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TABLE: activities
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TABLE: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. RPC FUNCTIONS
-- ============================================================================

-- Функция создания базы данных
CREATE OR REPLACE FUNCTION create_database(
  p_display_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_icon_name TEXT DEFAULT 'Database',
  p_color_hex TEXT DEFAULT '#3B82F6',
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
  v_database_id UUID;
  v_system_name TEXT;
  v_table_name TEXT;
  v_result JSONB;
BEGIN
  -- Генерируем system_name из display_name
  v_system_name := lower(regexp_replace(p_display_name, '[^a-zA-Z0-9]', '_', 'g'));
  v_system_name := 'db_' || v_system_name || '_' || extract(epoch from now())::text;
  
  -- Генерируем table_name
  v_table_name := 'user_' || replace(v_database_id::text, '-', '_');
  
  -- Создаем запись в databases
  INSERT INTO databases (system_name, display_name, description, icon_name, color_hex, table_name, created_by)
  VALUES (v_system_name, p_display_name, p_description, p_icon_name, p_color_hex, v_table_name, p_user_id)
  RETURNING id INTO v_database_id;
  
  -- Обновляем table_name с реальным ID
  v_table_name := 'user_' || replace(v_database_id::text, '-', '_');
  UPDATE databases SET table_name = v_table_name WHERE id = v_database_id;
  
  -- Создаем динамическую таблицу для данных
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
CREATE OR REPLACE FUNCTION get_user_databases(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(d.*) ORDER BY d.created_at DESC), '[]'::JSON)::JSONB INTO v_result
  FROM databases d
  WHERE d.created_by = p_user_id OR d.is_active = true;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Функция получения данных таблицы
CREATE OR REPLACE FUNCTION get_table_data(
  p_database_id UUID,
  p_filters JSONB DEFAULT '{}',
  p_pagination JSONB DEFAULT '{"page": 0, "pageSize": 50}',
  p_sorting JSONB DEFAULT '{"column": "created_at", "direction": "desc"}'
) RETURNS JSONB AS $$
DECLARE
  v_table_name TEXT;
  v_offset INTEGER;
  v_limit INTEGER;
  v_sort_column TEXT;
  v_sort_direction TEXT;
  v_result JSONB;
  v_total_count INTEGER;
  v_query TEXT;
BEGIN
  -- Получаем имя таблицы
  SELECT table_name INTO v_table_name FROM databases WHERE id = p_database_id;
  
  IF v_table_name IS NULL THEN
    RETURN '{"error": "Database not found"}'::JSONB;
  END IF;
  
  -- Парсим параметры пагинации
  v_offset := COALESCE((p_pagination->>'page')::INTEGER, 0) * COALESCE((p_pagination->>'pageSize')::INTEGER, 50);
  v_limit := COALESCE((p_pagination->>'pageSize')::INTEGER, 50);
  
  -- Парсим параметры сортировки
  v_sort_column := COALESCE(p_sorting->>'column', 'created_at');
  v_sort_direction := COALESCE(p_sorting->>'direction', 'desc');
  
  -- Строим запрос
  v_query := format('
    SELECT json_agg(row_to_json(t.*)) as data,
           (SELECT count(*) FROM %I) as total
    FROM %I t
    ORDER BY %I %s
    LIMIT %s OFFSET %s',
    v_table_name, v_table_name, v_sort_column, v_sort_direction, v_limit, v_offset);
  
  EXECUTE v_query INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Включаем RLS на всех таблицах
ALTER TABLE databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Политики для databases
CREATE POLICY "Users can read own databases"
ON databases FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can create databases"
ON databases FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own databases"
ON databases FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own databases"
ON databases FOR DELETE
USING (created_by = auth.uid());

-- Политики для table_schemas
CREATE POLICY "Users can read schemas of own databases"
ON table_schemas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM databases 
    WHERE id = table_schemas.database_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can manage schemas of own databases"
ON table_schemas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM databases 
    WHERE id = table_schemas.database_id 
    AND created_by = auth.uid()
  )
);

-- Политики для files
CREATE POLICY "Users can read files of own databases"
ON files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM databases 
    WHERE id = files.database_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can manage files of own databases"
ON files FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM databases 
    WHERE id = files.database_id 
    AND created_by = auth.uid()
  )
);

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Индексы для databases
CREATE INDEX IF NOT EXISTS idx_databases_created_by ON databases(created_by);
CREATE INDEX IF NOT EXISTS idx_databases_created_at ON databases(created_at);
CREATE INDEX IF NOT EXISTS idx_databases_system_name ON databases(system_name);

-- Индексы для table_schemas
CREATE INDEX IF NOT EXISTS idx_table_schemas_database_id ON table_schemas(database_id);
CREATE INDEX IF NOT EXISTS idx_table_schemas_display_order ON table_schemas(database_id, display_order);

-- Индексы для files
CREATE INDEX IF NOT EXISTS idx_files_database_id ON files(database_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);

-- Индексы для audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- 6. SAMPLE DATA (для тестирования)
-- ============================================================================

-- Создаем тестового пользователя (если не существует)
INSERT INTO users (id, email, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@test.com',
  'Administrator',
  'owner'
) ON CONFLICT (id) DO NOTHING;

-- Создаем тестовую базу данных
INSERT INTO databases (id, system_name, display_name, description, table_name, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'sample_sales',
  'Sample Sales Data',
  'Демонстрационная база данных с продажами',
  'user_sample_sales',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Создаем схему для тестовой базы
INSERT INTO table_schemas (database_id, column_name, data_type, display_name, display_order)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'product_name', 'text', 'Product Name', 1),
  ('00000000-0000-0000-0000-000000000001', 'quantity', 'number', 'Quantity', 2),
  ('00000000-0000-0000-0000-000000000001', 'price', 'number', 'Price', 3),
  ('00000000-0000-0000-0000-000000000001', 'sale_date', 'date', 'Sale Date', 4),
  ('00000000-0000-0000-0000-000000000001', 'customer_email', 'text', 'Customer Email', 5)
ON CONFLICT (database_id, column_name) DO NOTHING;

-- Создаем тестовую таблицу данных
CREATE TABLE IF NOT EXISTS user_sample_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  product_name TEXT,
  quantity INTEGER,
  price DECIMAL(10,2),
  sale_date DATE,
  customer_email TEXT
);

-- Включаем RLS для тестовой таблицы
ALTER TABLE user_sample_sales ENABLE ROW LEVEL SECURITY;

-- Политика для тестовой таблицы
CREATE POLICY "Users can read sample sales data"
ON user_sample_sales FOR SELECT
USING (true);

-- Вставляем тестовые данные
INSERT INTO user_sample_sales (product_name, quantity, price, sale_date, customer_email)
VALUES 
  ('Laptop', 2, 999.99, '2025-01-15', 'customer1@example.com'),
  ('Mouse', 5, 29.99, '2025-01-14', 'customer2@example.com'),
  ('Keyboard', 3, 79.99, '2025-01-13', 'customer3@example.com'),
  ('Monitor', 1, 299.99, '2025-01-12', 'customer4@example.com'),
  ('Headphones', 4, 149.99, '2025-01-11', 'customer5@example.com')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'VHData Platform database setup completed successfully!';
  RAISE NOTICE 'Created tables: databases, table_schemas, files, audit_log, database_relations';
  RAISE NOTICE 'Created collaboration tables: users, user_permissions, comments, activities, notifications';
  RAISE NOTICE 'Created RPC functions: create_database, get_user_databases, get_table_data';
  RAISE NOTICE 'Applied RLS policies for security';
  RAISE NOTICE 'Created sample data for testing';
  RAISE NOTICE 'Database is ready for VHData Platform!';
END $$;