-- =====================================================
-- DATA VALIDATION SYSTEM
-- Column-level validation rules with real-time checking
-- Migration: 20251022000006
-- =====================================================

-- =====================================================
-- 1. VALIDATION RULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,

  -- Rule configuration
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'required',
    'unique',
    'regex',
    'min_length',
    'max_length',
    'min_value',
    'max_value',
    'email',
    'url',
    'phone',
    'date_range',
    'custom_function'
  )),

  -- Rule parameters
  params JSONB DEFAULT '{}'::jsonb,
  -- Examples:
  -- regex: { "pattern": "^[A-Z]{3}\\d{3}$", "message": "Must be 3 letters + 3 digits" }
  -- min_length: { "value": 5, "message": "Must be at least 5 characters" }
  -- date_range: { "min": "2020-01-01", "max": "2025-12-31" }

  -- Error message
  error_message TEXT,

  -- Priority (lower = higher priority)
  priority INTEGER DEFAULT 100,

  -- Status
  enabled BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_validation_rules_database_id ON public.validation_rules(database_id);
CREATE INDEX idx_validation_rules_column_name ON public.validation_rules(column_name);
CREATE INDEX idx_validation_rules_enabled ON public.validation_rules(enabled);

-- Unique constraint: one rule type per column
CREATE UNIQUE INDEX idx_validation_rules_unique
  ON public.validation_rules(database_id, column_name, rule_type)
  WHERE enabled = TRUE;

-- Auto-update timestamp
CREATE TRIGGER update_validation_rules_updated_at
  BEFORE UPDATE ON public.validation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. VALIDATION FUNCTIONS
-- =====================================================

-- Validate a single value against a rule
CREATE OR REPLACE FUNCTION public.validate_value(
  p_value TEXT,
  p_rule_type TEXT,
  p_params JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_rule_type
    WHEN 'required' THEN
      RETURN p_value IS NOT NULL AND p_value != '';

    WHEN 'min_length' THEN
      RETURN LENGTH(p_value) >= (p_params->>'value')::INTEGER;

    WHEN 'max_length' THEN
      RETURN LENGTH(p_value) <= (p_params->>'value')::INTEGER;

    WHEN 'min_value' THEN
      RETURN p_value::NUMERIC >= (p_params->>'value')::NUMERIC;

    WHEN 'max_value' THEN
      RETURN p_value::NUMERIC <= (p_params->>'value')::NUMERIC;

    WHEN 'regex' THEN
      RETURN p_value ~ (p_params->>'pattern');

    WHEN 'email' THEN
      RETURN p_value ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

    WHEN 'url' THEN
      RETURN p_value ~ '^https?://[^\s]+$';

    WHEN 'phone' THEN
      -- Simple international phone validation
      RETURN p_value ~ '^\+?[0-9\s\-\(\)]+$';

    ELSE
      RETURN TRUE; -- Unknown rule type, pass by default
  END CASE;
END;
$$;

-- Validate a row against all column rules
CREATE OR REPLACE FUNCTION public.validate_row(
  p_database_id UUID,
  p_row_data JSONB
)
RETURNS TABLE (
  valid BOOLEAN,
  errors JSONB -- { "column_name": ["error1", "error2"], ... }
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_errors JSONB := '{}'::jsonb;
  v_rule RECORD;
  v_value TEXT;
  v_is_valid BOOLEAN;
BEGIN
  -- Loop through all enabled validation rules
  FOR v_rule IN
    SELECT *
    FROM public.validation_rules
    WHERE database_id = p_database_id
      AND enabled = TRUE
    ORDER BY priority ASC, column_name ASC
  LOOP
    -- Get column value
    v_value := p_row_data->>v_rule.column_name;

    -- Check unique constraint
    IF v_rule.rule_type = 'unique' THEN
      PERFORM 1
      FROM public.table_data
      WHERE database_id = p_database_id
        AND data->>v_rule.column_name = v_value
      LIMIT 1;

      v_is_valid := NOT FOUND;

    -- Check date range
    ELSIF v_rule.rule_type = 'date_range' THEN
      v_is_valid := (
        v_value::DATE >= (v_rule.params->>'min')::DATE AND
        v_value::DATE <= (v_rule.params->>'max')::DATE
      );

    -- Use generic validation function
    ELSE
      v_is_valid := validate_value(v_value, v_rule.rule_type, v_rule.params);
    END IF;

    -- Add error if validation failed
    IF NOT v_is_valid THEN
      v_errors := jsonb_set(
        v_errors,
        ARRAY[v_rule.column_name],
        COALESCE(v_errors->v_rule.column_name, '[]'::jsonb) ||
          jsonb_build_array(v_rule.error_message)
      );
    END IF;
  END LOOP;

  -- Return result
  RETURN QUERY SELECT (v_errors = '{}'::jsonb), v_errors;
END;
$$;

-- Trigger function to validate before insert/update
CREATE OR REPLACE FUNCTION public.trigger_validate_table_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_validation RECORD;
BEGIN
  -- Skip validation if explicitly disabled
  IF current_setting('app.skip_validation', true)::BOOLEAN THEN
    RETURN NEW;
  END IF;

  -- Validate the row
  SELECT * INTO v_validation
  FROM validate_row(NEW.database_id, NEW.data);

  -- If validation failed, raise exception
  IF NOT v_validation.valid THEN
    RAISE EXCEPTION 'Validation failed: %', v_validation.errors;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on table_data
CREATE TRIGGER trigger_validate_before_write
  BEFORE INSERT OR UPDATE ON public.table_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_validate_table_data();

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Get all validation errors for a database
CREATE OR REPLACE FUNCTION public.get_validation_errors(
  p_database_id UUID
)
RETURNS TABLE (
  row_id UUID,
  errors JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    td.id AS row_id,
    v.errors
  FROM public.table_data td
  CROSS JOIN LATERAL validate_row(td.database_id, td.data) v
  WHERE td.database_id = p_database_id
    AND NOT v.valid;
END;
$$;

-- Bulk validate all rows
CREATE OR REPLACE FUNCTION public.bulk_validate_database(
  p_database_id UUID
)
RETURNS TABLE (
  total_rows BIGINT,
  valid_rows BIGINT,
  invalid_rows BIGINT,
  error_details JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total BIGINT;
  v_invalid BIGINT;
  v_errors JSONB;
BEGIN
  -- Count total rows
  SELECT COUNT(*) INTO v_total
  FROM public.table_data
  WHERE database_id = p_database_id;

  -- Get validation errors
  SELECT jsonb_agg(
    jsonb_build_object(
      'row_id', row_id,
      'errors', errors
    )
  ) INTO v_errors
  FROM get_validation_errors(p_database_id);

  v_invalid := COALESCE(jsonb_array_length(v_errors), 0);

  RETURN QUERY SELECT
    v_total,
    v_total - v_invalid,
    v_invalid,
    COALESCE(v_errors, '[]'::jsonb);
END;
$$;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validation rules in their databases"
  ON public.validation_rules FOR SELECT
  USING (
    database_id IN (
      SELECT d.id FROM public.databases d
      LEFT JOIN public.projects p ON d.project_id = p.id
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE d.created_by = auth.uid()
        OR p.user_id = auth.uid()
        OR pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage validation rules in their databases"
  ON public.validation_rules FOR ALL
  USING (
    database_id IN (
      SELECT d.id FROM public.databases d
      LEFT JOIN public.projects p ON d.project_id = p.id
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE d.created_by = auth.uid()
        OR p.user_id = auth.uid()
        OR (pm.user_id = auth.uid() AND pm.role IN ('owner', 'editor'))
    )
  );

-- =====================================================
-- 5. GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.validation_rules TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_value TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_row TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_validation_errors TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_validate_database TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.validation_rules IS 'Column-level validation rules for data quality enforcement';
COMMENT ON FUNCTION public.validate_value IS 'Validate a single value against a validation rule';
COMMENT ON FUNCTION public.validate_row IS 'Validate an entire row against all column rules';
COMMENT ON FUNCTION public.get_validation_errors IS 'Get all validation errors for rows in a database';
COMMENT ON FUNCTION public.bulk_validate_database IS 'Validate all rows in a database and return summary';
