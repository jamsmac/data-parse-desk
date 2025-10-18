-- Sprint 2: Enhanced File Import
-- Таблица для хранения метаданных загруженных файлов
CREATE TABLE IF NOT EXISTS public.database_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  import_mode TEXT NOT NULL DEFAULT 'data', -- 'data' или 'schema_only'
  rows_imported INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  duplicates_found INTEGER DEFAULT 0,
  duplicate_strategy TEXT DEFAULT 'skip', -- 'skip', 'update', 'add_all'
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  file_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_database_files_database_id ON public.database_files(database_id);
CREATE INDEX idx_database_files_uploaded_at ON public.database_files(uploaded_at DESC);

-- Sprint 3: Data Lineage & History
-- Метаданные ячеек (источник данных)
CREATE TABLE IF NOT EXISTS public.cell_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.databases(id) ON DELETE CASCADE,
  row_id UUID NOT NULL REFERENCES public.table_data(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  source_file_id UUID REFERENCES public.database_files(id),
  source_row_number INTEGER,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  imported_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  UNIQUE(row_id, column_name)
);

CREATE INDEX idx_cell_metadata_row_id ON public.cell_metadata(row_id);
CREATE INDEX idx_cell_metadata_database_id ON public.cell_metadata(database_id);

-- История изменений ячеек
CREATE TABLE IF NOT EXISTS public.cell_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_metadata_id UUID NOT NULL REFERENCES public.cell_metadata(id) ON DELETE CASCADE,
  old_value JSONB,
  new_value JSONB,
  change_type TEXT NOT NULL, -- 'created', 'updated', 'imported'
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  source_file_id UUID REFERENCES public.database_files(id)
);

CREATE INDEX idx_cell_history_metadata_id ON public.cell_history(cell_metadata_id);
CREATE INDEX idx_cell_history_changed_at ON public.cell_history(changed_at DESC);

-- Sprint 4: AI Assistant
-- Таблица для хранения AI агентов
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL UNIQUE, -- 'schema_creator', 'data_parser', 'ocr_processor', etc.
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'google/gemini-2.5-flash',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица для хранения истории AI запросов
CREATE TABLE IF NOT EXISTS public.ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  agent_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB,
  tokens_used INTEGER,
  credits_used NUMERIC(10,2),
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_requests_user_id ON public.ai_requests(user_id);
CREATE INDEX idx_ai_requests_created_at ON public.ai_requests(created_at DESC);

-- Sprint 5: Credits System
-- Таблица кредитов пользователей
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  free_credits NUMERIC(10,2) DEFAULT 100.00,
  paid_credits NUMERIC(10,2) DEFAULT 0.00,
  total_credits_used NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);

-- Таблица транзакций кредитов
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  transaction_type TEXT NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
  amount NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  description TEXT,
  operation_type TEXT, -- 'schema_creation', 'data_parsing', 'ocr', etc.
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- Sprint 6: Storage Providers
CREATE TABLE IF NOT EXISTS public.storage_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider_type TEXT NOT NULL, -- 'digitalocean', 'google_drive', 'supabase'
  name TEXT NOT NULL,
  config JSONB NOT NULL, -- encrypted credentials
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storage_providers_user_id ON public.storage_providers(user_id);

-- Sprint 7: Telegram Integration
CREATE TABLE IF NOT EXISTS public.telegram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN DEFAULT true,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ
);

CREATE INDEX idx_telegram_accounts_telegram_id ON public.telegram_accounts(telegram_id);
CREATE INDEX idx_telegram_accounts_user_id ON public.telegram_accounts(user_id);

-- RLS Policies
ALTER TABLE public.database_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_accounts ENABLE ROW LEVEL SECURITY;

-- Policies для database_files
CREATE POLICY "Users can manage files in their databases"
ON public.database_files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.databases d
    LEFT JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = database_files.database_id
    AND (d.user_id = auth.uid() OR p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

-- Policies для cell_metadata и cell_history
CREATE POLICY "Users can view cell metadata in their databases"
ON public.cell_metadata
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.databases d
    LEFT JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = cell_metadata.database_id
    AND (d.user_id = auth.uid() OR p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can view cell history in their databases"
ON public.cell_history
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.cell_metadata cm
    JOIN public.databases d ON d.id = cm.database_id
    LEFT JOIN public.projects p ON d.project_id = p.id
    WHERE cm.id = cell_history.cell_metadata_id
    AND (d.user_id = auth.uid() OR p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
    ))
  )
);

-- Policies для AI
CREATE POLICY "Everyone can view active agents"
ON public.ai_agents
FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view their own AI requests"
ON public.ai_requests
FOR ALL
USING (auth.uid() = user_id);

-- Policies для кредитов
CREATE POLICY "Users can view their own credits"
ON public.user_credits
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit transactions"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Policies для storage providers
CREATE POLICY "Users can manage their own storage providers"
ON public.storage_providers
FOR ALL
USING (auth.uid() = user_id);

-- Policies для Telegram
CREATE POLICY "Users can manage their own Telegram account"
ON public.telegram_accounts
FOR ALL
USING (auth.uid() = user_id);

-- Функция для автоматического создания кредитов при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, free_credits, paid_credits)
  VALUES (NEW.id, 100.00, 0.00);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Триггер для создания кредитов
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Вставка дефолтных AI агентов
INSERT INTO public.ai_agents (agent_type, name, description, system_prompt, model) VALUES
('schema_creator', 'Schema Creator', 'Создает оптимальные схемы баз данных', 'You are an expert database architect. Create optimal table schemas with proper data types, constraints, and indexes.', 'google/gemini-2.5-flash'),
('data_parser', 'Data Parser', 'Парсит и валидирует данные', 'You are a data parsing expert. Parse, validate, and clean data efficiently.', 'google/gemini-2.5-flash'),
('ocr_processor', 'OCR Processor', 'Обрабатывает изображения с текстом', 'You are an OCR specialist. Extract text and structured data from images.', 'google/gemini-2.5-pro'),
('voice_transcriber', 'Voice Transcriber', 'Транскрибирует голосовые сообщения', 'You are a voice transcription expert. Convert speech to text accurately.', 'google/gemini-2.5-flash'),
('analytics_advisor', 'Analytics Advisor', 'Советует по аналитике данных', 'You are a data analytics advisor. Suggest insights and visualization strategies.', 'google/gemini-2.5-flash'),
('chart_builder', 'Chart Builder', 'Создает графики и визуализации', 'You are a data visualization expert. Create appropriate charts and dashboards.', 'google/gemini-2.5-flash')
ON CONFLICT (agent_type) DO NOTHING;