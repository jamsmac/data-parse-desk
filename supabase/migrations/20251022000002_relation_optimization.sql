-- ============================================================================
-- Migration: Relation Optimization
-- Description: Add helper functions and views for optimized relation loading
-- Date: 2025-10-22
-- Priority: P0 (Critical feature - Relations Auto-loading)
-- ============================================================================

-- ============================================================================
-- Function: Batch resolve relations for multiple records
-- ============================================================================
CREATE OR REPLACE FUNCTION public.batch_resolve_relations(
  p_source_database_id UUID,
  p_row_ids UUID[],
  p_relation_columns TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  row_id UUID,
  column_name TEXT,
  relation_data JSONB
) AS $$
DECLARE
  relation_config RECORD;
  foreign_ids UUID[];
  related_data RECORD;
BEGIN
  -- Get all relation columns if not specified
  IF p_relation_columns IS NULL THEN
    FOR relation_config IN
      SELECT column_name, relation_config
      FROM table_schemas
      WHERE database_id = p_source_database_id
        AND column_type = 'relation'
        AND relation_config IS NOT NULL
    LOOP
      p_relation_columns := array_append(p_relation_columns, relation_config.column_name);
    END LOOP;
  END IF;

  -- Return empty if no relation columns
  IF p_relation_columns IS NULL OR array_length(p_relation_columns, 1) = 0 THEN
    RETURN;
  END IF;

  -- For each relation column
  FOR relation_config IN
    SELECT
      ts.column_name,
      ts.relation_config->>'target_database_id' AS target_db_id,
      ts.relation_config->>'display_field' AS display_field,
      ts.relation_config->>'relation_type' AS relation_type
    FROM table_schemas ts
    WHERE ts.database_id = p_source_database_id
      AND ts.column_type = 'relation'
      AND ts.column_name = ANY(p_relation_columns)
  LOOP
    -- Collect all foreign IDs for this relation
    SELECT array_agg(DISTINCT (td.data->>relation_config.column_name)::UUID)
    INTO foreign_ids
    FROM table_data td
    WHERE td.database_id = p_source_database_id
      AND td.id = ANY(p_row_ids)
      AND td.data->>relation_config.column_name IS NOT NULL;

    -- Skip if no foreign IDs
    CONTINUE WHEN foreign_ids IS NULL OR array_length(foreign_ids, 1) = 0;

    -- Fetch related records in batch
    FOR related_data IN
      SELECT
        td_source.id AS source_row_id,
        relation_config.column_name,
        jsonb_build_object(
          'id', td_target.id,
          'display_value', COALESCE(
            td_target.data->>relation_config.display_field,
            td_target.data->>'name',
            td_target.data->>'title',
            td_target.id::TEXT
          ),
          'data', td_target.data
        ) AS relation_data
      FROM table_data td_source
      CROSS JOIN LATERAL (
        SELECT id, data
        FROM table_data
        WHERE database_id = relation_config.target_db_id::UUID
          AND id = (td_source.data->>relation_config.column_name)::UUID
        LIMIT 1
      ) td_target
      WHERE td_source.database_id = p_source_database_id
        AND td_source.id = ANY(p_row_ids)
        AND td_source.data->>relation_config.column_name IS NOT NULL
    LOOP
      row_id := related_data.source_row_id;
      column_name := related_data.column_name;
      relation_data := related_data.relation_data;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Function: Create materialized view for frequently accessed relations
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_relation_view(
  p_source_database_id UUID,
  p_target_database_id UUID,
  p_relation_column TEXT,
  p_view_name TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  view_name TEXT;
  sql_query TEXT;
BEGIN
  -- Generate view name if not provided
  IF p_view_name IS NULL THEN
    view_name := format(
      'relation_view_%s_%s',
      substring(p_source_database_id::TEXT, 1, 8),
      p_relation_column
    );
  ELSE
    view_name := p_view_name;
  END IF;

  -- Build dynamic SQL for view creation
  sql_query := format('
    CREATE OR REPLACE VIEW %I AS
    SELECT
      source.id AS source_id,
      source.data AS source_data,
      target.id AS target_id,
      target.data AS target_data,
      COALESCE(
        target.data->>''name'',
        target.data->>''title'',
        target.id::TEXT
      ) AS display_value
    FROM table_data source
    LEFT JOIN table_data target
      ON target.database_id = %L
      AND target.id = (source.data->>%L)::UUID
    WHERE source.database_id = %L
      AND source.data->>%L IS NOT NULL
  ',
    view_name,
    p_target_database_id,
    p_relation_column,
    p_source_database_id,
    p_relation_column
  );

  -- Execute the SQL
  EXECUTE sql_query;

  RETURN view_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Get relation statistics for optimization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_relation_stats(p_database_id UUID)
RETURNS TABLE (
  relation_column TEXT,
  target_database_id UUID,
  total_records BIGINT,
  resolved_count BIGINT,
  null_count BIGINT,
  unique_targets BIGINT,
  avg_resolution_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.column_name AS relation_column,
    (ts.relation_config->>'target_database_id')::UUID AS target_database_id,
    COUNT(*) AS total_records,
    COUNT(td.data->>ts.column_name) AS resolved_count,
    COUNT(*) FILTER (WHERE td.data->>ts.column_name IS NULL) AS null_count,
    COUNT(DISTINCT td.data->>ts.column_name) AS unique_targets,
    NULL::NUMERIC AS avg_resolution_time_ms -- Placeholder for future metrics
  FROM table_schemas ts
  LEFT JOIN table_data td ON td.database_id = ts.database_id
  WHERE ts.database_id = p_database_id
    AND ts.column_type = 'relation'
  GROUP BY ts.column_name, ts.relation_config
  ORDER BY resolved_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Add indexes for relation optimization
-- ============================================================================

-- Index on table_data for faster relation lookups
CREATE INDEX IF NOT EXISTS idx_table_data_database_id_id
  ON table_data(database_id, id);

-- Composite index for common relation queries
CREATE INDEX IF NOT EXISTS idx_table_data_database_data_gin
  ON table_data USING gin(data);

-- ============================================================================
-- Function: Validate relation integrity
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_relation_integrity(p_database_id UUID)
RETURNS TABLE (
  row_id UUID,
  column_name TEXT,
  foreign_id TEXT,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    td.id AS row_id,
    ts.column_name,
    td.data->>ts.column_name AS foreign_id,
    EXISTS (
      SELECT 1
      FROM table_data target
      WHERE target.database_id = (ts.relation_config->>'target_database_id')::UUID
        AND target.id = (td.data->>ts.column_name)::UUID
    ) AS is_valid,
    CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM table_data target
        WHERE target.database_id = (ts.relation_config->>'target_database_id')::UUID
          AND target.id = (td.data->>ts.column_name)::UUID
      )
      THEN 'Referenced record does not exist'
      ELSE NULL
    END AS error_message
  FROM table_data td
  CROSS JOIN table_schemas ts
  WHERE td.database_id = p_database_id
    AND ts.database_id = p_database_id
    AND ts.column_type = 'relation'
    AND td.data->>ts.column_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM table_data target
      WHERE target.database_id = (ts.relation_config->>'target_database_id')::UUID
        AND target.id = (td.data->>ts.column_name)::UUID
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.batch_resolve_relations(UUID, UUID[], TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_relation_view(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_relation_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_relation_integrity(UUID) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION public.batch_resolve_relations IS 'Efficiently resolves multiple relation columns for a batch of rows';
COMMENT ON FUNCTION public.create_relation_view IS 'Creates a materialized view for frequently accessed relations';
COMMENT ON FUNCTION public.get_relation_stats IS 'Returns statistics about relation columns for optimization analysis';
COMMENT ON FUNCTION public.validate_relation_integrity IS 'Validates that all relation references point to existing records';
