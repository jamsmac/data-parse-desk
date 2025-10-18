-- Создать дефолтный проект для каждого пользователя с базами данных
DO $$
DECLARE
  user_record RECORD;
  default_project_id UUID;
BEGIN
  -- Для каждого пользователя, у которого есть базы данных без project_id
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM public.databases 
    WHERE project_id IS NULL
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
    WHERE user_id = user_record.user_id AND project_id IS NULL;
  END LOOP;
END $$;

-- Сделать project_id обязательным полем
ALTER TABLE public.databases 
ALTER COLUMN project_id SET NOT NULL;