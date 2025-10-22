-- Добавить колонку project_id в таблицу databases
ALTER TABLE public.databases ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Создать дефолтный проект для каждого пользователя с базами данных
DO $$
DECLARE
  user_record RECORD;
  default_project_id UUID;
BEGIN
  -- Для каждого пользователя, у которого есть базы данных без project_id
  FOR user_record IN 
    SELECT DISTINCT created_by as user_id 
    FROM public.databases 
    WHERE project_id IS NULL AND created_by IS NOT NULL
  LOOP
    -- Создать дефолтный проект
    INSERT INTO public.projects (user_id, name, description, icon, color)
    VALUES (
      user_record.user_id,
      'Мои базы данных',
      'Проект по умолчанию',
      '📊',
      '#3B82F6'
    )
    RETURNING id INTO default_project_id;
    
    -- Обновить все базы данных без project_id
    UPDATE public.databases
    SET project_id = default_project_id
    WHERE created_by = user_record.user_id AND project_id IS NULL;
  END LOOP;
END $$;

-- Обновить все NULL значения project_id перед тем, как сделать колонку обязательной
UPDATE public.databases 
SET project_id = (
  SELECT id FROM public.projects 
  WHERE user_id = databases.created_by 
  LIMIT 1
)
WHERE project_id IS NULL AND created_by IS NOT NULL;

-- Для записей с created_by = NULL, создать дефолтный проект
INSERT INTO public.projects (user_id, name, description, icon, color)
SELECT 
  gen_random_uuid() as user_id,  -- Создаем фиктивного пользователя
  'Системные базы данных',
  'Проект для системных записей',
  '🔧',
  '#6B7280'
WHERE EXISTS (
  SELECT 1 FROM public.databases 
  WHERE project_id IS NULL AND created_by IS NULL
);

-- Обновить записи с created_by = NULL
UPDATE public.databases 
SET project_id = (
  SELECT id FROM public.projects 
  WHERE name = 'Системные базы данных'
  LIMIT 1
)
WHERE project_id IS NULL AND created_by IS NULL;

-- Сделать project_id обязательным полем
ALTER TABLE public.databases 
ALTER COLUMN project_id SET NOT NULL;