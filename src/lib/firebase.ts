/**
 * Firebase Configuration and Push Notification Service
 * Управление push-уведомлениями через Firebase Cloud Messaging
 */

import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  Messaging
} from 'firebase/messaging';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { supabase } from '@/integrations/supabase/client';

// ✅ ПРАВИЛЬНО - читать из env переменных
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// VAPID key for web push
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize messaging only if supported
let messaging: Messaging | null = null;

// Export initialized instances
export { app, analytics, messaging };

export const initMessaging = async (): Promise<Messaging | null> => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      return messaging;
    }
    return null;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
};

/**
 * Запрос разрешения на показ уведомлений и получение токена
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Проверяем поддержку уведомлений
    if (!('Notification' in window)) {
      return null;
    }

    // Запрашиваем разрешение
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return null;
    }

    // Инициализируем messaging если еще не инициализирован
    if (!messaging) {
      messaging = await initMessaging();
    }

    if (!messaging) {
      return null;
    }

    // Регистрируем Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Получаем FCM токен
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      // Сохраняем токен в базе данных
      await saveTokenToDatabase(token);
      return token;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

/**
 * Сохранение FCM токена в базе данных
 */
const saveTokenToDatabase = async (token: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('User not authenticated');
      return;
    }

    const { error } = await supabase
      .from('user_fcm_tokens')
      .upsert({
        user_id: user.id,
        token: token,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,token'
      });

    if (error) {
      console.error('Error saving FCM token:', error);
    } else {
    }
  } catch (error) {
    console.error('Error in saveTokenToDatabase:', error);
  }
};

/**
 * Удаление FCM токена из базы данных
 */
export const removeTokenFromDatabase = async (token: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from('user_fcm_tokens')
      .delete()
      .match({ user_id: user.id, token: token });

    if (error) {
      console.error('Error removing FCM token:', error);
    }
  } catch (error) {
    console.error('Error in removeTokenFromDatabase:', error);
  }
};

/**
 * Подписка на получение сообщений (foreground)
 */
export const subscribeToMessages = (callback: (payload: {
  notification?: { title?: string; body?: string; image?: string };
  data?: { [key: string]: string };
}) => void): (() => void) => {
  if (!messaging) {
    return () => {};
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    callback(payload);
  });

  return unsubscribe;
};

/**
 * Показ уведомления в браузере
 */
export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      ...options
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
    };
  }
};

/**
 * Типы уведомлений в системе
 */
export enum NotificationType {
  DATABASE_CLONED = 'database_cloned',
  IMPORT_COMPLETED = 'import_completed',
  IMPORT_FAILED = 'import_failed',
  EXPORT_COMPLETED = 'export_completed',
  RELATION_CREATED = 'relation_created',
  QUOTA_WARNING = 'quota_warning',
  SYSTEM_UPDATE = 'system_update',
  COLLABORATION_INVITE = 'collaboration_invite'
}

/**
 * Отправка push-уведомления (вызывается с backend)
 */
export interface PushNotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}