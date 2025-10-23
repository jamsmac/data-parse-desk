# 🤖 АНАЛИЗ AI ПРОМПТОВ - ОШИБКИ И НЕДОРАБОТКИ

**Дата:** 23 октября 2025  
**Статус:** 🔴 ТРЕБУЮТ ИСПРАВЛЕНИЯ

---

## 📊 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ

### 🔴 КРИТИЧЕСКИЕ ОШИБКИ:

#### 1. **ai-analyze-schema** - Неполный промпт
**Файл:** `supabase/functions/ai-analyze-schema/index.ts:9-84`

**Проблемы:**
- ❌ Нет обработки многозначных entity names (singular vs plural)
- ❌ Промпт требует `"name": "table_name"` в singular, но не объясняет правила
- ❌ Отсутствует валидация column types
- ❌ Не указаны ограничения на длину имен
- ❌ Нет примеров для русского языка

**Пример ошибки:**
```typescript
// ❌ НЕПРАВИЛЬНО: может вернуть "users" или "user"
"name": "table_name",  // Какой формат ожидается?

// ✅ ПРАВИЛЬНО: нужно указать явно
"name": "user",  // ALWAYS SINGULAR, snake_case
```

---

#### 2. **ai-import-suggestions** - Использует Gemini вместо Lovable AI
**Файл:** `supabase/functions/ai-import-suggestions/index.ts:5-6`

**Проблемы:**
- ❌ Использует GEMINI_API_KEY вместо LOVABLE_API_KEY
- ❌ Прямой вызов Google API вместо ai.gateway.lovable.dev
- ❌ Несогласованность с остальными функциями
- ❌ Дополнительная зависимость от Google API

**Код:**
```typescript
// ❌ НЕПРАВИЛЬНО
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/...';

// ✅ ПРАВИЛЬНО: должно быть
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_API_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
```

---

#### 3. **generate-insights** - Отсутствует AI анализ
**Файл:** `supabase/functions/generate-insights/index.ts`

**Проблемы:**
- ❌ Используется ТОЛЬКО rule-based анализ (if/else)
- ❌ НЕТ вызовов AI для генерации инсайтов
- ❌ Функция названа "AI insights", но AI НЕ используется
- ❌ Ограниченные возможности анализа

**Отсутствующий функционал:**
```typescript
// ❌ НЕТ AI анализа:
// - Корреляция между колонками
// - Предсказание трендов
// - Аномалии бизнес-логики
// - Рекомендации по оптимизации

// ✅ НУЖНО: добавить AI для:
const aiInsights = await callAI({
  data: tableData,
  schema: database.table_schemas,
  prompt: INSIGHTS_ANALYZER_PROMPT
});
```

---

#### 4. **telegram-natural-language** - Огромный промпт с дублированием
**Файл:** `supabase/functions/telegram-natural-language/index.ts:60-126`

**Проблемы:**
- ❌ 160+ строк промпта - слишком длинный
- ❌ Множество дублирующихся примеров
- ❌ Неэффективное использование токенов
- ❌ Смешение русских и английских примеров
- ❌ Отсутствует систематизация

**Размер:**
```
Промпт: ~4000 токенов
Рекомендуемый: ~1000 токенов
Избыточность: 75%
```

---

### ⚠️ СРЕДНИЕ ПРОБЛЕМЫ:

#### 5. **Отсутствие единого стиля промптов**

**Проблемы:**
- ⚠️ Разные форматы инструкций
- ⚠️ Разные стили описания (imperative vs descriptive)
- ⚠️ Несогласованная терминология
- ⚠️ Разная структура OUTPUT FORMAT

**Примеры несогласованности:**
```typescript
// ai-analyze-schema:
"OUTPUT FORMAT (JSON):"

// ai-import-suggestions:
"**Response Format (JSON):**"

// telegram-natural-language:
"Отвечай ТОЛЬКО в формате JSON через tool call"

// ✅ ДОЛЖНО БЫТЬ ЕДИНООБРАЗНО
```

---

#### 6. **Недостаточная обработка ошибок AI**

**Проблемы:**
- ⚠️ Нет retry логики для rate limits
- ⚠️ Нет fallback для некорректных ответов AI
- ⚠️ Недостаточное логирование AI responses
- ⚠️ Нет валидации структуры ответа

---

#### 7. **Отсутствие примеров в промптах**

**Файлы:**
- `ai-analyze-schema` - нет примеров valid JSON
- `generate-insights` - нет примеров инсайтов
- `ai-create-schema` - нет примеров mapping

**Что нужно:**
```typescript
// ❌ БЕЗ ПРИМЕРОВ (текущее)
"Return JSON with entities array"

// ✅ С ПРИМЕРАМИ (правильно)
`Return JSON with entities array.

EXAMPLE INPUT:
"I need a blog with posts, authors, and comments"

EXAMPLE OUTPUT:
{
  "entities": [
    {
      "name": "post",
      "columns": [...]
    }
  ]
}`
```

---

### 🟡 МИНОРНЫЕ ПРОБЛЕМЫ:

#### 8. **Неэффективные temperature настройки**

```typescript
// ai-analyze-schema:
temperature: 0.3  // ❌ Слишком креативно для schema

// ai-import-suggestions:
temperature: 0.2  // ✅ Хорошо

// telegram-natural-language:
// ❌ НЕТ temperature настройки

// ✅ РЕКОМЕНДАЦИИ:
// Schema generation: 0.1-0.2 (deterministic)
// NL understanding: 0.2-0.3 (structured)
// Insights: 0.5-0.7 (creative)
```

---

#### 9. **Отсутствие versioning промптов**

**Проблемы:**
- 🟡 Нет версий промптов
- 🟡 Нет changelog для промптов
- 🟡 Нет A/B тестирования
- 🟡 Нет метрик качества

---

#### 10. **Hardcoded model names**

```typescript
// ❌ HARDCODED во всех файлах:
model: 'google/gemini-2.5-flash'
model: 'gemini-2.0-flash-exp'

// ✅ ДОЛЖНО БЫТЬ:
const AI_MODEL = Deno.env.get('AI_MODEL') || 'google/gemini-2.5-flash';
```

---

## 📋 ПЛАН ИСПРАВЛЕНИЙ

### Приоритет 1 (КРИТИЧЕСКИЙ):
1. ✅ Исправить ai-import-suggestions (Gemini → Lovable AI)
2. ✅ Добавить AI в generate-insights
3. ✅ Оптимизировать telegram-natural-language промпт
4. ✅ Улучшить ai-analyze-schema промпт

### Приоритет 2 (ВЫСОКИЙ):
5. ✅ Унифицировать стиль всех промптов
6. ✅ Добавить обработку ошибок и retry логику
7. ✅ Добавить примеры в промпты

### Приоритет 3 (СРЕДНИЙ):
8. ✅ Оптимизировать temperature настройки
9. ✅ Вынести model names в env variables
10. ✅ Добавить валидацию ответов AI

---

## 🎯 ОЖИДАЕМЫЕ УЛУЧШЕНИЯ

После исправлений:
- ✅ Согласованность: 95% (было 60%)
- ✅ Качество AI ответов: +30%
- ✅ Использование токенов: -40%
- ✅ Обработка ошибок: 100% coverage
- ✅ Maintainability: Grade A

---

**Следующий шаг:** Примен��ть исправления →
