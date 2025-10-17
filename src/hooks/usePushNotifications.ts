/**
 * React Hook для управления push-уведомлениями
 * Интеграция с Firebase Cloud Messaging
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  requestNotificationPermission,
  removeTokenFromDatabase,
  subscribeToMessages,
  showNotification,
  NotificationType,
  PushNotificationPayload,
  initMessaging
} from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPreferences {
  enabled: boolean;
  databaseCloned: boolean;
  importCompleted: boolean;
  importFailed: boolean;
  exportCompleted: boolean;
  relationCreated: boolean;
  quotaWarning: boolean;
  systemUpdate: boolean;
  collaborationInvite: boolean;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  fcmToken: string | null;
  preferences: NotificationPreferences;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  testNotification: () => void;
}

const defaultPreferences: NotificationPreferences = {
  enabled: false,
  databaseCloned: true,
  importCompleted: true,
  importFailed: true,
  exportCompleted: true,
  relationCreated: false,
  quotaWarning: true,
  systemUpdate: true,
  collaborationInvite: true
};

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const queryClient = useQueryClient();

  // Проверяем поддержку уведомлений при монтировании
  useEffect(() => {
    const checkSupport = async () => {
      setIsLoading(true);

      // Проверяем поддержку Notification API
      const notificationSupported = 'Notification' in window;

      // Проверяем поддержку Service Workers
      const swSupported = 'serviceWorker' in navigator;

      // Инициализируем Firebase Messaging
      const messaging = await initMessaging();

      const supported = notificationSupported && swSupported && messaging !== null;
      setIsSupported(supported);

      if (supported) {
        // Проверяем текущее разрешение
        setPermission(Notification.permission);
        setIsEnabled(Notification.permission === 'granted');

        // Загружаем настройки из базы данных
        await loadPreferences();
      }

      setIsLoading(false);
    };

    checkSupport();
  }, []);

  // Загрузка настроек из базы данных
  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setPreferences(data.preferences || defaultPreferences);
        setIsEnabled(data.preferences?.enabled || false);

        // Загружаем FCM токен если он есть
        const { data: tokenData } = await supabase
          .from('user_fcm_tokens')
          .select('token')
          .eq('user_id', user.id)
          .single();

        if (tokenData) {
          setFcmToken(tokenData.token);
        }
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  // Сохранение настроек в базе данных
  const savePreferences = async (prefs: NotificationPreferences) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences: prefs,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving notification preferences:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in savePreferences:', error);
      throw error;
    }
  };

  // Включение уведомлений
  const enableNotifications = async () => {
    if (!isSupported) {
      toast.error('Push-уведомления не поддерживаются в вашем браузере');
      return;
    }

    setIsLoading(true);

    try {
      // Запрашиваем разрешение и получаем токен
      const token = await requestNotificationPermission();

      if (token) {
        setFcmToken(token);
        setPermission('granted');
        setIsEnabled(true);

        // Сохраняем настройки
        const newPrefs = { ...preferences, enabled: true };
        await savePreferences(newPrefs);
        setPreferences(newPrefs);

        // Подписываемся на сообщения
        subscribeToForegroundMessages();

        toast.success('Push-уведомления успешно включены');

        // Инвалидируем кэш
        queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      } else {
        toast.error('Не удалось включить уведомления. Проверьте разрешения браузера');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Ошибка при включении уведомлений');
    } finally {
      setIsLoading(false);
    }
  };

  // Отключение уведомлений
  const disableNotifications = async () => {
    setIsLoading(true);

    try {
      // Удаляем токен из базы
      if (fcmToken) {
        await removeTokenFromDatabase(fcmToken);
      }

      // Обновляем настройки
      const newPrefs = { ...preferences, enabled: false };
      await savePreferences(newPrefs);
      setPreferences(newPrefs);

      setIsEnabled(false);
      setFcmToken(null);

      toast.success('Push-уведомления отключены');

      // Инвалидируем кэш
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Ошибка при отключении уведомлений');
    } finally {
      setIsLoading(false);
    }
  };

  // Обновление настроек уведомлений
  const updatePreferences = async (prefs: Partial<NotificationPreferences>) => {
    try {
      const newPrefs = { ...preferences, ...prefs };
      await savePreferences(newPrefs);
      setPreferences(newPrefs);

      toast.success('Настройки уведомлений обновлены');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Ошибка при обновлении настроек');
    }
  };

  // Подписка на foreground сообщения
  const subscribeToForegroundMessages = useCallback(() => {
    const unsubscribe = subscribeToMessages((payload) => {
      // Проверяем настройки для типа уведомления
      const notificationType = payload.data?.type as NotificationType;

      if (shouldShowNotification(notificationType)) {
        // Показываем уведомление через Notification API
        showNotification(
          payload.notification?.title || 'VHData Platform',
          {
            body: payload.notification?.body,
            icon: payload.notification?.icon,
            tag: payload.data?.tag,
            data: payload.data
          }
        );

        // Также показываем toast для быстрого просмотра
        showToastNotification(payload);
      }
    });

    // Сохраняем unsubscribe функцию для cleanup
    return unsubscribe;
  }, [preferences]);

  // Проверка, нужно ли показывать уведомление данного типа
  const shouldShowNotification = (type: NotificationType): boolean => {
    if (!preferences.enabled) return false;

    switch (type) {
      case NotificationType.DATABASE_CLONED:
        return preferences.databaseCloned;
      case NotificationType.IMPORT_COMPLETED:
        return preferences.importCompleted;
      case NotificationType.IMPORT_FAILED:
        return preferences.importFailed;
      case NotificationType.EXPORT_COMPLETED:
        return preferences.exportCompleted;
      case NotificationType.RELATION_CREATED:
        return preferences.relationCreated;
      case NotificationType.QUOTA_WARNING:
        return preferences.quotaWarning;
      case NotificationType.SYSTEM_UPDATE:
        return preferences.systemUpdate;
      case NotificationType.COLLABORATION_INVITE:
        return preferences.collaborationInvite;
      default:
        return true;
    }
  };

  // Показ toast уведомления
  const showToastNotification = (payload: {
    notification?: { title?: string; body?: string };
    data?: { type?: string; [key: string]: string | undefined };
  }) => {
    const type = payload.data?.type as NotificationType;
    const title = payload.notification?.title || 'Уведомление';
    const body = payload.notification?.body || '';

    switch (type) {
      case NotificationType.DATABASE_CLONED:
      case NotificationType.IMPORT_COMPLETED:
      case NotificationType.EXPORT_COMPLETED:
      case NotificationType.RELATION_CREATED:
        toast.success(`${title}: ${body}`);
        break;
      case NotificationType.IMPORT_FAILED:
      case NotificationType.QUOTA_WARNING:
        toast.error(`${title}: ${body}`);
        break;
      case NotificationType.SYSTEM_UPDATE:
      case NotificationType.COLLABORATION_INVITE:
        toast.info(`${title}: ${body}`);
        break;
      default:
        toast(body, { description: title });
    }
  };

  // Тестовое уведомление
  const testNotification = () => {
    if (!isEnabled) {
      toast.error('Сначала включите push-уведомления');
      return;
    }

    showNotification('Тестовое уведомление', {
      body: 'Это тестовое push-уведомление от VHData Platform',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'test-notification',
      requireInteraction: false
    });

    toast.success('Тестовое уведомление отправлено');
  };

  // Подписываемся на сообщения при включении
  useEffect(() => {
    if (isEnabled && fcmToken) {
      const unsubscribe = subscribeToForegroundMessages();
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [isEnabled, fcmToken, subscribeToForegroundMessages]);

  return {
    isSupported,
    isEnabled,
    isLoading,
    permission,
    fcmToken,
    preferences,
    enableNotifications,
    disableNotifications,
    updatePreferences,
    testNotification
  };
}