# 🔐 GitHub CLI Authentication Guide

## Способ 1: Интерактивная авторизация через браузер (Рекомендуется)

```bash
# Запустите команду авторизации
gh auth login

# Выберите опции:
# 1. GitHub.com
# 2. HTTPS
# 3. Y (authenticate with browser)
# 4. Откроется браузер - войдите в GitHub
# 5. Разрешите доступ для GitHub CLI
```

## Способ 2: Авторизация через Personal Access Token

### Шаг 1: Создайте Personal Access Token на GitHub

1. Откройте https://github.com/settings/tokens
2. Нажмите "Generate new token" → "Generate new token (classic)"
3. Дайте имя токену: "CLI Access for VHData"
4. Выберите права доступа:
   - ✅ repo (Full control of private repositories)
   - ✅ workflow (Update GitHub Action workflows)
   - ✅ write:packages (Upload packages to GitHub Package Registry)
   - ✅ admin:org (если работаете с организацией)
   - ✅ gist (Create gists)
5. Нажмите "Generate token"
6. **ВАЖНО:** Скопируйте токен сразу! Он показывается только один раз

### Шаг 2: Используйте токен для авторизации

```bash
# Авторизация с токеном
gh auth login

# Выберите:
# 1. GitHub.com
# 2. HTTPS
# 3. Paste authentication token
# 4. Вставьте ваш токен
```

Или одной командой:
```bash
# Замените YOUR_TOKEN на ваш токен
echo "YOUR_TOKEN" | gh auth login --with-token
```

## Способ 3: Авторизация через SSH ключ

```bash
# Если у вас уже настроен SSH для Git
gh auth login

# Выберите:
# 1. GitHub.com
# 2. SSH
# 3. Выберите существующий SSH ключ
# 4. Подтвердите в браузере
```

## Проверка авторизации

```bash
# Проверьте статус
gh auth status

# Должно показать:
# ✓ Logged in to github.com as YOUR_USERNAME
```

## Настройка по умолчанию

```bash
# Установите репозиторий по умолчанию
gh repo set-default jamsmac/data-parse-desk

# Проверьте настройки
gh repo view
```

## Полезные команды после авторизации

### Работа с Pull Requests

```bash
# Создать PR
gh pr create --title "Title" --body "Description"

# Список PR
gh pr list

# Посмотреть PR
gh pr view [number]

# Проверить статус checks
gh pr checks

# Merge PR
gh pr merge [number]
```

### Работа с Issues

```bash
# Создать issue
gh issue create --title "Bug" --body "Description"

# Список issues
gh issue list

# Закрыть issue
gh issue close [number]
```

### Работа с репозиторием

```bash
# Клонировать репозиторий
gh repo clone jamsmac/data-parse-desk

# Форкнуть репозиторий
gh repo fork

# Посмотреть информацию
gh repo view

# Создать новый репозиторий
gh repo create
```

### Работа с Workflows

```bash
# Список workflows
gh workflow list

# Запустить workflow
gh workflow run [workflow-name]

# Посмотреть runs
gh run list

# Посмотреть логи
gh run view [run-id] --log
```

## Troubleshooting

### Ошибка: "Authentication required"
```bash
# Переавторизуйтесь
gh auth refresh
```

### Ошибка: "Repository not found"
```bash
# Проверьте что вы в правильной директории
pwd

# Установите репозиторий
gh repo set-default jamsmac/data-parse-desk
```

### Ошибка: "Permission denied"
```bash
# Проверьте права токена
gh auth status

# Пересоздайте токен с нужными правами
gh auth logout
gh auth login
```

## Дополнительная настройка

### Алиасы для удобства

```bash
# Добавьте в ~/.zshrc или ~/.bashrc
alias ghpr="gh pr create"
alias ghprs="gh pr list"
alias ghprv="gh pr view"
alias ghis="gh issue list"
```

### Настройка редактора

```bash
# Установите редактор по умолчанию
gh config set editor vim
# или
gh config set editor "code --wait"
```

### Настройка браузера

```bash
# Установите браузер по умолчанию
gh config set browser safari
```

---

## 🚀 Quick Start после авторизации

```bash
# 1. Проверьте статус
gh auth status

# 2. Перейдите в директорию проекта
cd /Users/js/VendHub/data-parse-desk

# 3. Создайте Pull Request
gh pr create --title "🔍 Production Readiness Audit & Major Improvements" --body-file PULL_REQUEST_TEMPLATE.md

# 4. Проверьте статус PR
gh pr view --web
```

---

**Готово!** Теперь вы можете использовать GitHub CLI для работы с репозиторием.