# 🔧 Vercel Deployment Troubleshooting

**Updated:** October 18, 2025
**Status:** Готов к deployment

---

## ✅ Что уже исправлено:

1. ✅ Упрощена конфигурация `vercel.json`
2. ✅ Удален устаревший `builds` синтаксис
3. ✅ Build проходит локально успешно
4. ✅ Все зависимости установлены

---

## 🚀 Пошаговая инструкция для Vercel

### Метод 1: Через Vercel Dashboard (РЕКОМЕНДУЕТСЯ)

#### Шаг 1: Регистрация на Vercel
1. Откройте: https://vercel.com/signup
2. Нажмите **"Continue with GitHub"**
3. Авторизуйте Vercel доступ к вашим репозиториям

#### Шаг 2: Импорт проекта
1. В Vercel Dashboard нажмите **"Add New Project"**
2. Найдите **`jamsmac/data-parse-desk`**
3. Нажмите **"Import"**

#### Шаг 3: Настройка проекта
**Framework Preset:** Vite (должно определиться автоматически)

**Root Directory:** `.` (по умолчанию)

**Build Command:**
```
npm run build
```

**Output Directory:**
```
dist
```

**Install Command:**
```
npm install
```

#### Шаг 4: Environment Variables (ВАЖНО!)

Нажмите **"Environment Variables"**, добавьте:

```bash
# ОБЯЗАТЕЛЬНЫЕ:
Name: VITE_SUPABASE_URL
Value: https://ваш-проект.supabase.co
Environment: Production ✅

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environment: Production ✅

# ОПЦИОНАЛЬНЫЕ (но рекомендуемые):
Name: VITE_SENTRY_DSN
Value: https://ваш-dsn@sentry.io/project-id
Environment: Production ✅

Name: VITE_APP_VERSION
Value: 1.0.0
Environment: Production ✅
```

**⚠️ ВАЖНО:**
- Все переменные должны начинаться с `VITE_`
- Используйте Production environment
- Не добавляйте кавычки вокруг значений

#### Шаг 5: Deploy!
1. Нажмите **"Deploy"**
2. Дождитесь завершения build (~2-3 минуты)
3. **Готово!** 🎉

---

### Метод 2: Через Vercel CLI (для опытных)

#### Установка:
```bash
npm install -g vercel
```

#### Деплой:
```bash
# Логин
vercel login

# Deploy
vercel

# Следуйте подсказкам:
# - Set up and deploy? Y
# - Which scope? Выберите свой аккаунт
# - Link to existing project? N
# - What's your project's name? data-parse-desk
# - In which directory is your code? ./
# - Override settings? N
```

#### Добавление переменных окружения:
```bash
vercel env add VITE_SUPABASE_URL production
# Введите значение

vercel env add VITE_SUPABASE_ANON_KEY production
# Введите значение
```

#### Production deploy:
```bash
vercel --prod
```

---

## ❌ Частые проблемы и решения

### Проблема 1: Build Failed - "Module not found"

**Ошибка:**
```
Error: Cannot find module 'some-package'
```

**Решение:**
```bash
# Локально проверьте:
npm install
npm run build

# Убедитесь, что package.json актуален:
git add package.json package-lock.json
git commit -m "fix: update dependencies"
git push

# Redeploy на Vercel
```

---

### Проблема 2: Environment Variables не работают

**Ошибка:**
```
VITE_SUPABASE_URL is undefined
```

**Решение:**

1. **Проверьте префикс:**
   - ✅ Правильно: `VITE_SUPABASE_URL`
   - ❌ Неправильно: `SUPABASE_URL`

2. **Проверьте в Vercel Dashboard:**
   - Settings → Environment Variables
   - Убедитесь, что выбрано "Production"
   - Нет лишних пробелов или кавычек

3. **Redeploy после добавления:**
   - Deployments → последний deploy → "Redeploy"

4. **Проверьте локально:**
   ```bash
   # Создайте .env.local
   VITE_SUPABASE_URL=https://ваш-проект.supabase.co
   VITE_SUPABASE_ANON_KEY=ваш-ключ

   # Проверьте
   npm run dev
   ```

---

### Проблема 3: Build успешен, но сайт показывает ошибку

**Ошибка в браузере:**
```
Failed to fetch
```

**Решение:**

1. **Проверьте Supabase настройки:**
   - Authentication → URL Configuration
   - Site URL: `https://ваш-домен.vercel.app`
   - Redirect URLs: `https://ваш-домен.vercel.app/**`

2. **Проверьте CORS в Supabase:**
   - Settings → API
   - Allowed origins должен включать ваш Vercel URL

3. **Проверьте browser console:**
   - F12 → Console
   - Найдите красные ошибки
   - Исправьте соответственно

---

### Проблема 4: Routing не работает (404 на /dashboard)

**Ошибка:**
```
404 - This page could not be found
```

**Решение:**

Уже исправлено в `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Если проблема сохраняется:
1. Проверьте, что `vercel.json` в корне проекта
2. Commit и push изменения
3. Redeploy на Vercel

---

### Проблема 5: Build слишком долгий (>10 минут)

**Причина:** Возможно, используется неправильный build command

**Решение:**

В Vercel Settings → General → Build & Development Settings:

```
Build Command: npm run build
Install Command: npm install
Output Directory: dist
```

Не используйте:
- ❌ `npm ci` (медленнее)
- ❌ `yarn install` (если используете npm)
- ❌ Custom build scripts (если не нужны)

---

### Проблема 6: "Invalid Token" при авторизации

**Ошибка:**
```
Invalid JWT token
```

**Решение:**

1. **Проверьте VITE_SUPABASE_ANON_KEY:**
   ```bash
   # В Supabase Dashboard:
   # Settings → API → Project API keys
   # Скопируйте "anon public" key
   ```

2. **Обновите в Vercel:**
   - Settings → Environment Variables
   - Найдите `VITE_SUPABASE_ANON_KEY`
   - Update с новым значением
   - Redeploy

3. **Проверьте Supabase URL:**
   - Убедитесь, что URL правильный
   - Формат: `https://xxxxx.supabase.co`

---

### Проблема 7: Vercel не может найти репозиторий

**Ошибка:**
```
Repository not found
```

**Решение:**

1. **Переустановите Vercel GitHub App:**
   - https://github.com/settings/installations
   - Найдите Vercel
   - Configure
   - Repository access: All repositories ИЛИ выберите `data-parse-desk`
   - Save

2. **В Vercel Dashboard:**
   - Add New Project
   - Adjust GitHub App Permissions
   - Select repository

---

## 🔍 Диагностика проблем

### Шаг 1: Проверьте локальный build
```bash
# Очистите и пересоберите
rm -rf dist node_modules
npm install
npm run build

# Если успешно, проблема в Vercel настройках
# Если падает, проблема в коде
```

### Шаг 2: Проверьте Vercel build logs
1. Deployments → последний deploy
2. Building → View Function Logs
3. Найдите ошибку (красный текст)
4. Используйте error message для поиска решения

### Шаг 3: Проверьте Runtime logs
1. Deployments → последний deploy
2. Runtime Logs
3. Найдите ошибки после деплоя
4. Обычно связаны с environment variables

---

## ✅ Чеклист успешного деплоя

### Перед деплоем:
- [ ] `npm run build` работает локально
- [ ] `npm run lint` без ошибок
- [ ] Git репозиторий обновлен
- [ ] Supabase credentials готовы
- [ ] `vercel.json` обновлен (упрощенная версия)

### В Vercel:
- [ ] Проект импортирован из GitHub
- [ ] Framework Preset: Vite
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Environment Variables добавлены:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Deploy запущен

### После деплоя:
- [ ] Build завершился успешно
- [ ] Сайт открывается по URL
- [ ] Нет ошибок в browser console
- [ ] Login работает
- [ ] Database CRUD работает
- [ ] Charts отображаются

---

## 🆘 Если ничего не помогает

### Вариант 1: Полная переустановка

```bash
# 1. Удалите проект из Vercel Dashboard
# 2. Локально:
rm -rf node_modules package-lock.json
npm install
npm run build

# 3. Commit changes
git add .
git commit -m "fix: rebuild dependencies"
git push

# 4. В Vercel: Import project заново
```

### Вариант 2: Альтернативные платформы

Если Vercel не работает, попробуйте:

#### Netlify (очень похож на Vercel):
1. https://app.netlify.com/start
2. Connect to Git → GitHub
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Environment variables
6. Deploy

#### Cloudflare Pages (бесплатно, быстро):
1. https://pages.cloudflare.com
2. Connect to Git
3. Framework preset: Vite
4. Build command: `npm run build`
5. Build output: `dist`
6. Deploy

---

## 📞 Получить помощь

### Vercel Support:
- Discord: https://vercel.com/discord
- Docs: https://vercel.com/docs
- GitHub Discussions: https://github.com/vercel/vercel/discussions

### Наша документация:
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Быстрый старт
- [DEPLOYMENT_ROADMAP.md](./DEPLOYMENT_ROADMAP.md) - Полное руководство

---

## 🎯 Следующие шаги после успешного деплоя

1. **Настройте Supabase Production:**
   - Добавьте Vercel URL в allowed origins
   - Настройте RLS policies
   - Настройте email templates

2. **Настройте мониторинг:**
   - Sentry для error tracking
   - Vercel Analytics (встроено)
   - Uptime monitoring (UptimeRobot)

3. **Настройте Custom Domain (опционально):**
   - Settings → Domains
   - Добавьте ваш домен
   - Обновите DNS записи
   - Дождитесь SSL certificate

4. **Проверьте Performance:**
   - Run Lighthouse audit
   - Проверьте Core Web Vitals
   - Оптимизируйте при необходимости

---

**Последнее обновление:** Октябрь 18, 2025
**Vercel.json:** Упрощен для совместимости
**Build:** ✅ Протестирован локально
**Status:** Готов к deployment

---

## 💡 Быстрый тест перед деплоем

```bash
# Запустите эти команды:
npm install
npm run build
npm run preview

# Откройте: http://localhost:4173
# Если работает локально → готов к Vercel deploy
# Если не работает → исправьте ошибки сначала
```

**Готовы к деплою? Следуйте Методу 1 выше! 🚀**
