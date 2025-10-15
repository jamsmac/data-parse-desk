#!/bin/bash

# Aurora Fixes Rollback Script
# Скрипт для отката исправлений Aurora Design System

set -e

echo "🔄 Aurora Fixes Rollback Script"
echo "================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Проверка наличия git
if ! command -v git &> /dev/null; then
  log_error "Git не установлен. Установите git для использования этого скрипта."
  exit 1
fi

# Проверка, что мы в git репозитории
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  log_error "Не git репозиторий. Откат невозможен."
  exit 1
fi

# Проверка статуса git
if ! git diff --quiet || ! git diff --cached --quiet; then
  log_warning "У вас есть незакоммиченные изменения."
  read -p "Продолжить? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Откат отменен."
    exit 0
  fi
fi

echo ""
log_info "Выберите вариант отката:"
echo ""
echo "1) Откат к последнему коммиту (отменить все незакоммиченные изменения)"
echo "2) Откат к конкретному коммиту"
echo "3) Создать backup и откатить файлы Aurora"
echo "4) Отменить последний коммит (сохранить изменения)"
echo "5) Отмена"
echo ""
read -p "Ваш выбор (1-5): " choice

case $choice in
  1)
    log_info "Откат всех незакоммиченных изменений..."
    git reset --hard HEAD
    git clean -fd
    log_success "Откат завершен. Все изменения отменены."
    ;;

  2)
    log_info "Показываю последние коммиты:"
    git log --oneline -10
    echo ""
    read -p "Введите hash коммита для отката: " commit_hash

    if git rev-parse --verify "$commit_hash" &> /dev/null; then
      log_warning "Это действие откатит все изменения до коммита $commit_hash"
      read -p "Продолжить? (y/n) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        git reset --hard "$commit_hash"
        log_success "Откат к коммиту $commit_hash завершен."
      else
        log_info "Откат отменен."
      fi
    else
      log_error "Неверный hash коммита: $commit_hash"
      exit 1
    fi
    ;;

  3)
    log_info "Создаю backup файлов Aurora..."

    backup_dir="aurora-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"

    # Копируем Aurora файлы
    if [ -d "src/components/aurora" ]; then
      cp -r src/components/aurora "$backup_dir/"
      log_success "Backup создан: $backup_dir/aurora"
    fi

    if [ -d "src/hooks/aurora" ]; then
      cp -r src/hooks/aurora "$backup_dir/"
      log_success "Backup создан: $backup_dir/hooks/aurora"
    fi

    if [ -d "src/lib/aurora" ]; then
      cp -r src/lib/aurora "$backup_dir/"
      log_success "Backup создан: $backup_dir/lib/aurora"
    fi

    if [ -f "src/index.css" ]; then
      cp src/index.css "$backup_dir/"
      log_success "Backup создан: $backup_dir/index.css"
    fi

    log_info "Откатываю файлы Aurora из git..."
    git checkout HEAD -- src/components/aurora/ src/hooks/aurora/ src/lib/aurora/ src/index.css 2>/dev/null || true

    log_success "Откат завершен. Backup сохранен в $backup_dir/"
    ;;

  4)
    log_info "Отменяю последний коммит (сохраняя изменения)..."
    git reset --soft HEAD~1
    log_success "Последний коммит отменен. Изменения сохранены."
    ;;

  5)
    log_info "Откат отменен."
    exit 0
    ;;

  *)
    log_error "Неверный выбор: $choice"
    exit 1
    ;;
esac

echo ""
log_info "Текущий статус:"
git status --short

echo ""
log_info "Рекомендации после отката:"
echo "  1. Проверьте изменения: git status"
echo "  2. Запустите тесты: npm run test"
echo "  3. Проверьте сборку: npm run build"
echo "  4. При необходимости установите зависимости: npm install"
echo ""
log_success "Готово!"
