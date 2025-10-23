-- ============================================================================
-- Migration: Performance Indexes for Production Database
-- Date: 2025-10-23
-- Tables: 16 tables (activities, audit_log, comments, databases, files, etc.)
-- Expected improvement: 50-90% faster queries
-- Time: ~2-5 minutes
-- ============================================================================

-- ============================================================================
-- 1. DATABASES - Core table for database management
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_databases_active_created
  ON public.databases(is_active, created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_databases_created_by
  ON public.databases(created_by, created_at DESC)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_databases_system_name
  ON public.databases(system_name);

COMMENT ON INDEX idx_databases_active_created IS 'Active databases sorted by creation time';
COMMENT ON INDEX idx_databases_created_by IS 'User-specific databases';
COMMENT ON INDEX idx_databases_system_name IS 'Fast lookup by system name';

-- ============================================================================
-- 2. FILES - File upload and processing
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_files_database_created
  ON public.files(database_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_files_processing_status
  ON public.files(processing_status, created_at DESC)
  WHERE processing_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_created_by
  ON public.files(created_by)
  WHERE created_by IS NOT NULL;

COMMENT ON INDEX idx_files_database_created IS 'Files by database and time';
COMMENT ON INDEX idx_files_processing_status IS 'Filter files by processing status';
COMMENT ON INDEX idx_files_created_by IS 'User-specific files';

-- ============================================================================
-- 3. TABLE_SCHEMAS - Schema definitions
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_table_schemas_database
  ON public.table_schemas(database_id, display_order);

COMMENT ON INDEX idx_table_schemas_database IS 'Schema columns ordered by display order';

-- ============================================================================
-- 4. ORDERS - Main orders table (already has some indexes)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_paying_time
  ON public.orders(paying_time DESC)
  WHERE paying_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status_machine
  ON public.orders(order_status, machine_code);

CREATE INDEX IF NOT EXISTS idx_orders_brew_status
  ON public.orders(brew_status, creation_time DESC)
  WHERE brew_status IS NOT NULL;

COMMENT ON INDEX idx_orders_paying_time IS 'Payment time analysis';
COMMENT ON INDEX idx_orders_status_machine IS 'Filter by status and machine';
COMMENT ON INDEX idx_orders_brew_status IS 'Brewing status tracking';

-- ============================================================================
-- 5. UPLOAD_LOG - Upload history
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_upload_log_status_date
  ON public.upload_log(status, upload_date DESC);

COMMENT ON INDEX idx_upload_log_status_date IS 'Recent uploads by status';

-- ============================================================================
-- 6. COMMENTS - Collaboration comments
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_comments_database_created
  ON public.comments(database_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_user
  ON public.comments(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_comments_database_created IS 'Comments by database and time';
COMMENT ON INDEX idx_comments_user IS 'User comments timeline';

-- ============================================================================
-- 7. AUDIT_LOG - Audit trail
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp
  ON public.audit_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_action
  ON public.audit_log(user_id, action_type, timestamp DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log(entity_type, entity_id, timestamp DESC)
  WHERE entity_id IS NOT NULL;

COMMENT ON INDEX idx_audit_log_timestamp IS 'Recent audit events';
COMMENT ON INDEX idx_audit_log_user_action IS 'User activity tracking';
COMMENT ON INDEX idx_audit_log_entity IS 'Entity-specific audit trail';

-- ============================================================================
-- 8. ACTIVITIES - User activities
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_activities_user_time
  ON public.activities(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_database
  ON public.activities(database_id, created_at DESC)
  WHERE database_id IS NOT NULL;

COMMENT ON INDEX idx_activities_user_time IS 'User activity timeline';
COMMENT ON INDEX idx_activities_database IS 'Database-specific activities';

-- ============================================================================
-- 9. NOTIFICATIONS - User notifications
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

COMMENT ON INDEX idx_notifications_user_created IS 'User notifications timeline';
COMMENT ON INDEX idx_notifications_unread IS 'Unread notifications';

-- ============================================================================
-- 10. NOTIFICATION_SETTINGS - User preferences
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notification_settings_user
  ON public.notification_settings(user_id);

COMMENT ON INDEX idx_notification_settings_user IS 'User notification preferences';

-- ============================================================================
-- 11. USERS - User accounts
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email
  ON public.users(email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_created
  ON public.users(created_at DESC);

COMMENT ON INDEX idx_users_email IS 'User lookup by email';
COMMENT ON INDEX idx_users_created IS 'Recent user registrations';

-- ============================================================================
-- 12. USER_PERMISSIONS - Permission management
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_permissions_user
  ON public.user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_database
  ON public.user_permissions(database_id);

COMMENT ON INDEX idx_user_permissions_user IS 'User-specific permissions';
COMMENT ON INDEX idx_user_permissions_database IS 'Database permissions';

-- ============================================================================
-- 13. DATABASE_PERMISSIONS - Database-level permissions
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_database_permissions_db
  ON public.database_permissions(database_id);

CREATE INDEX IF NOT EXISTS idx_database_permissions_user
  ON public.database_permissions(user_id, database_id);

COMMENT ON INDEX idx_database_permissions_db IS 'Permissions by database';
COMMENT ON INDEX idx_database_permissions_user IS 'User database permissions';

-- ============================================================================
-- 14. DATABASE_RELATIONS - Table relationships
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_database_relations_source
  ON public.database_relations(source_database_id);

CREATE INDEX IF NOT EXISTS idx_database_relations_target
  ON public.database_relations(target_database_id);

COMMENT ON INDEX idx_database_relations_source IS 'Relations from source';
COMMENT ON INDEX idx_database_relations_target IS 'Relations to target';

-- ============================================================================
-- Update statistics for all tables
-- ============================================================================

ANALYZE public.databases;
ANALYZE public.files;
ANALYZE public.table_schemas;
ANALYZE public.orders;
ANALYZE public.upload_log;
ANALYZE public.comments;
ANALYZE public.audit_log;
ANALYZE public.activities;
ANALYZE public.notifications;
ANALYZE public.notification_settings;
ANALYZE public.users;
ANALYZE public.user_permissions;
ANALYZE public.database_permissions;
ANALYZE public.database_relations;
