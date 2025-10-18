-- Fix remaining Function Search Path Mutable warnings
-- Add SET search_path to all remaining SECURITY DEFINER functions

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix create_database
CREATE OR REPLACE FUNCTION public.create_database(name text, user_id uuid, description text DEFAULT NULL::text, icon text DEFAULT NULL::text, color text DEFAULT NULL::text)
RETURNS databases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
declare
  new_db public.databases;
begin
  insert into public.databases(name, description, icon, color, user_id)
  values (name, description, icon, color, user_id)
  returning * into new_db;
  return new_db;
end;
$function$;

-- Fix create_project
CREATE OR REPLACE FUNCTION public.create_project(p_name text, p_user_id uuid, p_description text DEFAULT NULL::text, p_icon text DEFAULT '📁'::text, p_color text DEFAULT '#94A3B8'::text)
RETURNS projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  new_project public.projects;
BEGIN
  INSERT INTO public.projects(name, user_id, description, icon, color)
  VALUES (p_name, p_user_id, p_description, p_icon, p_color)
  RETURNING * INTO new_project;
  
  RETURN new_project;
END;
$function$;

-- Fix update_project
CREATE OR REPLACE FUNCTION public.update_project(p_id uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_icon text DEFAULT NULL::text, p_color text DEFAULT NULL::text, p_is_archived boolean DEFAULT NULL::boolean)
RETURNS projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix delete_project
CREATE OR REPLACE FUNCTION public.delete_project(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.projects WHERE id = p_id;
  RETURN true;
END;
$function$;

-- Fix update_database
CREATE OR REPLACE FUNCTION public.update_database(p_id uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_icon text DEFAULT NULL::text, p_color text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[])
RETURNS databases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix delete_database
CREATE OR REPLACE FUNCTION public.delete_database(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.databases WHERE id = p_id;
  RETURN true;
END;
$function$;

-- Fix clear_database_data
CREATE OR REPLACE FUNCTION public.clear_database_data(p_database_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.table_data WHERE database_id = p_database_id;
  RETURN true;
END;
$function$;

-- Fix create_table_schema
CREATE OR REPLACE FUNCTION public.create_table_schema(p_database_id uuid, p_column_name text, p_column_type text, p_is_required boolean DEFAULT false, p_default_value jsonb DEFAULT NULL::jsonb, p_position integer DEFAULT 0, p_relation_config jsonb DEFAULT NULL::jsonb, p_rollup_config jsonb DEFAULT NULL::jsonb, p_formula_config jsonb DEFAULT NULL::jsonb, p_lookup_config jsonb DEFAULT NULL::jsonb)
RETURNS table_schemas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix update_table_schema
CREATE OR REPLACE FUNCTION public.update_table_schema(p_id uuid, p_column_name text DEFAULT NULL::text, p_column_type text DEFAULT NULL::text, p_is_required boolean DEFAULT NULL::boolean, p_default_value jsonb DEFAULT NULL::jsonb, p_relation_config jsonb DEFAULT NULL::jsonb, p_rollup_config jsonb DEFAULT NULL::jsonb, p_formula_config jsonb DEFAULT NULL::jsonb, p_lookup_config jsonb DEFAULT NULL::jsonb)
RETURNS table_schemas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix delete_table_schema
CREATE OR REPLACE FUNCTION public.delete_table_schema(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.table_schemas WHERE id = p_id;
  RETURN true;
END;
$function$;

-- Fix reorder_columns
CREATE OR REPLACE FUNCTION public.reorder_columns(p_database_id uuid, p_column_order uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix get_table_data
CREATE OR REPLACE FUNCTION public.get_table_data(p_database_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_sort_column text DEFAULT NULL::text, p_sort_direction text DEFAULT 'asc'::text)
RETURNS TABLE(id uuid, data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix insert_table_row
CREATE OR REPLACE FUNCTION public.insert_table_row(p_database_id uuid, p_data jsonb)
RETURNS table_data
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  new_row public.table_data;
BEGIN
  INSERT INTO public.table_data(database_id, data)
  VALUES (p_database_id, p_data)
  RETURNING * INTO new_row;
  
  RETURN new_row;
END;
$function$;

-- Fix update_table_row
CREATE OR REPLACE FUNCTION public.update_table_row(p_id uuid, p_data jsonb)
RETURNS table_data
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix delete_table_row
CREATE OR REPLACE FUNCTION public.delete_table_row(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.table_data WHERE id = p_id;
  RETURN true;
END;
$function$;

-- Fix bulk_insert_table_rows
CREATE OR REPLACE FUNCTION public.bulk_insert_table_rows(p_database_id uuid, p_rows jsonb[])
RETURNS SETOF table_data
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  row_data JSONB;
BEGIN
  FOREACH row_data IN ARRAY p_rows LOOP
    INSERT INTO public.table_data(database_id, data)
    VALUES (p_database_id, row_data);
  END LOOP;
  
  RETURN QUERY SELECT * FROM public.table_data WHERE database_id = p_database_id;
END;
$function$;

-- Fix bulk_delete_table_rows
CREATE OR REPLACE FUNCTION public.bulk_delete_table_rows(p_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.table_data WHERE id = ANY(p_ids);
  RETURN true;
END;
$function$;

-- Fix create_database_relation
CREATE OR REPLACE FUNCTION public.create_database_relation(p_source_database_id uuid, p_target_database_id uuid, p_relation_type text, p_source_column text, p_target_column text, p_junction_table_id uuid DEFAULT NULL::uuid, p_cascade_delete boolean DEFAULT false)
RETURNS database_relations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Fix delete_database_relation
CREATE OR REPLACE FUNCTION public.delete_database_relation(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.database_relations WHERE id = p_id;
  RETURN true;
END;
$function$;