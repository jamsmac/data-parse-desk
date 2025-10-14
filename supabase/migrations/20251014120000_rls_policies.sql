-- =====================================================
-- RLS POLICIES FOR COLLABORATION & SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rows ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- Admins and owners can read all users
CREATE POLICY "Admins can read all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text
    AND role IN ('admin', 'owner')
  )
);

-- Owners can update any user
CREATE POLICY "Owners can update users"
ON users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text
    AND role = 'owner'
  )
);

-- =====================================================
-- USER_PERMISSIONS TABLE POLICIES
-- =====================================================

-- Users can read their own permissions
CREATE POLICY "Users can read own permissions"
ON user_permissions FOR SELECT
USING (auth.uid()::text = user_id);

-- Admins can read all permissions
CREATE POLICY "Admins can read permissions"
ON user_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text
    AND role IN ('admin', 'owner')
  )
);

-- Admins and owners can manage permissions
CREATE POLICY "Admins can manage permissions"
ON user_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text
    AND role IN ('admin', 'owner')
  )
);

-- =====================================================
-- DATABASES TABLE POLICIES
-- =====================================================

-- Users can read databases they have access to
CREATE POLICY "Users can read accessible databases"
ON databases FOR SELECT
USING (
  created_by = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()::text
    AND database_id = databases.id
  )
);

-- Users can create databases
CREATE POLICY "Users can create databases"
ON databases FOR INSERT
WITH CHECK (
  created_by = auth.uid()::text
);

-- Owners and admins can update databases
CREATE POLICY "Owners can update databases"
ON databases FOR UPDATE
USING (
  created_by = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()::text
    AND database_id = databases.id
    AND role IN ('admin', 'owner')
  )
);

-- Owners can delete databases
CREATE POLICY "Owners can delete databases"
ON databases FOR DELETE
USING (
  created_by = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()::text
    AND database_id = databases.id
    AND role = 'owner'
  )
);

-- =====================================================
-- TABLES TABLE POLICIES
-- =====================================================

-- Users can read tables from accessible databases
CREATE POLICY "Users can read accessible tables"
ON tables FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM databases
    WHERE databases.id = tables.database_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
      )
    )
  )
);

-- Editors and above can create tables
CREATE POLICY "Editors can create tables"
ON tables FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM databases
    WHERE databases.id = tables.database_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
        AND role IN ('editor', 'admin', 'owner')
      )
    )
  )
);

-- Editors and above can update tables
CREATE POLICY "Editors can update tables"
ON tables FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM databases
    WHERE databases.id = tables.database_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
        AND role IN ('editor', 'admin', 'owner')
      )
    )
  )
);

-- Admins and owners can delete tables
CREATE POLICY "Admins can delete tables"
ON tables FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM databases
    WHERE databases.id = tables.database_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
        AND role IN ('admin', 'owner')
      )
    )
  )
);

-- =====================================================
-- COLUMNS TABLE POLICIES
-- =====================================================

-- Users can read columns from accessible tables
CREATE POLICY "Users can read accessible columns"
ON columns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tables
    JOIN databases ON databases.id = tables.database_id
    WHERE tables.id = columns.table_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
      )
    )
  )
);

-- Editors and above can manage columns
CREATE POLICY "Editors can manage columns"
ON columns FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM tables
    JOIN databases ON databases.id = tables.database_id
    WHERE tables.id = columns.table_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
        AND role IN ('editor', 'admin', 'owner')
      )
    )
  )
);

-- =====================================================
-- ROWS TABLE POLICIES
-- =====================================================

-- Users can read rows from accessible tables
CREATE POLICY "Users can read accessible rows"
ON rows FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tables
    JOIN databases ON databases.id = tables.database_id
    WHERE tables.id = rows.table_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
      )
    )
  )
);

-- Editors and above can create rows
CREATE POLICY "Editors can create rows"
ON rows FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tables
    JOIN databases ON databases.id = tables.database_id
    WHERE tables.id = rows.table_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
        AND role IN ('editor', 'admin', 'owner')
      )
    )
  )
);

-- Editors and above can update rows
CREATE POLICY "Editors can update rows"
ON rows FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tables
    JOIN databases ON databases.id = tables.database_id
    WHERE tables.id = rows.table_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
        AND role IN ('editor', 'admin', 'owner')
      )
    )
  )
);

-- Editors and above can delete rows
CREATE POLICY "Editors can delete rows"
ON rows FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tables
    JOIN databases ON databases.id = tables.database_id
    WHERE tables.id = rows.table_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
        AND role IN ('editor', 'admin', 'owner')
      )
    )
  )
);

-- =====================================================
-- COMMENTS TABLE POLICIES
-- =====================================================

-- Users can read comments from accessible databases
CREATE POLICY "Users can read accessible comments"
ON comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM databases
    WHERE databases.id = comments.database_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
      )
    )
  )
);

-- Users can create comments on accessible databases
CREATE POLICY "Users can create comments"
ON comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM databases
    WHERE databases.id = comments.database_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
      )
    )
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE
USING (
  user_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM databases
    JOIN user_permissions ON user_permissions.database_id = databases.id
    WHERE databases.id = comments.database_id
    AND user_permissions.user_id = auth.uid()::text
    AND user_permissions.role IN ('admin', 'owner')
  )
);

-- =====================================================
-- ACTIVITIES TABLE POLICIES
-- =====================================================

-- Users can read activities from accessible databases
CREATE POLICY "Users can read accessible activities"
ON activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM databases
    WHERE databases.id = activities.database_id
    AND (
      databases.created_by = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()::text
        AND database_id = databases.id
      )
    )
  )
);

-- System creates activity records
CREATE POLICY "System can create activities"
ON activities FOR INSERT
WITH CHECK (true);

-- =====================================================
-- NOTIFICATIONS TABLE POLICIES
-- =====================================================

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid()::text);

-- System can create notifications
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (user_id = auth.uid()::text);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION has_database_permission(
  p_user_id TEXT,
  p_database_id UUID,
  p_required_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = p_user_id
    AND database_id = p_database_id
    AND (
      CASE p_required_role
        WHEN 'viewer' THEN role IN ('viewer', 'editor', 'admin', 'owner')
        WHEN 'editor' THEN role IN ('editor', 'admin', 'owner')
        WHEN 'admin' THEN role IN ('admin', 'owner')
        WHEN 'owner' THEN role = 'owner'
        ELSE false
      END
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is database owner
CREATE OR REPLACE FUNCTION is_database_owner(
  p_user_id TEXT,
  p_database_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM databases
    WHERE id = p_database_id
    AND created_by = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = p_user_id
    AND database_id = p_database_id
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for user_permissions lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_database_id ON user_permissions(database_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_composite ON user_permissions(user_id, database_id);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_database_id ON comments(database_id);
CREATE INDEX IF NOT EXISTS idx_comments_row_id ON comments(row_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS idx_activities_database_id ON activities(database_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Indexes for databases
CREATE INDEX IF NOT EXISTS idx_databases_created_by ON databases(created_by);

-- Indexes for tables
CREATE INDEX IF NOT EXISTS idx_tables_database_id ON tables(database_id);

-- Indexes for rows
CREATE INDEX IF NOT EXISTS idx_rows_table_id ON rows(table_id);
