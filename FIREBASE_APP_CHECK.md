# 🛡️ Firebase App Check Setup

## Что такое App Check?
Firebase App Check помогает защитить ваши backend ресурсы от злоупотреблений, такие как мошенничество с выставлением счетов или фишинг. Он работает с Firebase сервисами для проверки, что трафик поступает из вашего легитимного приложения.

## Настройка App Check для Web

### 1. Включите App Check в Firebase Console
1. Перейдите в [Firebase Console](https://console.firebase.google.com/project/vhdata-platform/appcheck)
2. Нажмите **"Get started"**
3. Выберите **reCAPTCHA v3** для Web app
4. Следуйте инструкциям по настройке

### 2. Получите reCAPTCHA Site Key
1. В App Check настройках выберите ваше Web приложение
2. Выберите **reCAPTCHA v3** как провайдера
3. Нажмите **"Register"** и получите Site Key
4. Добавьте в `.env.local`:
```env
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### 3. Добавьте App Check в код

Обновите `src/lib/firebase.ts`:
```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// После инициализации app
const app = initializeApp(firebaseConfig);

// Инициализация App Check (только в production)
if (import.meta.env.PROD && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}
```

## Security Rules для Firestore

### Базовые правила безопасности
Создайте файл `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Функция проверки аутентификации
    function isAuthenticated() {
      return request.auth != null;
    }

    // Функция проверки владельца
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Правила для FCM токенов
    match /user_fcm_tokens/{document} {
      allow read: if isOwner(resource.data.user_id);
      allow write: if isOwner(request.resource.data.user_id);
      allow delete: if isOwner(resource.data.user_id);
    }

    // Правила для настроек уведомлений
    match /user_notification_preferences/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Правила для истории уведомлений
    match /notification_history/{document} {
      allow read: if isOwner(resource.data.user_id);
      allow write: if false; // Только backend может писать
    }
  }
}
```

## Storage Security Rules

Для Firebase Storage создайте файл `storage.rules`:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuthenticated() {
      return request.auth != null;
    }

    // Правила для аватаров пользователей
    match /users/{userId}/avatar/{fileName} {
      allow read: if true; // Публичный доступ к аватарам
      allow write: if isAuthenticated() && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024 // Max 5MB
        && request.resource.contentType.matches('image/.*');
    }

    // Правила для файлов баз данных
    match /databases/{databaseId}/files/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated()
        && request.resource.size < 50 * 1024 * 1024; // Max 50MB
    }
  }
}
```

## Cloud Messaging Security

### Rate Limiting
Добавьте ограничение частоты отправки уведомлений в Edge Function:

```typescript
// В supabase/functions/send-push-notification/index.ts
import { RateLimiter } from 'some-rate-limiter-library';

const limiter = new RateLimiter({
  tokensPerInterval: 10, // 10 уведомлений
  interval: "minute", // в минуту
  fireImmediately: true
});

// В функции обработки
if (!limiter.tryRemoveTokens(1)) {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }),
    { status: 429 }
  );
}
```

## Мониторинг безопасности

### 1. Включите аудит логов
В Firebase Console → Project Settings → Cloud Logging

### 2. Настройте алерты
Firebase Console → Monitoring → Create Alert:
- Abnormal API usage
- Failed authentication attempts
- Quota exceeded warnings

### 3. Регулярно проверяйте
- Firebase Console → App Check → Metrics
- Firebase Console → Authentication → Users
- Firebase Console → Cloud Messaging → Reports

## Чеклист безопасности

- [ ] App Check включен для production
- [ ] reCAPTCHA настроен для Web
- [ ] Security Rules настроены для Firestore
- [ ] Storage Rules ограничивают размер файлов
- [ ] Rate limiting настроен для API
- [ ] Аудит логов включен
- [ ] Алерты настроены
- [ ] Service Account ключи защищены
- [ ] Environment переменные не в Git
- [ ] HTTPS включен для production

## Дополнительные меры защиты

### 1. Content Security Policy
Добавьте в HTML head:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' https://www.gstatic.com https://www.google.com;
               connect-src 'self' https://*.googleapis.com https://*.firebase.com;">
```

### 2. CORS настройки
Для API endpoints настройте CORS:
```typescript
const corsOptions = {
  origin: ['https://your-domain.com'],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### 3. Валидация входных данных
Всегда валидируйте данные на backend:
```typescript
import { z } from 'zod';

const notificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().max(100),
  body: z.string().max(500),
  type: z.enum(['database_cloned', 'import_completed', ...])
});

// Используйте
const validated = notificationSchema.parse(requestData);
```

## Ресурсы

- [Firebase App Check Docs](https://firebase.google.com/docs/app-check)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Web Security Best Practices](https://web.dev/secure/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)