-- ============================================================================
-- Migration Rollback: Fix Insecure RLS Policies
-- Date: 2025-10-26
-- Type: DOWN (Rollback)
-- Description: Rollback security fixes from 20251022000007_fix_insecure_rls_policies.sql
-- ============================================================================

-- ⚠️  DANGER: This rollback REMOVES security measures!
-- Only run this if you absolutely need to rollback to insecure policies
-- This is NOT recommended for production environments!

-- ============================================================================
-- STEP 1: DROP ALL SECURE POLICIES
-- ============================================================================

-- Activity Log policies
DROP POLICY IF EXISTS "System can insert activities" ON public.activity_log;
DROP POLICY IF EXISTS "Users can view activities in their projects" ON public.activity_log;

-- Data Insights policies
DROP POLICY IF EXISTS "Service role can insert insights" ON public.data_insights;
DROP POLICY IF EXISTS "Users can view insights for their databases" ON public.data_insights;

-- Database Relations policies
DROP POLICY IF EXISTS "Database owners can delete relations" ON public.database_relations;
DROP POLICY IF EXISTS "Database owners can update relations" ON public.database_relations;
DROP POLICY IF EXISTS "Database owners can create relations" ON public.database_relations;
DROP POLICY IF EXISTS "Users can view relations of accessible databases" ON public.database_relations;

-- Audit Log policies
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_log;

-- Files policies
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.files;
DROP POLICY IF EXISTS "Users can upload their own files" ON public.files;
DROP POLICY IF EXISTS "Users can view their files" ON public.files;

-- Table Schemas policies
DROP POLICY IF EXISTS "Database owners can delete schemas" ON public.table_schemas;
DROP POLICY IF EXISTS "Database owners can update schemas" ON public.table_schemas;
DROP POLICY IF EXISTS "Database owners can create schemas" ON public.table_schemas;
DROP POLICY IF EXISTS "Users can view schemas of accessible databases" ON public.table_schemas;

-- Databases policies
DROP POLICY IF EXISTS "Users can delete their own databases" ON public.databases;
DROP POLICY IF EXISTS "Users can update their own databases" ON public.databases;
DROP POLICY IF EXISTS "Users can create their own databases" ON public.databases;
DROP POLICY IF EXISTS "Users can view their databases" ON public.databases;

-- ============================================================================
-- STEP 2: DROP PERFORMANCE INDEXES FOR RLS
-- ============================================================================

DROP INDEX IF EXISTS public.idx_activity_log_user_id;
DROP INDEX IF EXISTS public.idx_activity_log_project_id;
DROP INDEX IF EXISTS public.idx_database_relations_source;
DROP INDEX IF EXISTS public.idx_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_files_database_id;
DROP INDEX IF EXISTS public.idx_files_uploaded_by;
DROP INDEX IF EXISTS public.idx_table_schemas_database_id;
DROP INDEX IF EXISTS public.idx_project_members_project_role;
DROP INDEX IF EXISTS public.idx_project_members_user_project;
DROP INDEX IF EXISTS public.idx_databases_created_by;

-- ============================================================================
-- STEP 3: RESTORE INSECURE POLICIES (USING true)
-- ============================================================================

-- ⚠️  WARNING: These policies allow ANYONE to access data!

-- Databases table (insecure policies)
CREATE POLICY "Anyone can view databases" ON public.databases FOR SELECT USING (true);
CREATE POLICY "Anyone can create databases" ON public.databases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update databases" ON public.databases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete databases" ON public.databases FOR DELETE USING (true);

-- Table Schemas (insecure policies)
CREATE POLICY "Anyone can view schemas" ON public.table_schemas FOR SELECT USING (true);
CREATE POLICY "Anyone can create schemas" ON public.table_schemas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update schemas" ON public.table_schemas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete schemas" ON public.table_schemas FOR DELETE USING (true);

-- Files (insecure policies)
CREATE POLICY "Anyone can view files" ON public.files FOR SELECT USING (true);
CREATE POLICY "Anyone can create files" ON public.files FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update files" ON public.files FOR UPDATE USING (true);

-- Audit Log (insecure policies)
CREATE POLICY "Anyone can view audit log" ON public.audit_log FOR SELECT USING (true);

-- Database Relations (insecure policies)
CREATE POLICY "Anyone can view relations" ON public.database_relations FOR SELECT USING (true);
CREATE POLICY "Anyone can create relations" ON public.database_relations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update relations" ON public.database_relations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete relations" ON public.database_relations FOR DELETE USING (true);

-- Data Insights (insecure policy)
CREATE POLICY "Service role can insert insights" ON public.data_insights FOR INSERT WITH CHECK (true);

-- Activity Log (insecure policy)
CREATE POLICY "Anyone can insert activities" ON public.activity_log FOR INSERT WITH CHECK (true);

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- ⚠️  CRITICAL WARNING:
-- Your database is now INSECURE!
-- All users can:
--   ✗ View other users' databases
--   ✗ Delete other users' data
--   ✗ Modify any records
--   ✗ No authentication checks
--
-- This rollback should ONLY be used for:
--   - Emergency fixes
--   - Testing purposes
--   - Development environments
--
-- DO NOT use in production!
-- Re-apply security fixes as soon as possible:
--   Run: 20251022000007_fix_insecure_rls_policies.sql
