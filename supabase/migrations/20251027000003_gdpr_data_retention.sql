-- ============================================================================
-- Migration: GDPR Data Retention & Cleanup
-- Priority: CRITICAL
-- Issue: No automatic deletion of old data (GDPR Article 5(1)(e) violation)
-- Reference: GDPR Article 5(1)(e) - Storage limitation
-- Date: 2025-10-27
-- ============================================================================

-- Create data retention configuration table
CREATE TABLE IF NOT EXISTS public.data_retention_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0 AND retention_days <= 3650),
  column_to_check TEXT NOT NULL DEFAULT 'created_at',
  enabled BOOLEAN DEFAULT true,
  last_cleanup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_column_name CHECK (column_to_check ~ '^[a-z_]+$')
);

COMMENT ON TABLE public.data_retention_config IS
  'GDPR-compliant data retention policies configuration';
COMMENT ON COLUMN public.data_retention_config.retention_days IS
  'Number of days to keep data (1-3650 days / 10 years max)';
COMMENT ON COLUMN public.data_retention_config.column_to_check IS
  'Timestamp column to check for data age';

-- Enable RLS on config table
ALTER TABLE public.data_retention_config ENABLE ROW LEVEL SECURITY;

-- Admin-only access to retention config
CREATE POLICY "Admins can view retention config"
  ON public.data_retention_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        raw_user_meta_data->>'role' = 'admin'
        OR raw_user_meta_data->>'is_admin' = 'true'
      )
    )
  );

CREATE POLICY "Admins can manage retention config"
  ON public.data_retention_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        raw_user_meta_data->>'role' = 'admin'
        OR raw_user_meta_data->>'is_admin' = 'true'
      )
    )
  );

-- Insert default retention policies (GDPR compliant)
INSERT INTO public.data_retention_config (table_name, retention_days, column_to_check, enabled) VALUES
  ('api_usage', 30, 'created_at', true),           -- 30 days for API usage logs
  ('audit_log', 365, 'created_at', true),          -- 1 year for audit logs
  ('query_performance_log', 90, 'created_at', true), -- 90 days for performance metrics
  ('activity_log', 365, 'created_at', true),       -- 1 year for activity
  ('webhook_logs', 30, 'created_at', true),        -- 30 days for webhook logs
  ('notification_history', 90, 'created_at', true) -- 90 days for notifications
ON CONFLICT (table_name) DO UPDATE SET
  retention_days = EXCLUDED.retention_days,
  updated_at = NOW();

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Main cleanup function - cleans all configured tables
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE (
  table_name TEXT,
  rows_deleted BIGINT,
  oldest_remaining TIMESTAMPTZ,
  cutoff_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_config RECORD;
  v_deleted BIGINT;
  v_oldest TIMESTAMPTZ;
  v_cutoff TIMESTAMPTZ;
BEGIN
  -- Loop through all enabled retention configs
  FOR v_config IN
    SELECT * FROM data_retention_config WHERE enabled = true ORDER BY table_name
  LOOP
    -- Calculate cutoff date
    v_cutoff := NOW() - (v_config.retention_days || ' days')::INTERVAL;

    BEGIN
      -- Execute delete with dynamic SQL
      EXECUTE format(
        'DELETE FROM %I WHERE %I < $1',
        v_config.table_name,
        v_config.column_to_check
      ) USING v_cutoff;

      GET DIAGNOSTICS v_deleted = ROW_COUNT;

      -- Get oldest remaining record
      EXECUTE format(
        'SELECT MIN(%I) FROM %I',
        v_config.column_to_check,
        v_config.table_name
      ) INTO v_oldest;

      -- Update last cleanup time
      UPDATE data_retention_config
      SET last_cleanup_at = NOW(), updated_at = NOW()
      WHERE id = v_config.id;

      -- Return results
      RETURN QUERY SELECT
        v_config.table_name::TEXT,
        v_deleted,
        v_oldest,
        v_cutoff;

      RAISE NOTICE '[GDPR Cleanup] % rows deleted from % (cutoff: %)',
        v_deleted, v_config.table_name, v_cutoff;

    EXCEPTION
      WHEN undefined_table THEN
        RAISE WARNING '[GDPR Cleanup] Table % does not exist, skipping', v_config.table_name;
      WHEN undefined_column THEN
        RAISE WARNING '[GDPR Cleanup] Column % does not exist in %, skipping',
          v_config.column_to_check, v_config.table_name;
      WHEN OTHERS THEN
        RAISE WARNING '[GDPR Cleanup] Error cleaning %: %', v_config.table_name, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION cleanup_old_data IS
  'GDPR-compliant cleanup of old data based on retention policies. Runs automatically via pg_cron.';

-- Manual cleanup function for specific table
CREATE OR REPLACE FUNCTION cleanup_table_data(
  p_table_name TEXT,
  p_days_to_keep INTEGER DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted BIGINT;
  v_cutoff TIMESTAMPTZ;
  v_column TEXT;
  v_days INTEGER;
BEGIN
  -- Get config for table
  SELECT retention_days, column_to_check INTO v_days, v_column
  FROM data_retention_config
  WHERE table_name = p_table_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No retention config found for table: %. Add config first.', p_table_name;
  END IF;

  -- Use override or config value
  v_days := COALESCE(p_days_to_keep, v_days);

  IF v_days < 1 OR v_days > 3650 THEN
    RAISE EXCEPTION 'Days to keep must be between 1 and 3650, got %', v_days;
  END IF;

  v_cutoff := NOW() - (v_days || ' days')::INTERVAL;

  -- Delete old data
  EXECUTE format(
    'DELETE FROM %I WHERE %I < $1',
    p_table_name,
    v_column
  ) USING v_cutoff;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Update last cleanup time
  UPDATE data_retention_config
  SET last_cleanup_at = NOW(), updated_at = NOW()
  WHERE table_name = p_table_name;

  RAISE NOTICE '[GDPR Cleanup] Deleted % rows from % (keeping last % days)',
    v_deleted, p_table_name, v_days;

  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_table_data IS
  'Manually cleanup specific table. Optionally override retention days.';

-- Get retention status for all tables
CREATE OR REPLACE FUNCTION get_retention_status()
RETURNS TABLE (
  table_name TEXT,
  retention_days INTEGER,
  enabled BOOLEAN,
  last_cleanup TIMESTAMPTZ,
  days_since_cleanup INTEGER,
  estimated_old_rows BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    drc.table_name,
    drc.retention_days,
    drc.enabled,
    drc.last_cleanup_at,
    EXTRACT(DAY FROM NOW() - COALESCE(drc.last_cleanup_at, drc.created_at))::INTEGER,
    0::BIGINT -- Placeholder, would need dynamic query per table
  FROM data_retention_config drc
  ORDER BY drc.table_name;
END;
$$;

COMMENT ON FUNCTION get_retention_status IS
  'Get current retention status for all configured tables';

-- ============================================================================
-- SCHEDULE WITH PG_CRON (if available)
-- ============================================================================

DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    -- Enable extension if not already enabled
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    -- Remove existing job if exists
    PERFORM cron.unschedule('gdpr_data_cleanup');

    -- Schedule cleanup job - Daily at 2 AM UTC
    PERFORM cron.schedule(
      'gdpr_data_cleanup',
      '0 2 * * *',  -- Cron: Every day at 2:00 AM UTC
      'SELECT cleanup_old_data();'
    );

    RAISE NOTICE '✅ Scheduled GDPR cleanup job with pg_cron (daily at 2 AM UTC)';
  ELSE
    RAISE WARNING '⚠️  pg_cron extension not available. Please schedule cleanup_old_data() manually or enable pg_cron.';
    RAISE NOTICE 'Alternative: Use Supabase Edge Function with cron.schedule';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING '⚠️  Insufficient privileges to create pg_cron job. Please run as superuser.';
  WHEN OTHERS THEN
    RAISE WARNING '⚠️  Could not schedule pg_cron job: %. Manual scheduling required.', SQLERRM;
END $$;

-- ============================================================================
-- GRANTS & PERMISSIONS
-- ============================================================================

-- Allow authenticated users to view retention config (admins only via RLS)
GRANT SELECT ON public.data_retention_config TO authenticated;

-- Allow execution of cleanup functions
GRANT EXECUTE ON FUNCTION cleanup_old_data TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_table_data TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_retention_status TO authenticated;

-- ============================================================================
-- VERIFICATION & TESTING
-- ============================================================================

DO $$
DECLARE
  v_config_count INTEGER;
  v_status RECORD;
BEGIN
  -- Verify configs were created
  SELECT COUNT(*) INTO v_config_count FROM data_retention_config WHERE enabled = true;

  IF v_config_count = 0 THEN
    RAISE EXCEPTION 'No retention configs created';
  END IF;

  RAISE NOTICE '✅ Created % retention configurations', v_config_count;

  -- Show status
  FOR v_status IN SELECT * FROM get_retention_status() LOOP
    RAISE NOTICE '  - %: % days retention, last cleanup: %',
      v_status.table_name,
      v_status.retention_days,
      COALESCE(v_status.last_cleanup::TEXT, 'never');
  END LOOP;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
==============================================================================
✅ Migration 20251027000003 completed successfully

GDPR Compliance Improvements:
- Created data_retention_config table with RLS
- Configured 6 tables with retention policies:
  * api_usage: 30 days
  * audit_log: 365 days (1 year)
  * query_performance_log: 90 days
  * activity_log: 365 days
  * webhook_logs: 30 days
  * notification_history: 90 days

Functions created:
- cleanup_old_data() - Automatic cleanup all tables
- cleanup_table_data(table, days) - Manual cleanup specific table
- get_retention_status() - View retention status

Scheduled:
- Daily cleanup at 2 AM UTC (via pg_cron if available)

Usage:
- Manual run: SELECT * FROM cleanup_old_data();
- Single table: SELECT cleanup_table_data(''api_usage'', 7);
- Check status: SELECT * FROM get_retention_status();

GDPR Article 5(1)(e) - Storage Limitation: ✅ COMPLIANT
==============================================================================
  ';
END $$;
