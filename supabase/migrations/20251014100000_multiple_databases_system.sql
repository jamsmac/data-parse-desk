-- ============================================================================
-- Migration: Multiple Databases System (Phase 1)
-- Description: Core tables for dynamic database management
-- Date: 2025-10-14
-- ============================================================================

-- ============================================================================
-- TABLE: databases
-- Purpose: Registry of all user-created databases
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  table_name TEXT UNIQUE NOT NULL,
  icon_name TEXT DEFAULT 'Database',
  color_hex TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  cached_record_count INTEGER DEFAULT 0,
  last_upload_date TIMESTAMP WITH TIME ZONE,
  column_config JSONB,
  widget_settings JSONB,
  created_by UUID,
  CONSTRAINT valid_system_name CHECK (system_name ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT valid_table_name CHECK (table_name ~ '^user_[a-z][a-z0-9_]*$')
);

-- ============================================================================
-- TABLE: table_schemas
-- Purpose: Detailed schema definition for each database
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.table_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  is_unique BOOLEAN DEFAULT false,
  is_indexed BOOLEAN DEFAULT false,
  default_value TEXT,
  validation_rules JSONB,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(database_id, column_name),
  CONSTRAINT valid_data_type CHECK (data_type IN ('text', 'number', 'date', 'datetime', 'boolean', 'json', 'relation', 'rollup', 'formula', 'lookup'))
);

-- ============================================================================
-- TABLE: files
-- Purpose: Extended information about uploaded files
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES public.databases(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  storage_filename TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID,
  processing_status TEXT DEFAULT 'pending',
  total_rows INTEGER DEFAULT 0,
  inserted_rows INTEGER DEFAULT 0,
  updated_rows INTEGER DEFAULT 0,
  rejected_rows INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  CONSTRAINT valid_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'partial'))
);

-- ============================================================================
-- TABLE: audit_log
-- Purpose: Complete audit trail of all critical operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  CONSTRAINT valid_action CHECK (action_type IN ('create', 'update', 'delete', 'upload', 'export', 'import', 'restore')),
  CONSTRAINT valid_entity CHECK (entity_type IN ('database', 'file', 'record', 'schema', 'user', 'role'))
);

-- ============================================================================
-- TABLE: database_relations (Phase 1.5)
-- Purpose: Define relationships between databases
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.database_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  target_database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  source_column_name TEXT NOT NULL,
  target_column_name TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  relation_name TEXT NOT NULL,
  reverse_relation_name TEXT,
  cascade_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_relation_type CHECK (relation_type IN ('one_to_one', 'one_to_many', 'many_to_many')),
  UNIQUE(source_database_id, source_column_name, target_database_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_databases_system_name ON public.databases(system_name);
CREATE INDEX IF NOT EXISTS idx_databases_is_active ON public.databases(is_active);
CREATE INDEX IF NOT EXISTS idx_table_schemas_database_id ON public.table_schemas(database_id);
CREATE INDEX IF NOT EXISTS idx_files_database_id ON public.files(database_id);
CREATE INDEX IF NOT EXISTS idx_files_upload_date ON public.files(upload_date);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log(timestamp DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_audit_log_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action_type, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action_type, old_values, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action_type, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER trigger_databases_updated_at
  BEFORE UPDATE ON public.databases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_table_schemas_updated_at
  BEFORE UPDATE ON public.table_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_databases_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.databases
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log_entry();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_relations ENABLE ROW LEVEL SECURITY;

-- Public access policies (MVP - will be restricted with auth later)
CREATE POLICY "Anyone can view databases" ON public.databases FOR SELECT USING (true);
CREATE POLICY "Anyone can create databases" ON public.databases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update databases" ON public.databases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete databases" ON public.databases FOR DELETE USING (true);

CREATE POLICY "Anyone can view schemas" ON public.table_schemas FOR SELECT USING (true);
CREATE POLICY "Anyone can create schemas" ON public.table_schemas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update schemas" ON public.table_schemas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete schemas" ON public.table_schemas FOR DELETE USING (true);

CREATE POLICY "Anyone can view files" ON public.files FOR SELECT USING (true);
CREATE POLICY "Anyone can create files" ON public.files FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update files" ON public.files FOR UPDATE USING (true);

CREATE POLICY "Anyone can view audit log" ON public.audit_log FOR SELECT USING (true);

CREATE POLICY "Anyone can view relations" ON public.database_relations FOR SELECT USING (true);
CREATE POLICY "Anyone can create relations" ON public.database_relations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update relations" ON public.database_relations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete relations" ON public.database_relations FOR DELETE USING (true);

-- ============================================================================
-- SEED DATA: Migrate existing "orders" to new system
-- ============================================================================
INSERT INTO public.databases (
  system_name,
  display_name,
  description,
  table_name,
  icon_name,
  color_hex,
  column_config
) VALUES (
  'orders_2024',
  'Orders 2024',
  'All vending machine orders from 2024',
  'orders',
  'ShoppingCart',
  '#10B981',
  '{"type": "orders", "legacy": true}'::jsonb
) ON CONFLICT DO NOTHING;

-- Create schema entries for orders table
INSERT INTO public.table_schemas (database_id, column_name, data_type, display_name, is_indexed, display_order)
SELECT 
  (SELECT id FROM public.databases WHERE system_name = 'orders_2024'),
  'order_number', 'text', 'Order Number', true, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.table_schemas ts
  JOIN public.databases db ON ts.database_id = db.id
  WHERE db.system_name = 'orders_2024' AND ts.column_name = 'order_number'
);

INSERT INTO public.table_schemas (database_id, column_name, data_type, display_name, is_indexed, display_order)
SELECT 
  (SELECT id FROM public.databases WHERE system_name = 'orders_2024'),
  column_name, data_type, display_name, is_indexed, display_order
FROM (VALUES
  ('operator_code', 'text', 'Operator Code', false, 2),
  ('goods_name', 'text', 'Product Name', true, 3),
  ('flavour_name', 'text', 'Flavour', false, 4),
  ('order_resource', 'text', 'Order Source', true, 5),
  ('order_type', 'text', 'Order Type', true, 6),
  ('order_status', 'text', 'Status', true, 7),
  ('cup_type', 'number', 'Cup Size', false, 8),
  ('machine_code', 'text', 'Machine Code', true, 9),
  ('address', 'text', 'Address', false, 10),
  ('order_price', 'number', 'Price', false, 11),
  ('brew_status', 'text', 'Brew Status', false, 12),
  ('creation_time', 'datetime', 'Created At', true, 13),
  ('paying_time', 'datetime', 'Paid At', false, 14),
  ('brewing_time', 'datetime', 'Brewed At', false, 15),
  ('delivery_time', 'datetime', 'Delivered At', false, 16),
  ('refund_time', 'datetime', 'Refunded At', false, 17),
  ('pay_card', 'text', 'Payment Card', false, 18),
  ('reason', 'text', 'Reason', false, 19),
  ('remark', 'text', 'Remarks', false, 20)
) AS t(column_name, data_type, display_name, is_indexed, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.table_schemas ts
  JOIN public.databases db ON ts.database_id = db.id
  WHERE db.system_name = 'orders_2024' AND ts.column_name = t.column_name
);

-- Update cached record count
UPDATE public.databases 
SET cached_record_count = (SELECT COUNT(*) FROM public.orders)
WHERE system_name = 'orders_2024';

