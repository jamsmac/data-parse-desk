-- Checklist Dependencies
-- Allows creating dependencies between checklist items (task blocking)

CREATE TABLE IF NOT EXISTS checklist_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The task that is blocked (cannot be completed until dependency is met)
  blocked_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,

  -- The task that must be completed first (the dependency)
  depends_on_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,

  -- Dependency type
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN (
    'finish_to_start',  -- blocked task can start only after dependency finishes
    'start_to_start',   -- blocked task can start only after dependency starts
    'finish_to_finish'  -- blocked task can finish only after dependency finishes
  )),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent self-dependencies
  CONSTRAINT no_self_dependency CHECK (blocked_item_id != depends_on_item_id),

  -- Unique dependency relationship
  CONSTRAINT unique_dependency UNIQUE (blocked_item_id, depends_on_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checklist_deps_blocked ON checklist_dependencies(blocked_item_id);
CREATE INDEX IF NOT EXISTS idx_checklist_deps_depends_on ON checklist_dependencies(depends_on_item_id);

-- RLS Policies
ALTER TABLE checklist_dependencies ENABLE ROW LEVEL SECURITY;

-- Users can view dependencies for checklists they have access to
CREATE POLICY "Users can view checklist dependencies"
  ON checklist_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checklist_items ci
      JOIN custom_checklists cc ON cc.id = ci.checklist_id
      WHERE ci.id = blocked_item_id
      AND cc.user_id = auth.uid()
    )
  );

-- Users can create dependencies for their own checklists
CREATE POLICY "Users can create checklist dependencies"
  ON checklist_dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklist_items ci
      JOIN custom_checklists cc ON cc.id = ci.checklist_id
      WHERE ci.id = blocked_item_id
      AND cc.user_id = auth.uid()
    )
  );

-- Users can delete their own checklist dependencies
CREATE POLICY "Users can delete checklist dependencies"
  ON checklist_dependencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM checklist_items ci
      JOIN custom_checklists cc ON cc.id = ci.checklist_id
      WHERE ci.id = blocked_item_id
      AND cc.user_id = auth.uid()
    )
  );

-- Function to check if a checklist item can be marked as complete
CREATE OR REPLACE FUNCTION can_complete_checklist_item(item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  unmet_dependencies INTEGER;
BEGIN
  -- Count dependencies that are not yet completed
  SELECT COUNT(*) INTO unmet_dependencies
  FROM checklist_dependencies cd
  JOIN checklist_items ci ON ci.id = cd.depends_on_item_id
  WHERE cd.blocked_item_id = item_id
  AND cd.dependency_type = 'finish_to_start'
  AND ci.is_completed = false;

  RETURN unmet_dependencies = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all items blocked by completing this item
CREATE OR REPLACE FUNCTION get_unblocked_items(completed_item_id UUID)
RETURNS TABLE(item_id UUID, item_text TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ci.id, ci.item_text
  FROM checklist_dependencies cd
  JOIN checklist_items ci ON ci.id = cd.blocked_item_id
  WHERE cd.depends_on_item_id = completed_item_id
  AND NOT EXISTS (
    -- Check if there are any other incomplete dependencies
    SELECT 1
    FROM checklist_dependencies cd2
    JOIN checklist_items ci2 ON ci2.id = cd2.depends_on_item_id
    WHERE cd2.blocked_item_id = ci.id
    AND ci2.is_completed = false
    AND cd2.depends_on_item_id != completed_item_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent completing items with unmet dependencies
CREATE OR REPLACE FUNCTION prevent_completing_blocked_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check when marking as completed
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    IF NOT can_complete_checklist_item(NEW.id) THEN
      RAISE EXCEPTION 'Cannot complete item: unmet dependencies exist';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_dependencies_before_complete
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW
  WHEN (NEW.is_completed IS DISTINCT FROM OLD.is_completed)
  EXECUTE FUNCTION prevent_completing_blocked_items();

-- Comments
COMMENT ON TABLE checklist_dependencies IS 'Dependencies between checklist items for task ordering';
COMMENT ON COLUMN checklist_dependencies.blocked_item_id IS 'The task that is blocked by the dependency';
COMMENT ON COLUMN checklist_dependencies.depends_on_item_id IS 'The task that must be completed first';
COMMENT ON COLUMN checklist_dependencies.dependency_type IS 'Type of dependency relationship';
COMMENT ON FUNCTION can_complete_checklist_item IS 'Returns true if all dependencies for this item are met';
COMMENT ON FUNCTION get_unblocked_items IS 'Returns items that become unblocked when this item is completed';
