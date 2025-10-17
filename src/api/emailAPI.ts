import { supabase } from '@/integrations/supabase/client';

/**
 * Email attachment interface
 */
export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  contentType?: string;
}

/**
 * Email request interface
 */
export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
  metadata?: Record<string, unknown>;
}

/**
 * Email response interface
 */
export interface SendEmailResponse {
  success: boolean;
  emailId: string;
  message: string;
  data?: unknown;
}

/**
 * Scheduled report request interface
 */
export interface SendScheduledReportRequest {
  scheduleId: string;
  reportData: unknown;
  format: 'pdf' | 'excel' | 'csv' | 'html';
  recipients: string[];
  subject?: string;
  templateName?: string;
  scheduleNextRun?: string;
}

/**
 * Scheduled report response interface
 */
export interface SendScheduledReportResponse {
  success: boolean;
  emailId: string;
  message: string;
  sentTo: string[];
  scheduleId: string;
  data?: unknown;
}

/**
 * Test email request interface
 */
export interface SendTestEmailRequest {
  to: string;
  testType?: 'simple' | 'digest' | 'report';
}

/**
 * Email API client for sending emails via Supabase Edge Functions
 */
export class EmailAPI {
  /**
   * Send a generic email
   * @param request Email request parameters
   * @returns Email response with emailId
   */
  static async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      // Get current user ID for audit logging
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        ...request,
        userId: user?.id,
      };

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: payload,
      });

      if (error) {
        console.error('Error invoking send-email function:', error);
        throw new Error(error.message || 'Failed to send email');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to send email');
      }

      return data as SendEmailResponse;
    } catch (error) {
      console.error('EmailAPI.sendEmail error:', error);
      throw error;
    }
  }

  /**
   * Send a test email
   * @param request Test email request
   * @returns Email response
   */
  static async sendTestEmail(request: SendTestEmailRequest): Promise<SendEmailResponse> {
    const testType = request.testType || 'simple';

    let subject: string;
    let html: string;

    switch (testType) {
      case 'digest':
        subject = 'VHData - Тестовое письмо (Дайджест)';
        html = this.generateDigestTestEmail();
        break;

      case 'report':
        subject = 'VHData - Тестовое письмо (Отчёт)';
        html = this.generateReportTestEmail();
        break;

      case 'simple':
      default:
        subject = 'VHData - Тестовое письмо';
        html = this.generateSimpleTestEmail();
        break;
    }

    return this.sendEmail({
      to: request.to,
      subject,
      html,
    });
  }

  /**
   * Send a scheduled report
   * @param request Scheduled report request
   * @returns Scheduled report response
   */
  static async sendScheduledReport(
    request: SendScheduledReportRequest
  ): Promise<SendScheduledReportResponse> {
    try {
      // Get current user ID for audit logging
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        ...request,
        userId: user?.id,
      };

      const { data, error } = await supabase.functions.invoke('send-scheduled-report', {
        body: payload,
      });

      if (error) {
        console.error('Error invoking send-scheduled-report function:', error);
        throw new Error(error.message || 'Failed to send scheduled report');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to send scheduled report');
      }

      return data as SendScheduledReportResponse;
    } catch (error) {
      console.error('EmailAPI.sendScheduledReport error:', error);
      throw error;
    }
  }

  /**
   * Send a notification email
   * @param to Recipient email
   * @param subject Email subject
   * @param message Email message (plain text or HTML)
   * @param type Notification type
   * @returns Email response
   */
  static async sendNotification(
    to: string,
    subject: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<SendEmailResponse> {
    const html = this.generateNotificationEmail(message, type);

    return this.sendEmail({
      to,
      subject,
      html,
    });
  }

  /**
   * Send a digest email with multiple notifications
   * @param to Recipient email
   * @param notifications Array of notifications
   * @param frequency 'daily' | 'weekly'
   * @returns Email response
   */
  static async sendDigest(
    to: string,
    notifications: Array<{ title: string; message: string; timestamp: string; type?: string }>,
    frequency: 'daily' | 'weekly' = 'daily'
  ): Promise<SendEmailResponse> {
    const subject = frequency === 'daily'
      ? `VHData - Ежедневная сводка (${new Date().toLocaleDateString('ru-RU')})`
      : `VHData - Еженедельная сводка (${new Date().toLocaleDateString('ru-RU')})`;

    const html = this.generateDigestEmail(notifications, frequency);

    return this.sendEmail({
      to,
      subject,
      html,
    });
  }

  // ========== Private Email Template Generators ==========

  /**
   * Generate simple test email HTML
   */
  private static generateSimpleTestEmail(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>✉️ Тестовое письмо VHData</h1>
  </div>
  <div class="content">
    <p>Здравствуйте!</p>
    <p>Это тестовое письмо от VHData Platform. Если вы получили это письмо, значит ваши настройки email работают корректно.</p>
    <p>Дата и время отправки: ${new Date().toLocaleString('ru-RU')}</p>
    <p>Теперь вы можете настроить уведомления и начать получать отчёты по электронной почте.</p>
  </div>
  <div class="footer">
    <p>© 2025 VHData Platform</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate digest test email HTML
   */
  private static generateDigestTestEmail(): string {
    const sampleNotifications = [
      { title: 'Новый комментарий', message: 'Пользователь оставил комментарий к вашей записи', time: '2 часа назад' },
      { title: 'Обновление базы данных', message: 'База "Продажи" была обновлена', time: '5 часов назад' },
      { title: 'Упоминание', message: 'Вас упомянули в комментарии', time: '1 день назад' },
    ];

    let notificationsList = '';
    sampleNotifications.forEach(notif => {
      notificationsList += `
        <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #667eea;">
          <strong>${notif.title}</strong>
          <p style="margin: 5px 0; color: #6c757d;">${notif.message}</p>
          <small style="color: #adb5bd;">${notif.time}</small>
        </div>
      `;
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
    .content { padding: 30px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📬 Ежедневная сводка VHData (Тест)</h1>
    <p>${new Date().toLocaleDateString('ru-RU')}</p>
  </div>
  <div class="content">
    <p><strong>Здравствуйте!</strong></p>
    <p>Это тестовая версия ежедневной сводки. У вас 3 новых уведомления:</p>
    ${notificationsList}
    <p style="margin-top: 20px;">В реальных письмах вы будете получать актуальные уведомления за прошедший день.</p>
  </div>
  <div class="footer">
    <p>© 2025 VHData Platform</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate report test email HTML
   */
  private static generateReportTestEmail(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
    .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Запланированный отчёт VHData (Тест)</h1>
  </div>
  <div class="content">
    <p>Здравствуйте!</p>
    <p>Это тестовое письмо с отчётом. В реальных письмах отчёт будет прикреплён в выбранном формате (PDF, Excel, CSV или HTML).</p>
    <div class="info-box">
      <p><strong>Пример информации об отчёте:</strong></p>
      <p>📄 Формат: PDF<br>
      📅 Дата генерации: ${new Date().toLocaleString('ru-RU')}<br>
      🔄 Расписание: Ежедневно в 09:00</p>
    </div>
    <p>После настройки запланированных отчётов, вы будете получать их автоматически по указанному расписанию.</p>
  </div>
  <div class="footer">
    <p>© 2025 VHData Platform</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate notification email HTML
   */
  private static generateNotificationEmail(message: string, type: string): string {
    const typeColors: Record<string, { bg: string; border: string; icon: string }> = {
      info: { bg: '#e7f3ff', border: '#2196F3', icon: 'ℹ️' },
      success: { bg: '#e8f5e9', border: '#4CAF50', icon: '✅' },
      warning: { bg: '#fff3e0', border: '#FF9800', icon: '⚠️' },
      error: { bg: '#ffebee', border: '#f44336', icon: '❌' },
    };

    const colors = typeColors[type] || typeColors.info;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .notification { background: ${colors.bg}; padding: 20px; border-radius: 10px; border-left: 4px solid ${colors.border}; }
    .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
  </style>
</head>
<body>
  <div class="notification">
    <h2>${colors.icon} Уведомление VHData</h2>
    <p>${message}</p>
    <p><small>Отправлено: ${new Date().toLocaleString('ru-RU')}</small></p>
  </div>
  <div class="footer">
    <p>© 2025 VHData Platform</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate digest email HTML
   */
  private static generateDigestEmail(
    notifications: Array<{ title: string; message: string; timestamp: string; type?: string }>,
    frequency: string
  ): string {
    let notificationsList = '';
    notifications.forEach(notif => {
      const typeIcon = notif.type === 'comment' ? '💬' :
                      notif.type === 'mention' ? '@' :
                      notif.type === 'update' ? '🔄' :
                      notif.type === 'share' ? '📤' : '📝';

      notificationsList += `
        <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #667eea;">
          <div style="display: flex; align-items: start; gap: 10px;">
            <span style="font-size: 20px;">${typeIcon}</span>
            <div style="flex: 1;">
              <strong>${notif.title}</strong>
              <p style="margin: 5px 0; color: #6c757d;">${notif.message}</p>
              <small style="color: #adb5bd;">${new Date(notif.timestamp).toLocaleString('ru-RU')}</small>
            </div>
          </div>
        </div>
      `;
    });

    const frequencyText = frequency === 'daily' ? 'Ежедневная' : 'Еженедельная';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
    .content { padding: 30px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📬 ${frequencyText} сводка VHData</h1>
    <p>${new Date().toLocaleDateString('ru-RU')}</p>
  </div>
  <div class="content">
    <p><strong>Здравствуйте!</strong></p>
    <p>У вас ${notifications.length} новых уведомлений:</p>
    ${notificationsList}
  </div>
  <div class="footer">
    <p>© 2025 VHData Platform. Все права защищены.</p>
    <p style="font-size: 12px; margin-top: 10px;">
      Вы получили это письмо, потому что включили ${frequency === 'daily' ? 'ежедневные' : 'еженедельные'} сводки в настройках.
    </p>
  </div>
</body>
</html>
    `.trim();
  }
}
