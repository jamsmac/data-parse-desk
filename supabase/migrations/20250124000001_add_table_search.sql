-- Add search functionality to table_data
CREATE OR REPLACE FUNCTION search_table_data(
  p_database_id uuid,
  p_search_query text,
  p_search_columns text[],
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_sort_column text DEFAULT NULL,
  p_sort_direction text DEFAULT 'asc',
  p_filters jsonb DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  database_id uuid,
  data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
) AS $$
DECLARE
  v_total_count bigint;
  v_sort_column text;
  v_sort_direction text;
BEGIN
  -- Validate sort direction
  v_sort_direction := LOWER(COALESCE(p_sort_direction, 'asc'));
  IF v_sort_direction NOT IN ('asc', 'desc') THEN
    v_sort_direction := 'asc';
  END IF;

  v_sort_column := p_sort_column;

  -- Build and execute query with search
  RETURN QUERY
  WITH filtered_data AS (
    SELECT
      td.id,
      td.database_id,
      td.data,
      td.created_at,
      td.updated_at
    FROM table_data td
    WHERE td.database_id = p_database_id
      -- Apply filters if provided
      AND (
        p_filters IS NULL OR
        (
          SELECT bool_and(
            CASE
              WHEN (filter_value->>'type') = 'text' AND (filter_value->>'operator') = 'equals' THEN
                (td.data->>filter_key)::text = (filter_value->>'value')::text
              WHEN (filter_value->>'type') = 'text' AND (filter_value->>'operator') = 'contains' THEN
                (td.data->>filter_key)::text ILIKE '%' || (filter_value->>'value')::text || '%'
              WHEN (filter_value->>'type') = 'number' AND (filter_value->>'operator') = '>' THEN
                (td.data->>filter_key)::numeric > (filter_value->>'value')::numeric
              WHEN (filter_value->>'type') = 'number' AND (filter_value->>'operator') = '<' THEN
                (td.data->>filter_key)::numeric < (filter_value->>'value')::numeric
              WHEN (filter_value->>'type') = 'number' AND (filter_value->>'operator') = '>=' THEN
                (td.data->>filter_key)::numeric >= (filter_value->>'value')::numeric
              WHEN (filter_value->>'type') = 'number' AND (filter_value->>'operator') = '<=' THEN
                (td.data->>filter_key)::numeric <= (filter_value->>'value')::numeric
              ELSE TRUE
            END
          )
          FROM jsonb_each(p_filters) AS filter_entry(filter_key, filter_value)
        )
      )
      -- Apply search if query provided
      AND (
        p_search_query = '' OR p_search_query IS NULL OR
        EXISTS (
          SELECT 1
          FROM jsonb_each_text(td.data) AS kv(key, value)
          WHERE key = ANY(p_search_columns)
            AND value ILIKE '%' || p_search_query || '%'
        )
      )
  ),
  counted_data AS (
    SELECT
      fd.*,
      COUNT(*) OVER() AS total_count
    FROM filtered_data fd
  )
  SELECT
    cd.id,
    cd.database_id,
    cd.data,
    cd.created_at,
    cd.updated_at,
    cd.total_count
  FROM counted_data cd
  ORDER BY
    CASE
      WHEN v_sort_column IS NOT NULL AND v_sort_direction = 'asc' THEN
        cd.data->>v_sort_column
      ELSE NULL
    END ASC,
    CASE
      WHEN v_sort_column IS NOT NULL AND v_sort_direction = 'desc' THEN
        cd.data->>v_sort_column
      ELSE NULL
    END DESC,
    cd.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_table_data TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION search_table_data IS 'Searches table data with full-text search across specified columns, with filtering and sorting support';
