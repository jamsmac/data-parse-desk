-- ============================================================================
-- Performance Monitoring Setup
-- Created: 2025-10-27
-- Documentation: PERFORMANCE_AUDIT_REPORT.md
-- ============================================================================
-- This migration enables performance monitoring extensions and creates
-- necessary tables/functions for tracking query performance
-- ============================================================================

-- 1. Enable pg_stat_statements extension for query performance tracking
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

COMMENT ON EXTENSION pg_stat_statements IS 'Track planning and execution statistics of all SQL statements executed';

-- 2. Create performance snapshots table
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_time TIMESTAMP NOT NULL DEFAULT NOW(),
  cache_hit_ratio NUMERIC(5,2),
  index_hit_ratio NUMERIC(5,2),
  active_connections INTEGER,
  idle_connections INTEGER,
  slow_query_count INTEGER,
  avg_query_time NUMERIC(10,2),
  total_db_size BIGINT,
  largest_table TEXT,
  largest_table_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_snapshots_time
  ON performance_snapshots(snapshot_time DESC);

COMMENT ON TABLE performance_snapshots IS 'Periodic snapshots of database performance metrics';

-- 3. Create performance alerts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_alerts_type
  ON performance_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_perf_alerts_severity
  ON performance_alerts(severity) WHERE NOT resolved;

CREATE INDEX IF NOT EXISTS idx_perf_alerts_time
  ON performance_alerts(created_at DESC);

COMMENT ON TABLE performance_alerts IS 'Performance alerts and warnings';

-- 4. Create function to get current performance metrics
-- ============================================================================
CREATE OR REPLACE FUNCTION get_performance_metrics()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY

  -- Cache hit ratio
  SELECT
    'cache_hit_ratio'::TEXT,
    round(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2),
    'percent'::TEXT,
    CASE
      WHEN round(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) > 99 THEN 'excellent'
      WHEN round(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) > 95 THEN 'good'
      ELSE 'poor'
    END::TEXT
  FROM pg_statio_user_tables

  UNION ALL

  -- Index hit ratio
  SELECT
    'index_hit_ratio'::TEXT,
    round(100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2),
    'percent'::TEXT,
    CASE
      WHEN round(100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2) > 99 THEN 'excellent'
      WHEN round(100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2) > 95 THEN 'good'
      ELSE 'poor'
    END::TEXT
  FROM pg_statio_user_indexes

  UNION ALL

  -- Active connections
  SELECT
    'active_connections'::TEXT,
    count(*)::NUMERIC,
    'count'::TEXT,
    CASE
      WHEN count(*) < 30 THEN 'excellent'
      WHEN count(*) < 50 THEN 'good'
      ELSE 'warning'
    END::TEXT
  FROM pg_stat_activity
  WHERE state = 'active' AND datname = current_database()

  UNION ALL

  -- Slow queries
  SELECT
    'slow_queries'::TEXT,
    count(*)::NUMERIC,
    'count'::TEXT,
    CASE
      WHEN count(*) = 0 THEN 'excellent'
      WHEN count(*) < 5 THEN 'good'
      ELSE 'warning'
    END::TEXT
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000 AND calls > 10;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_performance_metrics() IS 'Get current performance metrics with status';

-- 5. Create function to identify slow queries
-- ============================================================================
CREATE OR REPLACE FUNCTION get_slow_queries(
  threshold_ms INTEGER DEFAULT 1000,
  min_calls INTEGER DEFAULT 10
)
RETURNS TABLE (
  query_text TEXT,
  calls BIGINT,
  mean_time_ms NUMERIC,
  total_time_ms NUMERIC,
  rows_per_call NUMERIC,
  hit_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    left(query, 200) AS query_text,
    calls,
    round(mean_exec_time::NUMERIC, 2) AS mean_time_ms,
    round(total_exec_time::NUMERIC, 2) AS total_time_ms,
    round((total_exec_time / calls)::NUMERIC, 2) AS rows_per_call,
    round((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::NUMERIC, 2) AS hit_percentage
  FROM pg_stat_statements
  WHERE mean_exec_time > threshold_ms
    AND calls > min_calls
  ORDER BY total_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_slow_queries(INTEGER, INTEGER) IS 'Identify slow queries above threshold';

-- 6. Create function to get table bloat information
-- ============================================================================
CREATE OR REPLACE FUNCTION get_table_bloat()
RETURNS TABLE (
  table_name TEXT,
  live_tuples BIGINT,
  dead_tuples BIGINT,
  dead_tuple_percent NUMERIC,
  last_vacuum TIMESTAMP,
  last_autovacuum TIMESTAMP,
  needs_vacuum BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || relname AS table_name,
    n_live_tup,
    n_dead_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_percent,
    last_vacuum,
    last_autovacuum,
    (n_dead_tup > n_live_tup * 0.2 AND n_live_tup > 100) AS needs_vacuum
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY n_dead_tup DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_table_bloat() IS 'Get table bloat statistics and VACUUM recommendations';

-- 7. Create function for automated performance snapshot
-- ============================================================================
CREATE OR REPLACE FUNCTION take_performance_snapshot()
RETURNS void AS $$
BEGIN
  INSERT INTO performance_snapshots (
    cache_hit_ratio,
    index_hit_ratio,
    active_connections,
    idle_connections,
    slow_query_count,
    avg_query_time,
    total_db_size,
    largest_table,
    largest_table_size
  )
  SELECT
    -- Cache hit ratio
    round(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2),
    -- Index hit ratio
    (SELECT round(100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2)
     FROM pg_statio_user_indexes),
    -- Active connections
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND datname = current_database()),
    -- Idle connections
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle' AND datname = current_database()),
    -- Slow queries
    (SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 1000 AND calls > 10),
    -- Average query time
    (SELECT round(avg(mean_exec_time), 2) FROM pg_stat_statements),
    -- Total DB size
    pg_database_size(current_database()),
    -- Largest table
    (SELECT schemaname || '.' || tablename
     FROM pg_tables t
     JOIN pg_class c ON c.relname = t.tablename
     WHERE schemaname = 'public'
     ORDER BY pg_total_relation_size(c.oid) DESC
     LIMIT 1),
    -- Largest table size
    (SELECT pg_total_relation_size(c.oid)
     FROM pg_tables t
     JOIN pg_class c ON c.relname = t.tablename
     WHERE schemaname = 'public'
     ORDER BY pg_total_relation_size(c.oid) DESC
     LIMIT 1)
  FROM pg_statio_user_tables;

  RAISE NOTICE 'Performance snapshot taken at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION take_performance_snapshot() IS 'Take a snapshot of current performance metrics';

-- 8. Grant permissions
-- ============================================================================
GRANT SELECT ON performance_snapshots TO authenticated;
GRANT SELECT ON performance_alerts TO authenticated;

GRANT EXECUTE ON FUNCTION get_performance_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_bloat() TO authenticated;

-- Service role has full access
GRANT ALL ON performance_snapshots TO service_role;
GRANT ALL ON performance_alerts TO service_role;
GRANT EXECUTE ON FUNCTION take_performance_snapshot() TO service_role;

-- 9. Enable Row Level Security
-- ============================================================================
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read snapshots
CREATE POLICY "Users can read performance snapshots"
  ON performance_snapshots FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to read alerts
CREATE POLICY "Users can read performance alerts"
  ON performance_alerts FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access to snapshots"
  ON performance_snapshots FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to alerts"
  ON performance_alerts FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- Setup complete!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Performance monitoring enabled successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Available functions:';
  RAISE NOTICE '  - get_performance_metrics() - Current metrics with status';
  RAISE NOTICE '  - get_slow_queries() - Identify slow queries';
  RAISE NOTICE '  - get_table_bloat() - Table bloat analysis';
  RAISE NOTICE '  - take_performance_snapshot() - Manual snapshot';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Setup pg_cron for automated snapshots (see PERFORMANCE_AUTOMATION.md)';
  RAISE NOTICE '  2. Configure alerting webhooks';
  RAISE NOTICE '  3. Run: SELECT * FROM get_performance_metrics();';
END $$;
