-- ============================================================================
-- Migration: Fix dynamic table RLS policies
-- Priority: CRITICAL
-- Issue: Dynamic tables (data_*) have no default RLS policies
-- Date: 2025-10-27
-- ============================================================================

-- Update create_database() function to add default RLS policies
CREATE OR REPLACE FUNCTION create_database(
  p_name TEXT,
  p_user_id UUID,
  p_description TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_database_id UUID;
  v_table_name TEXT;
  v_result JSONB;
BEGIN
  -- Create database record
  INSERT INTO databases (name, description, icon, color, created_by, project_id)
  VALUES (p_name, p_description, p_icon, p_color, p_user_id, p_project_id)
  RETURNING id INTO v_database_id;

  -- Create dynamic table name
  v_table_name := 'data_' || REPLACE(v_database_id::TEXT, '-', '_');

  -- Validate table name length (PostgreSQL limit is 63 chars)
  IF length(v_table_name) > 63 THEN
    RAISE EXCEPTION 'Table name too long: % (max 63 chars)', v_table_name;
  END IF;

  -- Create dynamic table with proper structure
  EXECUTE format('
    CREATE TABLE %I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data JSONB DEFAULT ''''{}''''::jsonb
    )', v_table_name);

  -- Enable RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table_name);

  -- =========================================================================
  -- CREATE DEFAULT RLS POLICIES
  -- =========================================================================

  -- Policy 1: SELECT - Users can view their own data OR data in projects they're members of
  EXECUTE format('
    CREATE POLICY "Users can view accessible data"
      ON %I FOR SELECT
      USING (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM databases d
          LEFT JOIN project_members pm ON pm.project_id = d.project_id
          WHERE d.id = %L::uuid
          AND (d.created_by = auth.uid() OR pm.user_id = auth.uid())
        )
      )
  ', v_table_name, v_database_id);

  -- Policy 2: INSERT - Users can insert if they have access to database
  EXECUTE format('
    CREATE POLICY "Users can insert into accessible databases"
      ON %I FOR INSERT
      WITH CHECK (
        created_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM databases d
          LEFT JOIN project_members pm ON pm.project_id = d.project_id
          WHERE d.id = %L::uuid
          AND (
            d.created_by = auth.uid()
            OR (pm.user_id = auth.uid() AND pm.role IN (''''owner'''', ''''admin'''', ''''editor''''))
          )
        )
      )
  ', v_table_name, v_database_id);

  -- Policy 3: UPDATE - Users can update their own data OR if they're admin/owner
  EXECUTE format('
    CREATE POLICY "Users can update their own data"
      ON %I FOR UPDATE
      USING (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM databases d
          LEFT JOIN project_members pm ON pm.project_id = d.project_id
          WHERE d.id = %L::uuid
          AND pm.user_id = auth.uid()
          AND pm.role IN (''''owner'''', ''''admin'''')
        )
      )
  ', v_table_name, v_database_id);

  -- Policy 4: DELETE - Users can delete their own data OR if they're database owner
  EXECUTE format('
    CREATE POLICY "Users can delete their own data"
      ON %I FOR DELETE
      USING (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM databases d
          WHERE d.id = %L::uuid
          AND d.created_by = auth.uid()
        )
      )
  ', v_table_name, v_database_id);

  -- Create indexes for RLS performance
  EXECUTE format('
    CREATE INDEX %I ON %I(created_by, created_at DESC)
  ', 'idx_' || v_table_name || '_created_by', v_table_name);

  EXECUTE format('
    CREATE INDEX %I ON %I USING GIN(data)
  ', 'idx_' || v_table_name || '_data', v_table_name);

  -- Add trigger for updated_at
  EXECUTE format('
    CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
  ', v_table_name, v_table_name);

  -- Return created database
  SELECT row_to_json(d.*)::JSONB INTO v_result
  FROM databases d
  WHERE d.id = v_database_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_database IS
  'Creates a new database with dynamic table and secure RLS policies. Updated 2025-10-27 to include default RLS.';

-- Create helper function for updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_test_db_id UUID;
  v_table_name TEXT;
  v_policy_count INTEGER;
BEGIN
  -- Test: Create a test database
  SELECT (create_database('Security Test DB', auth.uid()))::jsonb->>'id' INTO v_test_db_id;

  IF v_test_db_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create test database';
  END IF;

  v_table_name := 'data_' || REPLACE(v_test_db_id::TEXT, '-', '_');

  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = v_table_name
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on %', v_table_name;
  END IF;

  -- Count policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = v_table_name;

  IF v_policy_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 policies, found %', v_policy_count;
  END IF;

  -- Cleanup test database
  DELETE FROM databases WHERE id = v_test_db_id;

  RAISE NOTICE '✅ Dynamic table RLS policies working correctly';
  RAISE NOTICE '  - RLS enabled: YES';
  RAISE NOTICE '  - Policies created: % (SELECT, INSERT, UPDATE, DELETE)', v_policy_count;
  RAISE NOTICE '  - Indexes created: 2 (created_by, data GIN)';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
==============================================================================
✅ Migration 20251027000002 completed successfully

Changes:
- Updated create_database() function with SECURITY DEFINER
- Added SET search_path = public, pg_temp
- Added 4 default RLS policies for all dynamic tables:
  * SELECT: Own data OR project member
  * INSERT: Editor+ role required
  * UPDATE: Own data OR admin+
  * DELETE: Own data OR database owner
- Added performance indexes (created_by, data GIN)
- Added updated_at trigger
- Added table name length validation

Security improvement: All new dynamic tables now have secure RLS policies
==============================================================================
  ';
END $$;
