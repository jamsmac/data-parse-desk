// Telegram Webhook Handler Edge Function
// Handles incoming messages from Telegram Bot API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

// Bot commands
const COMMANDS = {
  START: '/start',
  HELP: '/help',
  STATUS: '/status',
  SUBSCRIBE: '/subscribe',
  UNSUBSCRIBE: '/unsubscribe',
  LIST: '/list',
  STATS: '/stats',
  MUTE: '/mute',
  UNMUTE: '/unmute',
};

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const botToken = pathParts[pathParts.length - 1];

    if (!botToken) {
      return new Response(JSON.stringify({ error: 'Bot token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const update: TelegramUpdate = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: bot, error: botError } = await supabase
      .from('telegram_bots')
      .select('*')
      .eq('bot_token', botToken)
      .eq('enabled', true)
      .single();

    if (botError || !bot) {
      return new Response(JSON.stringify({ error: 'Bot not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (update.message || update.edited_message) {
      const message = update.message || update.edited_message!;
      const chatId = message.chat.id;
      const text = message.text?.trim() || '';

      await supabase.rpc('log_telegram_message', {
        p_bot_id: bot.id,
        p_chat_id: chatId,
        p_message_type: 'webhook',
        p_direction: 'incoming',
        p_text_content: text,
        p_payload: message,
        p_project_id: bot.project_id,
        p_status: 'delivered',
      });

      if (text.startsWith('/')) {
        const command = text.split(' ')[0].toLowerCase();
        let response = 'Unknown command. Use /help for available commands.';

        if (command === COMMANDS.START) {
          response = '👋 Welcome! Use /help to see commands.';
        } else if (command === COMMANDS.HELP) {
          response = '📚 Commands: /start /help /status /subscribe /list /stats';
        }

        await fetch(`${TELEGRAM_API_URL}${bot.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: response }),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
