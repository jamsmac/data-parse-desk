import { supabase } from '@/integrations/supabase/client';
import type { Notification, NotificationSettings } from '@/types/auth';

/**
 * API для работы с уведомлениями
 */

// Получить все уведомления пользователя
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return data || [];
}

// Получить непрочитанные уведомления
export async function getUnreadNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }

  return data || [];
}

// Отметить уведомление как прочитанное
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Отметить все уведомления как прочитанные
export async function markAllNotificationsAsRead(): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Удалить уведомление
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

// Удалить все уведомления
export async function deleteAllNotifications(): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.user.id);

  if (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
}

// Создать уведомление (обычно вызывается на бэкенде, но можно и на фронте)
export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  link?: string
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      link,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return data;
}

// Получить настройки уведомлений пользователя
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.user.id)
    .single();

  if (error) {
    console.error('Error fetching notification settings:', error);
    throw error;
  }

  return data;
}

// Обновить настройки уведомлений
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('notification_settings')
    .update(settings)
    .eq('user_id', user.user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }

  return data;
}

// Подписаться на уведомления (real-time)
export function subscribeToNotifications(
  callback: (notification: Notification) => void
) {
  return supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();
}

// Получить количество непрочитанных уведомлений
export async function getUnreadCount(): Promise<number> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}
