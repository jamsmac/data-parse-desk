import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  subscribeToNotifications,
} from '@/api/notificationsAPI';
import type { Notification } from '@/types/auth';

/**
 * Hook для работы с уведомлениями
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  // Получение всех уведомлений
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  // Получение непрочитанных уведомлений
  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: getUnreadNotifications,
  });

  // Получение количества непрочитанных
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: getUnreadCount,
  });

  // Отметить как прочитанное
  const markAsRead = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Отметить все как прочитанные
  const markAllAsRead = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Удалить уведомление
  const deleteNotif = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Удалить все уведомления
  const deleteAll = useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Real-time подписка
  useEffect(() => {
    const subscription = subscribeToNotifications((newNotification) => {
      queryClient.setQueryData<Notification[]>(
        ['notifications'],
        (old = []) => [newNotification, ...old]
      );
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return {
    notifications,
    unreadNotifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsRead.mutateAsync,
    markAllAsRead: markAllAsRead.mutateAsync,
    deleteNotification: deleteNotif.mutateAsync,
    deleteAll: deleteAll.mutateAsync,
  };
}

/**
 * Hook для работы с настройками уведомлений
 */
export function useNotificationSettings() {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => import('@/api/notificationsAPI').then(m => m.getNotificationSettings()),
  });

  const updateSettings = useMutation({
    mutationFn: (updates: Parameters<typeof import('@/api/notificationsAPI').updateNotificationSettings>[0]) =>
      import('@/api/notificationsAPI').then(m => m.updateNotificationSettings(updates)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettings.mutateAsync,
  };
}
