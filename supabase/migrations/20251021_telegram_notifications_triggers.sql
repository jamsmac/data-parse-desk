-- Telegram Real-time Notifications System
-- This migration creates triggers and functions for sending Telegram notifications

-- Function to send Telegram notification via Edge Function
CREATE OR REPLACE FUNCTION notify_telegram_on_data_change()
RETURNS TRIGGER AS $$
DECLARE
  v_database databases;
  v_project projects;
  v_notification_id UUID;
  v_telegram_account telegram_accounts;
BEGIN
  -- Get database info
  SELECT * INTO v_database FROM databases WHERE id = NEW.database_id;

  -- Get project info
  SELECT * INTO v_project FROM projects WHERE id = v_database.project_id;

  -- Get telegram account for database owner
  SELECT * INTO v_telegram_account
  FROM telegram_accounts
  WHERE user_id = v_database.user_id
  AND is_active = true
  LIMIT 1;

  -- Only proceed if user has Telegram connected
  IF v_telegram_account IS NOT NULL THEN
    -- Check notification preferences
    DECLARE
      v_prefs notification_preferences;
    BEGIN
      SELECT * INTO v_prefs
      FROM notification_preferences
      WHERE user_id = v_database.user_id;

      -- Only send if data_change notifications are enabled
      IF v_prefs IS NULL OR v_prefs.data_change = true THEN
        -- Create notification record
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          related_id
        ) VALUES (
          v_database.user_id,
          'Data Updated',
          format('Data was updated in database "%s" (Project: %s)',
            v_database.name,
            v_project.name
          ),
          'data_change',
          NEW.id
        ) RETURNING id INTO v_notification_id;

        -- Call Edge Function to send Telegram message
        PERFORM net.http_post(
          url := current_setting('app.supabase_url') || '/functions/v1/telegram-notify',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_key')
          ),
          body := jsonb_build_object(
            'telegram_id', v_telegram_account.telegram_id,
            'message', format(
              E'\360\237\224\224 *Data Updated*\n\n' ||
              'Database: %s\n' ||
              'Project: %s\n\n' ||
              'View changes in the app.',
              v_database.name,
              v_project.name
            )
          )
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for table_data updates
CREATE TRIGGER telegram_notify_on_table_data_update
AFTER UPDATE ON table_data
FOR EACH ROW
WHEN (OLD.data IS DISTINCT FROM NEW.data)
EXECUTE FUNCTION notify_telegram_on_data_change();

-- Function to notify on new comments
CREATE OR REPLACE FUNCTION notify_telegram_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_database databases;
  v_project projects;
  v_telegram_account telegram_accounts;
  v_commenter_name TEXT;
BEGIN
  -- Get commenter name
  SELECT
    COALESCE(
      (raw_user_meta_data->>'full_name')::TEXT,
      email
    ) INTO v_commenter_name
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Get database and project info
  IF NEW.database_id IS NOT NULL THEN
    SELECT * INTO v_database FROM databases WHERE id = NEW.database_id;
    IF v_database.project_id IS NOT NULL THEN
      SELECT * INTO v_project FROM projects WHERE id = v_database.project_id;

      -- Get project members' telegram accounts
      FOR v_telegram_account IN
        SELECT ta.*
        FROM telegram_accounts ta
        JOIN project_members pm ON pm.user_id = ta.user_id
        WHERE pm.project_id = v_project.id
        AND ta.is_active = true
        AND ta.user_id != NEW.user_id -- Don't notify the commenter
      LOOP
        -- Check notification preferences
        DECLARE
          v_prefs notification_preferences;
        BEGIN
          SELECT * INTO v_prefs
          FROM notification_preferences
          WHERE user_id = v_telegram_account.user_id;

          IF v_prefs IS NULL OR v_prefs.comments = true THEN
            -- Create notification
            INSERT INTO notifications (
              user_id,
              title,
              message,
              type,
              related_id
            ) VALUES (
              v_telegram_account.user_id,
              'New Comment',
              format('%s commented on "%s"', v_commenter_name, v_database.name),
              'comment',
              NEW.id
            );

            -- Send Telegram notification
            PERFORM net.http_post(
              url := current_setting('app.supabase_url') || '/functions/v1/telegram-notify',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.supabase_service_key')
              ),
              body := jsonb_build_object(
                'telegram_id', v_telegram_account.telegram_id,
                'message', format(
                  E'\360\237\222\254 *New Comment*\n\n' ||
                  'From: %s\n' ||
                  'Database: %s\n' ||
                  'Project: %s\n\n' ||
                  '%s',
                  v_commenter_name,
                  v_database.name,
                  v_project.name,
                  substring(NEW.content, 1, 200)
                )
              )
            );
          END IF;
        END;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new comments
CREATE TRIGGER telegram_notify_on_new_comment
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_telegram_on_comment();

-- Function to handle @mentions in comments
CREATE OR REPLACE FUNCTION notify_telegram_on_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_mentioned_user_id UUID;
  v_mentioned_username TEXT;
  v_telegram_account telegram_accounts;
  v_commenter_name TEXT;
  v_database databases;
BEGIN
  -- Extract @mentions from comment content
  FOR v_mentioned_username IN
    SELECT DISTINCT (regexp_matches(NEW.content, '@(\w+)', 'g'))[1]
  LOOP
    -- Find user by username (email or telegram username)
    SELECT u.id INTO v_mentioned_user_id
    FROM auth.users u
    LEFT JOIN telegram_accounts ta ON ta.user_id = u.id
    WHERE u.email LIKE v_mentioned_username || '%'
       OR ta.telegram_username = v_mentioned_username
    LIMIT 1;

    IF v_mentioned_user_id IS NOT NULL THEN
      -- Get mentioned user's telegram account
      SELECT * INTO v_telegram_account
      FROM telegram_accounts
      WHERE user_id = v_mentioned_user_id
      AND is_active = true
      LIMIT 1;

      IF v_telegram_account IS NOT NULL THEN
        -- Get commenter name
        SELECT
          COALESCE(
            (raw_user_meta_data->>'full_name')::TEXT,
            email
          ) INTO v_commenter_name
        FROM auth.users
        WHERE id = NEW.user_id;

        -- Get database info
        SELECT * INTO v_database FROM databases WHERE id = NEW.database_id;

        -- Check notification preferences
        DECLARE
          v_prefs notification_preferences;
        BEGIN
          SELECT * INTO v_prefs
          FROM notification_preferences
          WHERE user_id = v_mentioned_user_id;

          IF v_prefs IS NULL OR v_prefs.mentions = true THEN
            -- Create notification
            INSERT INTO notifications (
              user_id,
              title,
              message,
              type,
              related_id
            ) VALUES (
              v_mentioned_user_id,
              'You were mentioned',
              format('%s mentioned you in a comment', v_commenter_name),
              'mention',
              NEW.id
            );

            -- Send Telegram notification
            PERFORM net.http_post(
              url := current_setting('app.supabase_url') || '/functions/v1/telegram-notify',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.supabase_service_key')
              ),
              body := jsonb_build_object(
                'telegram_id', v_telegram_account.telegram_id,
                'message', format(
                  E'\360\237\223\243 *You were mentioned!*\n\n' ||
                  'From: %s\n' ||
                  'Database: %s\n\n' ||
                  '%s',
                  v_commenter_name,
                  v_database.name,
                  substring(NEW.content, 1, 200)
                )
              )
            );
          END IF;
        END;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for mentions in comments
CREATE TRIGGER telegram_notify_on_mention_in_comment
AFTER INSERT ON comments
FOR EACH ROW
WHEN (NEW.content ~ '@\w+')
EXECUTE FUNCTION notify_telegram_on_mention();

-- Enable pg_net extension if not already enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, anon, authenticated, service_role;

-- Set app settings for Edge Function URL (to be set in Supabase dashboard)
-- ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_key = 'your-service-role-key';
