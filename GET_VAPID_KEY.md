# Получение VAPID ключа для Push-уведомлений

## Быстрая инструкция

### 1. Перейдите в Firebase Console
https://console.firebase.google.com/project/vhdata-platform/settings/cloudmessaging

### 2. Найдите раздел "Web Push certificates"
Прокрутите страницу Cloud Messaging вниз до раздела **Web configuration**

### 3. Сгенерируйте ключ
- Нажмите кнопку **"Generate key pair"** в разделе Web Push certificates
- Скопируйте сгенерированный ключ (длинная строка символов)

### 4. Добавьте в .env.local
Откройте файл `.env.local` и замените `your-vapid-key-here` на полученный ключ:
```env
VITE_FIREBASE_VAPID_KEY=ваш_полученный_vapid_ключ
```

### 5. Перезапустите сервер
После добавления VAPID ключа сервер автоматически перезапустится

## Проверка работы

1. Откройте приложение в браузере: http://localhost:8080
2. Перейдите в Settings → Security → Push
3. Нажмите "Включить push-уведомления"
4. Разрешите показ уведомлений в браузере
5. Нажмите "Отправить тестовое уведомление"

## Важно!

- VAPID ключ является публичным и безопасным для использования в клиентской части
- Он нужен для идентификации вашего приложения при отправке push-уведомлений
- Без VAPID ключа регистрация для получения push-уведомлений не будет работать

## Текущий статус конфигурации

✅ **Настроено:**
- Firebase Project ID: vhdata-platform
- API Key: AIzaSyBUk1NMRNkFV08HLPCVQvKXvAS5JRxZjb4
- App ID: 1:643537450221:web:e9dc337c7d5f97400188e4
- Sender ID: 643537450221
- Storage Bucket: vhdata-platform.firebasestorage.app

❌ **Требуется добавить:**
- VAPID Key: получите из Firebase Console

После добавления VAPID ключа push-уведомления будут полностью готовы к работе!