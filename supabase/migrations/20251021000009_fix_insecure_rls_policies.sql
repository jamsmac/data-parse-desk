-- ============================================
-- ИСПРАВЛЕНИЕ НЕБЕЗОПАСНЫХ RLS ПОЛИТИК
-- ============================================

-- Шаг 1: Удалить все небезопасные политики
-- ============================================

-- Databases
DROP POLICY IF EXISTS "Anyone can delete databases" ON databases;
DROP POLICY IF EXISTS "Anyone can update databases" ON databases;
DROP POLICY IF EXISTS "Anyone can insert databases" ON databases;

-- Transactions
DROP POLICY IF EXISTS "Anyone can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Anyone can update transactions" ON transactions;
DROP POLICY IF EXISTS "Anyone can delete transactions" ON transactions;

-- Database Metadata
DROP POLICY IF EXISTS "Anyone can update metadata" ON database_metadata;
DROP POLICY IF EXISTS "Anyone can delete metadata" ON database_metadata;

-- Table Schemas
DROP POLICY IF EXISTS "Anyone can update schemas" ON table_schemas;
DROP POLICY IF EXISTS "Anyone can delete schemas" ON table_schemas;

-- Table Rows
DROP POLICY IF EXISTS "Anyone can insert rows" ON table_rows;
DROP POLICY IF EXISTS "Anyone can update rows" ON table_rows;
DROP POLICY IF EXISTS "Anyone can delete rows" ON table_rows;

-- Relations
DROP POLICY IF EXISTS "Anyone can create relations" ON database_relations;
DROP POLICY IF EXISTS "Anyone can update relations" ON database_relations;
DROP POLICY IF EXISTS "Anyone can delete relations" ON database_relations;

-- Composite Views
DROP POLICY IF EXISTS "Anyone can update views" ON composite_views;
DROP POLICY IF EXISTS "Anyone can delete views" ON composite_views;


-- Шаг 2: Создать безопасные политики
-- ============================================

-- DATABASES: Только владелец или админ проекта
-- ============================================

CREATE POLICY "Users can view their databases"
  ON databases FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = databases.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own databases"
  ON databases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own databases"
  ON databases FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = databases.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete their own databases"
  ON databases FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = databases.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );


-- TRANSACTIONS: Только владелец
-- ============================================

CREATE POLICY "Users can view their transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);


-- DATABASE_METADATA: Только владелец БД
-- ============================================

CREATE POLICY "Users can view metadata of their databases"
  ON database_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = database_metadata.database_id
      AND (
        databases.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = databases.project_id
          AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Database owners can update metadata"
  ON database_metadata FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = database_metadata.database_id
      AND databases.user_id = auth.uid()
    )
  );

CREATE POLICY "Database owners can delete metadata"
  ON database_metadata FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = database_metadata.database_id
      AND databases.user_id = auth.uid()
    )
  );


-- TABLE_SCHEMAS: Только владелец БД
-- ============================================

CREATE POLICY "Users can view schemas of accessible databases"
  ON table_schemas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = table_schemas.database_id
      AND (
        databases.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = databases.project_id
          AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Database owners can update schemas"
  ON table_schemas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = table_schemas.database_id
      AND databases.user_id = auth.uid()
    )
  );

CREATE POLICY "Database owners can delete schemas"
  ON table_schemas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = table_schemas.database_id
      AND databases.user_id = auth.uid()
    )
  );


-- TABLE_ROWS: Только члены проекта
-- ============================================

CREATE POLICY "Users can view rows of accessible databases"
  ON table_rows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = table_rows.database_id
      AND (
        databases.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = databases.project_id
          AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Project members can insert rows"
  ON table_rows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = database_id
      AND (
        databases.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = databases.project_id
          AND pm.user_id = auth.uid()
          AND pm.role IN ('owner', 'admin', 'editor')
        )
      )
    )
  );

CREATE POLICY "Project members can update rows"
  ON table_rows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = table_rows.database_id
      AND (
        databases.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = databases.project_id
          AND pm.user_id = auth.uid()
          AND pm.role IN ('owner', 'admin', 'editor')
        )
      )
    )
  );

CREATE POLICY "Project members can delete rows"
  ON table_rows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = table_rows.database_id
      AND (
        databases.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = databases.project_id
          AND pm.user_id = auth.uid()
          AND pm.role IN ('owner', 'admin', 'editor')
        )
      )
    )
  );


-- DATABASE_RELATIONS: Только владелец БД
-- ============================================

CREATE POLICY "Users can view relations of accessible databases"
  ON database_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = database_relations.source_database_id
      AND (
        databases.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = databases.project_id
          AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Database owners can create relations"
  ON database_relations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = source_database_id
      AND databases.user_id = auth.uid()
    )
  );

CREATE POLICY "Database owners can update relations"
  ON database_relations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = database_relations.source_database_id
      AND databases.user_id = auth.uid()
    )
  );

CREATE POLICY "Database owners can delete relations"
  ON database_relations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM databases
      WHERE databases.id = database_relations.source_database_id
      AND databases.user_id = auth.uid()
    )
  );


-- COMPOSITE_VIEWS: Только владелец или члены проекта
-- ============================================

CREATE POLICY "Users can view their composite views"
  ON composite_views FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = composite_views.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own composite views"
  ON composite_views FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own composite views"
  ON composite_views FOR DELETE
  USING (auth.uid() = created_by);


-- ============================================
-- КОНЕЦ МИГРАЦИИ
-- ============================================
