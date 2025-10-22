-- Scheduled Reports
-- Allows users to schedule automatic generation and delivery of reports

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  composite_view_id UUID REFERENCES composite_views(id) ON DELETE CASCADE,

  -- Report configuration
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Schedule (cron format)
  schedule_cron TEXT NOT NULL, -- e.g., '0 9 * * 1' for every Monday at 9am
  timezone TEXT DEFAULT 'UTC',

  -- Report content
  include_data BOOLEAN DEFAULT true,
  include_charts BOOLEAN DEFAULT false,
  include_insights BOOLEAN DEFAULT false,
  filters JSONB, -- Optional filters to apply

  -- Delivery options
  delivery_method TEXT NOT NULL DEFAULT 'email' CHECK (delivery_method IN ('email', 'telegram', 'both')),
  email_recipients TEXT[], -- Array of email addresses
  telegram_chat_id BIGINT, -- For Telegram delivery

  -- Report format
  report_format TEXT NOT NULL DEFAULT 'pdf' CHECK (report_format IN ('pdf', 'xlsx', 'csv')),

  -- Metadata
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Either database_id or composite_view_id must be set
  CONSTRAINT check_report_target CHECK (
    (database_id IS NOT NULL AND composite_view_id IS NULL) OR
    (database_id IS NULL AND composite_view_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user ON scheduled_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_database ON scheduled_reports(database_id) WHERE database_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_view ON scheduled_reports(composite_view_id) WHERE composite_view_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;

-- RLS Policies
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own scheduled reports
CREATE POLICY "Users can view their own scheduled reports"
  ON scheduled_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own scheduled reports
CREATE POLICY "Users can create scheduled reports"
  ON scheduled_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scheduled reports
CREATE POLICY "Users can update their own scheduled reports"
  ON scheduled_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scheduled reports
CREATE POLICY "Users can delete their own scheduled reports"
  ON scheduled_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Report execution history
CREATE TABLE IF NOT EXISTS report_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,

  execution_status TEXT NOT NULL CHECK (execution_status IN ('success', 'failed', 'pending')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Results
  file_url TEXT, -- URL to generated report file
  file_size_bytes INTEGER,
  rows_included INTEGER,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_executions_report ON report_executions(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_report_executions_created ON report_executions(created_at DESC);

-- RLS for executions
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own report executions"
  ON report_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_reports sr
      WHERE sr.id = scheduled_report_id
      AND sr.user_id = auth.uid()
    )
  );

-- Function to calculate next run time based on cron schedule
CREATE OR REPLACE FUNCTION calculate_next_run(cron_expression TEXT, base_time TIMESTAMP WITH TIME ZONE, tz TEXT)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  next_run TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Simplified cron parsing - in production use a proper cron library
  -- This is a basic implementation for common patterns

  -- Daily at specific hour (e.g., '0 9 * * *' = 9am daily)
  IF cron_expression ~ '^\d+ \d+ \* \* \*$' THEN
    next_run := (base_time + INTERVAL '1 day')::date +
                (split_part(cron_expression, ' ', 2)::integer || ' hours')::interval;

  -- Weekly on specific day (e.g., '0 9 * * 1' = Monday 9am)
  ELSIF cron_expression ~ '^\d+ \d+ \* \* \d+$' THEN
    next_run := (current_time + INTERVAL '7 days')::date +
                (split_part(cron_expression, ' ', 2)::integer || ' hours')::interval;

  -- Default: next day same time
  ELSE
    next_run := current_time + INTERVAL '1 day';
  END IF;

  RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set next_run_at when schedule is created/updated
CREATE OR REPLACE FUNCTION update_next_run_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    NEW.next_run_at := calculate_next_run(NEW.schedule_cron, NOW(), NEW.timezone);
  ELSE
    NEW.next_run_at := NULL;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_next_run_at
  BEFORE INSERT OR UPDATE ON scheduled_reports
  FOR EACH ROW
  WHEN (NEW.schedule_cron IS NOT NULL)
  EXECUTE FUNCTION update_next_run_at();

-- Comments
COMMENT ON TABLE scheduled_reports IS 'Automatic report generation and delivery schedules';
COMMENT ON COLUMN scheduled_reports.schedule_cron IS 'Cron expression for report schedule (e.g., 0 9 * * 1 for Monday 9am)';
COMMENT ON COLUMN scheduled_reports.next_run_at IS 'Calculated next execution time based on cron schedule';
COMMENT ON TABLE report_executions IS 'History of report generation executions';
