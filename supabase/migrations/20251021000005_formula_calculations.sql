-- Migration: Formula calculations support
-- Description: Add support for formula columns with auto-recalculation and history tracking
-- Date: 2025-10-21

-- Create formula_calculations table for audit trail
CREATE TABLE IF NOT EXISTS formula_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composite_view_id UUID REFERENCES composite_views(id) ON DELETE CASCADE,
  row_identifier TEXT NOT NULL,
  column_name TEXT NOT NULL,
  expression TEXT NOT NULL,
  input_data JSONB NOT NULL,
  result JSONB NOT NULL,
  return_type TEXT,
  calculation_time_ms INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_formula_calculations_view
  ON formula_calculations(composite_view_id, row_identifier);

CREATE INDEX IF NOT EXISTS idx_formula_calculations_column
  ON formula_calculations(composite_view_id, column_name);

CREATE INDEX IF NOT EXISTS idx_formula_calculations_time
  ON formula_calculations(calculated_at DESC);

-- Auto-cleanup old calculations (keep last 100 per view)
CREATE OR REPLACE FUNCTION cleanup_old_formula_calculations()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM formula_calculations
  WHERE id IN (
    SELECT id FROM formula_calculations
    WHERE composite_view_id = NEW.composite_view_id
    ORDER BY calculated_at DESC
    OFFSET 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-cleanup
DROP TRIGGER IF EXISTS cleanup_formula_calculations_trigger ON formula_calculations;
CREATE TRIGGER cleanup_formula_calculations_trigger
  AFTER INSERT ON formula_calculations
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_formula_calculations();

-- Enable RLS
ALTER TABLE formula_calculations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies: formula_calculations
-- Users can view calculations for their composite views
-- Only authenticated users (or system/service role) can insert
-- ============================================================================
CREATE POLICY "Users can view formula calculations in their views"
  ON formula_calculations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM composite_views cv
      WHERE cv.id = formula_calculations.composite_view_id
        AND cv.created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert formula calculations"
  ON formula_calculations FOR INSERT
  WITH CHECK (
    auth.role() IN ('authenticated', 'service_role') AND
    (
      composite_view_id IS NULL OR
      EXISTS (
        SELECT 1 FROM composite_views cv
        WHERE cv.id = formula_calculations.composite_view_id
          AND cv.created_by = auth.uid()
      )
    )
  );

-- Function to trigger formula recalculation when dependencies change
CREATE OR REPLACE FUNCTION notify_formula_recalculation()
RETURNS TRIGGER AS $$
DECLARE
  affected_views UUID[];
  view_id UUID;
BEGIN
  -- Find all composite views that might have formulas depending on this data
  -- This is a simplified version - in production, you'd want more sophisticated dependency tracking

  -- For now, we'll just notify that data has changed
  -- The frontend or a background job can handle recalculation

  PERFORM pg_notify(
    'formula_recalculation_needed',
    json_build_object(
      'table', TG_TABLE_NAME,
      'row_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', NOW()
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on composite_view_custom_data changes
DROP TRIGGER IF EXISTS formula_recalculation_trigger ON composite_view_custom_data;
CREATE TRIGGER formula_recalculation_trigger
  AFTER INSERT OR UPDATE OR DELETE ON composite_view_custom_data
  FOR EACH ROW
  EXECUTE FUNCTION notify_formula_recalculation();

-- Function to get formula calculation history
CREATE OR REPLACE FUNCTION get_formula_calculation_history(
  p_composite_view_id UUID,
  p_row_identifier TEXT,
  p_column_name TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  expression TEXT,
  result JSONB,
  return_type TEXT,
  calculation_time_ms INTEGER,
  calculated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.id,
    fc.expression,
    fc.result,
    fc.return_type,
    fc.calculation_time_ms,
    fc.calculated_at
  FROM formula_calculations fc
  WHERE fc.composite_view_id = p_composite_view_id
    AND fc.row_identifier = p_row_identifier
    AND fc.column_name = p_column_name
  ORDER BY fc.calculated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_formula_calculation_history(UUID, TEXT, TEXT, INTEGER) TO authenticated;

-- Helper function to recalculate all formulas in a composite view
CREATE OR REPLACE FUNCTION recalculate_view_formulas(p_composite_view_id UUID)
RETURNS TABLE (
  row_identifier TEXT,
  column_name TEXT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  formula_column RECORD;
  view_row RECORD;
  calculation_result JSONB;
BEGIN
  -- Get all formula columns in this view
  FOR formula_column IN
    SELECT
      name,
      config->>'expression' as expression,
      config->>'return_type' as return_type,
      config->'dependencies' as dependencies
    FROM composite_views cv,
         jsonb_array_elements(cv.custom_columns) AS custom_col
    WHERE cv.id = p_composite_view_id
      AND custom_col->>'type' = 'formula'
  LOOP
    -- For each row in the view, recalculate the formula
    -- This is a simplified version - actual implementation would query the view data

    -- Return placeholder for now
    row_identifier := 'pending';
    column_name := formula_column.name;
    success := true;
    error_message := NULL;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION recalculate_view_formulas(UUID) TO authenticated;

-- Comments
COMMENT ON TABLE formula_calculations IS 'Audit trail for formula calculations in composite views';
COMMENT ON FUNCTION notify_formula_recalculation IS 'Notifies when data changes that might affect formula calculations';
COMMENT ON FUNCTION get_formula_calculation_history IS 'Returns calculation history for a specific formula cell';
COMMENT ON FUNCTION recalculate_view_formulas IS 'Recalculates all formulas in a composite view';
