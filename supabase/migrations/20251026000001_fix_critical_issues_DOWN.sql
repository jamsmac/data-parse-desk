-- ============================================================================
-- Migration Rollback: Fix Critical Issues & Add Safeguards
-- Date: 2025-10-26
-- Type: DOWN (Rollback)
-- Description: Rollback changes from 20251026000001_fix_critical_issues.sql
-- ============================================================================

-- IMPORTANT: Run this migration to rollback changes if needed
-- This is a DESTRUCTIVE operation - make sure you have backups!

-- ============================================================================
-- PART 8: Remove additional performance indexes (reverse order)
-- ============================================================================

DROP INDEX CONCURRENTLY IF EXISTS public.idx_webhooks_active;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_database_relations_composite;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_formula_calculations_dependencies;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_comments_resolved_created;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_table_data_created_updated;

-- ============================================================================
-- PART 7: Revoke grants & permissions
-- ============================================================================

REVOKE EXECUTE ON FUNCTION check_circular_relations FROM authenticated;
REVOKE EXECUTE ON FUNCTION check_circular_formulas FROM authenticated;
REVOKE EXECUTE ON FUNCTION validate_column_config FROM authenticated;
REVOKE EXECUTE ON FUNCTION validate_relation_config FROM authenticated;
REVOKE EXECUTE ON FUNCTION validate_formula_config FROM authenticated;
REVOKE EXECUTE ON FUNCTION log_query_performance FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_slow_queries_report FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_table_sizes FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_unused_indexes FROM authenticated;

REVOKE SELECT ON public.query_performance_log FROM authenticated;
REVOKE INSERT ON public.query_performance_log FROM authenticated;

-- ============================================================================
-- PART 5: Drop performance monitoring functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_unused_indexes();
DROP FUNCTION IF EXISTS public.get_table_sizes();
DROP FUNCTION IF EXISTS public.get_slow_queries_report(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.log_query_performance(TEXT, INTEGER, INTEGER, INTEGER, JSONB, JSONB);

-- Drop performance log table
DROP TABLE IF EXISTS public.query_performance_log CASCADE;

-- ============================================================================
-- PART 4: Rollback files table consolidation
-- ============================================================================

-- Remove new columns added to files table
ALTER TABLE public.files DROP COLUMN IF EXISTS parent_file_id;
ALTER TABLE public.files DROP COLUMN IF EXISTS source_type;
ALTER TABLE public.files DROP COLUMN IF EXISTS file_type;

-- Drop migration function if exists
DROP FUNCTION IF EXISTS migrate_database_files_to_files();

-- Note: This does NOT restore database_files table
-- If you need to restore it, you must do so from backup

-- ============================================================================
-- PART 3: Remove JSONB validation constraints
-- ============================================================================

ALTER TABLE public.table_schemas DROP CONSTRAINT IF EXISTS valid_formula_config;
ALTER TABLE public.table_schemas DROP CONSTRAINT IF EXISTS valid_relation_config;
ALTER TABLE public.databases DROP CONSTRAINT IF EXISTS valid_column_config;

-- Drop validation functions
DROP FUNCTION IF EXISTS validate_formula_config(JSONB);
DROP FUNCTION IF EXISTS validate_relation_config(JSONB);
DROP FUNCTION IF EXISTS validate_column_config(JSONB);

-- ============================================================================
-- PART 2: Remove circular formula dependency checks
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_prevent_circular_formulas ON public.formula_calculations;
DROP FUNCTION IF EXISTS prevent_circular_formulas();
DROP FUNCTION IF EXISTS check_circular_formulas(UUID, TEXT, TEXT[]);

-- ============================================================================
-- PART 1: Remove circular relation dependency checks
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_prevent_circular_relations ON public.database_relations;
DROP FUNCTION IF EXISTS prevent_circular_relations();
DROP FUNCTION IF EXISTS check_circular_relations(UUID, UUID);

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- ✅ All changes from 20251026000001_fix_critical_issues.sql have been rolled back
-- ⚠️  WARNING: This rollback does NOT:
--    - Restore database_files table (if it existed)
--    - Restore any data that was migrated
--    - Remove data from query_performance_log (if any was created)
--
-- If you need to restore from backup, do so now before running new migrations.
