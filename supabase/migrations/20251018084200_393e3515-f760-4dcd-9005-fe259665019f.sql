-- ==========================================
-- ЭТАП 0.5: PROJECTS/WORKSPACES
-- ==========================================

-- Создать таблицу проектов
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#94A3B8',
  is_archived BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создать таблицу участников проекта
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Добавить project_id в databases
ALTER TABLE public.databases 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- ==========================================
-- ЭТАП 1: ДИНАМИЧЕСКИЕ ТАБЛИЦЫ
-- ==========================================

-- Создать таблицу схем колонок
CREATE TABLE IF NOT EXISTS public.table_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number', 'date', 'boolean', 'select', 'multi_select', 'email', 'url', 'phone', 'file', 'relation', 'rollup', 'formula', 'lookup')),
  is_required BOOLEAN DEFAULT false,
  default_value JSONB,
  position INTEGER NOT NULL DEFAULT 0,
  relation_config JSONB,
  rollup_config JSONB,
  formula_config JSONB,
  lookup_config JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(database_id, column_name)
);

-- Создать таблицу данных (JSONB)
CREATE TABLE IF NOT EXISTS public.table_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создать таблицу связей между базами
CREATE TABLE IF NOT EXISTS public.database_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  target_database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('one_to_many', 'many_to_one', 'many_to_many')),
  source_column TEXT NOT NULL,
  target_column TEXT NOT NULL,
  junction_table_id UUID REFERENCES public.databases(id),
  cascade_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Projects RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects"
ON public.projects FOR ALL
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
);

-- Project Members RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project membership"
ON public.project_members FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can manage members"
ON public.project_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

-- Table Schemas RLS
ALTER TABLE public.table_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage schemas in their databases"
ON public.table_schemas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.databases d
    LEFT JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = table_schemas.database_id 
    AND (d.created_by = auth.uid() OR p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

-- Table Data RLS
ALTER TABLE public.table_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage data in their databases"
ON public.table_data FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.databases d
    LEFT JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = table_data.database_id 
    AND (d.created_by = auth.uid() OR p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

-- Database Relations RLS
ALTER TABLE public.database_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage relations in their databases"
ON public.database_relations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.databases d
    LEFT JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = database_relations.source_database_id 
    AND (d.created_by = auth.uid() OR p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

-- ==========================================
-- TRIGGERS
-- ==========================================

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_table_schemas_updated_at
BEFORE UPDATE ON public.table_schemas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_table_data_updated_at
BEFORE UPDATE ON public.table_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- RPC FUNCTIONS: PROJECTS
-- ==========================================

CREATE OR REPLACE FUNCTION public.create_project(
  p_name TEXT,
  p_user_id UUID,
  p_description TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT '📁',
  p_color TEXT DEFAULT '#94A3B8'
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project public.projects;
BEGIN
  INSERT INTO public.projects(name, user_id, description, icon, color)
  VALUES (p_name, p_user_id, p_description, p_icon, p_color)
  RETURNING * INTO new_project;
  
  RETURN new_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_projects(p_user_id UUID)
RETURNS SETOF public.projects
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.* 
  FROM public.projects p
  LEFT JOIN public.project_members pm ON p.id = pm.project_id
  WHERE p.user_id = p_user_id OR pm.user_id = p_user_id
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.update_project(
  p_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_is_archived BOOLEAN DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_project public.projects;
BEGIN
  UPDATE public.projects
  SET 
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    icon = COALESCE(p_icon, icon),
    color = COALESCE(p_color, color),
    is_archived = COALESCE(p_is_archived, is_archived),
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO updated_project;
  
  RETURN updated_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_project(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.projects WHERE id = p_id;
  RETURN true;
END;
$$;

-- ==========================================
-- RPC FUNCTIONS: DATABASES
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_database(
  p_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS public.databases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_db public.databases;
BEGIN
  UPDATE public.databases
  SET 
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    icon = COALESCE(p_icon, icon),
    color = COALESCE(p_color, color),
    tags = COALESCE(p_tags, tags),
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO updated_db;
  
  RETURN updated_db;
END;
$$;


CREATE OR REPLACE FUNCTION public.clear_database_data(p_database_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.table_data WHERE database_id = p_database_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_databases(p_project_id UUID)
RETURNS SETOF public.databases
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.databases
  WHERE project_id = p_project_id
  ORDER BY created_at DESC;
$$;

-- ==========================================
-- RPC FUNCTIONS: TABLE SCHEMAS
-- ==========================================

CREATE OR REPLACE FUNCTION public.create_table_schema(
  p_database_id UUID,
  p_column_name TEXT,
  p_column_type TEXT,
  p_is_required BOOLEAN DEFAULT false,
  p_default_value JSONB DEFAULT NULL,
  p_position INTEGER DEFAULT 0,
  p_relation_config JSONB DEFAULT NULL,
  p_rollup_config JSONB DEFAULT NULL,
  p_formula_config JSONB DEFAULT NULL,
  p_lookup_config JSONB DEFAULT NULL
)
RETURNS public.table_schemas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_schema public.table_schemas;
BEGIN
  INSERT INTO public.table_schemas(
    database_id, column_name, column_type, is_required, 
    default_value, position, relation_config, rollup_config, 
    formula_config, lookup_config
  )
  VALUES (
    p_database_id, p_column_name, p_column_type, p_is_required,
    p_default_value, p_position, p_relation_config, p_rollup_config,
    p_formula_config, p_lookup_config
  )
  RETURNING * INTO new_schema;
  
  RETURN new_schema;
END;
$$;


CREATE OR REPLACE FUNCTION public.update_table_schema(
  p_id UUID,
  p_column_name TEXT DEFAULT NULL,
  p_column_type TEXT DEFAULT NULL,
  p_is_required BOOLEAN DEFAULT NULL,
  p_default_value JSONB DEFAULT NULL,
  p_relation_config JSONB DEFAULT NULL,
  p_rollup_config JSONB DEFAULT NULL,
  p_formula_config JSONB DEFAULT NULL,
  p_lookup_config JSONB DEFAULT NULL
)
RETURNS public.table_schemas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_schema public.table_schemas;
BEGIN
  UPDATE public.table_schemas
  SET 
    column_name = COALESCE(p_column_name, column_name),
    column_type = COALESCE(p_column_type, column_type),
    is_required = COALESCE(p_is_required, is_required),
    default_value = COALESCE(p_default_value, default_value),
    relation_config = COALESCE(p_relation_config, relation_config),
    rollup_config = COALESCE(p_rollup_config, rollup_config),
    formula_config = COALESCE(p_formula_config, formula_config),
    lookup_config = COALESCE(p_lookup_config, lookup_config),
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO updated_schema;
  
  RETURN updated_schema;
END;
$$;


CREATE OR REPLACE FUNCTION public.reorder_columns(
  p_database_id UUID,
  p_column_order UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  col_id UUID;
  idx INTEGER;
BEGIN
  FOR idx IN 1..array_length(p_column_order, 1) LOOP
    col_id := p_column_order[idx];
    UPDATE public.table_schemas
    SET position = idx
    WHERE id = col_id AND database_id = p_database_id;
  END LOOP;
  
  RETURN true;
END;
$$;

-- ==========================================
-- RPC FUNCTIONS: TABLE DATA
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_table_data(
  p_database_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_sort_column TEXT DEFAULT NULL,
  p_sort_direction TEXT DEFAULT 'asc'
)
RETURNS TABLE(
  id UUID,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total FROM public.table_data WHERE database_id = p_database_id;
  
  RETURN QUERY
  SELECT 
    td.id,
    td.data,
    td.created_at,
    td.updated_at,
    total
  FROM public.table_data td
  WHERE td.database_id = p_database_id
  ORDER BY 
    CASE WHEN p_sort_column IS NOT NULL AND p_sort_direction = 'asc' 
      THEN td.data->>p_sort_column END ASC,
    CASE WHEN p_sort_column IS NOT NULL AND p_sort_direction = 'desc' 
      THEN td.data->>p_sort_column END DESC,
    td.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


CREATE OR REPLACE FUNCTION public.update_table_row(
  p_id UUID,
  p_data JSONB
)
RETURNS public.table_data
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.table_data;
BEGIN
  UPDATE public.table_data
  SET 
    data = p_data,
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO updated_row;
  
  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_table_row(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.table_data WHERE id = p_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_insert_table_rows(
  p_database_id UUID,
  p_rows JSONB[]
)
RETURNS SETOF public.table_data
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_data JSONB;
BEGIN
  FOREACH row_data IN ARRAY p_rows LOOP
    INSERT INTO public.table_data(database_id, data)
    VALUES (p_database_id, row_data);
  END LOOP;
  
  RETURN QUERY SELECT * FROM public.table_data WHERE database_id = p_database_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_delete_table_rows(p_ids UUID[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.table_data WHERE id = ANY(p_ids);
  RETURN true;
END;
$$;


-- ==========================================
-- RPC FUNCTIONS: RELATIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.create_database_relation(
  p_source_database_id UUID,
  p_target_database_id UUID,
  p_relation_type TEXT,
  p_source_column TEXT,
  p_target_column TEXT,
  p_junction_table_id UUID DEFAULT NULL,
  p_cascade_delete BOOLEAN DEFAULT false
)
RETURNS public.database_relations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_relation public.database_relations;
BEGIN
  INSERT INTO public.database_relations(
    source_database_id, target_database_id, relation_type,
    source_column, target_column, junction_table_id, cascade_delete
  )
  VALUES (
    p_source_database_id, p_target_database_id, p_relation_type,
    p_source_column, p_target_column, p_junction_table_id, p_cascade_delete
  )
  RETURNING * INTO new_relation;
  
  RETURN new_relation;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_database_relations(p_database_id UUID)
RETURNS SETOF public.database_relations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.database_relations
  WHERE source_database_id = p_database_id OR target_database_id = p_database_id
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.delete_database_relation(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.database_relations WHERE id = p_id;
  RETURN true;
END;
$$;