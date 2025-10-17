import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface ScheduledReportRequest {
  scheduleId: string;
  reportData: unknown; // Report data to be sent
  format: 'pdf' | 'excel' | 'csv' | 'html';
  recipients: string[];
  subject?: string;
  userId?: string;
  templateName?: string;
  scheduleNextRun?: string;
}

interface ReportAttachment {
  filename: string;
  content: string; // base64 encoded
  contentType: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate HTML email template for scheduled report
 */
function generateReportEmailHTML(
  templateName: string,
  format: string,
  reportDate: string,
  scheduleId: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      color: #6c757d;
      font-size: 14px;
    }
    .info-box {
      background: white;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
      border-left: 4px solid #667eea;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    .info-label {
      font-weight: 600;
      color: #495057;
    }
    .info-value {
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Запланированный отчёт VHData</h1>
    <p>Ваш отчёт готов</p>
  </div>

  <div class="content">
    <p>Здравствуйте!</p>

    <p>Ваш запланированный отчёт был успешно сгенерирован и прикреплён к этому письму.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Название:</span>
        <span class="info-value">${templateName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Формат:</span>
        <span class="info-value">${format.toUpperCase()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Дата генерации:</span>
        <span class="info-value">${reportDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">ID расписания:</span>
        <span class="info-value">${scheduleId}</span>
      </div>
    </div>

    <p>Отчёт прикреплён к этому письму. Если у вас возникли вопросы, пожалуйста, свяжитесь с нашей службой поддержки.</p>

    <p>
      <strong>Примечание:</strong> Это автоматически сгенерированное письмо в соответствии с вашими настройками запланированных отчётов.
    </p>
  </div>

  <div class="footer">
    <p>© 2025 VHData Platform. Все права защищены.</p>
    <p style="font-size: 12px; margin-top: 10px;">
      Это письмо было отправлено автоматически. Пожалуйста, не отвечайте на него.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Convert report data to attachment based on format
 */
function prepareReportAttachment(
  reportData: unknown,
  format: string,
  templateName: string
): ReportAttachment {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${templateName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.${format}`;

  // For now, convert report data to JSON string as base64
  // In production, you would generate actual PDF/Excel/CSV files here
  const dataString = JSON.stringify(reportData, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(dataString)));

  let contentType = 'application/json';

  switch (format) {
    case 'pdf':
      contentType = 'application/pdf';
      break;
    case 'excel':
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;
    case 'csv':
      contentType = 'text/csv';
      break;
    case 'html':
      contentType = 'text/html';
      break;
  }

  return {
    filename,
    content: base64Content,
    contentType,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing');
    }

    // Parse request body
    const reportRequest: ScheduledReportRequest = await req.json();

    // Validate required fields
    if (!reportRequest.scheduleId || !reportRequest.recipients || reportRequest.recipients.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: scheduleId, recipients',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Prepare email content
    const templateName = reportRequest.templateName || 'Отчёт';
    const reportDate = new Date().toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = reportRequest.subject || `${templateName} - ${reportDate}`;
    const htmlContent = generateReportEmailHTML(
      templateName,
      reportRequest.format,
      reportDate,
      reportRequest.scheduleId
    );

    // Prepare attachment
    const attachment = prepareReportAttachment(
      reportRequest.reportData,
      reportRequest.format,
      templateName
    );

    // Prepare Resend request
    const resendPayload = {
      from: 'VHData Reports <reports@vhdata.app>',
      to: reportRequest.recipients,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.content,
          content_type: attachment.contentType,
        },
      ],
    };

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend API error:', errorData);

      return new Response(
        JSON.stringify({
          error: 'Failed to send report email',
          details: errorData,
        }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const resendData = await resendResponse.json();

    // Update schedule lastRun and nextRun in database
    if (reportRequest.scheduleNextRun) {
      await supabase
        .from('scheduled_reports')
        .update({
          last_run: new Date().toISOString(),
          next_run: reportRequest.scheduleNextRun,
        })
        .eq('id', reportRequest.scheduleId);
    }

    // Log to audit_log
    if (reportRequest.userId) {
      try {
        await supabase.from('audit_log').insert({
          user_id: reportRequest.userId,
          action: 'scheduled_report_sent',
          entity_type: 'report',
          entity_id: reportRequest.scheduleId,
          new_values: {
            schedule_id: reportRequest.scheduleId,
            recipients: reportRequest.recipients,
            format: reportRequest.format,
            resend_id: resendData.id,
            sent_at: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log report send to audit_log:', logError);
        // Don't fail the request if logging fails
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendData.id,
        message: 'Scheduled report sent successfully',
        sentTo: reportRequest.recipients,
        scheduleId: reportRequest.scheduleId,
        data: resendData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-scheduled-report function:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
