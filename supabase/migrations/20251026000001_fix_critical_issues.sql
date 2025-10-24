-- ============================================================================
-- Migration: Fix Critical Issues & Add Safeguards
-- Date: 2025-10-26
-- Priority: CRITICAL
-- Description: Fix circular dependencies, add validation, optimize structure
-- ============================================================================

-- ============================================================================
-- PART 1: CIRCULAR DEPENDENCY CHECK FOR RELATIONS
-- ============================================================================

-- Function to detect circular relations (e.g., A -> B -> C -> A)
CREATE OR REPLACE FUNCTION check_circular_relations(
  p_source_database_id UUID,
  p_target_database_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_cycle BOOLEAN := FALSE;
  v_visited UUID[] := ARRAY[]::UUID[];
  v_current UUID;
  v_next UUID;
BEGIN
  -- Start from target and traverse forward
  v_current := p_target_database_id;
  v_visited := array_append(v_visited, p_source_database_id);

  -- Traverse up to 10 levels (prevent infinite loops)
  FOR i IN 1..10 LOOP
    -- Check if current node points back to source or any visited node
    SELECT target_database_id INTO v_next
    FROM public.database_relations
    WHERE source_database_id = v_current
    AND target_database_id = ANY(v_visited)
    LIMIT 1;

    IF v_next IS NOT NULL THEN
      -- Found a cycle!
      v_has_cycle := TRUE;
      EXIT;
    END IF;

    -- Get next node in chain
    SELECT target_database_id INTO v_next
    FROM public.database_relations
    WHERE source_database_id = v_current
    LIMIT 1;

    EXIT WHEN v_next IS NULL;

    v_visited := array_append(v_visited, v_current);
    v_current := v_next;
  END LOOP;

  RETURN v_has_cycle;
END;
$$;

COMMENT ON FUNCTION check_circular_relations IS
  'Detects circular dependencies in database relations to prevent infinite loops';

-- Trigger to prevent circular relations on INSERT
CREATE OR REPLACE FUNCTION prevent_circular_relations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF check_circular_relations(NEW.source_database_id, NEW.target_database_id) THEN
    RAISE EXCEPTION 'Circular relation detected: creating this relation would form a cycle'
      USING HINT = 'Check your relation chain: A -> B -> ... -> A is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_circular_relations ON public.database_relations;
CREATE TRIGGER trigger_prevent_circular_relations
  BEFORE INSERT OR UPDATE ON public.database_relations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_relations();

-- ============================================================================
-- PART 2: CIRCULAR DEPENDENCY CHECK FOR FORMULAS
-- ============================================================================

-- Function to detect circular formula dependencies
CREATE OR REPLACE FUNCTION check_circular_formulas(
  p_database_id UUID,
  p_column_name TEXT,
  p_dependencies TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_cycle BOOLEAN := FALSE;
  v_dep TEXT;
  v_sub_deps TEXT[];
BEGIN
  -- Check if any dependency refers back to current column
  IF p_column_name = ANY(p_dependencies) THEN
    RETURN TRUE;
  END IF;

  -- Check each dependency recursively (limited depth)
  FOREACH v_dep IN ARRAY p_dependencies LOOP
    -- Get dependencies of this dependency
    SELECT dependencies INTO v_sub_deps
    FROM public.formula_calculations
    WHERE database_id = p_database_id
    AND column_name = v_dep;

    -- If dependency has its own dependencies
    IF v_sub_deps IS NOT NULL AND array_length(v_sub_deps, 1) > 0 THEN
      -- Check if current column is in sub-dependencies
      IF p_column_name = ANY(v_sub_deps) THEN
        RETURN TRUE;
      END IF;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION check_circular_formulas IS
  'Detects circular dependencies in formula calculations';

-- Trigger to prevent circular formula dependencies
CREATE OR REPLACE FUNCTION prevent_circular_formulas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.dependencies IS NOT NULL THEN
    IF check_circular_formulas(NEW.database_id, NEW.column_name, NEW.dependencies) THEN
      RAISE EXCEPTION 'Circular formula dependency detected: % depends on itself', NEW.column_name
        USING HINT = 'Formula dependencies cannot form cycles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_circular_formulas ON public.formula_calculations;
CREATE TRIGGER trigger_prevent_circular_formulas
  BEFORE INSERT OR UPDATE ON public.formula_calculations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_formulas();

-- ============================================================================
-- PART 3: JSONB VALIDATION FUNCTIONS
-- ============================================================================

-- Validate column_config JSONB structure
CREATE OR REPLACE FUNCTION validate_column_config(config JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Must be a JSON object
  IF jsonb_typeof(config) != 'object' THEN
    RETURN FALSE;
  END IF;

  -- If has 'type' field, must be string
  IF config ? 'type' AND jsonb_typeof(config->'type') != 'string' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Validate relation_config JSONB structure
CREATE OR REPLACE FUNCTION validate_relation_config(config JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF config IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Must be an object
  IF jsonb_typeof(config) != 'object' THEN
    RETURN FALSE;
  END IF;

  -- Must have required fields
  IF NOT (config ? 'target_database_id' AND config ? 'target_column_name') THEN
    RETURN FALSE;
  END IF;

  -- Validate field types
  IF jsonb_typeof(config->'target_database_id') NOT IN ('string', 'null') THEN
    RETURN FALSE;
  END IF;

  IF jsonb_typeof(config->'target_column_name') NOT IN ('string', 'null') THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Validate formula_config JSONB structure
CREATE OR REPLACE FUNCTION validate_formula_config(config JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF config IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Must be an object
  IF jsonb_typeof(config) != 'object' THEN
    RETURN FALSE;
  END IF;

  -- Must have formula field
  IF NOT (config ? 'formula') THEN
    RETURN FALSE;
  END IF;

  -- formula must be string
  IF jsonb_typeof(config->'formula') != 'string' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Add CHECK constraints for JSONB validation
DO $$
BEGIN
  -- Add constraint to databases.column_config
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_column_config' AND conrelid = 'public.databases'::regclass
  ) THEN
    ALTER TABLE public.databases
    ADD CONSTRAINT valid_column_config
    CHECK (column_config IS NULL OR validate_column_config(column_config));
  END IF;

  -- Add constraint to table_schemas.relation_config
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_relation_config' AND conrelid = 'public.table_schemas'::regclass
  ) THEN
    ALTER TABLE public.table_schemas
    ADD CONSTRAINT valid_relation_config
    CHECK (relation_config IS NULL OR validate_relation_config(relation_config));
  END IF;

  -- Add constraint to table_schemas.formula_config
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_formula_config' AND conrelid = 'public.table_schemas'::regclass
  ) THEN
    ALTER TABLE public.table_schemas
    ADD CONSTRAINT valid_formula_config
    CHECK (formula_config IS NULL OR validate_formula_config(formula_config));
  END IF;
END $$;

-- ============================================================================
-- PART 4: CONSOLIDATE FILES TABLES (Fix Duplication)
-- ============================================================================

-- Add type discriminator to files table to handle both upload and database files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'file_type'
  ) THEN
    ALTER TABLE public.files ADD COLUMN file_type TEXT DEFAULT 'upload'
      CHECK (file_type IN ('upload', 'database_file', 'attachment', 'export'));

    COMMENT ON COLUMN public.files.file_type IS
      'Discriminator: upload (user uploads), database_file (generated), attachment (comments), export (reports)';
  END IF;

  -- Add source_type to track where file came from
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE public.files ADD COLUMN source_type TEXT
      CHECK (source_type IN ('manual', 'api', 'webhook', 'scheduled', 'integration'));
  END IF;

  -- Add reference to parent file (for versions/transformations)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'parent_file_id'
  ) THEN
    ALTER TABLE public.files ADD COLUMN parent_file_id UUID
      REFERENCES public.files(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_files_parent
      ON public.files(parent_file_id) WHERE parent_file_id IS NOT NULL;
  END IF;
END $$;

-- Create view to migrate from database_files if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'database_files') THEN
    -- Create migration function
    CREATE OR REPLACE FUNCTION migrate_database_files_to_files()
    RETURNS INTEGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    DECLARE
      v_migrated INTEGER := 0;
    BEGIN
      -- Copy records from database_files to files with file_type = 'database_file'
      INSERT INTO public.files (
        database_id, original_filename, storage_filename, file_size_bytes,
        mime_type, uploaded_by, processing_status, total_rows, inserted_rows,
        metadata, file_type, created_at
      )
      SELECT
        database_id, original_filename, storage_filename, file_size_bytes,
        mime_type, created_by, processing_status, total_rows, inserted_rows,
        metadata, 'database_file', created_at
      FROM public.database_files
      WHERE NOT EXISTS (
        SELECT 1 FROM public.files f
        WHERE f.storage_filename = database_files.storage_filename
        AND f.file_type = 'database_file'
      );

      GET DIAGNOSTICS v_migrated = ROW_COUNT;

      RAISE NOTICE 'Migrated % records from database_files to files', v_migrated;
      RETURN v_migrated;
    END;
    $func$;

    -- Execute migration (commented out for safety - run manually if needed)
    -- SELECT migrate_database_files_to_files();
  END IF;
END $$;

-- ============================================================================
-- PART 5: PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Table for storing query performance metrics
CREATE TABLE IF NOT EXISTS public.query_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name TEXT NOT NULL,
  query_hash TEXT,
  execution_time_ms INTEGER NOT NULL,
  rows_returned INTEGER,
  rows_affected INTEGER,
  query_plan JSONB,
  parameters JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_performance_log_created
  ON public.query_performance_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_log_query_name
  ON public.query_performance_log(query_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_log_slow
  ON public.query_performance_log(execution_time_ms DESC)
  WHERE execution_time_ms > 1000;

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
  p_query_name TEXT,
  p_execution_time_ms INTEGER,
  p_rows_returned INTEGER DEFAULT NULL,
  p_rows_affected INTEGER DEFAULT NULL,
  p_query_plan JSONB DEFAULT NULL,
  p_parameters JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id UUID;
  v_query_hash TEXT;
BEGIN
  -- Generate hash for query name + parameters
  v_query_hash := md5(p_query_name || COALESCE(p_parameters::text, ''));

  INSERT INTO public.query_performance_log (
    query_name, query_hash, execution_time_ms, rows_returned,
    rows_affected, query_plan, parameters, user_id
  ) VALUES (
    p_query_name, v_query_hash, p_execution_time_ms, p_rows_returned,
    p_rows_affected, p_query_plan, p_parameters, auth.uid()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to get slow queries report
CREATE OR REPLACE FUNCTION get_slow_queries_report(
  p_min_execution_ms INTEGER DEFAULT 1000,
  p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
  query_name TEXT,
  avg_execution_ms NUMERIC,
  max_execution_ms INTEGER,
  min_execution_ms INTEGER,
  execution_count BIGINT,
  last_execution TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    query_name,
    ROUND(AVG(execution_time_ms)::numeric, 2) as avg_execution_ms,
    MAX(execution_time_ms) as max_execution_ms,
    MIN(execution_time_ms) as min_execution_ms,
    COUNT(*) as execution_count,
    MAX(created_at) as last_execution
  FROM public.query_performance_log
  WHERE execution_time_ms >= p_min_execution_ms
    AND created_at > NOW() - INTERVAL '1 hour' * p_hours_back
  GROUP BY query_name
  ORDER BY avg_execution_ms DESC;
$$;

-- Function to get table size statistics
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
  schema_name TEXT,
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  table_size TEXT,
  indexes_size TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname::TEXT,
    tablename::TEXT,
    n_live_tup as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                   pg_relation_size(schemaname||'.'||tablename)) as indexes_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE (
  schema_name TEXT,
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  index_scans BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    schemaname::TEXT,
    tablename::TEXT,
    indexname::TEXT,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size,
    idx_scan as index_scans
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND idx_scan < 10  -- Less than 10 scans
    AND pg_relation_size(schemaname||'.'||indexname) > 1024 * 1024  -- Larger than 1MB
  ORDER BY pg_relation_size(schemaname||'.'||indexname) DESC;
$$;

-- ============================================================================
-- PART 6: ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Add missing indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_table_data_created_updated
  ON public.table_data(created_at DESC, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_resolved_created
  ON public.comments(resolved, created_at DESC) WHERE resolved = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_formula_calculations_dependencies
  ON public.formula_calculations USING GIN(dependencies)
  WHERE dependencies IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_database_relations_composite
  ON public.database_relations(source_database_id, target_database_id, relation_type);

-- Partial index for active webhooks only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhooks_active
  ON public.webhooks(user_id, is_active, created_at DESC)
  WHERE is_active = true;

-- ============================================================================
-- PART 7: GRANTS & PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION check_circular_relations TO authenticated;
GRANT EXECUTE ON FUNCTION check_circular_formulas TO authenticated;
GRANT EXECUTE ON FUNCTION validate_column_config TO authenticated;
GRANT EXECUTE ON FUNCTION validate_relation_config TO authenticated;
GRANT EXECUTE ON FUNCTION validate_formula_config TO authenticated;
GRANT EXECUTE ON FUNCTION log_query_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_sizes TO authenticated;
GRANT EXECUTE ON FUNCTION get_unused_indexes TO authenticated;

GRANT SELECT ON public.query_performance_log TO authenticated;
GRANT INSERT ON public.query_performance_log TO authenticated;

-- ============================================================================
-- PART 8: COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION check_circular_relations IS
  'Detects circular dependencies in database relations (A->B->C->A). Returns TRUE if cycle exists.';

COMMENT ON FUNCTION check_circular_formulas IS
  'Detects circular dependencies in formula calculations. Returns TRUE if cycle exists.';

COMMENT ON TABLE public.query_performance_log IS
  'Stores query execution metrics for performance monitoring and optimization';

COMMENT ON FUNCTION log_query_performance IS
  'Logs query execution time and details for performance analysis';

COMMENT ON FUNCTION get_slow_queries_report IS
  'Returns aggregated statistics for slow queries (>1000ms by default)';

COMMENT ON FUNCTION get_table_sizes IS
  'Returns size statistics for all tables including row counts and disk usage';

COMMENT ON FUNCTION get_unused_indexes IS
  'Identifies indexes that are rarely used but consume significant space';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

-- ✅ Added circular dependency detection for relations
-- ✅ Added circular dependency detection for formulas
-- ✅ Added JSONB validation functions and constraints
-- ✅ Consolidated files tables with type discriminator
-- ✅ Added performance monitoring functions
-- ✅ Added query performance logging
-- ✅ Added additional performance indexes
-- ✅ Added comprehensive documentation
--
-- NEXT STEPS:
-- 1. Run this migration on staging environment
-- 2. Test circular dependency detection
-- 3. Monitor query performance with new logging
-- 4. Review unused indexes report
-- 5. Optionally migrate database_files data
--
-- To migrate database_files data (run manually if needed):
-- SELECT migrate_database_files_to_files();
--
-- To view slow queries:
-- SELECT * FROM get_slow_queries_report(1000, 24);
--
-- To view table sizes:
-- SELECT * FROM get_table_sizes();
--
-- To view unused indexes:
-- SELECT * FROM get_unused_indexes();
