-- ============================================================================
-- Migration: Push Notifications System
-- Description: Store push notification subscriptions for PWA
-- Date: 2025-10-22
-- Priority: P1 (Stage 6 - PWA Offline Mode Enhancements)
-- ============================================================================

-- ============================================================================
-- 1. PUSH SUBSCRIPTIONS TABLE
-- Stores Web Push API subscriptions for each user
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User association
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Push subscription data
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL, -- Public key for encryption
  auth_key TEXT NOT NULL,   -- Auth secret for encryption

  -- Device information (optional)
  user_agent TEXT,
  device_name TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),

  -- Subscription settings
  enabled BOOLEAN DEFAULT true,
  notification_types JSONB DEFAULT '["all"]'::jsonb, -- Types of notifications to receive

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_user_endpoint UNIQUE(user_id, endpoint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled ON public.push_subscriptions(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at_trigger ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at_trigger
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- ============================================================================
-- 2. NOTIFICATION HISTORY TABLE
-- Track sent notifications for analytics and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,

  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  tag TEXT,
  data JSONB,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'clicked')),
  error_message TEXT,

  -- Metadata
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON public.notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON public.notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON public.notification_history(created_at DESC);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- push_subscriptions table
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- notification_history table
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification history"
  ON public.notification_history FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON public.notification_history FOR INSERT
  WITH CHECK (true); -- Will be restricted by service role key

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get active push subscriptions for a user
CREATE OR REPLACE FUNCTION public.get_user_push_subscriptions(p_user_id UUID)
RETURNS TABLE (
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT,
  notification_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key,
    ps.notification_types
  FROM public.push_subscriptions ps
  WHERE ps.user_id = p_user_id
    AND ps.enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log notification sent
CREATE OR REPLACE FUNCTION public.log_notification(
  p_user_id UUID,
  p_subscription_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_status TEXT DEFAULT 'sent',
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notification_history (
    user_id,
    subscription_id,
    title,
    body,
    status,
    data,
    sent_at
  ) VALUES (
    p_user_id,
    p_subscription_id,
    p_title,
    p_body,
    p_status,
    p_data,
    CASE WHEN p_status = 'sent' THEN NOW() ELSE NULL END
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark notification as clicked
CREATE OR REPLACE FUNCTION public.mark_notification_clicked(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notification_history
  SET
    status = 'clicked',
    clicked_at = NOW()
  WHERE id = p_notification_id
    AND status = 'sent';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clean up old notifications (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notification_history
  WHERE created_at < NOW() - INTERVAL '30 days'
  RETURNING COUNT(*) INTO deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_user_push_subscriptions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_notification(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_clicked(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO authenticated;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.push_subscriptions IS 'Web Push API subscriptions for PWA notifications';
COMMENT ON TABLE public.notification_history IS 'History of all push notifications sent to users';

COMMENT ON FUNCTION public.get_user_push_subscriptions IS 'Get all active push subscriptions for a user';
COMMENT ON FUNCTION public.log_notification IS 'Log a sent push notification';
COMMENT ON FUNCTION public.mark_notification_clicked IS 'Mark a notification as clicked by user';
COMMENT ON FUNCTION public.cleanup_old_notifications IS 'Delete notifications older than 30 days';

-- ============================================================================
-- 7. AUTO-CLEANUP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_cleanup_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Run cleanup every 100 inserts
  IF (NEW.id::text::bigint % 100) = 0 THEN
    PERFORM cleanup_old_notifications();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_cleanup_notifications_trigger ON public.notification_history;
CREATE TRIGGER auto_cleanup_notifications_trigger
  AFTER INSERT ON public.notification_history
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_old_notifications();

COMMENT ON TRIGGER auto_cleanup_notifications_trigger ON public.notification_history IS
  'Automatically cleanup old notifications every 100 inserts';
