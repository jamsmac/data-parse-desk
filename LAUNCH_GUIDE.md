# 🚀 ИНСТРУКЦИЯ ПО ЗАПУСКУ DATA-PARSE-DESK

**Обновлено**: 15.10.2025  
**Статус проекта**: 78% готовности, готов к beta-тестированию

---

## ⚡ БЫСТРЫЙ СТАРТ (5 минут)

### Шаг 1: Установка зависимостей

```bash
npm install
```

### Шаг 2: Настройка переменных окружения

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

Отредактируйте `.env` и заполните:

```env
# Supabase (обязательно)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Sentry (опционально, для error tracking)
VITE_SENTRY_DSN=your_sentry_dsn
VITE_SENTRY_ENVIRONMENT=development
```

### Шаг 3: Настройка Supabase

#### 3.1 Создание проекта

1. Зайдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь готовности (2-3 минуты)

#### 3.2 Получение ключей

1. Откройте **Settings** → **API**
2. Скопируйте:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

#### 3.3 Запуск миграций

Откройте **SQL Editor** в Supabase Dashboard и выполните миграции по порядку:

```bash
# 1. Базовая структура
supabase/migrations/20251014091502_*.sql

# 2. Система множественных БД
supabase/migrations/20251014100000_multiple_databases_system.sql

# 3. RPC функции
supabase/migrations/20251014110000_rpc_functions.sql

# 4. RLS политики безопасности
supabase/migrations/20251014120000_rls_policies.sql
```

**Важно**: Выполняйте миграции в указанном порядке!

### Шаг 4: Запуск проекта

```bash
npm run dev
```

Откройте браузер: <http://localhost:5173>

---

## 📝 ПЕРВЫЙ ВХОД

### Регистрация пользователя

1. На главной странице нажмите **Регистрация**
2. Заполните форму:
   - Имя
   - Email
   - Пароль (мин. 6 символов)
3. Подтвердите email (проверьте почту)
4. Войдите в систему

### Первые шаги

После входа вы можете:

1. **Создать базу данных**
   - Dashboard → "Создать базу данных"
   - Выберите иконку, цвет, название

2. **Загрузить файл**
   - Откройте созданную БД
   - Нажмите "Загрузить файл"
   - Выберите CSV или Excel файл
   - Система автоматически определит колонки

3. **Просмотреть данные**
   - Фильтрация
   - Сортировка
   - Редактирование ячеек
   - Экспорт результатов

---

## 🛠️ ДЕТАЛЬНАЯ НАСТРОЙКА

### Проверка установки

Убедитесь, что все установлено правильно:

```bash
# Проверка Node.js (нужна версия 18+)
node --version

# Проверка npm
npm --version

# Проверка зависимостей
npm list --depth=0
```

### Настройка БД (детально)

#### Автоматическая настройка (рекомендуется)

Если у вас установлен Supabase CLI:

```bash
# Установка Supabase CLI
npm install -g supabase

# Линк к проекту
supabase link --project-ref your-project-ref

# Запуск всех миграций
supabase db push
```

#### Ручная настройка

Скопируйте содержимое каждого файла миграции и выполните в SQL Editor:

1. **20251014091502** - создает таблицу `orders`
2. **20251014100000** - создает `databases`, `table_schemas`, `files`, `audit_log`
3. **20251014110000** - создает RPC функции для динамических запросов
4. **20251014120000** - настраивает RLS (Row Level Security)

### Проверка миграций

В Supabase Dashboard → **Table Editor**, должны быть видны таблицы:

- `databases`
- `table_schemas`
- `files`
- `audit_log`
- `database_relations`

---

## 🧪 РЕЖИМЫ ЗАПУСКА

### Development (разработка)

```bash
npm run dev
```

- Hot reload включен
- Source maps активны
- Vite dev server на порту 5173

### Production Build (сборка)

```bash
npm run build
```

Результат в папке `dist/`

### Preview Production

```bash
npm run build
npm run preview
```

Локальный просмотр production сборки

---

## 🔧 ДОПОЛНИТЕЛЬНЫЕ КОМАНДЫ

### Тестирование

```bash
# Запустить тесты
npm run test

# Тесты с UI
npm run test:ui

# Тесты с coverage
npm run test:coverage
```

### Линтинг

```bash
# Проверка кода
npm run lint

# Исправление ошибок
npm run lint -- --fix
```

### Сборка с анализом

```bash
# Build с visualizer для анализа bundle
npm run build
# Откроется HTML с визуализацией размеров
```

---

## 🐛 TROUBLESHOOTING

### Проблема: "Failed to connect to Supabase"

**Причина**: Неправильные ключи или URL

**Решение**:

1. Проверьте `.env` файл
2. Убедитесь что ключи скопированы полностью
3. Перезапустите dev server

### Проблема: "Table not found"

**Причина**: Миграции не выполнены

**Решение**:

1. Откройте Supabase Dashboard → SQL Editor
2. Проверьте наличие таблиц в Table Editor
3. Выполните миграции заново

### Проблема: "Permission denied"

**Причина**: RLS политики блокируют доступ

**Решение**:

1. Убедитесь что пользователь авторизован
2. Проверьте что миграция `20251014120000_rls_policies.sql` выполнена
3. В dev режиме можно временно отключить RLS:

   ```sql
   ALTER TABLE databases DISABLE ROW LEVEL SECURITY;
   ```

### Проблема: "Module not found"

**Причина**: Зависимости не установлены

**Решение**:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Port 5173 already in use"

**Причина**: Порт занят другим процессом

**Решение**:

```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Или используйте другой порт
npm run dev -- --port 3000
```

### Проблема: Ошибки TypeScript

**Причина**: Несоответствие типов

**Решение**:

```bash
# Перезапустить TypeScript server в VSCode
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Проверка типов
npx tsc --noEmit
```

---

## 📊 ПРОВЕРКА РАБОТОСПОСОБНОСТИ

### Checklist успешного запуска

- [ ] `npm install` выполнен без ошибок
- [ ] `.env` файл создан и заполнен
- [ ] Supabase проект создан
- [ ] Все 4 миграции выполнены
- [ ] Таблицы видны в Supabase Dashboard
- [ ] `npm run dev` запускается
- [ ] Браузер открывается на localhost:5173
- [ ] Страница регистрации отображается
- [ ] Можно создать аккаунт
- [ ] После входа виден Dashboard

---

## 🌐 PRODUCTION DEPLOYMENT

### Vercel (рекомендуется)

```bash
# Установка Vercel CLI
npm i -g vercel

# Деплой
vercel

# Production деплой
vercel --prod
```

**Environment Variables в Vercel**:

- Добавьте все переменные из `.env`
- Settings → Environment Variables

### Netlify

```bash
# Установка Netlify CLI
npm i -g netlify-cli

# Деплой
netlify deploy

# Production деплой
netlify deploy --prod
```

### Docker (опционально)

```dockerfile
# Создайте Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

```bash
# Build & Run
docker build -t data-parse-desk .
docker run -p 5173:5173 data-parse-desk
```

---

## 🔐 БЕЗОПАСНОСТЬ (ВАЖНО!)

### Перед production запуском

1. **Измените RLS политики**
   - Проверьте все policies в `20251014120000_rls_policies.sql`
   - Убедитесь что доступ ограничен только владельцем

2. **Настройте Sentry**
   - Добавьте `VITE_SENTRY_DSN`
   - Включите production environment

3. **Security Headers**
   - Настройте CORS в Supabase
   - Добавьте CSP headers на хостинге

4. **Rate Limiting**
   - Настройте в Supabase Settings → API
   - Ограничьте количество запросов

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

### Документация проекта

- [README.md](README.md) - Описание проекта
- [CRITICAL_REPOSITORY_AUDIT_CORRECTED.md](CRITICAL_REPOSITORY_AUDIT_CORRECTED.md) - Детальный аудит
- [TESTING_AND_CICD_GUIDE.md](TESTING_AND_CICD_GUIDE.md) - Гид по тестированию

### Внешние ресурсы

- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev/)
- [React Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)

---

## 💡 ПОЛЕЗНЫЕ СОВЕТЫ

### Для разработки

1. **Используйте Supabase Studio локально**

   ```bash
   supabase start
   ```

2. **Включите React Query Devtools**
   - Уже включено в dev mode
   - Нажмите кнопку внизу справа

3. **VS Code расширения**
   - ES7+ React/Redux/React-Native snippets
   - Tailwind CSS IntelliSense
   - ESLint
   - Prettier

### Для тестирования

1. **Используйте тестовые данные**
   - Создайте отдельный Supabase проект для тестов
   - Используйте `.env.test`

2. **Seed данные**

   ```bash
   # Создайте seed.sql с тестовыми данными
   ```

---

## 🎯 ЧТО ДАЛЬШЕ?

После успешного запуска:

1. **Изучите функционал**
   - Создайте несколько баз данных
   - Загрузите тестовые CSV/Excel файлы
   - Попробуйте фильтры и формулы

2. **Прочитайте аудит**
   - [CRITICAL_REPOSITORY_AUDIT_CORRECTED.md](CRITICAL_REPOSITORY_AUDIT_CORRECTED.md)
   - Узнайте о текущем состоянии проекта

3. **Доработайте для production**
   - Добавьте тесты (текущее покрытие 10%)
   - Создайте Legal документы
   - Настройте monitoring

---

## 📞 ПОДДЕРЖКА

**Проблемы с запуском?**

1. Проверьте этот гайд еще раз
2. Посмотрите секцию Troubleshooting
3. Создайте issue на GitHub с описанием проблемы

**Репозиторий**: <https://github.com/jamsmac/data-parse-desk>

---

## ✅ УСПЕШНЫЙ ЗАПУСК

Если все шаги выполнены, вы должны увидеть:

```
✅ Dependencies installed
✅ Environment configured  
✅ Database migrations applied
✅ Dev server running
✅ Browser opened at localhost:5173
✅ Registration page visible
```

**Поздравляем! Проект запущен и готов к использованию!** 🎉

---

*Последнее обновление: 15.10.2025*  
*Версия проекта: 0.0.0 (beta)*
