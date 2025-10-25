# 🔍 НАСТРОЙКА SENTRY - ERROR MONITORING

**Время:** 15 минут
**Сложность:** Лёгкая
**Статус:** ⚠️ Требует создания аккаунта

---

## 🎯 ЧТО ТАКОЕ SENTRY

Sentry - это платформа для мониторинга ошибок в production:
- ✅ Отслеживание JavaScript errors
- ✅ Performance monitoring
- ✅ Session replay
- ✅ Alerts на критические ошибки
- ✅ Интеграция с Slack/Email
- ✅ Source maps для debugging

---

## 📋 ШАГ ЗА ШАГОМ

### Шаг 1: Создать аккаунт (3 минуты)

1. Перейти на https://sentry.io/signup/
2. Выбрать вариант регистрации:
   - **GitHub** (рекомендуется)
   - **Google**
   - Email
3. Подтвердить email
4. Выбрать план:
   - **Developer (Free)** - 5K errors/month (достаточно для начала)
   - Team - $26/месяц (больше features)
   - Business - $80/месяц (enterprise)

**Рекомендация:** Начать с **Free** плана

---

### Шаг 2: Создать проект (2 минуты)

1. После входа нажать **"Create Project"**
2. Выбрать платформу: **React**
3. Set your alert frequency: **Alert me on every new issue**
4. Project name: `data-parse-desk-2`
5. Team: `Your Team Name`
6. Нажать **"Create Project"**

---

### Шаг 3: Получить DSN (1 минута)

После создания проекта Sentry покажет:

```javascript
Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  // ... other config
});
```

**Скопируйте DSN** - это строка вида:
```
https://abc123def456@o123456.ingest.sentry.io/789012
```

---

### Шаг 4: Добавить DSN в .env (2 минуты)

#### Development (.env):
```bash
# Sentry Error Monitoring
VITE_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
VITE_SENTRY_ENVIRONMENT="development"
VITE_SENTRY_SAMPLE_RATE="1.0"          # 100% in dev
VITE_SENTRY_REPLAY_SESSION_RATE="1.0"   # 100% in dev
VITE_SENTRY_REPLAY_ERROR_RATE="1.0"     # 100% on errors
```

#### Production (.env.production):
```bash
# Sentry Error Monitoring
VITE_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
VITE_SENTRY_ENVIRONMENT="production"
VITE_SENTRY_SAMPLE_RATE="0.1"           # 10% in prod
VITE_SENTRY_REPLAY_SESSION_RATE="0.1"   # 10% sessions
VITE_SENTRY_REPLAY_ERROR_RATE="1.0"     # 100% on errors
```

#### Staging (.env.staging - если используется):
```bash
VITE_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
VITE_SENTRY_ENVIRONMENT="staging"
VITE_SENTRY_SAMPLE_RATE="0.5"           # 50% in staging
```

---

### Шаг 5: Проверить интеграцию (уже готово!) ✅

Код Sentry **уже добавлен** в проект:

**Файл:** `src/main.tsx` (строки 6-30)
```typescript
// Sentry integration is already configured!
if (ENV.monitoring.sentryDsn) {
  Sentry.init({
    dsn: ENV.monitoring.sentryDsn,
    environment: ENV.monitoring.sentryEnvironment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAY_SESSION_RATE || '0.1'),
    replaysOnErrorSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAY_ERROR_RATE || '1.0'),
  });
}
```

**Всё готово!** Просто добавьте DSN в .env и всё заработает.

---

### Шаг 6: Протестировать (3 минуты)

#### A. Запустить приложение:
```bash
npm run dev
```

#### B. Открыть DevTools Console и выполнить:
```javascript
// Тест Sentry
throw new Error("Sentry Test Error - игнорируйте это");
```

#### C. Проверить в Sentry:
1. Перейти на https://sentry.io
2. Открыть проект `data-parse-desk-2`
3. Issues → Должна появиться новая ошибка "Sentry Test Error"

#### D. Если ошибка появилась - **ВСЁ РАБОТАЕТ!** ✅

---

### Шаг 7: Настроить Source Maps (опционально, 5 минут)

Source maps помогают debugging в production.

**Файл:** `vite.config.ts` (уже настроен!)

```typescript
export default defineConfig({
  build: {
    sourcemap: true, // ✅ Already enabled
  },
  plugins: [
    // Sentry plugin already configured in package.json
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "your-org",
      project: "data-parse-desk-2",
    }),
  ],
});
```

**Для активации:**
1. Получить Auth Token на sentry.io/settings/account/api/auth-tokens/
2. Добавить в `.env.local` (НЕ коммитить!):
   ```bash
   SENTRY_AUTH_TOKEN="your-sentry-auth-token"
   ```

---

## ✅ CHECKLIST

- [ ] Создан аккаунт на sentry.io
- [ ] Создан проект `data-parse-desk-2`
- [ ] Получен DSN
- [ ] DSN добавлен в `.env`
- [ ] DSN добавлен в `.env.production`
- [ ] Приложение запущено (`npm run dev`)
- [ ] Протестирована ошибка в console
- [ ] Ошибка появилась в Sentry Dashboard
- [ ] (Опционально) Source maps настроены

---

## 📊 КОНФИГУРАЦИЯ ПО ОКРУЖЕНИЯМ

### Development
```
Sample Rate: 100% (все ошибки)
Replay: 100% (все сессии)
Environment: "development"
```

### Staging
```
Sample Rate: 50% (половина ошибок)
Replay: 50% (половина сессий)
Environment: "staging"
```

### Production
```
Sample Rate: 10% (10% ошибок для экономии квоты)
Replay: 10% (10% сессий)
Replay on Error: 100% (все сессии с ошибками)
Environment: "production"
```

---

## 🔔 НАСТРОЙКА ALERTS

### В Sentry Dashboard:

1. **Settings** → **Alerts** → **Create Alert Rule**
2. **Conditions:**
   - Issue is first seen
   - Issue changes state to unresolved
   - Issue is seen more than 100 times in 1 hour
3. **Actions:**
   - Send email to: [ваш email]
   - (Опционально) Send Slack notification
   - (Опционально) Create Jira ticket

### Рекомендуемые правила:

#### Rule 1: New Issues
```
Condition: Issue is first seen
Action: Email to team@company.com
```

#### Rule 2: High Volume
```
Condition: Issue seen > 100 times in 1h
Action: Email + Slack critical alert
```

#### Rule 3: Critical Errors
```
Condition: Issue level is error or fatal
Frequency: More than 10 times in 5 minutes
Action: Page on-call engineer
```

---

## 🔗 ИНТЕГРАЦИИ

### Slack Integration:
1. Settings → Integrations → Slack
2. Connect Workspace
3. Select channel: `#engineering-alerts`
4. Configure notifications

### GitHub Integration:
1. Settings → Integrations → GitHub
2. Install Sentry app
3. Link repository: `jamsmac/data-parse-desk`
4. Auto-create issues on new errors (опционально)

---

## 📈 МОНИТОРИНГ PERFORMANCE

Sentry также может мониторить производительность:

### В коде (уже есть!):
```typescript
Sentry.browserTracingIntegration()
```

### Что отслеживается:
- ✅ Page load time
- ✅ API request duration
- ✅ Component render time
- ✅ Navigation timing
- ✅ Web Vitals (LCP, FID, CLS)

### Просмотр:
1. Sentry Dashboard → Performance
2. Анализ медленных транзакций
3. Оптимизация bottlenecks

---

## 💰 СТОИМОСТЬ

### Free Plan (5K errors/month):
```
✅ Error tracking
✅ Performance monitoring
✅ Session replay (limited)
✅ 1 user
✅ 30 days history
```

### Team Plan ($26/month):
```
✅ 50K errors/month
✅ Unlimited users
✅ 90 days history
✅ More integrations
✅ Priority support
```

**Для начала хватит Free плана!**

---

## 🆘 TROUBLESHOOTING

### Ошибки не появляются в Sentry:

1. **Проверить DSN:**
   ```bash
   echo $VITE_SENTRY_DSN
   # Должен быть установлен
   ```

2. **Проверить console:**
   ```
   Откройте DevTools → Console
   Должно быть: [Sentry] Successfully initialized
   ```

3. **Проверить network:**
   ```
   DevTools → Network → Filter: sentry
   Должны быть запросы к sentry.io
   ```

4. **Проверить окружение:**
   ```javascript
   console.log(ENV.monitoring.sentryDsn);
   // Должен показать ваш DSN
   ```

### Session Replay не работает:

1. Проверить sample rate в .env
2. Проверить plan в Sentry (Free план limited)
3. Проверить browser compatibility

---

## 📚 ПОЛЕЗНЫЕ ССЫЛКИ

- **Sentry Dashboard:** https://sentry.io
- **React Integration:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Performance Monitoring:** https://docs.sentry.io/product/performance/
- **Session Replay:** https://docs.sentry.io/product/session-replay/
- **Source Maps:** https://docs.sentry.io/platforms/javascript/sourcemaps/

---

## ✨ ГОТОВО!

После выполнения всех шагов:

✅ Sentry настроен
✅ Ошибки отслеживаются
✅ Alerts настроены
✅ Performance monitoring активен
✅ Production готов

**Следующий шаг:** Настройка backups (см. НАСТРОЙКА_BACKUPS.md)

---

**Время выполнения:** 15 минут
**Сложность:** ⭐⭐☆☆☆ Лёгкая
**Приоритет:** 🟡 Высокий (но не критичный)

