# 🚀 ИНСТРУКЦИИ ПО ДЕПЛОЮ AI ФУНКЦИЙ

## ❌ Проблема: Нет доступа к Supabase API

**Ошибка:**
```
Your account does not have the necessary privileges to access this endpoint
```

## ✅ Решение: Авторизация в Supabase CLI

### Шаг 1: Авторизация
```bash
# Авторизуйтесь в Supabase
supabase login

# Откроется браузер для авторизации
# Войдите с вашими учетными данными Supabase
```

### Шаг 2: Получение Access Token
```bash
# Получите ваш access token
supabase projects list

# Или используйте личный access token
# Создайте его в: https://app.supabase.com/account/tokens
```

### Шаг 3: Установка токена (если нужно)
```bash
# Установите переменную окружения
export SUPABASE_ACCESS_TOKEN=sbp_your_token_here

# Или используйте флаг при деплое
supabase functions deploy ai-import-suggestions \
  --project-ref uzcmaxfhfcsxzfqvaloz \
  --token sbp_your_token_here
```

### Шаг 4: Деплой функций
```bash
# После успешной авторизации:

# 1. Деплой ai-import-suggestions
supabase functions deploy ai-import-suggestions --project-ref uzcmaxfhfcsxzfqvaloz

# 2. Деплой ai-analyze-schema
supabase functions deploy ai-analyze-schema --project-ref uzcmaxfhfcsxzfqvaloz

# 3. Проверка логов
supabase functions logs ai-import-suggestions --tail
```

---

## 🎯 АЛЬТЕРНАТИВА: Деплой через Supabase Dashboard

Если CLI не работает, используйте веб-интерфейс:

### Шаг 1: Откройте Dashboard
```
https://app.supabase.com/project/uzcmaxfhfcsxzfqvaloz/functions
```

### Шаг 2: Создайте/Обновите функцию

1. **Для ai-import-suggestions:**
   - Нажмите "Create a new function" или выберите существующую
   - Имя: `ai-import-suggestions`
   - Скопируйте код из: `supabase/functions/ai-import-suggestions/index.ts`
   - **ВАЖНО:** Также добавьте `_shared/prompts.ts` как зависимость

2. **Для ai-analyze-schema:**
   - Повторите для `ai-analyze-schema`
   - Скопируйте код из: `supabase/functions/ai-analyze-schema/index.ts`

### Шаг 3: Установите секреты
```
Settings → Vault → Secrets:
- LOVABLE_API_KEY = ваш_ключ_lovable_ai
```

---

## 📋 CHECKLIST РУЧНОГО ДЕПЛОЯ

### Файлы для загрузки:

#### 1. _shared/prompts.ts
```typescript
// Скопируйте весь файл из:
supabase/functions/_shared/prompts.ts

// Это общий модуль для всех функций
```

#### 2. ai-import-suggestions/index.ts
```typescript
// Скопируйте из:
supabase/functions/ai-import-suggestions/index.ts

// Убедитесь что import работает:
import { IMPORT_SUGGESTIONS_PROMPT, getModelConfig, callAIWithRetry } from '../_shared/prompts.ts';
```

#### 3. ai-analyze-schema/index.ts
```typescript
// Скопируйте из:
supabase/functions/ai-analyze-schema/index.ts

// Убедитесь что import работает:
import { SCHEMA_ANALYZER_PROMPT, getModelConfig, callAIWithRetry } from '../_shared/prompts.ts';
```

---

## 🔧 ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

### 1. Тест ai-import-suggestions
```bash
curl -X POST \
  https://uzcmaxfhfcsxzfqvaloz.supabase.co/functions/v1/ai-import-suggestions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "columns": [{"name": "email", "type": "text"}],
    "sampleData": [{"email": "test@example.com"}],
    "databaseId": "test-uuid"
  }'
```

### 2. Тест ai-analyze-schema
```bash
curl -X POST \
  https://uzcmaxfhfcsxzfqvaloz.supabase.co/functions/v1/ai-analyze-schema \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "E-commerce with products and orders",
    "inputType": "text",
    "projectId": "test-uuid"
  }'
```

### 3. Проверка логов
```
Dashboard → Functions → Select function → Logs
```

---

## 🐛 TROUBLESHOOTING

### "Docker is not running"
```bash
# Запустите Docker Desktop
open -a Docker

# Или установите Docker:
# brew install --cask docker
```

### "Module not found: _shared/prompts.ts"
**Причина:** Supabase Dashboard не поддерживает относительные импорты напрямую.

**Решение:**
1. Объедините код в один файл
2. Или используйте Supabase CLI (после авторизации)
3. Или используйте GitHub Integration для автодеплоя

---

## 💡 РЕКОМЕНДАЦИИ

### Вариант 1: CLI (рекомендуется)
```bash
# Авторизуйтесь один раз
supabase login

# Деплойте функции
supabase functions deploy ai-import-suggestions
```

### Вариант 2: GitHub Integration
```
1. Подключите GitHub к Supabase
2. Push изменения в main branch
3. Автоматический деплой
```

### Вариант 3: Manual Dashboard Upload
```
1. Скопируйте код вручную
2. Добавьте в Dashboard
3. Менее удобно для обновлений
```

---

## 📞 СЛЕДУЮЩИЕ ШАГИ

1. **Авторизуйтесь в Supabase CLI:**
   ```bash
   supabase login
   ```

2. **Попробуйте деплой снова:**
   ```bash
   ./DEPLOY_AI_PROMPTS.sh
   ```

3. **Если не работает - используйте Dashboard**

4. **После деплоя - протестируйте функции**

---

**Создано:** 23 октября 2025  
**Статус:** ⏳ Ожидает авторизации
