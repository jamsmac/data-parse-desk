# Email Notifications Setup Guide

Руководство по настройке email уведомлений в Data Parse Desk с использованием Resend.

## Обзор

Data Parse Desk использует [Resend](https://resend.com) для отправки email уведомлений. Resend предоставляет:

- ✨ Простой и современный API
- 📊 Детальную аналитику доставки
- 🎨 Поддержку React Email компонентов
- 🚀 Высокую скорость доставки
- 💰 Щедрый бесплатный тариф (3,000 писем/месяц)

## Быстрый старт

### 1. Регистрация в Resend

```bash
# Перейдите на https://resend.com и создайте аккаунт
# После регистрации вы попадёте в панель управления
```

### 2. Получение API ключа

1. В Resend Dashboard перейдите в **API Keys**
2. Нажмите **Create API Key**
3. Введите название (например, "Data Parse Desk Production")
4. Выберите права доступа: **Full Access** или **Sending Access**
5. Скопируйте созданный ключ (формат: `re_...`)

### 3. Настройка в Supabase

#### Локальная разработка

Создайте файл `.env.local` в папке `supabase`:

```bash
# supabase/.env.local
RESEND_API_KEY=re_your_api_key_here
```

#### Production (Supabase Cloud)

1. Откройте ваш проект в [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в **Settings** → **Edge Functions** → **Secrets**
3. Добавьте новый secret:
   - Key: `RESEND_API_KEY`
   - Value: `re_your_api_key_here`
4. Сохраните изменения

### 4. Настройка домена (Production)

Для production использования настройте свой домен:

#### В Resend Dashboard

1. Перейдите в **Domains**
2. Нажмите **Add Domain**
3. Введите ваш домен (например, `dataparsedesk.com`)
4. Добавьте DNS записи, которые покажет Resend:

```dns
# Пример DNS записей
TXT  @ resend.com.  "resend-verify=your-verification-code"
MX   @ resend.com.  "feedback-smtp.resend.com" (priority 10)
TXT  _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

5. Дождитесь подтверждения домена (обычно 5-15 минут)

#### Обновление кода

После подтверждения домена обновите адрес отправителя:

```typescript
// supabase/functions/send-notification/index.ts
from: 'Data Parse Desk <notifications@yourdomain.com>',
```

## Типы email уведомлений

### 1. Комментарии (`comment`)

Отправляется когда кто-то оставляет комментарий:

```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    user_id: userId,
    type: 'comment',
    title: 'Новый комментарий в базе данных',
    message: 'Пользователь Иван оставил комментарий к вашей базе "Продажи"',
    metadata: {
      actionUrl: 'https://app.dataparsedesk.com/projects/123/database/456',
      actionText: 'Посмотреть комментарий',
    },
  },
});
```

### 2. Упоминания (`mention`)

Отправляется при упоминании пользователя:

```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    user_id: userId,
    type: 'mention',
    title: 'Вас упомянули в комментарии',
    message: '@ivan упомянул вас в обсуждении базы "Клиенты"',
    metadata: {
      actionUrl: 'https://app.dataparsedesk.com/projects/123/database/456',
      actionText: 'Перейти к комментарию',
    },
  },
});
```

### 3. Отчёты (`report`)

Отправляется когда отчёт готов:

```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    user_id: userId,
    type: 'report',
    title: 'Отчёт готов к скачиванию',
    message: 'Ваш отчёт "Продажи за квартал" успешно сгенерирован',
    metadata: {
      actionUrl: 'https://app.dataparsedesk.com/reports/789',
      actionText: 'Скачать отчёт',
    },
  },
});
```

### 4. Приглашения (`member_added`)

Отправляется при добавлении в проект:

```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    user_id: userId,
    type: 'member_added',
    title: 'Вас добавили в проект',
    message: 'Иван Петров добавил вас в проект "Маркетинговая аналитика"',
    metadata: {
      actionUrl: 'https://app.dataparsedesk.com/projects/123',
      actionText: 'Перейти к проекту',
    },
  },
});
```

## HTML Email Templates

Каждый тип уведомления имеет свой HTML шаблон с:

- 🎨 Адаптивным дизайном (mobile-friendly)
- 🌈 Градиентным header
- 📱 Поддержкой тёмной темы
- 🔘 Call-to-action кнопкой
- 🔗 Ссылкой на отписку
- ✨ Профессиональным внешним видом

### Кастомизация шаблонов

Шаблоны находятся в `supabase/functions/send-notification/email-templates.ts`.

Пример изменения цветов:

```typescript
// Измените градиент в baseStyle
.header {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}

.button {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}
```

## Настройка уведомлений пользователем

Пользователи могут управлять своими уведомлениями в настройках:

```typescript
// Обновление настроек
const { data, error } = await supabase
  .from('notification_preferences')
  .update({
    email_enabled: true,
    comment_notifications: true,
    mention_notifications: true,
    report_notifications: false,
    frequency: 'instant', // 'instant' | 'daily' | 'weekly'
  })
  .eq('user_id', userId);
```

## Тестирование

### Локальное тестирование

```bash
# 1. Запустите функцию локально
supabase functions serve send-notification

# 2. Отправьте тестовый запрос
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-notification' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "test-user-id",
    "type": "comment",
    "title": "Test Notification",
    "message": "This is a test message"
  }'
```

### Генерация preview HTML

```bash
# Запустите тестовый скрипт
cd supabase/functions/send-notification
deno run --allow-net --allow-env --allow-write test-email.ts

# Откройте сгенерированные HTML файлы в браузере
open preview-comment.html
open preview-mention.html
open preview-report.html
open preview-member_added.html
```

### Отправка тестового email

```bash
# Установите переменные окружения
export RESEND_API_KEY=re_your_api_key
export TEST_EMAIL=your@email.com

# Запустите тестовый скрипт
deno run --allow-net --allow-env --allow-write test-email.ts
```

## Мониторинг и аналитика

### Resend Dashboard

В Resend Dashboard вы можете:

- 📊 Просматривать статистику доставки
- 📧 Проверять все отправленные письма
- ⚠️ Отслеживать ошибки и bounces
- 📈 Анализировать open rate и click rate

### Логи в Supabase

Проверяйте логи Edge Function:

```bash
# Локально
supabase functions logs send-notification

# В Supabase Dashboard
# Navigate to Functions → send-notification → Logs
```

## Troubleshooting

### Email не отправляется

**Проблема:** Функция возвращает `success: false`

**Решение:**
1. Проверьте наличие `RESEND_API_KEY` в secrets
2. Убедитесь, что API ключ валидный
3. Проверьте логи функции

```bash
supabase functions logs send-notification --tail
```

### Письма попадают в спам

**Проблема:** Email доставляется, но попадает в спам

**Решение:**
1. Используйте подтверждённый домен (не тестовый)
2. Настройте SPF, DKIM, DMARC записи
3. Избегайте спам-слов в теме
4. Добавьте физический адрес в footer
5. Включите ссылку на отписку

### Rate limit ошибки

**Проблема:** `Too many requests`

**Решение:**
1. Проверьте лимиты вашего тарифа
2. Рассмотрите переход на платный план
3. Реализуйте batching для массовых рассылок

### Домен не подтверждается

**Проблема:** DNS записи добавлены, но домен не проходит верификацию

**Решение:**
1. Подождите до 24 часов для распространения DNS
2. Проверьте правильность записей через `dig`:

```bash
dig TXT yourdomain.com
dig MX yourdomain.com
```

3. Убедитесь, что записи добавлены точно как в Resend

## Best Practices

### 1. Батчинг для массовых рассылок

Для отправки большого количества писем используйте batch API:

```typescript
const emails = users.map(user => ({
  from: 'Data Parse Desk <notifications@yourdomain.com>',
  to: [user.email],
  subject: 'Weekly Report',
  html: getEmailTemplate('report', { ... }),
}));

// Send in batches of 100
for (let i = 0; i < emails.length; i += 100) {
  const batch = emails.slice(i, i + 100);
  await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batch),
  });
}
```

### 2. Обработка ошибок

Всегда логируйте неудачные отправки:

```typescript
if (!emailResponse.ok) {
  await supabase.from('email_errors').insert({
    user_id: notification.user_id,
    error: emailResult.message,
    notification_type: notification.type,
    created_at: new Date().toISOString(),
  });
}
```

### 3. Unsubscribe ссылка

Всегда включайте ссылку на отписку:

```typescript
metadata: {
  unsubscribeUrl: `${APP_URL}/settings?tab=notifications&token=${unsubscribeToken}`,
}
```

## Цены Resend

| План | Цена | Включено | Дополнительно |
|------|------|----------|---------------|
| Free | $0 | 3,000 emails/мес | - |
| Pro | $20/мес | 50,000 emails | $0.40/1000 |
| Scale | Custom | Custom | Custom |

## Дополнительные ресурсы

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference/introduction)
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)
- [React Email Components](https://react.email)
- [Email Template Testing Tools](https://www.emailonacid.com)

## Поддержка

Если у вас возникли проблемы:

1. Проверьте [Resend Status](https://status.resend.com)
2. Посмотрите [FAQ](https://resend.com/docs/knowledge-base)
3. Свяжитесь с поддержкой: [support@resend.com](mailto:support@resend.com)
