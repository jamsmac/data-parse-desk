-- Conditional Formatting Rules
-- Allows users to define visual formatting rules based on data values

CREATE TABLE IF NOT EXISTS conditional_formatting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  composite_view_id UUID REFERENCES composite_views(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rule configuration
  name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Lower number = higher priority

  -- Condition
  condition_type TEXT NOT NULL CHECK (condition_type IN (
    'equals', 'not_equals',
    'greater_than', 'less_than',
    'greater_or_equal', 'less_or_equal',
    'contains', 'not_contains',
    'starts_with', 'ends_with',
    'is_empty', 'is_not_empty',
    'between', 'in_list'
  )),
  condition_value JSONB, -- Can store string, number, array, or range

  -- Formatting to apply
  format_config JSONB NOT NULL, -- { background, text, bold, italic, icon }
  -- Example: { "background": "#22c55e", "text": "#ffffff", "bold": true }

  -- Apply to entire row or just cell
  apply_to_row BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Either database_id or composite_view_id must be set
  CONSTRAINT check_target CHECK (
    (database_id IS NOT NULL AND composite_view_id IS NULL) OR
    (database_id IS NULL AND composite_view_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cf_rules_database ON conditional_formatting_rules(database_id) WHERE database_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cf_rules_composite_view ON conditional_formatting_rules(composite_view_id) WHERE composite_view_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cf_rules_user ON conditional_formatting_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_cf_rules_active ON conditional_formatting_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_cf_rules_priority ON conditional_formatting_rules(priority);

-- RLS Policies
ALTER TABLE conditional_formatting_rules ENABLE ROW LEVEL SECURITY;

-- Users can view their own rules
CREATE POLICY "Users can view their own formatting rules"
  ON conditional_formatting_rules FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own rules
CREATE POLICY "Users can create formatting rules"
  ON conditional_formatting_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rules
CREATE POLICY "Users can update their own formatting rules"
  ON conditional_formatting_rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own rules
CREATE POLICY "Users can delete their own formatting rules"
  ON conditional_formatting_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conditional_formatting_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conditional_formatting_rules_updated_at
  BEFORE UPDATE ON conditional_formatting_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_conditional_formatting_rules_updated_at();

-- Comments
COMMENT ON TABLE conditional_formatting_rules IS 'Visual formatting rules based on cell values';
COMMENT ON COLUMN conditional_formatting_rules.priority IS 'Lower number means higher priority (applied first)';
COMMENT ON COLUMN conditional_formatting_rules.condition_value IS 'Value to compare against, can be string, number, array for in_list, or {min, max} for between';
COMMENT ON COLUMN conditional_formatting_rules.format_config IS 'JSON object defining visual formatting: {background, text, bold, italic, icon}';
COMMENT ON COLUMN conditional_formatting_rules.apply_to_row IS 'If true, formatting applies to entire row, otherwise just the cell';
