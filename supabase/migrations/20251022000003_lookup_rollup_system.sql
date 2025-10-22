-- ============================================================================
-- Migration: Lookup and Rollup Columns System
-- Description: Automatic computation and update of Lookup and Rollup columns
-- Date: 2025-10-22
-- Priority: P0 (Critical feature - Task 1.4)
-- ============================================================================

-- ============================================================================
-- LOOKUP COLUMNS: Pull values from related tables
-- ============================================================================

-- Function: Compute Lookup value for a single record
CREATE OR REPLACE FUNCTION public.compute_lookup(
  p_source_database_id UUID,
  p_source_row_id UUID,
  p_lookup_column_name TEXT,
  p_lookup_config JSONB
)
RETURNS JSONB AS $$
DECLARE
  relation_column TEXT;
  target_column TEXT;
  foreign_id UUID;
  lookup_value JSONB;
BEGIN
  -- Extract config
  relation_column := p_lookup_config->>'relation_column';
  target_column := p_lookup_config->>'target_column';

  -- Get foreign ID from source record
  SELECT (data->>relation_column)::UUID INTO foreign_id
  FROM table_data
  WHERE database_id = p_source_database_id
    AND id = p_source_row_id;

  -- Return NULL if no foreign ID
  IF foreign_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch value from target record
  SELECT to_jsonb(data->>target_column) INTO lookup_value
  FROM table_data
  WHERE database_id = (p_lookup_config->>'target_database_id')::UUID
    AND id = foreign_id;

  RETURN lookup_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Batch compute Lookup values for multiple rows
CREATE OR REPLACE FUNCTION public.batch_compute_lookups(
  p_database_id UUID,
  p_row_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  row_id UUID,
  column_name TEXT,
  lookup_value JSONB
) AS $$
DECLARE
  lookup_col RECORD;
  computed_value JSONB;
BEGIN
  -- Get all lookup columns for this database
  FOR lookup_col IN
    SELECT
      column_name,
      lookup_config
    FROM table_schemas
    WHERE database_id = p_database_id
      AND column_type = 'lookup'
      AND lookup_config IS NOT NULL
  LOOP
    -- Compute for each row
    FOR row_id IN
      SELECT id
      FROM table_data
      WHERE database_id = p_database_id
        AND (p_row_ids IS NULL OR id = ANY(p_row_ids))
    LOOP
      computed_value := compute_lookup(
        p_database_id,
        row_id,
        lookup_col.column_name,
        lookup_col.lookup_config
      );

      column_name := lookup_col.column_name;
      lookup_value := computed_value;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Update Lookup columns in data
CREATE OR REPLACE FUNCTION public.update_lookup_columns(
  p_database_id UUID,
  p_row_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  lookup_result RECORD;
BEGIN
  -- Compute all lookup values
  FOR lookup_result IN
    SELECT * FROM batch_compute_lookups(p_database_id, p_row_ids)
  LOOP
    -- Update the data with computed lookup value
    UPDATE table_data
    SET data = jsonb_set(
      data,
      ARRAY[lookup_result.column_name],
      COALESCE(lookup_result.lookup_value, 'null'::jsonb),
      true
    )
    WHERE database_id = p_database_id
      AND id = lookup_result.row_id;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROLLUP COLUMNS: Aggregate values from related records
-- ============================================================================

-- Function: Compute Rollup aggregation for a single record
CREATE OR REPLACE FUNCTION public.compute_rollup(
  p_source_database_id UUID,
  p_source_row_id UUID,
  p_rollup_column_name TEXT,
  p_rollup_config JSONB
)
RETURNS NUMERIC AS $$
DECLARE
  relation_column TEXT;
  target_column TEXT;
  target_database_id UUID;
  aggregation TEXT;
  rollup_value NUMERIC;
  values_array NUMERIC[];
BEGIN
  -- Extract config
  relation_column := p_rollup_config->>'relation_column';
  target_column := p_rollup_config->>'target_column';
  target_database_id := (p_rollup_config->>'target_database_id')::UUID;
  aggregation := p_rollup_config->>'aggregation';

  -- For one_to_many: get all related records that reference this row
  IF p_rollup_config->>'relation_type' = 'one_to_many' THEN
    -- Collect values from related records
    SELECT array_agg((data->>target_column)::NUMERIC)
    INTO values_array
    FROM table_data
    WHERE database_id = target_database_id
      AND (data->>relation_column)::UUID = p_source_row_id
      AND data->>target_column IS NOT NULL;

  -- For many_to_one or array: get related records by IDs
  ELSE
    SELECT array_agg((data->>target_column)::NUMERIC)
    INTO values_array
    FROM table_data source
    CROSS JOIN LATERAL (
      SELECT UNNEST(
        CASE
          WHEN jsonb_typeof(source.data->relation_column) = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(source.data->relation_column))::UUID[]
          ELSE ARRAY[(source.data->>relation_column)::UUID]
        END
      ) AS foreign_id
    ) foreign_ids
    INNER JOIN table_data target
      ON target.database_id = target_database_id
      AND target.id = foreign_ids.foreign_id
    WHERE source.database_id = p_source_database_id
      AND source.id = p_source_row_id
      AND target.data->>target_column IS NOT NULL;
  END IF;

  -- Return NULL if no values
  IF values_array IS NULL OR array_length(values_array, 1) = 0 THEN
    RETURN NULL;
  END IF;

  -- Perform aggregation
  CASE aggregation
    WHEN 'count' THEN
      rollup_value := array_length(values_array, 1);
    WHEN 'sum' THEN
      SELECT SUM(val) INTO rollup_value FROM UNNEST(values_array) AS val;
    WHEN 'avg' THEN
      SELECT AVG(val) INTO rollup_value FROM UNNEST(values_array) AS val;
    WHEN 'min' THEN
      SELECT MIN(val) INTO rollup_value FROM UNNEST(values_array) AS val;
    WHEN 'max' THEN
      SELECT MAX(val) INTO rollup_value FROM UNNEST(values_array) AS val;
    WHEN 'median' THEN
      SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY val)
      INTO rollup_value
      FROM UNNEST(values_array) AS val;
    ELSE
      rollup_value := NULL;
  END CASE;

  RETURN rollup_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Batch compute Rollup values
CREATE OR REPLACE FUNCTION public.batch_compute_rollups(
  p_database_id UUID,
  p_row_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  row_id UUID,
  column_name TEXT,
  rollup_value NUMERIC
) AS $$
DECLARE
  rollup_col RECORD;
  computed_value NUMERIC;
BEGIN
  -- Get all rollup columns for this database
  FOR rollup_col IN
    SELECT
      column_name,
      rollup_config
    FROM table_schemas
    WHERE database_id = p_database_id
      AND column_type = 'rollup'
      AND rollup_config IS NOT NULL
  LOOP
    -- Compute for each row
    FOR row_id IN
      SELECT id
      FROM table_data
      WHERE database_id = p_database_id
        AND (p_row_ids IS NULL OR id = ANY(p_row_ids))
    LOOP
      computed_value := compute_rollup(
        p_database_id,
        row_id,
        rollup_col.column_name,
        rollup_col.rollup_config
      );

      column_name := rollup_col.column_name;
      rollup_value := computed_value;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Update Rollup columns in data
CREATE OR REPLACE FUNCTION public.update_rollup_columns(
  p_database_id UUID,
  p_row_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  rollup_result RECORD;
BEGIN
  -- Compute all rollup values
  FOR rollup_result IN
    SELECT * FROM batch_compute_rollups(p_database_id, p_row_ids)
  LOOP
    -- Update the data with computed rollup value
    UPDATE table_data
    SET data = jsonb_set(
      data,
      ARRAY[rollup_result.column_name],
      to_jsonb(rollup_result.rollup_value),
      true
    )
    WHERE database_id = p_database_id
      AND id = rollup_result.row_id;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Auto-update on data changes
-- ============================================================================

-- Function: Trigger to update lookup columns when source data changes
CREATE OR REPLACE FUNCTION public.trigger_update_lookups()
RETURNS TRIGGER AS $$
DECLARE
  has_lookup_columns BOOLEAN;
BEGIN
  -- Check if database has lookup columns
  SELECT EXISTS (
    SELECT 1 FROM table_schemas
    WHERE database_id = NEW.database_id
      AND column_type = 'lookup'
  ) INTO has_lookup_columns;

  -- Only update if there are lookup columns
  IF has_lookup_columns THEN
    PERFORM update_lookup_columns(NEW.database_id, ARRAY[NEW.id]);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Trigger to update rollup columns when related data changes
CREATE OR REPLACE FUNCTION public.trigger_update_rollups()
RETURNS TRIGGER AS $$
DECLARE
  affected_databases UUID[];
  affected_rows UUID[];
  rollup_col RECORD;
BEGIN
  -- Find all databases that have rollup columns referencing this database
  FOR rollup_col IN
    SELECT DISTINCT
      ts.database_id,
      ts.rollup_config
    FROM table_schemas ts
    WHERE ts.column_type = 'rollup'
      AND ts.rollup_config IS NOT NULL
      AND (ts.rollup_config->>'target_database_id')::UUID = COALESCE(NEW.database_id, OLD.database_id)
  LOOP
    -- Find affected rows in source database
    IF TG_OP = 'DELETE' THEN
      -- Find rows that referenced the deleted record
      SELECT array_agg(DISTINCT id)
      INTO affected_rows
      FROM table_data
      WHERE database_id = rollup_col.database_id
        AND (
          (data->>(rollup_col.rollup_config->>'relation_column'))::UUID = OLD.id
          OR
          (data->(rollup_col.rollup_config->>'relation_column')) ? OLD.id::TEXT
        );
    ELSE
      -- Find rows that reference this record
      SELECT array_agg(DISTINCT id)
      INTO affected_rows
      FROM table_data
      WHERE database_id = rollup_col.database_id
        AND (
          (data->>(rollup_col.rollup_config->>'relation_column'))::UUID = NEW.id
          OR
          (data->(rollup_col.rollup_config->>'relation_column')) ? NEW.id::TEXT
        );
    END IF;

    -- Update rollup values for affected rows
    IF affected_rows IS NOT NULL AND array_length(affected_rows, 1) > 0 THEN
      PERFORM update_rollup_columns(rollup_col.database_id, affected_rows);
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on table_data
DROP TRIGGER IF EXISTS trigger_auto_update_lookups ON table_data;
CREATE TRIGGER trigger_auto_update_lookups
  AFTER INSERT OR UPDATE ON table_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_lookups();

DROP TRIGGER IF EXISTS trigger_auto_update_rollups ON table_data;
CREATE TRIGGER trigger_auto_update_rollups
  AFTER INSERT OR UPDATE OR DELETE ON table_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_rollups();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function: Get computed column statistics
CREATE OR REPLACE FUNCTION public.get_computed_column_stats(p_database_id UUID)
RETURNS TABLE (
  column_name TEXT,
  column_type TEXT,
  total_rows BIGINT,
  computed_rows BIGINT,
  null_rows BIGINT,
  avg_computation_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.column_name,
    ts.column_type,
    COUNT(td.id) AS total_rows,
    COUNT(td.data->ts.column_name) FILTER (WHERE td.data->ts.column_name IS NOT NULL) AS computed_rows,
    COUNT(*) FILTER (WHERE td.data->ts.column_name IS NULL) AS null_rows,
    NULL::NUMERIC AS avg_computation_time_ms
  FROM table_schemas ts
  LEFT JOIN table_data td ON td.database_id = ts.database_id
  WHERE ts.database_id = p_database_id
    AND ts.column_type IN ('lookup', 'rollup')
  GROUP BY ts.column_name, ts.column_type
  ORDER BY ts.column_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Recalculate all computed columns for a database
CREATE OR REPLACE FUNCTION public.recalculate_computed_columns(p_database_id UUID)
RETURNS JSONB AS $$
DECLARE
  lookup_count INTEGER;
  rollup_count INTEGER;
  start_time TIMESTAMPTZ;
  duration_ms NUMERIC;
BEGIN
  start_time := clock_timestamp();

  -- Update all lookup columns
  lookup_count := update_lookup_columns(p_database_id);

  -- Update all rollup columns
  rollup_count := update_rollup_columns(p_database_id);

  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;

  RETURN jsonb_build_object(
    'lookup_updates', lookup_count,
    'rollup_updates', rollup_count,
    'duration_ms', duration_ms
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.compute_lookup(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_compute_lookups(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lookup_columns(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_rollup(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_compute_rollups(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_rollup_columns(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_computed_column_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_computed_columns(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION public.compute_lookup IS 'Computes lookup value for a single record by fetching from related table';
COMMENT ON FUNCTION public.compute_rollup IS 'Computes rollup aggregation (sum, avg, count, etc.) for a single record';
COMMENT ON FUNCTION public.update_lookup_columns IS 'Updates all lookup columns for specified rows (or all if NULL)';
COMMENT ON FUNCTION public.update_rollup_columns IS 'Updates all rollup columns for specified rows (or all if NULL)';
COMMENT ON FUNCTION public.recalculate_computed_columns IS 'Recalculates all lookup and rollup columns for a database';
COMMENT ON FUNCTION public.get_computed_column_stats IS 'Returns statistics about computed columns';
