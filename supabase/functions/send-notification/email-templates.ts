// Email templates for different notification types

export interface EmailTemplateData {
  userName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

const baseStyle = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f4f4f5;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 32px 24px;
    text-align: center;
  }
  .header h1 {
    color: white;
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }
  .content {
    padding: 32px 24px;
  }
  .notification-badge {
    display: inline-block;
    background: #f0f0f1;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    margin-bottom: 16px;
    text-transform: uppercase;
  }
  .title {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 16px 0;
  }
  .message {
    font-size: 15px;
    color: #555;
    margin: 0 0 24px 0;
  }
  .button {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 32px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    transition: transform 0.2s;
  }
  .button:hover {
    transform: translateY(-2px);
  }
  .footer {
    background: #f9fafb;
    padding: 24px;
    text-align: center;
    border-top: 1px solid #e5e7eb;
  }
  .footer p {
    margin: 0;
    font-size: 13px;
    color: #6b7280;
  }
  .footer a {
    color: #667eea;
    text-decoration: none;
  }
`;

export function getCommentEmailTemplate(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 Data Parse Desk</h1>
    </div>
    <div class="content">
      <div class="notification-badge">Новый комментарий</div>
      <h2 class="title">${data.title}</h2>
      <p class="message">${data.message}</p>
      ${data.actionUrl ? `
        <a href="${data.actionUrl}" class="button">${data.actionText || 'Посмотреть'}</a>
      ` : ''}
    </div>
    <div class="footer">
      <p>Вы получили это письмо, потому что подписаны на уведомления о комментариях.</p>
      <p><a href="${data.metadata?.unsubscribeUrl || '#'}">Отписаться от уведомлений</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getMentionEmailTemplate(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📢 Data Parse Desk</h1>
    </div>
    <div class="content">
      <div class="notification-badge">Упоминание</div>
      <h2 class="title">${data.title}</h2>
      <p class="message">${data.message}</p>
      ${data.actionUrl ? `
        <a href="${data.actionUrl}" class="button">${data.actionText || 'Посмотреть'}</a>
      ` : ''}
    </div>
    <div class="footer">
      <p>Вы получили это письмо, потому что вас упомянули в комментарии.</p>
      <p><a href="${data.metadata?.unsubscribeUrl || '#'}">Отписаться от уведомлений</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getReportEmailTemplate(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Data Parse Desk</h1>
    </div>
    <div class="content">
      <div class="notification-badge">Отчёт готов</div>
      <h2 class="title">${data.title}</h2>
      <p class="message">${data.message}</p>
      ${data.actionUrl ? `
        <a href="${data.actionUrl}" class="button">${data.actionText || 'Скачать отчёт'}</a>
      ` : ''}
    </div>
    <div class="footer">
      <p>Вы получили это письмо, потому что подписаны на уведомления об отчётах.</p>
      <p><a href="${data.metadata?.unsubscribeUrl || '#'}">Отписаться от уведомлений</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getMemberAddedEmailTemplate(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Data Parse Desk</h1>
    </div>
    <div class="content">
      <div class="notification-badge">Приглашение</div>
      <h2 class="title">${data.title}</h2>
      <p class="message">${data.message}</p>
      ${data.actionUrl ? `
        <a href="${data.actionUrl}" class="button">${data.actionText || 'Перейти к проекту'}</a>
      ` : ''}
    </div>
    <div class="footer">
      <p>Вы получили это письмо, потому что вас добавили в проект.</p>
      <p><a href="${data.metadata?.unsubscribeUrl || '#'}">Управление уведомлениями</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getGenericEmailTemplate(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Data Parse Desk</h1>
    </div>
    <div class="content">
      <div class="notification-badge">Уведомление</div>
      <h2 class="title">${data.title}</h2>
      <p class="message">${data.message}</p>
      ${data.actionUrl ? `
        <a href="${data.actionUrl}" class="button">${data.actionText || 'Посмотреть'}</a>
      ` : ''}
    </div>
    <div class="footer">
      <p>Это уведомление от Data Parse Desk.</p>
      <p><a href="${data.metadata?.unsubscribeUrl || '#'}">Управление уведомлениями</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getEmailTemplate(type: string, data: EmailTemplateData): string {
  switch (type) {
    case 'comment':
      return getCommentEmailTemplate(data);
    case 'mention':
      return getMentionEmailTemplate(data);
    case 'report':
      return getReportEmailTemplate(data);
    case 'member_added':
      return getMemberAddedEmailTemplate(data);
    default:
      return getGenericEmailTemplate(data);
  }
}
