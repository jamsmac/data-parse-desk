-- ============================================================================
-- Migration: Telegram Group Chat Integration
-- Description: Enable Telegram bot integration for project collaboration
-- Date: 2025-10-22
-- Priority: P1 (Stage 4 - Optional feature)
-- ============================================================================

-- ============================================================================
-- 1. TELEGRAM BOT CONFIGURATION TABLE
-- Stores bot tokens and settings per project
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project association
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Bot credentials
  bot_token TEXT NOT NULL, -- Encrypted bot token
  bot_username TEXT NOT NULL,
  bot_name TEXT,

  -- Configuration
  enabled BOOLEAN DEFAULT true,
  notification_types JSONB DEFAULT '["data_change", "comment", "mention", "insight"]'::jsonb,

  -- Rate limiting
  max_messages_per_minute INTEGER DEFAULT 20,
  max_messages_per_hour INTEGER DEFAULT 100,

  -- Metadata
  webhook_url TEXT,
  last_webhook_check TIMESTAMPTZ,
  webhook_status TEXT DEFAULT 'pending' CHECK (webhook_status IN ('pending', 'active', 'failed', 'disabled')),

  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, bot_token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_telegram_bots_project_id ON public.telegram_bots(project_id);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_enabled ON public.telegram_bots(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_telegram_bots_created_by ON public.telegram_bots(created_by);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS update_telegram_bots_updated_at ON public.telegram_bots;
CREATE TRIGGER update_telegram_bots_updated_at
  BEFORE UPDATE ON public.telegram_bots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. TELEGRAM CHAT SUBSCRIPTIONS TABLE
-- Maps Telegram chats to projects/databases
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Telegram chat info
  chat_id BIGINT NOT NULL, -- Telegram chat ID
  chat_type TEXT NOT NULL CHECK (chat_type IN ('private', 'group', 'supergroup', 'channel')),
  chat_title TEXT,

  -- Association
  bot_id UUID NOT NULL REFERENCES public.telegram_bots(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  database_id UUID REFERENCES public.databases(id) ON DELETE SET NULL,

  -- Subscription settings
  subscribed_events JSONB DEFAULT '["all"]'::jsonb,
  notification_filter JSONB DEFAULT '{}'::jsonb, -- Filters for notifications

  -- User mapping (optional - for private chats)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  telegram_user_id BIGINT,
  telegram_username TEXT,

  -- Status
  active BOOLEAN DEFAULT true,
  muted_until TIMESTAMPTZ,

  -- Metadata
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(bot_id, chat_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_telegram_chats_bot_id ON public.telegram_chats(bot_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_chat_id ON public.telegram_chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_project_id ON public.telegram_chats(project_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_database_id ON public.telegram_chats(database_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_user_id ON public.telegram_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_active ON public.telegram_chats(active) WHERE active = true;

-- Auto-update timestamp
DROP TRIGGER IF EXISTS update_telegram_chats_updated_at ON public.telegram_chats;
CREATE TRIGGER update_telegram_chats_updated_at
  BEFORE UPDATE ON public.telegram_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. TELEGRAM MESSAGE LOG TABLE
-- Tracks sent/received messages for debugging and rate limiting
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Association
  bot_id UUID NOT NULL REFERENCES public.telegram_bots(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,

  -- Message details
  message_id BIGINT, -- Telegram message ID
  message_type TEXT NOT NULL CHECK (message_type IN ('notification', 'command_response', 'error', 'webhook')),
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),

  -- Content
  text_content TEXT,
  payload JSONB, -- Full message payload

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'rate_limited')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Related entities
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  database_id UUID REFERENCES public.databases(id) ON DELETE SET NULL,
  row_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_telegram_messages_bot_id ON public.telegram_messages(bot_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_id ON public.telegram_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_status ON public.telegram_messages(status);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_created_at ON public.telegram_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_project_id ON public.telegram_messages(project_id);

-- Partitioning by month (for performance at scale)
-- Uncomment when ready for production
-- CREATE TABLE telegram_messages_2025_10 PARTITION OF telegram_messages
--   FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- telegram_bots table
ALTER TABLE public.telegram_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bots in their projects"
  ON public.telegram_bots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE p.id = telegram_bots.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

CREATE POLICY "Project owners and admins can manage bots"
  ON public.telegram_bots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE p.id = telegram_bots.project_id
      AND (
        p.user_id = auth.uid()
        OR (pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE p.id = telegram_bots.project_id
      AND (
        p.user_id = auth.uid()
        OR (pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin'))
      )
    )
  );

-- telegram_chats table
ALTER TABLE public.telegram_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chats in their projects"
  ON public.telegram_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE p.id = telegram_chats.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

CREATE POLICY "Project members can manage their chats"
  ON public.telegram_chats FOR ALL
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE p.id = telegram_chats.project_id
      AND (
        p.user_id = auth.uid()
        OR (pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin'))
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE p.id = telegram_chats.project_id
      AND (
        p.user_id = auth.uid()
        OR (pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin'))
      )
    )
  );

-- telegram_messages table
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their projects"
  ON public.telegram_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.project_members pm ON p.id = pm.project_id
      WHERE p.id = telegram_messages.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

-- Only service role can insert/update messages (Edge Functions)
CREATE POLICY "Service role can manage messages"
  ON public.telegram_messages FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get active Telegram chats for a project
CREATE OR REPLACE FUNCTION public.get_project_telegram_chats(p_project_id UUID)
RETURNS TABLE (
  chat_id BIGINT,
  chat_type TEXT,
  chat_title TEXT,
  bot_token TEXT,
  subscribed_events JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.chat_id,
    tc.chat_type,
    tc.chat_title,
    tb.bot_token,
    tc.subscribed_events
  FROM public.telegram_chats tc
  JOIN public.telegram_bots tb ON tb.id = tc.bot_id
  WHERE tc.project_id = p_project_id
    AND tc.active = true
    AND tb.enabled = true
    AND (tc.muted_until IS NULL OR tc.muted_until < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log Telegram message
CREATE OR REPLACE FUNCTION public.log_telegram_message(
  p_bot_id UUID,
  p_chat_id BIGINT,
  p_message_type TEXT,
  p_direction TEXT,
  p_text_content TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID AS $$
DECLARE
  message_id UUID;
BEGIN
  INSERT INTO public.telegram_messages (
    bot_id,
    chat_id,
    message_type,
    direction,
    text_content,
    payload,
    project_id,
    status
  ) VALUES (
    p_bot_id,
    p_chat_id,
    p_message_type,
    p_direction,
    p_text_content,
    p_payload,
    p_project_id,
    p_status
  )
  RETURNING id INTO message_id;

  RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check rate limit for bot
CREATE OR REPLACE FUNCTION public.check_telegram_rate_limit(
  p_bot_id UUID,
  p_chat_id BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
  messages_last_minute INTEGER;
  messages_last_hour INTEGER;
  max_per_minute INTEGER;
  max_per_hour INTEGER;
BEGIN
  -- Get bot limits
  SELECT
    max_messages_per_minute,
    max_messages_per_hour
  INTO max_per_minute, max_per_hour
  FROM public.telegram_bots
  WHERE id = p_bot_id;

  -- Count messages in last minute
  SELECT COUNT(*)
  INTO messages_last_minute
  FROM public.telegram_messages
  WHERE bot_id = p_bot_id
    AND chat_id = p_chat_id
    AND direction = 'outgoing'
    AND created_at > NOW() - INTERVAL '1 minute';

  IF messages_last_minute >= max_per_minute THEN
    RETURN FALSE;
  END IF;

  -- Count messages in last hour
  SELECT COUNT(*)
  INTO messages_last_hour
  FROM public.telegram_messages
  WHERE bot_id = p_bot_id
    AND chat_id = p_chat_id
    AND direction = 'outgoing'
    AND created_at > NOW() - INTERVAL '1 hour';

  IF messages_last_hour >= max_per_hour THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update chat activity
CREATE OR REPLACE FUNCTION public.update_telegram_chat_activity(
  p_chat_id BIGINT,
  p_bot_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.telegram_chats
  SET
    last_activity_at = NOW(),
    message_count = message_count + 1
  WHERE chat_id = p_chat_id
    AND bot_id = p_bot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_project_telegram_chats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_telegram_message(UUID, BIGINT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_telegram_rate_limit(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_telegram_chat_activity(BIGINT, UUID) TO authenticated;

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.telegram_bots IS 'Telegram bot configurations for projects';
COMMENT ON TABLE public.telegram_chats IS 'Telegram chat subscriptions to projects/databases';
COMMENT ON TABLE public.telegram_messages IS 'Log of all Telegram messages for debugging and rate limiting';

COMMENT ON FUNCTION public.get_project_telegram_chats IS 'Get all active Telegram chats for a project';
COMMENT ON FUNCTION public.log_telegram_message IS 'Log a Telegram message for tracking and debugging';
COMMENT ON FUNCTION public.check_telegram_rate_limit IS 'Check if bot can send more messages based on rate limits';
COMMENT ON FUNCTION public.update_telegram_chat_activity IS 'Update last activity timestamp for a chat';

-- ============================================================================
-- 8. CLEANUP TRIGGER
-- Auto-delete old messages (older than 30 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_telegram_messages()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.telegram_messages
  WHERE created_at < NOW() - INTERVAL '30 days';

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_telegram_messages_trigger ON public.telegram_messages;
CREATE TRIGGER cleanup_telegram_messages_trigger
  AFTER INSERT ON public.telegram_messages
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_telegram_messages();

COMMENT ON TRIGGER cleanup_telegram_messages_trigger ON public.telegram_messages IS
  'Automatically delete messages older than 30 days to prevent table bloat';
