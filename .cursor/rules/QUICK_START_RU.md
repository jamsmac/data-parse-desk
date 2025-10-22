# Быстрый старт: Cursor Rules для DataParseDesk

## 🚀 Что это?

Это набор из 8 комплексных правил кодирования для проекта DataParseDesk. Они помогут вам и AI-ассистентам писать код, соответствующий стандартам проекта.

## 📚 Созданные файлы

### 1. **project_overview.mdc** ⭐ - НАЧНИТЕ ОТСЮДА
Обзор всей архитектуры проекта
- Стек технологий (React + Supabase + Tailwind)
- Структура проекта
- Ключевые функции
- Роутинг
- База данных

**Прочитайте первым делом!** (~15 минут)

### 2. **supabase.mdc** 🗄️
Все о работе с Supabase
- Запросы к БД
- React Query интеграция
- Realtime подписки
- Аутентификация
- Загрузка файлов
- RPC функции

**Используйте когда:** работаете с данными, API, auth

### 3. **security.mdc** 🔒 - КРИТИЧНО!
Безопасность и RLS политики
- Row Level Security (ОБЯЗАТЕЛЬНО!)
- Валидация входных данных
- Защита от SQL injection
- Защита от XSS
- Rate limiting
- Audit logging

**Используйте когда:** создаете миграции, работаете с auth

⚠️ **ВАЖНО:** Все таблицы ДОЛЖНЫ иметь RLS! См. коммит [98b5540](https://github.com/user/repo/commit/98b5540) - было исправлено 18 небезопасных RLS политик.

### 4. **react_components.mdc** ⚛️
Паттерны React компонентов
- Структура компонентов
- Lazy loading
- State management (React Query vs useState)
- Формы с React Hook Form
- Loading/Error состояния
- Accessibility
- Performance

**Используйте когда:** создаете/рефакторите компоненты

### 5. **typescript.mdc** 📘
TypeScript best practices
- Strict mode (ОБЯЗАТЕЛЬНО)
- Запрет на `any`
- Type guards
- Generics
- Utility types
- Интеграция с Zod

**Используйте когда:** исправляете type ошибки, пишете типы

### 6. **styling.mdc** 🎨
Tailwind CSS и стилизация
- CSS переменные (ОБЯЗАТЕЛЬНО использовать!)
- Темная/светлая темы
- Responsive дизайн (mobile-first)
- Компоненты shadcn/ui
- Анимации
- Accessibility

**Используйте когда:** стилизуете компоненты

### 7. **cursor_rules.mdc** 📋
Мета-правила для создания правил
- Структура файлов правил
- Формат примеров кода
- Использование `mdc:` ссылок

**Используйте когда:** обновляете правила

### 8. **self_improve.mdc** 🔄
Система самообучения правил
- Автоматически срабатывает при обнаружении паттернов

## 🎯 Быстрый старт (45 минут)

1. **Прочитайте** [project_overview.mdc](mdc:.cursor/rules/project_overview.mdc) - 15 мин
   - Поймете архитектуру проекта

2. **Пробегитесь** по [typescript.mdc](mdc:.cursor/rules/typescript.mdc) - 10 мин
   - Основные паттерны TypeScript

3. **Пробегитесь** по [react_components.mdc](mdc:.cursor/rules/react_components.mdc) - 10 мин
   - Как писать компоненты

4. **Прочитайте** секцию RLS в [security.mdc](mdc:.cursor/rules/security.mdc) - 10 мин
   - КРИТИЧНО для безопасности!

5. Остальные правила используйте по мере необходимости

## 🔥 Критичные правила (ВСЕГДА соблюдайте!)

### Безопасность
- ✅ ВСЕ таблицы ДОЛЖНЫ иметь RLS
- ✅ НИКОГДА не используйте `any`
- ✅ ВСЕГДА валидируйте ввод пользователя с Zod
- ✅ НИКОГДА не коммитьте .env файлы

### Стилизация
- ✅ ВСЕГДА используйте CSS переменные из index.css
- ✅ НИКОГДА не хардкодьте цвета
- ✅ ВСЕ компоненты должны поддерживать light/dark темы

### TypeScript
- ✅ Strict mode включен
- ✅ Никаких `any` типов
- ✅ Явные return types для экспортируемых функций
- ✅ НИКОГДА не используйте @ts-ignore

### Supabase
- ✅ ВСЕГДА проверяйте ошибки
- ✅ Используйте React Query для всех запросов
- ✅ Полагайтесь на RLS, не на фильтрацию на клиенте

### React
- ✅ Lazy load все некритичные страницы
- ✅ React Query для server state
- ✅ useState/useReducer только для UI state

## 📖 Примеры использования

### Создаю новый компонент
```typescript
// 1. Читаю react_components.mdc - структура компонента
// 2. Читаю typescript.mdc - типы для props
// 3. Читаю styling.mdc - как стилизовать

import { FC } from "react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  onEdit?: (id: string) => void;
}

export const ProjectCard: FC<ProjectCardProps> = ({ project, onEdit }) => {
  return (
    <div className="bg-card text-card-foreground p-6 rounded-lg">
      <h3 className="text-lg font-semibold">{project.name}</h3>
      {/* ... */}
    </div>
  );
};
```

### Создаю миграцию
```sql
-- 1. Читаю security.mdc - RLS ОБЯЗАТЕЛЕН!
-- 2. Читаю supabase.mdc - паттерны миграций

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- ОБЯЗАТЕЛЬНО!
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS политики
CREATE POLICY "users_select_own"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);
```

### Работаю с данными
```typescript
// 1. Читаю supabase.mdc - как делать запросы
// 2. Читаю react_components.mdc - React Query паттерны

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
```

## 🛠️ Как AI использует эти правила

Когда вы работаете с Cursor/Claude:
1. Правила автоматически применяются на основе `globs` паттернов
2. AI видит эти правила и следует им
3. Вы получаете код, соответствующий стандартам проекта

## 📊 Чего покрывают правила

| Область | Файл | Статус |
|---------|------|--------|
| Архитектура | project_overview.mdc | ✅ Полностью |
| Supabase/БД | supabase.mdc | ✅ Полностью |
| Безопасность | security.mdc | ✅ Полностью |
| React | react_components.mdc | ✅ Полностью |
| TypeScript | typescript.mdc | ✅ Полностью |
| Стилизация | styling.mdc | ✅ Полностью |
| Тестирование | - | ❌ TODO |
| Деплой | - | ⚠️ Минимально |

## 💡 Советы

1. **Держите README.mdc открытым** - там быстрый доступ ко всем правилам
2. **Используйте поиск** - Cmd+F по файлам правил
3. **Копируйте примеры** - все примеры из реального кода
4. **Следуйте ✅ DO примерам** - избегайте ❌ DON'T
5. **Обновляйте правила** - если нашли новый паттерн

## 🤝 Вклад в правила

Заметили паттерн, который стоит задокументировать?
1. Проверьте, подходит ли он в существующее правило
2. Добавьте пример в соответствующий файл
3. Обновите README.mdc если добавляете новое правило

## ❓ Вопросы?

- Не понятна архитектура? → [project_overview.mdc](mdc:.cursor/rules/project_overview.mdc)
- Проблемы с типами? → [typescript.mdc](mdc:.cursor/rules/typescript.mdc)
- Ошибки запросов? → [supabase.mdc](mdc:.cursor/rules/supabase.mdc)
- Проблемы с RLS? → [security.mdc](mdc:.cursor/rules/security.mdc)
- Как стилизовать? → [styling.mdc](mdc:.cursor/rules/styling.mdc)

## 📝 Финальные напоминания

🔴 **КРИТИЧНО:**
- Все таблицы с RLS
- Никаких `any` типов
- CSS переменные для цветов
- Валидация ввода с Zod

🟡 **ВАЖНО:**
- React Query для server state
- Lazy loading страниц
- Mobile-first дизайн
- Accessibility (ARIA, semantic HTML)

🟢 **РЕКОМЕНДУЕТСЯ:**
- Читайте комментарии в примерах
- Используйте TypeScript строго
- Тестируйте в обеих темах
- Документируйте сложные компоненты

---

**Удачного кодинга! 🚀**

*Последнее обновление: 2025-10-22*
