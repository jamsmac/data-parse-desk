# 🚀 Быстрый старт - Data Parse Desk 2.0

Это руководство поможет вам запустить Data Parse Desk 2.0 за **5 минут**!

---

## 📋 Что нужно перед началом

- ✅ **Node.js** 18 или выше ([Скачать](https://nodejs.org/))
- ✅ **npm** 9 или выше (идет вместе с Node.js)
- ✅ **Git** ([Скачать](https://git-scm.com/))
- ✅ **Аккаунт Supabase** ([Регистрация бесплатно](https://supabase.com/))

---

## 🎯 Шаг 1: Клонирование проекта

```bash
git clone <url-репозитория>
cd data-parse-desk-2
```

---

## 📦 Шаг 2: Установка зависимостей

```bash
npm install
```

⏱️ Это займет 2-3 минуты.

---

## 🔧 Шаг 3: Настройка окружения

### 3.1 Создайте файл `.env.local`:

```bash
cp .env.example .env.local
```

### 3.2 Получите учетные данные Supabase:

1. Перейдите на [supabase.com/dashboard](https://supabase.com/dashboard)
2. Создайте новый проект (или выберите существующий)
3. Перейдите в **Settings** → **API**
4. Скопируйте:
   - **URL** проекта
   - **anon** ключ (public key)

### 3.3 Получите Google Gemini API ключ (для AI функций):

1. Перейдите на [ai.google.dev](https://ai.google.dev)
2. Нажмите **Get API Key**
3. Скопируйте ключ

### 3.4 Заполните `.env.local`:

```env
# Supabase (обязательно)
VITE_SUPABASE_URL=https://ваш-проект-id.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_ключ

# Google Gemini для AI (обязательно)
VITE_GEMINI_API_KEY=ваш_gemini_ключ

# Версия приложения
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=development
```

---

## 🗄️ Шаг 4: Настройка базы данных

### Вариант А: Через Supabase Dashboard (рекомендуется)

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдите в **SQL Editor**
3. Создайте новый запрос
4. Скопируйте содержимое каждого файла из `supabase/migrations/` и выполните по порядку

### Вариант Б: Через Supabase CLI

```bash
# Установите Supabase CLI
npm install -g supabase

# Войдите в аккаунт
supabase login

# Свяжите проект
supabase link --project-ref ваш-проект-id

# Примените миграции
supabase db push
```

---

## 🚀 Шаг 5: Запуск приложения

```bash
npm run dev
```

Приложение откроется в браузере по адресу: **http://localhost:5173**

🎉 **Готово!** Вы можете начать работу!

---

## 📖 Что делать дальше?

### Первые шаги в приложении:

1. **Зарегистрируйтесь** на странице `/register`
2. **Создайте первую базу данных** на странице `/dashboard`
3. **Импортируйте данные** из CSV файла
4. **Попробуйте AI-функции** для автоматического определения типов колонок

### Изучите документацию:

- 📚 [Developer Onboarding](./DEVELOPER_ONBOARDING.md) - Руководство для разработчиков
- 📡 [API Documentation](./API_DOCUMENTATION.md) - Справка по API
- 🧪 [Testing Guide](./TESTING_GUIDE.md) - Руководство по тестированию
- 🚀 [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Развертывание в production

---

## 🐳 Альтернатива: Запуск через Docker

Если у вас установлен Docker:

```bash
# Запустить все сервисы
docker-compose up -d

# Приложение будет доступно на http://localhost:5173
```

Это запустит:
- ✅ Frontend (React + Vite)
- ✅ PostgreSQL (база данных)
- ✅ Redis (кеширование)
- ✅ Supabase Studio (UI для БД)

---

## 🧪 Запуск тестов

```bash
# Проверка типов TypeScript
npm run type-check

# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Все тесты сразу
npm run test:all
```

---

## 🛠️ Полезные команды

```bash
# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Предпросмотр production сборки
npm run preview

# Проверка кода (ESLint)
npm run lint

# Форматирование кода
npm run format
```

---

## ❓ Частые проблемы

### Проблема: "Module not found"

**Решение:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Supabase connection failed"

**Решение:**
1. Проверьте правильность `VITE_SUPABASE_URL` в `.env.local`
2. Проверьте правильность `VITE_SUPABASE_ANON_KEY`
3. Убедитесь, что проект Supabase активен

### Проблема: "Port 5173 already in use"

**Решение:**
```bash
# Используйте другой порт
npm run dev -- --port 3000
```

### Проблема: Миграции не применяются

**Решение:**
1. Убедитесь, что вы применяете миграции по порядку (по дате в имени файла)
2. Проверьте логи в Supabase Dashboard
3. Убедитесь, что у вас есть права на выполнение SQL

---

## 📞 Получить помощь

Если что-то не работает:

1. 📖 Проверьте [Developer Onboarding Guide](./DEVELOPER_ONBOARDING.md)
2. 🐛 Создайте [GitHub Issue](https://github.com/org/repo/issues)
3. 💬 Спросите в [Discord](https://discord.gg/dateparsedesk)
4. ✉️ Напишите на support@dateparsedesk.com

---

## 🎓 Рекомендуемый путь обучения

### День 1: Знакомство с проектом
- ✅ Запустите приложение локально
- ✅ Создайте тестовую базу данных
- ✅ Импортируйте CSV файл
- ✅ Изучите основные функции

### День 2: Изучение архитектуры
- 📖 Прочитайте [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
- 📁 Изучите структуру проекта
- 🔍 Просмотрите ключевые компоненты

### День 3: Практика
- 💻 Создайте простой компонент
- 🧪 Напишите тест
- 📝 Обновите документацию

### День 4: Продвинутые функции
- 🤖 Попробуйте AI-импорт
- 🔗 Создайте Lookup/Rollup колонки
- 👥 Протестируйте collaboration features

### День 5: Вклад в проект
- 🐛 Исправьте баг или
- ✨ Добавьте новую функцию
- 📤 Создайте Pull Request

---

## 🌟 Фичи для изучения

### Основные функции:
- ✅ Создание баз данных
- ✅ Импорт/Экспорт CSV
- ✅ Фильтрация и сортировка
- ✅ Inline редактирование

### Продвинутые функции:
- 🤖 AI-powered импорт с автоопределением типов
- 🔗 Lookup колонки (как VLOOKUP в Excel)
- 📊 Rollup колонки (агрегация данных)
- 🔍 Продвинутая фильтрация (AND/OR логика)
- ✅ Валидация данных (12 типов)
- 📅 Альтернативные виды (Calendar, Kanban, Gallery)

### Collaboration:
- 👥 Real-time присутствие пользователей
- 🖱️ Совместные курсоры
- 💬 Комментарии и @mentions
- 📋 Activity feed

### Offline & PWA:
- 📱 Установка как приложение
- 🔌 Работа без интернета
- 🔄 Автоматическая синхронизация

---

## 📊 Следующие шаги

После успешного запуска:

1. ⭐ Поставьте звезду проекту на GitHub
2. 🐦 Подпишитесь на [@dateparsedesk](https://twitter.com/dateparsedesk)
3. 👥 Присоединяйтесь к [Discord сообществу](https://discord.gg/dateparsedesk)
4. 📖 Изучите полную документацию
5. 🚀 Начните разработку!

---

## 💡 Советы для разработки

### Горячие клавиши в приложении:
- `Ctrl/Cmd + K` - Быстрый поиск
- `Ctrl/Cmd + N` - Новая база данных
- `Ctrl/Cmd + I` - Импорт данных
- `Ctrl/Cmd + E` - Экспорт данных

### VS Code расширения (рекомендуется):
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- GitLens

### Chrome расширения:
- React Developer Tools
- Redux DevTools (если используете)

---

## 🎯 Checklist первого запуска

- [ ] Node.js 18+ установлен
- [ ] Проект склонирован
- [ ] Зависимости установлены (`npm install`)
- [ ] Файл `.env.local` создан и заполнен
- [ ] Supabase проект настроен
- [ ] Миграции применены
- [ ] Dev сервер запущен (`npm run dev`)
- [ ] Приложение открыто в браузере
- [ ] Тестовый аккаунт создан
- [ ] Первая база данных создана

---

**Время на setup: ~10 минут** ⏱️

**Поздравляем! Вы готовы к разработке! 🎉**

---

**Версия документа**: 1.0
**Последнее обновление**: 22 января 2025
