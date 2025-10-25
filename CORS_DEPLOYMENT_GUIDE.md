# 🚀 CORS Security Deployment Guide

## Краткое руководство по развертыванию CORS исправлений

**Статус:** ✅ Готово к деплою
**Дата:** 2025-10-24

---

## ⚡ Quick Start

### 1. Проверка перед деплоем (2 минуты)
```bash
# Запустить тесты
./test_cors_security.sh
```

**Ожидаемый результат:**
```
✓ ALL TESTS PASSED!
Security Score: 10/10 🔒
```

### 2. Deploy (5 минут)
```bash
# Переключиться на production
supabase link --project-ref uzcmaxfhfcsxzfqvaloz

# Deploy всех функций
supabase functions deploy --all
```

### 3. Проверка (1 минута)
```bash
# Проверить что функции задеплоены
supabase functions list
```

**Готово!** ✅

---

## 📋 Полный Deployment Checklist

### Pre-Deployment
- [x] Все 32 функции используют `getCorsHeaders`
- [x] Нет wildcard CORS (`*`)
- [x] Тесты проходят: `./test_cors_security.sh`
- [ ] Production URL добавлен в `ALLOWED_ORIGINS`

### Deployment
- [ ] `supabase link --project-ref uzcmaxfhfcsxzfqvaloz`
- [ ] `supabase functions deploy --all`
- [ ] `supabase functions list` (проверка)

### Post-Deployment
- [ ] Тест OPTIONS request
- [ ] Тест POST request
- [ ] Проверка логов: `supabase functions logs --all`

---

## 🌐 Настройка Production URL

**ВАЖНО:** Перед деплоем обновите разрешенные домены!

Откройте [supabase/functions/_shared/security.ts](supabase/functions/_shared/security.ts):

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',           // Dev
  'http://localhost:3000',           // Alt dev
  'https://app.dataparsedesk.com',   // ← ОБНОВИТЕ
  'https://dataparsedesk.com',       // ← ОБНОВИТЕ
];
```

Замените на ваши реальные production домены.

---

## 🧪 Тестирование после деплоя

### Тест 1: OPTIONS Request (Preflight)
```bash
curl -X OPTIONS \
  -H "Origin: http://localhost:5173" \
  -v \
  https://uzcmaxfhfcsxzfqvaloz.supabase.co/functions/v1/ai-analyze-schema
```

**Ожидается:** Status 200 + CORS headers в ответе

### Тест 2: POST Request
```bash
curl -X POST \
  -H "Origin: http://localhost:5173" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  https://uzcmaxfhfcsxzfqvaloz.supabase.co/functions/v1/ai-analyze-schema
```

**Ожидается:** Нормальный ответ с данными

### Тест 3: Проверка логов
```bash
# Смотреть логи в реальном времени
supabase functions logs ai-analyze-schema --tail

# Искать ошибки
supabase functions logs --all | grep -i "error"
```

---

## 🔄 Rollback (если нужно)

Если что-то пошло не так:

```bash
# Восстановить из бэкапов
cd supabase/functions
find . -name "*.bak" -exec bash -c 'mv "$0" "${0%.bak}"' {} \;

# Задеплоить старую версию
supabase functions deploy --all
```

---

## ✅ Success Criteria

Deploy успешен если:
- ✅ Все 32 функции задеплоены
- ✅ Тесты с localhost:5173 работают
- ✅ Нет ошибок в логах
- ✅ Пользователи не жалуются

---

## 📞 Troubleshooting

### "CORS error" в браузере?
1. Проверить origin: `console.log(window.location.origin)`
2. Добавить его в `ALLOWED_ORIGINS`
3. Redeploy: `supabase functions deploy _shared && supabase functions deploy --all`

### Функция возвращает 500?
1. Проверить логи: `supabase functions logs <function-name>`
2. Проверить что `corsHeaders` определен
3. Проверить imports в начале файла

---

## 📚 Документация

- [CORS_SECURITY_COMPLETE.md](CORS_SECURITY_COMPLETE.md) - Полный отчет
- [CORS_ИСПРАВЛЕНО.md](CORS_ИСПРАВЛЕНО.md) - На русском
- [test_cors_security.sh](test_cors_security.sh) - Скрипт тестирования

---

**Последнее обновление:** 2025-10-24
**Готово к production:** ✅ ДА
