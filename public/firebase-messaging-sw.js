/**
 * Firebase Messaging Service Worker
 * Обработка push-уведомлений в фоновом режиме
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (должна совпадать с основным конфигом)
const firebaseConfig = {
  apiKey: "AIzaSyBUk1NMRNkFV08HLPCVQvKXvAS5JRxZjb4",
  authDomain: "vhdata-platform.firebaseapp.com",
  projectId: "vhdata-platform",
  storageBucket: "vhdata-platform.firebasestorage.app",
  messagingSenderId: "643537450221",
  appId: "1:643537450221:web:e9dc337c7d5f97400188e4"
};

// Initialize Firebase in Service Worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

/**
 * Обработка фоновых сообщений (background messages)
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Извлекаем данные из payload
  const notificationTitle = payload.notification?.title || 'VHData Platform';
  const notificationOptions = {
    body: payload.notification?.body || 'У вас новое уведомление',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.tag || 'vhdata-notification',
    data: payload.data || {},
    requireInteraction: payload.data?.requireInteraction === 'true',
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    actions: []
  };

  // Добавляем действия в зависимости от типа уведомления
  if (payload.data?.type) {
    switch (payload.data.type) {
      case 'database_cloned':
        notificationOptions.actions = [
          { action: 'open', title: 'Открыть' },
          { action: 'dismiss', title: 'Закрыть' }
        ];
        break;
      case 'import_completed':
        notificationOptions.actions = [
          { action: 'view', title: 'Просмотреть' },
          { action: 'later', title: 'Позже' }
        ];
        break;
      case 'import_failed':
        notificationOptions.actions = [
          { action: 'retry', title: 'Повторить' },
          { action: 'details', title: 'Подробнее' }
        ];
        break;
      case 'collaboration_invite':
        notificationOptions.actions = [
          { action: 'accept', title: 'Принять' },
          { action: 'decline', title: 'Отклонить' }
        ];
        break;
      case 'quota_warning':
        notificationOptions.actions = [
          { action: 'upgrade', title: 'Улучшить план' },
          { action: 'dismiss', title: 'Закрыть' }
        ];
        break;
      default:
        notificationOptions.actions = [
          { action: 'open', title: 'Открыть' },
          { action: 'dismiss', title: 'Закрыть' }
        ];
    }
  }

  // Показываем уведомление
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Обработка кликов по уведомлению
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  // Обработка действий
  if (action === 'dismiss' || action === 'later') {
    // Просто закрываем уведомление
    return;
  }

  // Формируем URL для открытия
  let urlToOpen = '/';

  if (notificationData) {
    switch (notificationData.type) {
      case 'database_cloned':
        if (notificationData.databaseId) {
          urlToOpen = `/database/${notificationData.databaseId}`;
        }
        break;
      case 'import_completed':
      case 'import_failed':
        if (notificationData.databaseId) {
          urlToOpen = `/database/${notificationData.databaseId}`;
        }
        if (action === 'retry' && notificationData.fileId) {
          urlToOpen = `/database/${notificationData.databaseId}?retry=${notificationData.fileId}`;
        }
        break;
      case 'collaboration_invite':
        if (notificationData.inviteId) {
          urlToOpen = `/invites/${notificationData.inviteId}?action=${action}`;
        }
        break;
      case 'quota_warning':
        if (action === 'upgrade') {
          urlToOpen = '/settings/billing';
        }
        break;
      default:
        if (notificationData.url) {
          urlToOpen = notificationData.url;
        }
    }
  }

  // Открываем или фокусируем окно
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Проверяем, есть ли уже открытое окно
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Фокусируем существующее окно и переходим по URL
          return client.focus().then(() => {
            client.navigate(urlToOpen);
          });
        }
      }
      // Если окна нет, открываем новое
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Обработка события установки Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing');
  self.skipWaiting();
});

/**
 * Обработка события активации Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(clients.claim());
});

/**
 * Синхронизация данных в фоне (если поддерживается)
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    console.log('[firebase-messaging-sw.js] Syncing notifications');
    // Здесь можно добавить логику синхронизации
  }
});

/**
 * Периодическая фоновая синхронизация (если поддерживается)
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    console.log('[firebase-messaging-sw.js] Periodic sync for notifications');
    // Здесь можно добавить логику периодической проверки
  }
});