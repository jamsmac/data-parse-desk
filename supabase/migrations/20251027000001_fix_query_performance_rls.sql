-- ============================================================================
-- Migration: Fix query_performance_log RLS
-- Priority: CRITICAL
-- Issue: Any authenticated user can read other users' performance metrics
-- Date: 2025-10-27
-- ============================================================================

-- Add RLS policies for query_performance_log
CREATE POLICY "Users can view own performance logs"
  ON public.query_performance_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert performance logs"
  ON public.query_performance_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add index for RLS performance
CREATE INDEX IF NOT EXISTS idx_query_performance_log_user_id
  ON public.query_performance_log(user_id, created_at DESC);

COMMENT ON POLICY "Users can view own performance logs"
  ON public.query_performance_log IS
  'Users can only view their own query performance metrics';

COMMENT ON POLICY "Service role can insert performance logs"
  ON public.query_performance_log IS
  'Users can insert performance logs only for themselves';

-- ============================================================================
-- VERIFICATION TESTS
-- ============================================================================

-- Test 1: Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'query_performance_log'
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on query_performance_log';
  END IF;

  RAISE NOTICE '✅ RLS is enabled on query_performance_log';
END $$;

-- Test 2: Verify policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'query_performance_log'
    AND policyname = 'Users can view own performance logs'
  ) THEN
    RAISE EXCEPTION 'SELECT policy not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'query_performance_log'
    AND policyname = 'Service role can insert performance logs'
  ) THEN
    RAISE EXCEPTION 'INSERT policy not found';
  END IF;

  RAISE NOTICE '✅ All RLS policies created successfully';
END $$;

-- Test 3: Verify index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'query_performance_log'
    AND indexname = 'idx_query_performance_log_user_id'
  ) THEN
    RAISE EXCEPTION 'Performance index not found';
  END IF;

  RAISE NOTICE '✅ Performance index created successfully';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

RAISE NOTICE '
==============================================================================
✅ Migration 20251027000001 completed successfully

Changes:
- Added RLS policy for SELECT (own data only)
- Added RLS policy for INSERT (own data only)
- Added performance index on (user_id, created_at)

Security improvement: Users can no longer view other users'' performance logs
==============================================================================
';
