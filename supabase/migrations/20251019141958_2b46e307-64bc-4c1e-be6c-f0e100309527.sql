-- Create schema_templates table for pre-built schema templates
CREATE TABLE IF NOT EXISTS schema_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'crm', 'ecommerce', 'hr', 'project_management', etc
  schema JSONB NOT NULL,
  preview_image TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE schema_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view public templates
CREATE POLICY "Anyone can view public schema templates"
ON schema_templates FOR SELECT
USING (is_public = true OR created_by = auth.uid());

-- Users can create their own templates
CREATE POLICY "Users can create their own templates"
ON schema_templates FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
ON schema_templates FOR UPDATE
USING (created_by = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
ON schema_templates FOR DELETE
USING (created_by = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_schema_templates_updated_at
BEFORE UPDATE ON schema_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create index on category for faster filtering
CREATE INDEX idx_schema_templates_category ON schema_templates(category);
CREATE INDEX idx_schema_templates_public ON schema_templates(is_public);

-- Insert 5 popular templates
INSERT INTO schema_templates (name, description, category, schema, is_public) VALUES
(
  'CRM System',
  'Complete Customer Relationship Management system with customers, deals, activities, and contacts',
  'crm',
  '{"entities":[{"name":"customers","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"name","type":"text","nullable":false},{"name":"email","type":"text","unique":true},{"name":"phone","type":"text"},{"name":"company","type":"text"},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"deals","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"customer_id","type":"uuid","references":"customers.id"},{"name":"title","type":"text","nullable":false},{"name":"amount","type":"numeric","default":0},{"name":"stage","type":"text","default":"prospecting"},{"name":"close_date","type":"date"},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"activities","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"customer_id","type":"uuid","references":"customers.id"},{"name":"deal_id","type":"uuid","references":"deals.id"},{"name":"type","type":"text","nullable":false},{"name":"description","type":"text"},{"name":"created_at","type":"timestamptz","default":"now()"}]}],"relationships":[{"from":"deals","to":"customers","type":"many-to-one"},{"from":"activities","to":"customers","type":"many-to-one"},{"from":"activities","to":"deals","type":"many-to-one"}]}',
  true
),
(
  'E-commerce Store',
  'E-commerce platform with products, orders, customers, and inventory tracking',
  'ecommerce',
  '{"entities":[{"name":"products","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"name","type":"text","nullable":false},{"name":"description","type":"text"},{"name":"price","type":"numeric","nullable":false},{"name":"stock","type":"integer","default":0},{"name":"category","type":"text"},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"orders","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"customer_id","type":"uuid","nullable":false},{"name":"status","type":"text","default":"pending"},{"name":"total","type":"numeric","nullable":false},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"order_items","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"order_id","type":"uuid","references":"orders.id"},{"name":"product_id","type":"uuid","references":"products.id"},{"name":"quantity","type":"integer","nullable":false},{"name":"price","type":"numeric","nullable":false}]}],"relationships":[{"from":"order_items","to":"orders","type":"many-to-one"},{"from":"order_items","to":"products","type":"many-to-one"}]}',
  true
),
(
  'Project Management',
  'Project and task management system with teams, projects, tasks, and time tracking',
  'project_management',
  '{"entities":[{"name":"projects","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"name","type":"text","nullable":false},{"name":"description","type":"text"},{"name":"status","type":"text","default":"active"},{"name":"start_date","type":"date"},{"name":"end_date","type":"date"},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"tasks","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"project_id","type":"uuid","references":"projects.id"},{"name":"title","type":"text","nullable":false},{"name":"description","type":"text"},{"name":"status","type":"text","default":"todo"},{"name":"priority","type":"text","default":"medium"},{"name":"due_date","type":"date"},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"time_entries","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"task_id","type":"uuid","references":"tasks.id"},{"name":"hours","type":"numeric","nullable":false},{"name":"description","type":"text"},{"name":"date","type":"date","nullable":false},{"name":"created_at","type":"timestamptz","default":"now()"}]}],"relationships":[{"from":"tasks","to":"projects","type":"many-to-one"},{"from":"time_entries","to":"tasks","type":"many-to-one"}]}',
  true
),
(
  'HR Management',
  'Human Resources management with employees, departments, positions, and attendance tracking',
  'hr',
  '{"entities":[{"name":"departments","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"name","type":"text","nullable":false},{"name":"description","type":"text"},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"employees","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"department_id","type":"uuid","references":"departments.id"},{"name":"first_name","type":"text","nullable":false},{"name":"last_name","type":"text","nullable":false},{"name":"email","type":"text","unique":true},{"name":"phone","type":"text"},{"name":"position","type":"text"},{"name":"hire_date","type":"date"},{"name":"salary","type":"numeric"},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"attendance","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"employee_id","type":"uuid","references":"employees.id"},{"name":"date","type":"date","nullable":false},{"name":"check_in","type":"time"},{"name":"check_out","type":"time"},{"name":"status","type":"text","default":"present"},{"name":"created_at","type":"timestamptz","default":"now()"}]}],"relationships":[{"from":"employees","to":"departments","type":"many-to-one"},{"from":"attendance","to":"employees","type":"many-to-one"}]}',
  true
),
(
  'Inventory Management',
  'Warehouse and inventory tracking with items, suppliers, warehouses, and stock movements',
  'inventory',
  '{"entities":[{"name":"warehouses","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"name","type":"text","nullable":false},{"name":"location","type":"text"},{"name":"capacity","type":"integer"},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"items","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"name","type":"text","nullable":false},{"name":"sku","type":"text","unique":true},{"name":"description","type":"text"},{"name":"unit_price","type":"numeric"},{"name":"created_at","type":"timestamptz","default":"now()"}]},{"name":"inventory","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"warehouse_id","type":"uuid","references":"warehouses.id"},{"name":"item_id","type":"uuid","references":"items.id"},{"name":"quantity","type":"integer","default":0},{"name":"min_stock","type":"integer","default":0},{"name":"max_stock","type":"integer"},{"name":"updated_at","type":"timestamptz","default":"now()"}]},{"name":"movements","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"item_id","type":"uuid","references":"items.id"},{"name":"warehouse_id","type":"uuid","references":"warehouses.id"},{"name":"type","type":"text","nullable":false},{"name":"quantity","type":"integer","nullable":false},{"name":"date","type":"timestamptz","default":"now()"}]}],"relationships":[{"from":"inventory","to":"warehouses","type":"many-to-one"},{"from":"inventory","to":"items","type":"many-to-one"},{"from":"movements","to":"items","type":"many-to-one"},{"from":"movements","to":"warehouses","type":"many-to-one"}]}',
  true
);