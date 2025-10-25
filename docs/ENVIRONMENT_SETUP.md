# Environment Configuration Guide

## Обзор

Приложение теперь поддерживает separate configurations для разных окружений (development, staging, production).

**Дата:** 2025-10-24
**Файлы:**
- [src/config/env.ts](../src/config/env.ts)
- [.env.development](../.env.development)
- [.env.production](../.env.production)
- [.env.staging](../.env.staging)
- [.env.example](../.env.example)

---

## 🎯 Зачем нужно разделение окружений

### Проблемы ДО:
- Один .env файл для всех окружений
- Риск использования production credentials в development
- Сложно тестировать production settings локально
- Feature flags в коде вместо конфигурации
- Нет разделения debug/production logs

### Преимущества ПОСЛЕ:
- ✅ Отдельные configurations для dev/staging/prod
- ✅ Feature flags через environment variables
- ✅ Безопасное разделение credentials
- ✅ Debug mode только в development
- ✅ Разные timeouts и settings
- ✅ Централизованная типизированная конфигурация

---

## 📁 Структура файлов

```
.
├── .env                    # Локальный файл (git ignored) - fallback
├── .env.development        # Development settings
├── .env.production         # Production settings
├── .env.staging            # Staging settings
├── .env.example            # Template для всех окружений
└── src/
    └── config/
        └── env.ts          # Типизированный ENV object
```

### Какой файл используется?

| Команда | Vite Mode | Загружаемый файл |
|---------|-----------|------------------|
| `npm run dev` | `development` | `.env.development` |
| `npm run build` | `production` | `.env.production` |
| `npm run build:staging` | `staging` | `.env.staging` |
| Fallback | any | `.env` |

---

## 🔧 Настройка окружений

### 1. Development (.env.development)

**Назначение:** Локальная разработка

**Особенности:**
- Debug mode включен
- Детальные logs (level: debug)
- Все feature flags enabled
- Длинные timeouts для debugging
- CORS: localhost origins
- Sentry отключен или отдельный DSN

```bash
# Development Environment
VITE_ENVIRONMENT="development"
VITE_DEBUG_MODE="true"
VITE_LOG_LEVEL="debug"
VITE_API_TIMEOUT="30000"

VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-dev-anon-key"

# Dev-only: Service role key для local testing Edge Functions
SUPABASE_SERVICE_ROLE_KEY="your-dev-service-role-key"

VITE_CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# All features enabled for testing
VITE_ENABLE_AI_FEATURES="true"
VITE_ENABLE_EXPORT="true"
VITE_ENABLE_CLOUD_SYNC="true"
VITE_ENABLE_TELEGRAM="true"

# Monitoring disabled
VITE_ENABLE_ANALYTICS="false"
```

### 2. Staging (.env.staging)

**Назначение:** Pre-production testing

**Особенности:**
- Debug частично enabled
- Info level logs
- Все features enabled для тестирования
- Production-like settings
- CORS: staging domains
- Sentry enabled (staging environment)

```bash
# Staging Environment
VITE_ENVIRONMENT="staging"
VITE_DEBUG_MODE="true"
VITE_LOG_LEVEL="info"
VITE_API_TIMEOUT="15000"

VITE_SUPABASE_URL="https://your-staging.supabase.co"
VITE_SUPABASE_ANON_KEY="your-staging-anon-key"

VITE_CORS_ORIGINS="https://staging.yourapp.com"

# All features for testing
VITE_ENABLE_AI_FEATURES="true"
VITE_ENABLE_EXPORT="true"
VITE_ENABLE_CLOUD_SYNC="true"
VITE_ENABLE_TELEGRAM="true"

# Monitoring enabled
VITE_ENABLE_ANALYTICS="false"
VITE_SENTRY_DSN="https://your-sentry-dsn@sentry.io"
VITE_SENTRY_ENVIRONMENT="staging"
```

### 3. Production (.env.production)

**Назначение:** Production deployment

**Особенности:**
- Debug disabled
- Error level logs только
- Conservative feature flags
- Короткие timeouts
- CORS: production domains only
- Sentry enabled
- Analytics enabled

```bash
# Production Environment
VITE_ENVIRONMENT="production"
VITE_DEBUG_MODE="false"
VITE_LOG_LEVEL="error"
VITE_API_TIMEOUT="10000"

VITE_SUPABASE_URL="https://your-prod.supabase.co"
VITE_SUPABASE_ANON_KEY="your-prod-anon-key"

# NO SERVICE_ROLE_KEY IN PRODUCTION FRONTEND!

VITE_CORS_ORIGINS="https://app.yourapp.com,https://yourapp.com"

# Conservative feature flags
VITE_ENABLE_AI_FEATURES="true"
VITE_ENABLE_EXPORT="true"
VITE_ENABLE_CLOUD_SYNC="true"
VITE_ENABLE_TELEGRAM="false"  # Disabled until fully tested

# Monitoring enabled
VITE_ENABLE_ANALYTICS="true"
VITE_SENTRY_DSN="https://your-sentry-dsn@sentry.io"
VITE_SENTRY_ENVIRONMENT="production"
```

---

## 💻 Использование в коде

### Типизированный доступ к ENV

```typescript
import { ENV } from '@/config/env';

// Environment info
console.log(ENV.environment);        // 'development' | 'staging' | 'production'
console.log(ENV.isDevelopment);      // boolean
console.log(ENV.isProduction);       // boolean
console.log(ENV.mode);                // Vite mode

// Debug settings
if (ENV.debug.enabled) {
  console.log('Debug mode ON');
}

const logLevel = ENV.debug.logLevel;  // 'debug' | 'info' | 'warn' | 'error'

// Supabase
const url = ENV.supabase.url;
const key = ENV.supabase.anonKey;
const projectId = ENV.supabase.projectId;

// Feature flags
if (ENV.features.enableAI) {
  // Show AI features
}

if (ENV.features.enableOfflineMode) {
  // Enable offline sync
}

// API configuration
const timeout = ENV.api.timeout;      // number (ms)
const maxRetries = ENV.api.maxRetries;

// CORS
const origins = ENV.cors.allowedOrigins; // string[]

// Monitoring
if (ENV.monitoring.sentryDsn) {
  // Initialize Sentry
}
```

### Conditional Features

```typescript
// В компоненте
import { ENV } from '@/config/env';

function MyComponent() {
  return (
    <div>
      {ENV.features.enableAI && <AIFeatures />}
      {ENV.features.enableExport && <ExportButton />}
      {ENV.features.enableTelegram && <TelegramIntegration />}
    </div>
  );
}
```

### Debug Logging

```typescript
import { ENV } from '@/config/env';

function debugLog(message: string, ...args: any[]) {
  if (ENV.debug.enabled && ENV.debug.logLevel === 'debug') {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

function infoLog(message: string, ...args: any[]) {
  if (ENV.debug.enabled && ['debug', 'info'].includes(ENV.debug.logLevel)) {
    console.info(`[INFO] ${message}`, ...args);
  }
}
```

---

## 🚀 Build & Deploy

### Development

```bash
# Использует .env.development
npm run dev

# Logs:
# Mode: development
# Debug Mode: ON
# Log Level: DEBUG
```

### Staging

```bash
# Создать staging build
npm run build -- --mode staging

# Preview staging build
npm run preview

# Deploy
# (команда зависит от hosting provider)
```

### Production

```bash
# Использует .env.production
npm run build

# Preview production build
npm run preview

# Deploy
# (команда зависит от hosting provider)
```

---

## 🔒 Безопасность

### DO's ✅

1. **Используйте отдельные Supabase projects**
   - Development: dev project
   - Staging: staging project
   - Production: production project

2. **Service Role Key**
   - Только в Edge Functions
   - Только в .env.development для local testing
   - НИКОГДА в .env.production

3. **CORS Origins**
   - Development: localhost only
   - Staging: staging domain only
   - Production: production domain only

4. **Feature Flags**
   - Новые features: disabled в production
   - Тестируем в dev/staging сначала
   - Постепенный rollout

5. **Git**
   - Commit .env.example
   - .gitignore всех .env файлов
   - Никогда не commit credentials

### DON'Ts ❌

1. ❌ НЕ используйте production credentials в dev
2. ❌ НЕ commit .env файлы в git
3. ❌ НЕ копируйте service role key в frontend builds
4. ❌ НЕ используйте wildcard CORS в production
5. ❌ НЕ включайте debug mode в production

---

## 📊 Available Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGc...` |

### Environment Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_ENVIRONMENT` | string | `development` | Environment name |
| `VITE_DEBUG_MODE` | boolean | `false` | Enable debug logs |
| `VITE_LOG_LEVEL` | string | `error` | Log level (debug/info/warn/error) |

### API Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_API_TIMEOUT` | number | `10000` | API timeout (ms) |
| `VITE_ENABLE_OFFLINE_MODE` | boolean | `true` | Enable offline sync |
| `VITE_CORS_ORIGINS` | string | `localhost:5173` | Comma-separated origins |

### Feature Flags

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_ENABLE_AI_FEATURES` | boolean | `true` | AI-powered features |
| `VITE_ENABLE_EXPORT` | boolean | `true` | Data export |
| `VITE_ENABLE_CLOUD_SYNC` | boolean | `true` | Cloud sync (Dropbox/OneDrive) |
| `VITE_ENABLE_TELEGRAM` | boolean | `false` | Telegram integration |
| `VITE_ENABLE_ANALYTICS` | boolean | `false` | Analytics tracking |

### Monitoring

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_SENTRY_DSN` | string | - | Sentry DSN for error tracking |
| `VITE_SENTRY_ENVIRONMENT` | string | `development` | Sentry environment tag |

### Optional Integrations

| Variable | Description |
|----------|-------------|
| `VITE_DROPBOX_CLIENT_ID` | Dropbox OAuth client ID |
| `VITE_ONEDRIVE_CLIENT_ID` | OneDrive OAuth client ID |
| `VITE_TELEGRAM_BOT_TOKEN` | Telegram bot API token |

---

## 🧪 Testing

### Проверка текущего окружения

```typescript
import { logEnvInfo } from '@/config/env';

// В main.tsx или App.tsx
logEnvInfo();

// Console output:
// 🔧 Environment Configuration
//   Mode: development
//   Environment: development
//   Debug Mode: ON
//   Log Level: DEBUG
//   Supabase Project: uzcmaxfhfcsxzfqvaloz
//   Features
//     Service Worker: ✗
//     Offline Mode: ✓
//     AI Features: ✓
//     Export: ✓
//     Cloud Sync: ✓
//     Telegram: ✓
//     Analytics: ✗
//   API Timeout: 30000ms
//   CORS Origins: http://localhost:5173, http://localhost:3000
//   Sentry: Not configured
```

### Тест validation

```bash
# Удалить required variable
# Запустить app
npm run dev

# Expected error:
# Missing required environment variables:
#   - VITE_SUPABASE_URL
#
# Please copy .env.example to .env.development and fill in the required values.
```

---

## 🔧 Migration Guide

### Existing Projects

Если у вас уже есть .env файл:

1. **Backup текущий .env**
   ```bash
   cp .env .env.backup
   ```

2. **Создать файлы для каждого окружения**
   ```bash
   cp .env.example .env.development
   cp .env.example .env.production
   cp .env.example .env.staging
   ```

3. **Скопировать credentials из backup**
   ```bash
   # В каждый файл скопировать нужные credentials
   # Использовать разные Supabase projects если возможно
   ```

4. **Настроить environment-specific settings**
   - `.env.development`: debug=true, timeout=30000
   - `.env.production`: debug=false, timeout=10000
   - `.env.staging`: debug=true, timeout=15000

5. **Update .gitignore**
   ```
   # Environment variables
   .env
   .env.local
   .env.development
   .env.staging
   .env.production
   .env.*.local

   # Keep example
   !.env.example
   ```

6. **Test**
   ```bash
   npm run dev        # Uses .env.development
   npm run build      # Uses .env.production
   ```

---

## 📚 Best Practices

### 1. Environment Parity

Держите environments максимально похожими:
- Same Supabase version
- Same feature flags structure
- Same variable names
- Только values different

### 2. Feature Flag Strategy

```typescript
// Good: Gradual rollout
.env.development:   VITE_ENABLE_NEW_FEATURE="true"
.env.staging:       VITE_ENABLE_NEW_FEATURE="true"
.env.production:    VITE_ENABLE_NEW_FEATURE="false"  // Enable after testing

// Bad: Different features in each environment
```

### 3. Secrets Management

```bash
# Development: в .env файлах (git ignored)
# Staging/Production: в hosting platform secrets
# - Vercel: Environment Variables
# - Netlify: Environment Variables
# - AWS: Secrets Manager
```

### 4. Documentation

Документируйте все environment variables:
- Зачем нужна
- Какие values допустимы
- Impact на application
- Default value

---

## 🐛 Troubleshooting

### Problem: Wrong environment loaded

**Symptoms:** Production settings в development

**Solution:**
```bash
# Check which file is being used
npm run dev -- --debug

# Explicitly set mode
npm run dev -- --mode development
```

### Problem: Variables not updating

**Symptoms:** Changes в .env не применяются

**Solution:**
```bash
# Restart dev server
# Vite caches env at startup
```

### Problem: Build uses wrong env

**Symptoms:** Development settings в production build

**Solution:**
```bash
# Check build command mode
npm run build -- --mode production

# Verify .env.production exists and has correct values
cat .env.production
```

---

## 📞 Related Documentation

- [QUICKSTART_CONNECTION.md](../QUICKSTART_CONNECTION.md) - Connection setup
- [CORS_SECURITY_COMPLETE.md](../CORS_SECURITY_COMPLETE.md) - CORS configuration
- [EXPONENTIAL_BACKOFF.md](EXPONENTIAL_BACKOFF.md) - Retry logic

---

**Последнее обновление:** 2025-10-24
**Статус:** ✅ Реализовано
**Тесты:** Manual testing required
