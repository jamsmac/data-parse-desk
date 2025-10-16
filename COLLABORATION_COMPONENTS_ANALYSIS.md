# Анализ компонентов collaboration

## Обзор

Директория `src/components/collaboration/` содержит 8 компонентов для функциональности совместной работы, которые **НЕ подключены** к проекту.

## Статус компонентов

### ✅ Все компоненты готовы к использованию

Все файлы имеют:
- Полную реализацию UI/UX
- TypeScript типизацию
- Интеграцию с shadcn/ui компонентами
- Локализацию на русском языке
- Обработку ошибок и состояний загрузки

### 📊 Типы уже определены

В `src/types/auth.ts` присутствуют все необходимые типы:
- `User`, `UserRole`, `Permission`, `Role`
- `Comment`, `Activity`, `Notification`
- `NotificationSettings`

## Оценка необходимости компонентов

### 🌟 ВЫСОКИЙ ПРИОРИТЕТ (Критичные для многопользовательской работы)

#### 1. **ActivityFeed.tsx** - Лента активности
**Необходимость: ⭐⭐⭐⭐⭐ (Очень важно)**

**Зачем нужен:**
- Отслеживание всех изменений в базах данных
- Аудит действий пользователей
- История изменений для каждой записи
- Прозрачность работы команды

**Где использовать:**
- В DatabaseView как сайдбар или вкладка
- В Dashboard для общей активности
- В ProfilePage для личной истории

**Интеграция:**
```typescript
// В DatabaseView.tsx
import { ActivityFeed } from '@/components/collaboration/ActivityFeed';

<ActivityFeed 
  activities={activities}
  limit={10}
/>
```

---

#### 2. **CommentsPanel.tsx** - Панель комментариев
**Необходимость: ⭐⭐⭐⭐⭐ (Очень важно)**

**Зачем нужен:**
- Обсуждение конкретных записей данных
- Вопросы и ответы по данным
- Упоминания коллег (@mention)
- Контекст для изменений

**Где использовать:**
- В модальном окне просмотра/редактирования строки
- В сайдбаре DatabaseView для выбранной строки

**Интеграция:**
```typescript
// В DataTable.tsx при клике на строку
import { CommentsPanel } from '@/components/collaboration/CommentsPanel';

<CommentsPanel
  comments={rowComments}
  currentUser={user}
  rowId={row.id}
  databaseId={databaseId}
  onAddComment={handleAddComment}
  onUpdateComment={handleUpdateComment}
  onDeleteComment={handleDeleteComment}
/>
```

---

#### 3. **NotificationCenter.tsx** - Центр уведомлений
**Необходимость: ⭐⭐⭐⭐ (Важно)**

**Зачем нужен:**
- Уведомления о комментариях
- Уведомления об изменениях данных
- Уведомления о новых доступах
- Системные сообщения

**Где использовать:**
- В Header как выпадающая панель (иконка колокольчика)
- Отдельная страница /notifications

**Интеграция:**
```typescript
// В Header.tsx
import { NotificationCenter } from '@/components/collaboration/NotificationCenter';

<Popover>
  <PopoverTrigger>
    <Button variant="ghost" size="icon">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-96">
    <NotificationCenter
      notifications={notifications}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onDelete={handleDelete}
      onDeleteAll={handleDeleteAll}
    />
  </PopoverContent>
</Popover>
```

---

### 🔧 СРЕДНИЙ ПРИОРИТЕТ (Для расширенного управления)

#### 4. **UserManagement.tsx** - Управление пользователями
**Необходимость: ⭐⭐⭐⭐ (Важно для команд)**

**Зачем нужен:**
- Приглашение пользователей в проект
- Управление ролями и правами
- Деактивация пользователей
- Просмотр активности команды

**Где использовать:**
- Отдельная страница /settings/users (для владельцев/админов)
- Вкладка в настройках базы данных

**Интеграция:**
```typescript
// В Settings.tsx или DatabaseSettings.tsx
import { UserManagement } from '@/components/collaboration/UserManagement';

<UserManagement
  users={databaseUsers}
  currentUserId={user.id}
  onInviteUser={handleInviteUser}
  onUpdateUserRole={handleUpdateRole}
  onRemoveUser={handleRemoveUser}
  onDeactivateUser={handleDeactivate}
  onActivateUser={handleActivate}
/>
```

---

#### 5. **RoleEditor.tsx** - Редактор ролей
**Необходимость: ⭐⭐⭐ (Полезно для гибкости)**

**Зачем нужен:**
- Создание кастомных ролей
- Настройка детальных разрешений
- Дублирование существующих ролей
- Адаптация под бизнес-процессы

**Где использовать:**
- Страница /settings/roles (только для админов)
- Расширенные настройки базы данных

**Интеграция:**
```typescript
// В RolesSettings.tsx
import { RoleEditor } from '@/components/collaboration/RoleEditor';

<RoleEditor
  roles={roles}
  permissions={permissions}
  onCreateRole={handleCreateRole}
  onUpdateRole={handleUpdateRole}
  onDeleteRole={handleDeleteRole}
  onDuplicateRole={handleDuplicateRole}
/>
```

---

#### 6. **PermissionsMatrix.tsx** - Матрица разрешений
**Необходимость: ⭐⭐⭐ (Полезно для аудита)**

**Зачем нужен:**
- Визуализация прав доступа
- Быстрая проверка разрешений
- Массовое изменение прав
- Экспорт матрицы прав

**Где использовать:**
- Вкладка в RoleEditor
- Отдельная страница /settings/permissions

**Интеграция:**
```typescript
// В PermissionsSettings.tsx
import { PermissionsMatrix } from '@/components/collaboration/PermissionsMatrix';

<PermissionsMatrix
  roles={roles}
  permissions={permissions}
  onTogglePermission={handleTogglePermission}
  readOnly={!isAdmin}
/>
```

---

### ⚙️ НИЗКИЙ ПРИОРИТЕТ (Опциональные настройки)

#### 7. **NotificationPreferences.tsx** - Настройки уведомлений
**Необходимость: ⭐⭐⭐ (Улучшает UX)**

**Зачем нужен:**
- Персональные настройки уведомлений
- Выбор каналов уведомлений
- Настройка частоты
- Фильтрация типов событий

**Где использовать:**
- Страница /profile или /settings/notifications

**Интеграция:**
```typescript
// В ProfilePage.tsx или NotificationSettings.tsx
import { NotificationPreferences } from '@/components/collaboration/NotificationPreferences';

<NotificationPreferences
  settings={userNotificationSettings}
  onSave={handleSaveSettings}
/>
```

---

#### 8. **EmailSettings.tsx** - Настройки email
**Необходимость: ⭐⭐ (Если есть email-уведомления)**

**Зачем нужен:**
- Настройка email-уведомлений
- Выбор частоты отправки
- Тестирование email
- Управление типами писем

**Где использовать:**
- Страница /settings/email (если реализованы email-уведомления)

**Интеграция:**
```typescript
// В EmailSettingsPage.tsx
import { EmailSettings } from '@/components/collaboration/EmailSettings';

<EmailSettings
  settings={emailSettings}
  onSave={handleSaveEmailSettings}
  onTestEmail={handleTestEmail}
/>
```

---

## Рекомендации по внедрению

### Фаза 1: Базовая функциональность (MVP)
**Приоритет: ВЫСОКИЙ**
**Срок: 1-2 недели**

1. **ActivityFeed** - Добавить в DatabaseView
2. **CommentsPanel** - Интегрировать в просмотр строк
3. **NotificationCenter** - Добавить в Header

**Что нужно реализовать:**
- Backend API для комментариев
- Backend API для уведомлений
- Backend API для активности
- WebSocket/Polling для real-time обновлений

### Фаза 2: Управление командой
**Приоритет: СРЕДНИЙ**
**Срок: 2-3 недели**

4. **UserManagement** - Страница управления пользователями
5. **NotificationPreferences** - Настройки в профиле

**Что нужно реализовать:**
- Система приглашений
- Email-уведомления (опционально)
- Multi-tenancy (если нужно)

### Фаза 3: Продвинутые права
**Приоритет: НИЗКИЙ**
**Срок: 1-2 недели**

6. **RoleEditor** - Кастомные роли
7. **PermissionsMatrix** - Визуализация прав
8. **EmailSettings** - Email-рассылки

**Что нужно реализовать:**
- Гибкая система permissions
- RBAC (Role-Based Access Control)
- Email-интеграция (SendGrid/AWS SES)

---

## Backend требования

### Необходимые таблицы в Supabase

```sql
-- Таблица комментариев
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  row_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица активности
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица уведомлений
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица настроек уведомлений
CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  comment_notifications BOOLEAN DEFAULT TRUE,
  mention_notifications BOOLEAN DEFAULT TRUE,
  share_notifications BOOLEAN DEFAULT TRUE,
  update_notifications BOOLEAN DEFAULT TRUE,
  frequency TEXT DEFAULT 'instant',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица ролей (если нужны кастомные)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица прав доступа к базам данных
CREATE TABLE database_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(database_id, user_id)
);
```

### API эндпоинты

```typescript
// Комментарии
POST   /api/databases/:id/rows/:rowId/comments
GET    /api/databases/:id/rows/:rowId/comments
PATCH  /api/comments/:id
DELETE /api/comments/:id

// Активность
GET    /api/databases/:id/activities
GET    /api/activities (глобальная)

// Уведомления
GET    /api/notifications
PATCH  /api/notifications/:id/read
DELETE /api/notifications/:id
POST   /api/notifications/mark-all-read

// Пользователи
GET    /api/databases/:id/users
POST   /api/databases/:id/users/invite
PATCH  /api/databases/:id/users/:userId/role
DELETE /api/databases/:id/users/:userId

// Настройки
GET    /api/settings/notifications
PATCH  /api/settings/notifications
```

---

## План миграции

### Шаг 1: Создание типов и утилит (1 день)

```bash
# Создать файлы API
touch src/api/commentsAPI.ts
touch src/api/notificationsAPI.ts
touch src/api/activityAPI.ts
touch src/api/usersAPI.ts

# Создать хуки
touch src/hooks/useComments.ts
touch src/hooks/useNotifications.ts
touch src/hooks/useActivity.ts
touch src/hooks/usePermissions.ts
```

### Шаг 2: Backend миграции (2-3 дня)

1. Создать миграции Supabase
2. Настроить Row Level Security (RLS)
3. Создать триггеры для автоматического логирования
4. Тестирование API

### Шаг 3: Интеграция Фазы 1 (3-5 дней)

1. Добавить ActivityFeed в DatabaseView
2. Добавить CommentsPanel в DataTable
3. Добавить NotificationCenter в Header
4. Настроить real-time обновления
5. Тестирование UX

### Шаг 4: Интеграция Фазы 2 и 3 (по необходимости)

---

## Стилизация под Aurora Design System

Все компоненты нужно обернуть в Aurora компоненты:

```typescript
// Было
<Card>
  <CardHeader>
    <CardTitle>Комментарии</CardTitle>
  </CardHeader>
  <CardContent>
    ...
  </CardContent>
</Card>

// Стало
<GlassCard intensity="medium" variant="interactive">
  <GlassCardHeader>
    <GlassCardTitle>Комментарии</GlassCardTitle>
  </GlassCardHeader>
  <GlassCardContent>
    ...
  </GlassCardContent>
</GlassCard>
```

---

## Выводы

### ✅ Компоненты НУЖНЫ, потому что:

1. **Data-parse-desk** - это платформа для работы с данными
2. Командная работа - критична для бизнес-данных
3. Аудит изменений - обязателен для критичных данных
4. Комментарии - помогают в обсуждении данных
5. Уведомления - держат команду в курсе изменений

### 🎯 Рекомендации:

1. **Начать с Фазы 1** - ActivityFeed, CommentsPanel, NotificationCenter
2. Реализовать backend API для этих компонентов
3. Интегрировать постепенно, тестируя каждый компонент
4. Адаптировать под Aurora Design System
5. Настроить real-time обновления через Supabase Realtime

### 📊 Оценка усилий:

- **Фаза 1 (MVP)**: 40-60 часов разработки
- **Фаза 2 (Управление)**: 30-40 часов разработки
- **Фаза 3 (Продвинутое)**: 20-30 часов разработки

**Итого: 90-130 часов** для полной интеграции всех компонентов.

---

## Итоговая оценка компонентов

| Компонент | Приоритет | Сложность | Ценность | Рекомендация |
|-----------|-----------|-----------|----------|--------------|
| ActivityFeed | ⭐⭐⭐⭐⭐ | Средняя | Высокая | **Внедрить** |
| CommentsPanel | ⭐⭐⭐⭐⭐ | Средняя | Высокая | **Внедрить** |
| NotificationCenter | ⭐⭐⭐⭐ | Высокая | Высокая | **Внедрить** |
| UserManagement | ⭐⭐⭐⭐ | Высокая | Средняя | Внедрить позже |
| NotificationPreferences | ⭐⭐⭐ | Низкая | Средняя | Внедрить позже |
| RoleEditor | ⭐⭐⭐ | Высокая | Средняя | Опционально |
| PermissionsMatrix | ⭐⭐⭐ | Средняя | Низкая | Опционально |
| EmailSettings | ⭐⭐ | Средняя | Низкая | Опционально |

**Все компоненты полезны и соответствуют концепции проекта. Рекомендуется поэтапное внедрение начиная с высокоприоритетных.**
