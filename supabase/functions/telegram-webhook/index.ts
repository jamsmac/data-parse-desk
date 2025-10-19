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
  callback_query?: {
    id: string;
    from: {
      id: number;
      username?: string;
      first_name?: string;
    };
    message?: {
      chat: {
        id: number;
      };
    };
    data?: string;
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

      // Handle /link command for new users
      if (!account && text?.startsWith('/link ')) {
        const code = text.split(' ')[1]?.trim();
        if (!code || code.length !== 6) {
          await sendTelegramMessage(BOT_TOKEN, chat.id, 
            '❌ Неверный формат. Используйте: /link 123456'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Find user by link code
        const { data: metadata } = await supabaseClient
          .from('database_metadata')
          .select('user_id, value')
          .eq('key', 'telegram_link_code')
          .single();

        if (!metadata) {
          await sendTelegramMessage(BOT_TOKEN, chat.id, 
            '❌ Код не найден. Сгенерируйте новый код в настройках приложения.'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const linkData = JSON.parse(metadata.value);
        const expiresAt = new Date(linkData.expires_at);

        if (linkData.code !== code) {
          await sendTelegramMessage(BOT_TOKEN, chat.id, 
            '❌ Неверный код. Проверьте код в настройках приложения.'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (new Date() > expiresAt) {
          await sendTelegramMessage(BOT_TOKEN, chat.id, 
            '❌ Код истек. Сгенерируйте новый код в настройках приложения.'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Link account
        const { error: linkError } = await supabaseClient
          .from('telegram_accounts')
          .insert({
            user_id: metadata.user_id,
            telegram_id: from.id,
            telegram_username: from.username,
            first_name: from.first_name,
            last_name: from.last_name,
            is_active: true,
          });

        if (linkError) {
          console.error('Error linking account:', linkError);
          await sendTelegramMessage(BOT_TOKEN, chat.id, 
            '❌ Ошибка подключения. Попробуйте позже.'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete used link code
        await supabaseClient
          .from('database_metadata')
          .delete()
          .eq('user_id', metadata.user_id)
          .eq('key', 'telegram_link_code');

        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          `✅ Аккаунт успешно подключен!\n\n` +
          `Доступные команды:\n` +
          `/projects - список проектов\n` +
          `/checklist - мои чеклисты\n` +
          `/view - просмотр данных\n` +
          `/stats - статистика\n` +
          `/help - помощь`
        );

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!account) {
        // Send welcome message for unlinked users
        await sendTelegramMessage(BOT_TOKEN, chat.id, 
          '👋 Привет! Для начала работы:\n\n' +
          '1. Откройте DATA PARSE DESK\n' +
          '2. Перейдите в Настройки → Интеграции\n' +
          '3. Сгенерируйте код подключения\n' +
          '4. Отправьте мне команду: /link [код]'
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
              let message = '📋 Выберите чеклист:\n\n';
              const keyboard = {
                inline_keyboard: checklistViews.slice(0, 10).map(v => [{
                  text: `${v.name}`,
                  callback_data: `view_${v.id}`
                }])
              };
              
              await sendTelegramMessageWithKeyboard(BOT_TOKEN, chat.id, message, keyboard);
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
            `⏳ Загружаю файл "${fileName}"...`
          );

          try {
            // Get file path from Telegram
            const fileResponse = await fetch(
              `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
            );
            const fileData = await fileResponse.json();
            
            if (!fileData.ok || !fileData.result?.file_path) {
              throw new Error('Failed to get file path from Telegram');
            }

            const filePath = fileData.result.file_path;
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

            // Download file
            const downloadResponse = await fetch(fileUrl);
            if (!downloadResponse.ok) {
              throw new Error('Failed to download file from Telegram');
            }

            const fileBuffer = await downloadResponse.arrayBuffer();
            const fileBase64 = btoa(
              new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            // Upload to Supabase Storage
            const storagePath = `telegram-imports/${account.user_id}/${Date.now()}-${fileName}`;
            const { error: uploadError } = await supabaseClient
              .storage
              .from('avatars') // Using existing bucket
              .upload(storagePath, fileBuffer, {
                contentType: fileName.endsWith('.csv') ? 'text/csv' : 
                             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              });

            if (uploadError) {
              console.error('Upload error:', uploadError);
              throw new Error('Failed to upload file to storage');
            }

            // Store file metadata
            await supabaseClient
              .from('database_files')
              .insert({
                database_id: null, // Will be set when user selects database
                filename: fileName,
                file_type: fileName.split('.').pop(),
                file_size: document.file_size,
                uploaded_by: account.user_id,
                metadata: {
                  telegram_file_id: fileId,
                  storage_path: storagePath,
                  source: 'telegram'
                }
              });

            await sendTelegramMessage(BOT_TOKEN, chat.id,
              `✅ Файл "${fileName}" загружен!\n\n` +
              `Размер: ${Math.round((document.file_size || 0) / 1024)} KB\n\n` +
              `Используйте /import для импорта данных в базу.`
            );

          } catch (error) {
            console.error('File processing error:', error);
            await sendTelegramMessage(BOT_TOKEN, chat.id,
              `❌ Ошибка при обработке файла: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        } else {
          await sendTelegramMessage(BOT_TOKEN, chat.id,
            `❌ Неподдерживаемый формат файла.\n\n` +
            `Пожалуйста, отправьте файл в формате CSV, XLSX или XLS.`
          );
        }
      }
    } else if (update.callback_query) {
      // Handle inline button callbacks
      const { callback_query } = update;
      const chatId = callback_query.message?.chat.id;
      const data = callback_query.data;

      if (!chatId || !data) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user is linked
      const { data: account } = await supabaseClient
        .from('telegram_accounts')
        .select('*')
        .eq('telegram_id', callback_query.from.id)
        .eq('is_active', true)
        .single();

      if (!account) {
        await sendTelegramMessage(BOT_TOKEN, chatId, 
          '❌ Ваш аккаунт не подключен. Используйте /link для подключения.'
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle view callback
      if (data.startsWith('view_')) {
        const viewId = data.substring(5);
        
        const { data: view } = await supabaseClient
          .from('composite_views')
          .select('id, name, config')
          .eq('id', viewId)
          .single();

        if (!view) {
          await sendTelegramMessage(BOT_TOKEN, chatId, '❌ Представление не найдено.');
        } else {
          const { data: customData } = await supabaseClient
            .from('composite_view_custom_data')
            .select('*')
            .eq('composite_view_id', view.id)
            .limit(10);

          let message = `<b>${view.name}</b>\n\n`;
          const buttons: any[] = [];
          
          if (!customData || customData.length === 0) {
            message += 'Нет данных.';
          } else {
            customData.forEach((item, i) => {
              message += `${i + 1}. Row: ${item.row_identifier}\n`;
              const data = item.data as any;
              
              if (item.column_type === 'checklist' && data.items) {
                const completed = data.items.filter((i: any) => i.checked).length;
                const total = data.items.length;
                message += `   ✅ ${completed}/${total} завершено (${Math.round((completed/total)*100)}%)\n`;
                
                // Add buttons for incomplete items
                data.items
                  .filter((taskItem: any, idx: number) => !taskItem.checked && idx < 3)
                  .forEach((taskItem: any, idx: number) => {
                    buttons.push([{
                      text: `✓ ${taskItem.text.substring(0, 30)}`,
                      callback_data: `toggle_${item.id}_${idx}`
                    }]);
                  });
              } else if (item.column_type === 'status') {
                message += `   📍 ${data.value || 'Не установлен'}\n`;
              } else if (item.column_type === 'progress') {
                message += `   📊 ${data.percentage || 0}%\n`;
              }
              message += '\n';
            });
          }

          const keyboard = buttons.length > 0 ? { inline_keyboard: buttons } : null;
          
          if (keyboard) {
            await sendTelegramMessageWithKeyboard(BOT_TOKEN, chatId, message, keyboard);
          } else {
            await sendTelegramMessage(BOT_TOKEN, chatId, message);
          }
        }

        // Answer callback query
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callback_query.id,
            text: 'Загружено ✓'
          }),
        });
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

async function sendTelegramMessageWithKeyboard(
  botToken: string,
  chatId: number,
  text: string,
  keyboard: any
) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to send Telegram message with keyboard:', error);
  }

  return response.json();
}
