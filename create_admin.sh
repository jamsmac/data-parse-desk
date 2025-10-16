#!/bin/bash

# Скрипт для создания администратора через Supabase API
# Использование: bash create_admin.sh

echo "🚀 Создание администратора..."
echo ""

# Выполняем запрос
response=$(curl -X POST 'https://uzcmaxfhfcsxzfqvaloz.supabase.co/auth/v1/signup' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Y21heGZoZmNzeHpmcXZhbG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Mzc3ODQsImV4cCI6MjA3NjExMzc4NH0.Octzcd1kJ7i4felxxGO0vghmqJ1eLYC56ZCraPPCVHk' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@test.com",
    "password": "Vh311941990",
    "options": {
      "data": {
        "full_name": "Administrator"
      }
    }
  }')

echo "Ответ от сервера:"
echo "$response"
echo ""
echo "✅ Если пользователь создан успешно, используйте:"
echo ""
echo "Email: admin@test.com"
echo "Password: Vh311941990"
echo ""
echo "Войдите на: http://localhost:8080"
