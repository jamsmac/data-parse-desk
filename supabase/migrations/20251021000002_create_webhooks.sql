-- Create webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_key TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 30000,
  headers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_url CHECK (url ~* '^https?://'),
  CONSTRAINT valid_timeout CHECK (timeout_ms > 0 AND timeout_ms <= 60000)
);

-- Create webhook_logs table for history
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES public.webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  request_payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create webhook_events table for available event types
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT UNIQUE NOT NULL,
  description TEXT,
  payload_schema JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default webhook events
INSERT INTO public.webhook_events (event_type, description, payload_schema) VALUES
  ('database.created', 'Triggered when a new database is created', '{"database_id": "uuid", "name": "string", "project_id": "uuid"}'::jsonb),
  ('database.updated', 'Triggered when a database is updated', '{"database_id": "uuid", "changes": "object"}'::jsonb),
  ('database.deleted', 'Triggered when a database is deleted', '{"database_id": "uuid"}'::jsonb),
  ('row.created', 'Triggered when a new row is created', '{"database_id": "uuid", "row_id": "uuid", "data": "object"}'::jsonb),
  ('row.updated', 'Triggered when a row is updated', '{"database_id": "uuid", "row_id": "uuid", "old_data": "object", "new_data": "object"}'::jsonb),
  ('row.deleted', 'Triggered when a row is deleted', '{"database_id": "uuid", "row_id": "uuid"}'::jsonb),
  ('import.completed', 'Triggered when a file import is completed', '{"import_id": "uuid", "database_id": "uuid", "rows_imported": "number"}'::jsonb),
  ('import.failed', 'Triggered when a file import fails', '{"import_id": "uuid", "error": "string"}'::jsonb),
  ('report.generated', 'Triggered when a report is generated', '{"report_id": "uuid", "format": "string"}'::jsonb),
  ('comment.created', 'Triggered when a comment is created', '{"comment_id": "uuid", "database_id": "uuid", "user_id": "uuid"}'::jsonb)
ON CONFLICT (event_type) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON public.webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_project_id ON public.webhooks(project_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON public.webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON public.webhook_logs(success);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhooks
CREATE POLICY "Users can view their own webhooks"
ON public.webhooks
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own webhooks"
ON public.webhooks
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own webhooks"
ON public.webhooks
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own webhooks"
ON public.webhooks
FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for webhook_logs
CREATE POLICY "Users can view logs for their webhooks"
ON public.webhook_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.webhooks
    WHERE webhooks.id = webhook_logs.webhook_id
    AND webhooks.user_id = auth.uid()
  )
);

-- RLS policies for webhook_events (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view webhook events"
ON public.webhook_events
FOR SELECT
USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean old webhook logs (older than 30 days)
CREATE OR REPLACE FUNCTION clean_old_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.webhook_logs
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE public.webhooks IS 'Stores user-defined webhooks for external integrations';
COMMENT ON TABLE public.webhook_logs IS 'Stores webhook execution history and responses';
COMMENT ON TABLE public.webhook_events IS 'Defines available webhook event types';
COMMENT ON COLUMN public.webhooks.secret_key IS 'Optional secret key for webhook signature verification';
COMMENT ON COLUMN public.webhooks.events IS 'Array of event types this webhook subscribes to';
COMMENT ON COLUMN public.webhooks.retry_enabled IS 'Whether to retry failed webhook calls';
COMMENT ON COLUMN public.webhooks.max_retries IS 'Maximum number of retry attempts';
