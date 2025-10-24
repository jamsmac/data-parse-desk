-- ============================================================================
-- CRITICAL MANUAL MIGRATION FOR PRODUCTION
-- Apply this via Supabase SQL Editor if automated migration fails
-- Date: 2025-10-25
-- ============================================================================

-- This migration combines 3 critical fixes:
-- 1. RLS Security Fix (20251022000007)
-- 2. Performance Indexes (20251025000001)
-- 3. Structure Sync (if needed)

BEGIN;

-- ============================================================================
-- PART 1: FIX INSECURE RLS POLICIES (SECURITY CRITICAL)
-- ============================================================================

-- Step 1.1: Drop all insecure policies
DO $$
BEGIN
  -- Databases table
  DROP POLICY IF EXISTS "Anyone can view databases" ON public.databases;
  DROP POLICY IF EXISTS "Anyone can create databases" ON public.databases;
  DROP POLICY IF EXISTS "Anyone can update databases" ON public.databases;
  DROP POLICY IF EXISTS "Anyone can delete databases" ON public.databases;

  -- Table Schemas
  DROP POLICY IF EXISTS "Anyone can view schemas" ON public.table_schemas;
  DROP POLICY IF EXISTS "Anyone can create schemas" ON public.table_schemas;
  DROP POLICY IF EXISTS "Anyone can update schemas" ON public.table_schemas;
  DROP POLICY IF EXISTS "Anyone can delete schemas" ON public.table_schemas;

  -- Files
  DROP POLICY IF EXISTS "Anyone can view files" ON public.files;
  DROP POLICY IF EXISTS "Anyone can create files" ON public.files;
  DROP POLICY IF EXISTS "Anyone can update files" ON public.files;

  -- Database Relations
  DROP POLICY IF EXISTS "Anyone can view relations" ON public.database_relations;
  DROP POLICY IF EXISTS "Anyone can create relations" ON public.database_relations;
  DROP POLICY IF EXISTS "Anyone can update relations" ON public.database_relations;
  DROP POLICY IF EXISTS "Anyone can delete relations" ON public.database_relations;

  RAISE NOTICE 'Dropped insecure RLS policies';
END $$;

-- Step 1.2: Create secure policies for databases
CREATE POLICY "Users can view their databases"
  ON public.databases FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = databases.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own databases"
  ON public.databases FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own databases"
  ON public.databases FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = databases.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete their own databases"
  ON public.databases FOR DELETE
  USING (auth.uid() = created_by);

-- Step 1.3: Enable RLS on all tables
ALTER TABLE public.databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_relations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: ADD PERFORMANCE INDEXES
-- ============================================================================

-- Index 1: table_data composite (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'table_data') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_table_data_db_time
      ON table_data(database_id, created_at DESC);
    RAISE NOTICE 'Created idx_table_data_db_time';
  END IF;
END $$;

-- Index 2: table_data JSON GIN (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'table_data') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_table_data_json
      ON table_data USING GIN (data);
    RAISE NOTICE 'Created idx_table_data_json';
  END IF;
END $$;

-- Index 3: project_members composite (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_members') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_members_composite
      ON project_members(project_id, user_id);
    RAISE NOTICE 'Created idx_project_members_composite';
  END IF;
END $$;

-- Index 4: api_usage time-series (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_usage') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_time
      ON api_usage(created_at DESC) WHERE created_at IS NOT NULL;
    RAISE NOTICE 'Created idx_api_usage_time';
  END IF;
END $$;

-- ============================================================================
-- PART 3: UPDATE STATISTICS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'table_data') THEN
    ANALYZE table_data;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_members') THEN
    ANALYZE project_members;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_usage') THEN
    ANALYZE api_usage;
  END IF;

  RAISE NOTICE 'Statistics updated';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================

-- Check RLS is enabled
SELECT
  tablename,
  row_security_active as rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('databases', 'table_schemas', 'files', 'database_relations')
ORDER BY tablename;

-- Check indexes created
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND indexname IN (
    'idx_table_data_db_time',
    'idx_table_data_json',
    'idx_project_members_composite',
    'idx_api_usage_time'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Critical migration completed successfully!';
  RAISE NOTICE '   - RLS policies secured';
  RAISE NOTICE '   - Performance indexes created';
  RAISE NOTICE '   - Statistics updated';
END $$;
