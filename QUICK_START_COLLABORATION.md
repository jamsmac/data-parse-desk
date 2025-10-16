# Быстрый старт: Интеграция Collaboration компонентов

## ✅ Шаг 1: Типы обновлены! 

```bash
✓ npx supabase gen types typescript --project-id uzcmaxfhfcsxzfqvaloz > src/integrations/supabase/types.ts
```

TypeScript ошибки в API файлах исчезнут после применения SQL миграции.

---

## 🔧 Шаг 2: Применить SQL миграцию

### Через Supabase Dashboard (5 минут)

1. **Откройте Supabase Dashboard**
   - Перейдите: https://app.supabase.com/project/uzcmaxfhfcsxzfqvaloz

2. **Откройте SQL Editor**
   - В левом меню выберите **SQL Editor**
   - Нажмите **New Query**

3. **Скопируйте SQL миграцию**
   - Откройте файл: `supabase/migrations/20250116_collaboration_tables.sql`
   - Скопируйте **ВЕСЬ** содержимое (350+ строк)

4. **Выполните миграцию**
   - Вставьте скопированный SQL в редактор
   - Нажмите **RUN** (или Ctrl/Cmd + Enter)
   - Дождитесь сообщения "Success"

5. **Проверьте результат**
   - Вставьте и выполните эту проверку:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'comments', 
  'activities', 
  'notifications', 
  'notification_settings', 
  'database_permissions'
);
```

Должно вернуть 5 строк:
- comments
- activities  
- notifications
- notification_settings
- database_permissions

---

## 🧪 Шаг 3: Тестирование (2 минуты)

### Тест 1: Создайте тестовое уведомление

В SQL Editor выполните:

```sql
-- Получите ваш user_id
SELECT id, email FROM auth.users LIMIT 1;

-- Создайте тестовое уведомление (замените YOUR_USER_ID)
INSERT INTO notifications (user_id, type, title, message)
VALUES (
  'YOUR_USER_ID'::UUID,
  'info',
  'Тестовое уведомление',
  'Система уведомлений работает!'
);

-- Проверьте
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
```

### Тест 2: Проверьте API в приложении

В любом компоненте React:

```typescript
import { getNotifications } from '@/api/notificationsAPI';

// В useEffect или обработчике
getNotifications()
  .then(notifications => {
    console.log('✅ Уведомления работают:', notifications);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
  });
```

---

## 📱 Шаг 4: Интеграция в UI

### A. NotificationCenter в Header

Создайте или обновите `src/components/Header.tsx`:

```typescript
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationCenter } from '@/components/collaboration/NotificationCenter';
import { useNotifications } from '@/hooks/useNotifications';

export function Header() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  } = useNotifications();

  return (
    <header className="border-b">
      <div className="container flex items-center justify-between py-4">
        <h1>VHData Platform</h1>
        
        {/* Notification Bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 min-w-[20px] px-1 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotification}
              onDeleteAll={deleteAll}
            />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
```

### B. ActivityFeed в DatabaseView

Обновите `src/pages/DatabaseView.tsx`:

```typescript
import { ActivityFeed } from '@/components/collaboration/ActivityFeed';
import { useActivity } from '@/hooks/useActivity';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DatabaseView() {
  const { id: databaseId } = useParams();
  const { activities, logActivity } = useActivity(databaseId!);

  return (
    <div className="container py-6">
      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data">Данные</TabsTrigger>
          <TabsTrigger value="activity">
            Активность
            {activities.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {activities.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          {/* Ваш DataTable компонент */}
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed activities={activities} limit={50} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### C. CommentsPanel для строк

Обновите компонент, где отображаются строки (например, в DataTable):

```typescript
import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CommentsPanel } from '@/components/collaboration/CommentsPanel';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';

export function DataRow({ row, databaseId }) {
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();
  const {
    comments,
    addComment,
    updateComment,
    deleteComment,
  } = useComments(databaseId, row.id);

  return (
    <>
      <tr>
        <td>{row.data}</td>
        <td>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(true)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            {comments.length > 0 && comments.length}
          </Button>
        </td>
      </tr>

      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Комментарии к записи</DialogTitle>
          </DialogHeader>
          <CommentsPanel
            comments={comments}
            currentUser={user!}
            rowId={row.id}
            databaseId={databaseId}
            onAddComment={(content, parentId) =>
              addComment({ content, parentId })
            }
            onUpdateComment={(commentId, content) =>
              updateComment({ commentId, content })
            }
            onDeleteComment={deleteComment}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 🎨 Адаптация под Aurora Design System

Замените shadcn/ui компоненты на Aurora:

```typescript
// Было
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Стало
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/aurora';

// Было
<Card>
  <CardHeader>
    <CardTitle>Комментарии</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>

// Стало
<GlassCard intensity="medium" variant="interactive">
  <GlassCardHeader>
    <GlassCardTitle>Комментарии</GlassCardTitle>
  </GlassCardHeader>
  <GlassCardContent>...</GlassCardContent>
</GlassCard>
```

---

## 📊 Checklist интеграции

### Backend (Выполнено ✅)
- [x] SQL миграция создана
- [x] RLS политики настроены
- [x] Триггеры и функции добавлены
- [x] API слой реализован
- [x] React hooks созданы

### UI Интеграция (Нужно сделать)
- [ ] NotificationCenter в Header
- [ ] ActivityFeed в DatabaseView
- [ ] CommentsPanel в DataTable
- [ ] Aurora Design System адаптация

### Тестирование (После интеграции)
- [ ] Создание/чтение комментариев
- [ ] Получение уведомлений
- [ ] Отображение активности
- [ ] Real-time обновления
- [ ] Права доступа (RLS)

---

## 🐛 Возможные проблемы и решения

### Проблема: TypeScript ошибки в API файлах

**Решение:** Типы уже обновлены! Но если ошибки остались:
```bash
# Перезапустите TypeScript server
# В VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Или перезапустите dev server
npm run dev
```

### Проблема: RLS блокирует запросы

**Решение:** Проверьте, что пользователь авторизован:
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user); // Должен быть объект, не null
```

### Проблема: Real-time не работает

**Решение:** Включите Realtime в Supabase Dashboard:
1. Перейдите в **Database** → **Replication**
2. Включите Realtime для таблиц: comments, activities, notifications

---

## 🎯 Следующие шаги

1. ✅ **Типы обновлены** 
2. 🔄 **Применить SQL миграцию** (сейчас)
3. 🔄 **Протестировать API** (5 мин)
4. 🔄 **Интегрировать NotificationCenter** (2-3 часа)
5. 🔄 **Интегрировать ActivityFeed** (2-3 часа)
6. 🔄 **Интегрировать CommentsPanel** (2-3 часа)
7. 🔄 **Адаптировать под Aurora** (2-3 часа)

**Общее время:** 10-15 часов работы

---

## 📚 Документация

- **Детальный анализ:** `COLLABORATION_COMPONENTS_ANALYSIS.md`
- **Руководство:** `COLLABORATION_INTEGRATION_GUIDE.md`
- **Резюме:** `COLLABORATION_IMPLEMENTATION_SUMMARY.md`
- **Этот файл:** `QUICK_START_COLLABORATION.md`

---

**Автор:** Cline AI Assistant  
**Дата:** 2025-01-16  
**Проект:** data-parse-desk  
**Supabase Project ID:** uzcmaxfhfcsxzfqvaloz
