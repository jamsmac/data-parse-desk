-- Schema Version Control System
-- Migration: 20251021000008_schema_versions.sql
-- Purpose: Track schema changes, enable rollback, version comparison

-- ============================================================================
-- TABLE: schema_versions
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  schema_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  description TEXT,
  is_current BOOLEAN DEFAULT false,
  checksum TEXT NOT NULL,

  CONSTRAINT unique_project_version UNIQUE(project_id, version_number)
);

-- ============================================================================
-- TABLE: schema_version_tags
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES schema_versions(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_version_tag UNIQUE(version_id, tag_name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_schema_versions_project ON schema_versions(project_id, created_at DESC);
CREATE INDEX idx_schema_versions_current ON schema_versions(project_id, is_current) WHERE is_current = true;
CREATE INDEX idx_schema_versions_checksum ON schema_versions(checksum);
CREATE INDEX idx_schema_version_tags_version ON schema_version_tags(version_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_version_tags ENABLE ROW LEVEL SECURITY;

-- Users can view schema versions for their projects
CREATE POLICY "Users can view their schema versions"
ON schema_versions FOR SELECT
USING (
  created_by = auth.uid()
);

-- Users can create schema versions for their projects
CREATE POLICY "Users can create schema versions"
ON schema_versions FOR INSERT
WITH CHECK (
  created_by = auth.uid()
);

-- Users can update their schema versions (for is_current flag)
CREATE POLICY "Users can update their schema versions"
ON schema_versions FOR UPDATE
USING (
  created_by = auth.uid()
);

-- Users can delete their schema versions
CREATE POLICY "Users can delete their schema versions"
ON schema_versions FOR DELETE
USING (
  created_by = auth.uid()
);

-- Tags policies
CREATE POLICY "Users can view tags on their versions"
ON schema_version_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM schema_versions
    WHERE schema_versions.id = schema_version_tags.version_id
    AND schema_versions.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create tags on their versions"
ON schema_version_tags FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM schema_versions
    WHERE schema_versions.id = schema_version_tags.version_id
    AND schema_versions.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete their tags"
ON schema_version_tags FOR DELETE
USING (
  created_by = auth.uid()
);

-- ============================================================================
-- FUNCTION: Get Schema Version History
-- ============================================================================
CREATE OR REPLACE FUNCTION get_schema_version_history(
  p_project_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  version_number INTEGER,
  schema_data JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ,
  description TEXT,
  is_current BOOLEAN,
  checksum TEXT,
  tags JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sv.id,
    sv.version_number,
    sv.schema_data,
    sv.created_by,
    sv.created_at,
    sv.description,
    sv.is_current,
    sv.checksum,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', svt.id,
          'tag_name', svt.tag_name,
          'description', svt.description,
          'created_at', svt.created_at
        )
      ) FILTER (WHERE svt.id IS NOT NULL),
      '[]'::jsonb
    ) as tags
  FROM schema_versions sv
  LEFT JOIN schema_version_tags svt ON sv.id = svt.version_id
  WHERE sv.project_id = p_project_id
    AND sv.created_by = auth.uid()
  GROUP BY sv.id, sv.version_number, sv.schema_data, sv.created_by,
           sv.created_at, sv.description, sv.is_current, sv.checksum
  ORDER BY sv.version_number DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FUNCTION: Calculate Schema Diff
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_schema_diff(
  p_version_id_1 UUID,
  p_version_id_2 UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema_1 JSONB;
  v_schema_2 JSONB;
  v_diff JSONB;
  v_tables_1 JSONB;
  v_tables_2 JSONB;
  v_added_tables JSONB;
  v_removed_tables JSONB;
  v_modified_tables JSONB;
BEGIN
  -- Get schemas
  SELECT schema_data INTO v_schema_1
  FROM schema_versions
  WHERE id = p_version_id_1 AND created_by = auth.uid();

  SELECT schema_data INTO v_schema_2
  FROM schema_versions
  WHERE id = p_version_id_2 AND created_by = auth.uid();

  IF v_schema_1 IS NULL OR v_schema_2 IS NULL THEN
    RAISE EXCEPTION 'One or both schema versions not found';
  END IF;

  -- Extract tables
  v_tables_1 := COALESCE(v_schema_1->'tables', '[]'::jsonb);
  v_tables_2 := COALESCE(v_schema_2->'tables', '[]'::jsonb);

  -- Find added tables (in schema_2 but not in schema_1)
  SELECT jsonb_agg(t2)
  INTO v_added_tables
  FROM jsonb_array_elements(v_tables_2) t2
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_tables_1) t1
    WHERE t1->>'name' = t2->>'name'
  );

  -- Find removed tables (in schema_1 but not in schema_2)
  SELECT jsonb_agg(t1)
  INTO v_removed_tables
  FROM jsonb_array_elements(v_tables_1) t1
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_tables_2) t2
    WHERE t2->>'name' = t1->>'name'
  );

  -- Find modified tables (exist in both but different)
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', t1->>'name',
      'before', t1,
      'after', t2
    )
  )
  INTO v_modified_tables
  FROM jsonb_array_elements(v_tables_1) t1
  JOIN jsonb_array_elements(v_tables_2) t2 ON t1->>'name' = t2->>'name'
  WHERE t1 != t2;

  -- Build diff
  v_diff := jsonb_build_object(
    'added_tables', COALESCE(v_added_tables, '[]'::jsonb),
    'removed_tables', COALESCE(v_removed_tables, '[]'::jsonb),
    'modified_tables', COALESCE(v_modified_tables, '[]'::jsonb),
    'total_changes', (
      COALESCE(jsonb_array_length(v_added_tables), 0) +
      COALESCE(jsonb_array_length(v_removed_tables), 0) +
      COALESCE(jsonb_array_length(v_modified_tables), 0)
    )
  );

  RETURN v_diff;
END;
$$;

-- ============================================================================
-- FUNCTION: Set Current Version
-- ============================================================================
CREATE OR REPLACE FUNCTION set_current_schema_version(
  p_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Get project_id and verify ownership
  SELECT project_id INTO v_project_id
  FROM schema_versions
  WHERE id = p_version_id AND created_by = auth.uid();

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Schema version not found or access denied';
  END IF;

  -- Unset all current versions for this project
  UPDATE schema_versions
  SET is_current = false
  WHERE project_id = v_project_id
    AND created_by = auth.uid();

  -- Set new current version
  UPDATE schema_versions
  SET is_current = true
  WHERE id = p_version_id
    AND created_by = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'version_id', p_version_id,
    'message', 'Current version updated'
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Calculate Checksum
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_schema_checksum(p_schema_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN md5(p_schema_data::text);
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE schema_versions IS 'Stores schema versions for version control';
COMMENT ON TABLE schema_version_tags IS 'Tags for schema versions (e.g., "production", "stable")';
COMMENT ON FUNCTION get_schema_version_history IS 'Retrieves version history with tags';
COMMENT ON FUNCTION calculate_schema_diff IS 'Calculates differences between two schema versions';
COMMENT ON FUNCTION set_current_schema_version IS 'Sets a specific version as current';
COMMENT ON FUNCTION calculate_schema_checksum IS 'Calculates MD5 checksum for schema data';
