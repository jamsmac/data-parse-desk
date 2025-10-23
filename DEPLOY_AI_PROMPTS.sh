#!/bin/bash

# ============================================================================
# AI ПРОМПТЫ - ДЕПЛОЙ СКРИПТ
# Дата: 2025-10-23
# Описание: Деплой обновленных Edge Functions с улучшенными промптами
# ============================================================================

set -e

echo "🚀 Начинаем деплой обновленных AI функций..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI не установлен${NC}"
    echo "Установите: brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI найден${NC}"
echo ""

# Проверка подключения к проекту
echo "🔍 Проверка подключения к проекту..."
supabase link --project-ref uzcmaxfhfcsxzfqvaloz 2>/dev/null || {
    echo -e "${YELLOW}⚠️ Проект не подключен. Подключаем...${NC}"
    supabase link --project-ref uzcmaxfhfcsxzfqvaloz
}

echo -e "${GREEN}✅ Подключено к проекту uzcmaxfhfcsxzfqvaloz${NC}"
echo ""

# Список функций для деплоя
FUNCTIONS=(
    "ai-import-suggestions"
    "ai-analyze-schema"
)

echo "📦 Функции для деплоя:"
for func in "${FUNCTIONS[@]}"; do
    echo "  - $func"
done
echo ""

# Деплой каждой функции
for func in "${FUNCTIONS[@]}"; do
    echo -e "${YELLOW}📤 Деплой $func...${NC}"
    
    if supabase functions deploy "$func"; then
        echo -e "${GREEN}✅ $func задеплоен успешно${NC}"
    else
        echo -e "${RED}❌ Ошибка при деплое $func${NC}"
        exit 1
    fi
    
    echo ""
done

echo -e "${GREEN}🎉 Все функции задеплоены успешно!${NC}"
echo ""

# Проверка логов
echo "📋 Проверка логов последних функций:"
echo ""

for func in "${FUNCTIONS[@]}"; do
    echo -e "${YELLOW}Логи $func:${NC}"
    supabase functions logs "$func" --limit 5
    echo ""
done

# Финальные инструкции
echo -e "${GREEN}✅ ДЕПЛОЙ ЗАВЕРШЕН${NC}"
echo ""
echo "📝 Следующие шаги:"
echo "  1. Протестируйте функции в браузере"
echo "  2. Проверьте логи: supabase functions logs FUNCTION_NAME --tail"
echo "  3. Мониторьте usage в Lovable AI dashboard"
echo ""
echo "🔗 Полезные команды:"
echo "  supabase functions list"
echo "  supabase functions logs ai-import-suggestions --tail"
echo "  supabase functions logs ai-analyze-schema --tail"
echo ""
