-- Secure RLS Policies Migration
-- Purpose: Drop permissive public policies and add user-scoped policies
-- Date: 2025-10-16

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS public.databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.table_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.database_relations ENABLE ROW LEVEL SECURITY;

-- Drop permissive policies if they exist
DO $$
BEGIN
  -- databases
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'databases' AND policyname LIKE 'Anyone can%'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view databases" ON public.databases';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create databases" ON public.databases';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can update databases" ON public.databases';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can delete databases" ON public.databases';
  END IF;

  -- table_schemas
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'table_schemas' AND policyname LIKE 'Anyone can%'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view schemas" ON public.table_schemas';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create schemas" ON public.table_schemas';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can update schemas" ON public.table_schemas';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can delete schemas" ON public.table_schemas';
  END IF;

  -- files
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'files' AND policyname LIKE 'Anyone can%'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view files" ON public.files';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create files" ON public.files';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can update files" ON public.files';
  END IF;

  -- audit_log
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname LIKE 'Anyone can%'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view audit log" ON public.audit_log';
  END IF;

  -- database_relations
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'database_relations' AND policyname LIKE 'Anyone can%'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view relations" ON public.database_relations';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create relations" ON public.database_relations';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can update relations" ON public.database_relations';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can delete relations" ON public.database_relations';
  END IF;
END$$;

-- User-scoped policies (basic secure defaults)

-- databases: owner-based access via created_by
CREATE POLICY IF NOT EXISTS "Users can select own databases"
  ON public.databases FOR SELECT USING (created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert own databases"
  ON public.databases FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own databases"
  ON public.databases FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete own databases"
  ON public.databases FOR DELETE USING (created_by = auth.uid());

-- table_schemas: access through parent database ownership
CREATE POLICY IF NOT EXISTS "Users can manage schemas of own databases"
  ON public.table_schemas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.databases d
      WHERE d.id = table_schemas.database_id AND d.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.databases d
      WHERE d.id = table_schemas.database_id AND d.created_by = auth.uid()
    )
  );

-- files: access via related database
CREATE POLICY IF NOT EXISTS "Users can manage files of own databases"
  ON public.files FOR ALL
  USING (
    files.database_id IS NULL OR EXISTS (
      SELECT 1 FROM public.databases d
      WHERE d.id = files.database_id AND d.created_by = auth.uid()
    )
  )
  WITH CHECK (
    files.database_id IS NULL OR EXISTS (
      SELECT 1 FROM public.databases d
      WHERE d.id = files.database_id AND d.created_by = auth.uid()
    )
  );

-- relations: manage only within own databases
CREATE POLICY IF NOT EXISTS "Users can manage relations of own databases"
  ON public.database_relations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.databases d
      WHERE d.id = database_relations.source_database_id AND d.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.databases d
      WHERE d.id = database_relations.source_database_id AND d.created_by = auth.uid()
    )
  );

-- audit_log: users can read entries they created
CREATE POLICY IF NOT EXISTS "Users can read own audit log"
  ON public.audit_log FOR SELECT USING (user_id = auth.uid());
