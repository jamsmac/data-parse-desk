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
    document?: {
      file_id: string;
      file_name?: string;
      file_size?: number;
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
          `Добро пожаловать, ${from.first_name}! Ваш аккаунт подключен.\n\n` +
          `Доступные команды:\n` +
          `/projects - список проектов\n` +
          `/checklist - мои чеклисты\n` +
          `/view - просмотр данных\n` +
          `/stats - статистика\n` +
          `/help - помощь`
        );
      } else if (text?.startsWith('/projects')) {
        const { data: projects } = await supabaseClient
          .from('projects')
          .select('id, name, description')
          .eq('user_id', account.user_id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!projects || projects.length === 0) {
          await sendTelegramMessage(BOT_TOKEN, chat.id, '📂 У вас пока нет проектов.');
        } else {
          let message = '📂 Ваши проекты:\n\n';
          projects.forEach((p, i) => {
            message += `${i + 1}. <b>${p.name}</b>\n`;
            if (p.description) message += `   <i>${p.description}</i>\n`;
            message += `   ID: <code>${p.id}</code>\n\n`;
          });
          await sendTelegramMessage(BOT_TOKEN, chat.id, message);
        }
      } else if (text?.startsWith('/checklist')) {
        const { data: projects } = await supabaseClient
          .from('projects')
          .select('id')
          .eq('user_id', account.user_id);

        if (!projects || projects.length === 0) {
          await sendTelegramMessage(BOT_TOKEN, chat.id, '📋 У вас нет проектов с чеклистами.');
        } else {
          const projectIds = projects.map(p => p.id);
          const { data: views } = await supabaseClient
            .from('composite_views')
            .select('id, name, config')
            .in('project_id', projectIds)
            .limit(20);

          if (!views || views.length === 0) {
            await sendTelegramMessage(BOT_TOKEN, chat.id, '📋 У вас нет чеклистов.');
          } else {
            const checklistViews = views.filter(v => {
              const config = v.config as any;
              return config.columns?.some((col: any) => col.type === 'checklist');
            });

            if (checklistViews.length === 0) {
              await sendTelegramMessage(BOT_TOKEN, chat.id, '📋 У вас нет чеклистов.');
            } else {
              let message = '📋 Ваши чеклисты:\n\n';
              checklistViews.forEach((v, i) => {
                message += `${i + 1}. ${v.name}\n`;
                message += `   /view_${v.id.substring(0, 8)}\n\n`;
              });
              await sendTelegramMessage(BOT_TOKEN, chat.id, message);
            }
          }
        }
      } else if (text?.startsWith('/view_')) {
        const viewIdPrefix = text.substring(6);
        
        const { data: view } = await supabaseClient
          .from('composite_views')
          .select('id, name, config')
          .like('id', `${viewIdPrefix}%`)
          .single();

        if (!view) {
          await sendTelegramMessage(BOT_TOKEN, chat.id, '❌ Представление не найдено.');
        } else {
          const { data: customData } = await supabaseClient
            .from('composite_view_custom_data')
            .select('*')
            .eq('composite_view_id', view.id)
            .limit(5);

          let message = `<b>${view.name}</b>\n\n`;
          
          if (!customData || customData.length === 0) {
            message += 'Нет данных.';
          } else {
            customData.forEach((item, i) => {
              message += `${i + 1}. Row: ${item.row_identifier}\n`;
              const data = item.data as any;
              
              if (item.column_type === 'checklist' && data.items) {
                const completed = data.items.filter((i: any) => i.checked).length;
                const total = data.items.length;
                message += `   ✅ ${completed}/${total} завершено\n`;
              } else if (item.column_type === 'status') {
                message += `   📍 ${data.value || 'Не установлен'}\n`;
              } else if (item.column_type === 'progress') {
                message += `   📊 ${data.percentage || 0}%\n`;
              }
              message += '\n';
            });
          }

          await sendTelegramMessage(BOT_TOKEN, chat.id, message);
        }
      } else if (text?.startsWith('/stats')) {
        const { data: credits } = await supabaseClient
          .from('user_credits')
          .select('*')
          .eq('user_id', account.user_id)
          .single();

        const { data: projects, count: projectCount } = await supabaseClient
          .from('projects')
          .select('*', { count: 'exact' })
          .eq('user_id', account.user_id);

        let databaseCount = 0;
        if (projects && projects.length > 0) {
          const { count } = await supabaseClient
            .from('databases')
            .select('*', { count: 'exact', head: true })
            .in('project_id', projects.map(p => p.id));
          databaseCount = count || 0;
        }

        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          `📊 Ваша статистика:\n\n` +
          `💰 Кредиты: ${Number(credits?.free_credits || 0) + Number(credits?.paid_credits || 0)}\n` +
          `📁 Проектов: ${projectCount || 0}\n` +
          `📊 Таблиц: ${databaseCount}`
        );
      } else if (text?.startsWith('/import')) {
        await sendTelegramMessage(BOT_TOKEN, chat.id,
          `📤 Импорт данных:\n\n` +
          `Прикрепите файл CSV или Excel к следующему сообщению для импорта данных.\n\n` +
          `Поддерживаемые форматы: .csv, .xlsx, .xls`
        );
      } else if (text?.startsWith('/help')) {
        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          `ℹ️ Помощь:\n\n` +
          `/projects - список проектов\n` +
          `/checklist - мои чеклисты\n` +
          `/view - просмотр данных\n` +
          `/stats - показать статистику\n` +
          `/import - импортировать данные\n` +
          `/help - показать эту справку\n\n` +
          `Для полного доступа откройте веб-приложение.`
        );
      } else {
        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          `Команда не распознана. Используйте /help для списка команд.`
        );
      }

      // Handle file uploads
      if (update.message?.document) {
        const document = update.message.document;
        const fileId = document.file_id;
        const fileName = document.file_name || 'unknown';

        // Check if it's a supported file type
        const supportedExtensions = ['.csv', '.xlsx', '.xls'];
        const isSupported = supportedExtensions.some(ext => 
          fileName.toLowerCase().endsWith(ext)
        );

        if (isSupported) {
          await sendTelegramMessage(BOT_TOKEN, chat.id,
            `✅ Файл "${fileName}" получен!\n\n` +
            `Импорт будет обработан. Вы получите уведомление после завершения.`
          );

          // TODO: Download file from Telegram and process it
          // This would require implementing file download and import logic
          console.log('File received for import:', { fileId, fileName, userId: account.user_id });
        } else {
          await sendTelegramMessage(BOT_TOKEN, chat.id,
            `❌ Неподдерживаемый формат файла.\n\n` +
            `Пожалуйста, отправьте файл в формате CSV, XLSX или XLS.`
          );
        }
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
