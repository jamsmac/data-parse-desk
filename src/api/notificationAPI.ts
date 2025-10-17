/**
 * API для работы с push-уведомлениями
 * Интеграция с Firebase Cloud Messaging и Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { NotificationType } from '@/lib/firebase';

export interface NotificationPayload {
  userId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationPreferences {
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

export interface NotificationHistory {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  status: string;
  sentAt: string;
  readAt: string | null;
  clickedAt: string | null;
}

export class NotificationAPI {
  /**
   * Отправить push-уведомление пользователю
   */
  static async sendNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    notificationId?: string;
    message: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = payload.userId || user?.id;

      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase.rpc('send_push_notification', {
        p_user_id: userId,
        p_type: payload.type,
        p_title: payload.title,
        p_body: payload.body,
        p_data: payload.data || {}
      });

      if (error) throw error;

      return {
        success: data.success,
        notificationId: data.notification_id,
        message: data.message
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Отправить массовое уведомление
   */
  static async sendBulkNotification(
    userIds: string[],
    payload: Omit<NotificationPayload, 'userId'>
  ): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('send_bulk_notification', {
        p_user_ids: userIds,
        p_type: payload.type,
        p_title: payload.title,
        p_body: payload.body,
        p_data: payload.data || {}
      });

      if (error) throw error;

      return {
        success: data.success,
        sentCount: data.sent_count,
        failedCount: data.failed_count
      };
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  /**
   * Получить настройки уведомлений пользователя
   */
  static async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data?.preferences || null;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Сохранить настройки уведомлений
   */
  static async saveNotificationPreferences(
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences: preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      throw error;
    }
  }

  /**
   * Получить историю уведомлений
   */
  static async getNotificationHistory(
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationHistory[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        type: item.type,
        title: item.title,
        body: item.body,
        data: item.data,
        status: item.status,
        sentAt: item.sent_at,
        readAt: item.read_at,
        clickedAt: item.clicked_at
      }));
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }

  /**
   * Отметить уведомление как прочитанное
   */
  static async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) throw error;

      return data || false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Отметить уведомление как кликнутое
   */
  static async markNotificationClicked(notificationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('mark_notification_clicked', {
        p_notification_id: notificationId
      });

      if (error) throw error;

      return data || false;
    } catch (error) {
      console.error('Error marking notification as clicked:', error);
      return false;
    }
  }

  /**
   * Сохранить FCM токен
   */
  static async saveFCMToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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

      if (error) throw error;
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  /**
   * Удалить FCM токен
   */
  static async removeFCMToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_fcm_tokens')
        .delete()
        .match({ user_id: user.id, token: token });

      if (error) throw error;
    } catch (error) {
      console.error('Error removing FCM token:', error);
      throw error;
    }
  }

  /**
   * Автоматическое уведомление при клонировании БД
   */
  static async notifyDatabaseCloned(
    databaseId: string,
    databaseName: string,
    rowsCopied: number
  ): Promise<void> {
    try {
      await this.sendNotification({
        type: NotificationType.DATABASE_CLONED,
        title: 'База данных успешно клонирована',
        body: `Клонирование "${databaseName}" завершено. Скопировано ${rowsCopied} записей.`,
        data: {
          databaseId,
          rowsCopied
        }
      });
    } catch (error) {
      console.error('Error sending database cloned notification:', error);
    }
  }

  /**
   * Автоматическое уведомление при завершении импорта
   */
  static async notifyImportCompleted(
    databaseId: string,
    fileName: string,
    importedRows: number,
    rejectedRows: number
  ): Promise<void> {
    try {
      await this.sendNotification({
        type: NotificationType.IMPORT_COMPLETED,
        title: 'Импорт данных завершен',
        body: `Файл "${fileName}" обработан. Импортировано: ${importedRows}, отклонено: ${rejectedRows}.`,
        data: {
          databaseId,
          fileName,
          importedRows,
          rejectedRows
        }
      });
    } catch (error) {
      console.error('Error sending import completed notification:', error);
    }
  }

  /**
   * Автоматическое уведомление при ошибке импорта
   */
  static async notifyImportFailed(
    databaseId: string,
    fileName: string,
    error: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        type: NotificationType.IMPORT_FAILED,
        title: 'Ошибка при импорте данных',
        body: `Не удалось импортировать файл "${fileName}": ${error}`,
        data: {
          databaseId,
          fileName,
          error
        }
      });
    } catch (error) {
      console.error('Error sending import failed notification:', error);
    }
  }

  /**
   * Автоматическое уведомление о приближении к квоте
   */
  static async notifyQuotaWarning(
    resourceType: string,
    used: number,
    limit: number
  ): Promise<void> {
    try {
      const percentage = Math.round((used / limit) * 100);

      await this.sendNotification({
        type: NotificationType.QUOTA_WARNING,
        title: 'Предупреждение о квоте',
        body: `Вы использовали ${percentage}% от лимита ${resourceType}. Использовано ${used} из ${limit}.`,
        data: {
          resourceType,
          used,
          limit,
          percentage
        }
      });
    } catch (error) {
      console.error('Error sending quota warning notification:', error);
    }
  }
}