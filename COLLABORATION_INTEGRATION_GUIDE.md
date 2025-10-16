# Руководство по интеграции компонентов Collaboration

## 📋 Содержание
1. [Применение миграций](#применение-миграций)
2. [Файлы созданные для интеграции](#файлы-созданные)
3. [Следующие шаги](#следующие-шаги)
4. [Тестирование](#тестирование)

---

## 🚀 Применение миграций

### Шаг 1: Применение SQL миграции

Выполните миграцию в Supabase одним из способов:

**Вариант A: Через Supabase CLI (Рекомендуется)**
```bash
# Если Supabase запущен локально
npx supabase migration up

# Или примените конкретную миграцию
npx supabase db push
```

**Вариант B: Через Supabase Dashboard**
1. Откройте ваш проект в Supabase Dashboard
2. Перейдите в раздел **SQL Editor**
3. Скопируйте содержимое файла `supabase/migrations/20250116_collaboration_tables.sql`
4. Вставьте в SQL Editor и нажмите **RUN**

**Вариант C: Через psql**
```bash
psql -h your-project.supabase.co -U postgres -d postgres -f supabase/migrations/20250116_collaboration_tables.sql
```

### Шаг 2: Проверка успешности миграции

Выполните в SQL Editor:

```sql
-- Проверка созданных таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('comments', 'activities', 'notifications', 'notification_settings', 'database_permissions');

-- Должно вернуть 5 таблиц

-- Проверка RLS политик
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Проверка функций
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('log_activity', 'create_notification', 'update_updated_at_column', 'create_notification_settings_for_new_user');
```

---

## 📁 Файлы созданные

### ✅ Созданные файлы

```
data-parse-desk/
├── COLLABORATION_COMPONENTS_ANALYSIS.md       # Подробный анализ компонентов
├── COLLABORATION_INTEGRATION_GUIDE.md         # Это руководство
├── supabase/
│   └── migrations/
│       └── 20250116_collaboration_tables.sql  # SQL миграция
├── src/
│   ├── api/
│   │   └── commentsAPI.ts                     # ✅ API для комментариев
│   │   ├── notificationsAPI.ts                # 🔄 Нужно создать
│   │   └── activityAPI.ts                     # 🔄 Нужно создать
│   └── hooks/
│       ├── useComments.ts                     # 🔄 Нужно создать
│       ├── useNotifications.ts                # 🔄 Нужно создать
│       └── useActivity.ts                     # 🔄 Нужно создать
```

---

## 🔧 Следующие шаги

### Необходимо доработать:

#### 1. Обновить Supabase типы
После применения миграции обновите типы:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
# Или для remote
npx supabase gen types typescript --project-id your-project-ref > src/integrations/supabase/types.ts
```

#### 2. Создать оставшиеся API файлы
- `src/api/notificationsAPI.ts`
- `src/api/activityAPI.ts`

#### 3. Создать React Hooks
- `src/hooks/useComments.ts`
- `src/hooks/useNotifications.ts`
- `src/hooks/useActivity.ts`

#### 4. Адаптировать компоненты под Aurora Design System

Обновить компоненты в `src/components/collaboration/`:
- Заменить `<Card>` на `<GlassCard>`
- Заменить `<Button>` на `<FluidButton>`
- Добавить анимации `<FadeIn>`, `<AnimatedList>`

#### 5. Интегрировать компоненты

**A. NotificationCenter в Header**
```tsx
// src/components/Header.tsx
import { NotificationCenter } from '@/components/collaboration/NotificationCenter';
import { useNotifications } from '@/hooks/useNotifications';

// В компоненте Header
const { notifications } = useNotifications();

<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge variant="destructive">{unreadCount}</Badge>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-96">
    <NotificationCenter notifications={notifications} ... />
  </PopoverContent>
</Popover>
```

**B. CommentsPanel в DatabaseView**
```tsx
// src/pages/DatabaseView.tsx
import { CommentsPanel } from '@/components/collaboration/CommentsPanel';
import { useComments } from '@/hooks/useComments';

// При клике на строку открывать панель комментариев
const { comments } = useComments(databaseId, selectedRowId);

<Dialog open={showComments} onOpenChange={setShowComments}>
  <DialogContent className="max-w-2xl">
    <CommentsPanel
      comments={comments}
      currentUser={user}
      rowId={selectedRowId}
      databaseId={databaseId}
      onAddComment={handleAddComment}
      onUpdateComment={handleUpdateComment}
      onDeleteComment={handleDeleteComment}
    />
  </DialogContent>
</Dialog>
```

**C. ActivityFeed в DatabaseView**
```tsx
// src/pages/DatabaseView.tsx
import { ActivityFeed } from '@/components/collaboration/ActivityFeed';
import { useActivity } from '@/hooks/useActivity';

// В сайдбаре или отдельной вкладке
const { activities } = useActivity(databaseId);

<Tabs>
  <TabsList>
    <TabsTrigger value="data">Данные</TabsTrigger>
    <TabsTrigger value="activity">Активность</TabsTrigger>
  </TabsList>
  <TabsContent value="activity">
    <ActivityFeed activities={activities} limit={20} />
  </TabsContent>
</Tabs>
```

---

## 🧪 Тестирование

### 1. Тест создания комментария

```typescript
// Тестовый код
import { addComment } from '@/api/commentsAPI';

async function testComment() {
  try {
    const comment = await addComment(
      'database-uuid',
      'row-123',
      'Тестовый комментарий'
    );
    console.log('✅ Комментарий создан:', comment);
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}
```

### 2. Тест получения уведомлений

```typescript
import { getNotifications } from '@/api/notificationsAPI';

async function testNotifications() {
  try {
    const notifications = await getNotifications();
    console.log('✅ Уведомления получены:', notifications.length);
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}
```

### 3. Тест логирования активности

```sql
-- В Supabase SQL Editor
SELECT log_activity(
  'user-uuid'::UUID,
  'database-uuid'::UUID,
  'create',
  'row',
  'row-123',
  'Новая запись',
  '{"old": null, "new": {"name": "Test"}}'::JSONB
);

-- Проверка записи
SELECT * FROM activities ORDER BY created_at DESC LIMIT 1;
```

### 4. Тест прав доступа (RLS)

```sql
-- Проверка, что пользователь видит только свои данные
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';

-- Эти запросы должны работать только для данных пользователя
SELECT * FROM comments;
SELECT * FROM notifications;
SELECT * FROM activities;
```

---

## 📊 Статус интеграции

### ✅ Завершено
- [x] Анализ всех 8 компонентов collaboration
- [x] SQL миграция с таблицами, индексами, RLS
- [x] API для комментариев (commentsAPI.ts)
- [x] Руководство по интеграции

### 🔄 В процессе
- [ ] API для уведомлений (notificationsAPI.ts)
- [ ] API для активности (activityAPI.ts)
- [ ] React Hooks для всех компонентов
- [ ] Обновление Supabase типов

### ⏳ Ожидает
- [ ] Интеграция NotificationCenter в Header
- [ ] Интеграция CommentsPanel в DatabaseView
- [ ] Интеграция ActivityFeed в DatabaseView
- [ ] Адаптация под Aurora Design System
- [ ] E2E тестирование

---

## 🎯 Приоритеты (Фаза 1)

### Высокий приоритет (Сделать сейчас)
1. ✅ SQL миграция
2. ✅ commentsAPI.ts
3. 🔄 notificationsAPI.ts
4. 🔄 activityAPI.ts
5. 🔄 React Hooks
6. 🔄 Интеграция в UI

### Средний приоритет (Фаза 2)
7. UserManagement компонент
8. NotificationPreferences компонент
9. Система приглашений

### Низкий приоритет (Фаза 3)
10. RoleEditor компонент
11. PermissionsMatrix компонент
12. EmailSettings компонент
13. Email-интеграция

---

## 💡 Полезные ссылки

- [Анализ компонентов](./COLLABORATION_COMPONENTS_ANALYSIS.md)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Aurora Design System Components](./src/components/aurora/)

---

## ❓ Часто задаваемые вопросы

### Q: Как применить миграцию в production?
A: Используйте Supabase CLI: `npx supabase db push --linked` или примените через Dashboard

### Q: Как откатить миграцию?
A: Создайте обратную миграцию с `DROP TABLE` командами для каждой таблицы

### Q: Нужно ли обновлять типы после миграции?
A: Да, обязательно выполните `npx supabase gen types typescript`

### Q: Работает ли real-time для этих таблиц?
A: Да, все таблицы поддерживают Supabase Realtime из коробки

---

**Создано:** 2025-01-16  
**Последнее обновление:** 2025-01-16  
**Версия:** 1.0.0
