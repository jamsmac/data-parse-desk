import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  message?: {
    from: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    text?: string;
    chat: {
      id: number;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const update: TelegramUpdate = await req.json();
    console.log('Telegram update received:', JSON.stringify(update));

    if (update.message) {
      const { from, text, chat } = update.message;
      
      // Check if user is linked
      const { data: account } = await supabaseClient
        .from('telegram_accounts')
        .select('*')
        .eq('telegram_id', from.id)
        .eq('is_active', true)
        .single();

      if (!account) {
        // Send welcome message
        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          'Привет! Для начала работы подключите ваш аккаунт через настройки приложения DATA PARSE DESK.'
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update last interaction time
      await supabaseClient
        .from('telegram_accounts')
        .update({ last_interaction_at: new Date().toISOString() })
        .eq('telegram_id', from.id);

      // Process commands
      if (text?.startsWith('/start')) {
        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          `Добро пожаловать, ${from.first_name}! Ваш аккаунт подключен.\n\nДоступные команды:\n/stats - статистика\n/help - помощь`
        );
      } else if (text?.startsWith('/stats')) {
        // Get user statistics
        const { data: credits } = await supabaseClient
          .from('user_credits')
          .select('*')
          .eq('user_id', account.user_id)
          .single();

        const { data: projects, count } = await supabaseClient
          .from('projects')
          .select('*', { count: 'exact' })
          .eq('user_id', account.user_id);

        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          `📊 Ваша статистика:\n\n` +
          `💰 Кредиты: ${Number(credits?.free_credits || 0) + Number(credits?.paid_credits || 0)}\n` +
          `📁 Проектов: ${count || 0}`
        );
      } else if (text?.startsWith('/help')) {
        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          `ℹ️ Помощь:\n\n` +
          `/stats - показать статистику\n` +
          `/help - показать эту справку\n\n` +
          `Для полного доступа откройте веб-приложение.`
        );
      } else {
        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          `Команда не распознана. Используйте /help для списка команд.`
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to send Telegram message:', error);
  }
  
  return response.json();
}
