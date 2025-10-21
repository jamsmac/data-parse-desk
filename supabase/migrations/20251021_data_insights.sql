-- Data Insights Table
-- Stores AI-generated insights and recommendations about databases

CREATE TABLE IF NOT EXISTS data_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trend', 'anomaly', 'suggestion', 'reminder')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action TEXT,
  metadata JSONB,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_insights_database_id ON data_insights(database_id);
CREATE INDEX IF NOT EXISTS idx_data_insights_user_id ON data_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_data_insights_type ON data_insights(type);
CREATE INDEX IF NOT EXISTS idx_data_insights_is_dismissed ON data_insights(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_data_insights_created_at ON data_insights(created_at DESC);

-- RLS Policies
ALTER TABLE data_insights ENABLE ROW LEVEL SECURITY;

-- Users can view their own insights
CREATE POLICY "Users can view their own insights"
  ON data_insights FOR SELECT
  USING (auth.uid() = user_id);

-- Users can dismiss their own insights
CREATE POLICY "Users can dismiss their own insights"
  ON data_insights FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert insights
CREATE POLICY "Service role can insert insights"
  ON data_insights FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE data_insights IS 'AI-generated insights and recommendations about user databases';
COMMENT ON COLUMN data_insights.type IS 'Type of insight: trend, anomaly, suggestion, or reminder';
COMMENT ON COLUMN data_insights.severity IS 'Importance level: low, medium, or high';
COMMENT ON COLUMN data_insights.metadata IS 'Additional structured data about the insight';
COMMENT ON COLUMN data_insights.is_dismissed IS 'Whether user has dismissed this insight';
