# Send Notification Function

Эта функция отправляет уведомления пользователям через различные каналы (Email, Telegram).

## Настройка Email уведомлений (Resend)

### 1. Создайте аккаунт на Resend

1. Перейдите на [resend.com](https://resend.com)
2. Зарегистрируйтесь и войдите в панель управления
3. Подтвердите свой домен (или используйте тестовый домен `onboarding.resend.dev`)

### 2. Получите API ключ

1. В панели Resend перейдите в раздел **API Keys**
2. Создайте новый API ключ
3. Скопируйте ключ (он будет показан только один раз)

### 3. Настройте переменную окружения

Добавьте API ключ в Supabase Edge Functions:

```bash
# Локальная разработка
echo "RESEND_API_KEY=re_xxxxxxxxxx" >> supabase/.env.local

# Production (через Supabase Dashboard)
# Settings -> Edge Functions -> Secrets
# Добавьте: RESEND_API_KEY = re_xxxxxxxxxx
```

### 4. Настройка домена (Production)

Для production использования необходимо настроить свой домен:

1. В Resend перейдите в **Domains**
2. Добавьте свой домен (например, `dataparsedesk.com`)
3. Добавьте DNS записи, которые показывает Resend
4. Дождитесь подтверждения домена
5. Обновите адрес отправителя в коде:

```typescript
from: 'Data Parse Desk <notifications@yourdomain.com>',
```

## Типы уведомлений

Функция поддерживает следующие типы уведомлений:

- `comment` - новый комментарий
- `mention` - упоминание в комментарии
- `report` - отчёт готов
- `member_added` - добавление в проект

## Использование

```typescript
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    user_id: 'user-uuid',
    type: 'comment',
    title: 'Новый комментарий',
    message: 'Пользователь оставил комментарий к вашей базе данных',
    metadata: {
      actionUrl: 'https://app.dataparsedesk.com/projects/123',
      actionText: 'Посмотреть комментарий',
    },
  },
});
```

## HTML Email Templates

Email шаблоны находятся в `email-templates.ts`. Каждый тип уведомления имеет свой шаблон с соответствующим дизайном и иконками.

Шаблоны включают:
- Адаптивный дизайн (mobile-friendly)
- Градиентный header
- Call-to-action кнопку
- Footer с ссылкой на отписку

## Тестирование

### Локальное тестирование

```bash
# Запустите локально
supabase functions serve send-notification

# Отправьте тестовый запрос
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-notification' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"user_id":"test-user-id","type":"comment","title":"Test","message":"Test message"}'
```

### Тестирование в Resend Dashboard

Resend предоставляет тестовую среду с возможностью просмотра всех отправленных писем в реальном времени.

## Troubleshooting

### Email не отправляется

1. Проверьте, что `RESEND_API_KEY` настроен
2. Убедитесь, что домен подтверждён (для production)
3. Проверьте логи функции:
   ```bash
   supabase functions logs send-notification
   ```

### Письма попадают в спам

1. Настройте SPF, DKIM и DMARC записи
2. Используйте подтверждённый домен
3. Избегайте спам-слов в теме и тексте
4. Добавьте ссылку на отписку

## Ограничения Resend

- **Free Plan**: 100 писем/день, 3,000/месяц
- **Pro Plan**: от $20/месяц за 50,000 писем
- Максимальный размер письма: 40 MB

## Дополнительная информация

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference/introduction)
- [Resend Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)
