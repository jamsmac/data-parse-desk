import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';


async function sendTelegramMessage(chatId: number, text: string, botToken: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Telegram API error:', error);
    throw new Error(`Failed to send Telegram message: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Get secure CORS headers based on origin
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    // Support two formats:
    // 1. Direct format: { telegram_id, message }
    // 2. Legacy format: { user_id, notification_type, data }

    if (body.telegram_id && body.message) {
      // Direct format - used by database triggers
      await sendTelegramMessage(body.telegram_id, body.message, botToken);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy format - for backward compatibility
    const { user_id, notification_type, data } = body;

    if (!user_id || !notification_type) {
      throw new Error('Missing required fields');
    }

    // Get user's Telegram account and notification preferences
    const { data: telegramAccount } = await supabaseClient
      .from('telegram_accounts')
      .select('telegram_id')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    if (!telegramAccount) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active Telegram account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: preferences } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Check if this notification type is enabled
    const isEnabled = preferences?.telegram_enabled &&
      ((notification_type === 'mention' && preferences.mentions_enabled) ||
       (notification_type === 'comment' && preferences.comments_enabled) ||
       (notification_type === 'data_change' && preferences.email_enabled));

    if (!isEnabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Notification type disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format message based on notification type
    let message = '';

    switch (notification_type) {
      case 'mention':
        message = `🔔 <b>Вас упомянули</b>\n\n` +
                  `${data.mentioned_by} упомянул вас в комментарии:\n` +
                  `"${data.comment_text}"\n\n` +
                  `База данных: ${data.database_name}`;
        break;

      case 'comment':
        message = `💬 <b>Новый комментарий</b>\n\n` +
                  `${data.author} оставил комментарий:\n` +
                  `"${data.comment_text}"\n\n` +
                  `База данных: ${data.database_name}`;
        break;

      case 'data_change':
        message = `📝 <b>Данные изменены</b>\n\n` +
                  `${data.changed_by} изменил данные в базе "${data.database_name}"\n` +
                  `Колонка: ${data.column_name}\n` +
                  `Строка: #${data.row_number}`;
        break;

      default:
        message = `📬 <b>Уведомление</b>\n\n${JSON.stringify(data)}`;
    }

    await sendTelegramMessage(telegramAccount.telegram_id, message, botToken);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
