import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; last_name?: string; username?: string };
    chat: { id: number };
    text?: string;
    photo?: Array<{ file_id: string; file_size: number }>;
    document?: { file_id: string; file_name: string; mime_type: string; file_size: number };
    voice?: { file_id: string; duration: number; mime_type?: string; file_size?: number };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; last_name?: string; username?: string };
    message: { message_id: number; chat: { id: number }; text?: string };
    data: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const update: TelegramUpdate = await req.json();
    console.log('Telegram update:', JSON.stringify(update));

    // Handle callback queries (button presses)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, supabaseClient, BOT_TOKEN);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = update.message;
    
    // Handle voice messages
    if (message?.voice) {
      const telegramId = message.from.id;
      const chatId = message.chat.id;
      
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Check if user is linked
      const { data: account } = await supabaseClient
        .from('telegram_accounts')
        .select('*')
        .eq('telegram_id', telegramId)
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

      await sendTelegramMessage(BOT_TOKEN, chatId,
        `🎤 Распознаю голосовое сообщение (${message.voice.duration}с)...`
      );

      try {
        // Get file from Telegram
        const fileResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${message.voice.file_id}`
        );
        const fileData = await fileResponse.json();

        if (!fileData.ok || !fileData.result?.file_path) {
          throw new Error('Failed to get voice file from Telegram');
        }

        // Download voice file
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
        const downloadResponse = await fetch(fileUrl);
        
        if (!downloadResponse.ok) {
          throw new Error('Failed to download voice file');
        }

        const audioBuffer = await downloadResponse.arrayBuffer();
        const audioBase64 = btoa(
          new Uint8Array(audioBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Call process-voice function for transcription
        const { data: transcriptionData, error: transcriptionError } = await supabaseClient.functions.invoke(
          'process-voice',
          {
            body: {
              audioData: audioBase64,
              format: 'ogg' // Telegram voice messages are in OGG format
            }
          }
        );

        if (transcriptionError || !transcriptionData?.transcription) {
          throw new Error('Failed to transcribe voice message');
        }

        const transcribedText = transcriptionData.transcription;
        
        await sendTelegramMessage(BOT_TOKEN, chatId,
          `📝 Распознанный текст:\n"${transcribedText}"\n\n⏳ Обрабатываю команду...`
        );

        // Process transcribed text as a natural language query
        const { data: nlpData, error: nlpError } = await supabaseClient.functions.invoke(
          'telegram-natural-language',
          {
            body: {
              user_id: account.user_id,
              query: transcribedText,
              telegram_id: telegramId
            }
          }
        );

        if (nlpError) {
          throw new Error('Failed to process natural language query');
        }

        // Send the result back
        const resultMessage = nlpData?.message || '✅ Команда выполнена';
        await sendTelegramMessage(BOT_TOKEN, chatId, resultMessage);

      } catch (error) {
        console.error('Voice processing error:', error);
        await sendTelegramMessage(BOT_TOKEN, chatId,
          `❌ Ошибка обработки голоса: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!message || !message.text) {
      // Handle file uploads (photos and documents)
      if (message?.photo || message?.document) {
        const telegramId = message.from.id;
        const chatId = message.chat.id;

        let fileId: string;
        let fileName: string;
        let mimeType: string;
        let fileSize: number | undefined;
        let isDataFile = false;

        // Determine file details based on type (photo or document)
        if (message.photo) {
          const photo = message.photo;
          const largestPhoto = photo[photo.length - 1]; // Get the largest resolution
          fileId = largestPhoto.file_id;
          fileName = `photo_${Date.now()}.jpg`;
          mimeType = 'image/jpeg';
          fileSize = largestPhoto.file_size;
        } else if (message.document) {
          const document = message.document;
          fileId = document.file_id;
          fileName = document.file_name;
          mimeType = document.mime_type;
          fileSize = document.file_size;

          // Check if the document is a data file (CSV, Excel)
          const supportedExtensions = ['.csv', '.xlsx', '.xls'];
          isDataFile = supportedExtensions.some(ext =>
            fileName.toLowerCase().endsWith(ext)
          );
        } else {
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Initialize Supabase client
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Check if user is linked
        const { data: account } = await supabaseClient
          .from('telegram_accounts')
          .select('*')
          .eq('telegram_id', telegramId)
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

        if (isDataFile) {
          // Handle data import files
          await sendTelegramMessage(BOT_TOKEN, chatId,
            `⏳ Загружаю файл данных "${fileName}"...`
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
                file_size: fileSize,
                uploaded_by: account.user_id,
                metadata: {
                  telegram_file_id: fileId,
                  storage_path: storagePath,
                  source: 'telegram'
                }
              });

            await sendTelegramMessage(BOT_TOKEN, chatId,
              `✅ Файл "${fileName}" загружен!\n\n` +
              `Размер: ${Math.round((fileSize || 0) / 1024)} KB\n\n` +
              `Используйте /import для импорта данных в базу.`
            );

          } catch (error) {
            console.error('File processing error:', error);
            await sendTelegramMessage(BOT_TOKEN, chatId,
              `❌ Ошибка при обработке файла: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        } else {
          // Handle general file upload (photos, other documents)
          await sendTelegramMessage(BOT_TOKEN, chatId,
            `⏳ Загружаю файл "${fileName}"...`
          );

          try {
            // Get file path from Telegram
            const fileResponse = await fetch(
              `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
            );
            const fileData = await fileResponse.json();

            if (!fileData.ok || !fileData.result?.file_path) {
              throw new Error('Не удалось получить файл из Telegram');
            }

            // Download file
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
            const downloadResponse = await fetch(fileUrl);

            if (!downloadResponse.ok) {
              throw new Error('Не удалось скачать файл');
            }

            const fileBuffer = await downloadResponse.arrayBuffer();

            // Upload to Supabase Storage
            const storagePath = `telegram/${account.user_id}/${Date.now()}_${fileName}`;
            const { error: uploadError } = await supabaseClient
              .storage
              .from('avatars')
              .upload(storagePath, fileBuffer, {
                contentType: mimeType,
                upsert: false
              });

            if (uploadError) {
              console.error('Storage upload error:', uploadError);
              throw new Error('Ошибка загрузки в хранилище');
            }

            // Get public URL
            const { data: { publicUrl } } = supabaseClient
              .storage
              .from('avatars')
              .getPublicUrl(storagePath);

            const sizeKB = fileSize ? Math.round(fileSize / 1024) : 0;
            await sendTelegramMessage(BOT_TOKEN, chatId,
              `✅ Файл загружен успешно!\n\n` +
              `📁 ${fileName}\n` +
              `💾 Размер: ${sizeKB} KB\n\n` +
              `🔗 Доступен по ссылке:\n${publicUrl}`
            );

          } catch (error) {
            console.error('File upload error:', error);
            await sendTelegramMessage(BOT_TOKEN, chatId,
              `❌ Ошибка при загрузке файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
            );
          }
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle regular messages
    if (message && message.text) {
      const text = message.text;
      const telegramId = message.from.id;
      const chatId = message.chat.id;

      // Initialize Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Check if user is linked
      const { data: account } = await supabaseClient
        .from('telegram_accounts')
        .select('*')
        .eq('telegram_id', telegramId)
        .eq('is_active', true)
        .single();

      // Handle /link command for new users
      if (!account && text.startsWith('/link ')) {
        const code = text.split(' ')[1]?.trim();
        if (!code || code.length !== 6) {
          await sendTelegramMessage(BOT_TOKEN, chatId,
            '❌ Неверный формат. Используйте: /link 123456'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Find user by link code - look through all users' codes
        const { data: allCodes, error: codesError } = await supabaseClient
          .from('database_metadata')
          .select('user_id, value')
          .eq('key', 'telegram_link_code');

        if (codesError || !allCodes || allCodes.length === 0) {
          await sendTelegramMessage(BOT_TOKEN, chatId,
            '❌ Код не найден. Сгенерируйте новый код в настройках приложения.'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check each code
        let foundUserId: string | null = null;
        for (const metadata of allCodes) {
          try {
            const codeData = JSON.parse(metadata.value as string);

            // Check if code matches
            if (codeData.code === code) {
              // Check if not expired
              const expiresAt = new Date(codeData.expires_at);
              if (expiresAt < new Date()) {
                await sendTelegramMessage(BOT_TOKEN, chatId,
                  '❌ Код истёк. Сгенерируйте новый код (действителен 10 минут).'
                );
                return new Response(JSON.stringify({ ok: true }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }

              foundUserId = metadata.user_id;
              break;
            }
          } catch (e) {
            console.error('Error parsing code data:', e);
          }
        }

        if (!foundUserId) {
          await sendTelegramMessage(BOT_TOKEN, chatId,
            '❌ Неверный код. Проверьте правильность ввода.'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Link account
        const { error: linkError } = await supabaseClient
          .from('telegram_accounts')
          .insert({
            user_id: foundUserId,
            telegram_id: telegramId,
            telegram_username: message.from.username,
            first_name: message.from.first_name,
            last_name: message.from.last_name,
            is_active: true,
          });

        if (linkError) {
          console.error('Error linking account:', linkError);
          await sendTelegramMessage(BOT_TOKEN, chatId,
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
          .eq('user_id', foundUserId)
          .eq('key', 'telegram_link_code');

        await sendTelegramMessage(BOT_TOKEN, chatId,
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
        await sendTelegramMessage(BOT_TOKEN, chatId,
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
        .eq('telegram_id', telegramId);

      // Process commands
      if (text.startsWith('/start')) {
        await sendTelegramMessage(BOT_TOKEN, chatId,
          `Добро пожаловать, ${message.from.first_name}! Ваш аккаунт подключен.\n\n` +
          `Доступные команды:\n` +
          `/projects - список проектов\n` +
          `/checklist - мои чеклисты\n` +
          `/view - просмотр данных\n` +
          `/stats - статистика\n` +
          `/help - помощь`
        );
      } else if (text.startsWith('/projects')) {
        const { data: projects } = await supabaseClient
          .from('projects')
          .select('id, name, description')
          .eq('user_id', account.user_id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!projects || projects.length === 0) {
          await sendTelegramMessage(BOT_TOKEN, chatId, '📂 У вас пока нет проектов.');
        } else {
          let message = '📂 Ваши проекты:\n\n';
          projects.forEach((p, i) => {
            message += `${i + 1}. <b>${p.name}</b>\n`;
            if (p.description) message += `   <i>${p.description}</i>\n`;
            message += `   ID: <code>${p.id}</code>\n\n`;
          });
          await sendTelegramMessage(BOT_TOKEN, chatId, message);
        }
      } else if (text.startsWith('/checklist')) {
        const { data: projects } = await supabaseClient
          .from('projects')
          .select('id')
          .eq('user_id', account.user_id);

        if (!projects || projects.length === 0) {
          await sendTelegramMessage(BOT_TOKEN, chatId, '📋 У вас нет проектов с чеклистами.');
        } else {
          const projectIds = projects.map(p => p.id);
          const { data: views } = await supabaseClient
            .from('composite_views')
            .select('id, name, config')
            .in('project_id', projectIds)
            .limit(20);

          if (!views || views.length === 0) {
            await sendTelegramMessage(BOT_TOKEN, chatId, '📋 У вас нет чеклистов.');
          } else {
            const checklistViews = views.filter(v => {
              const config = v.config as any;
              return config.columns?.some((col: any) => col.type === 'checklist');
            });

            if (checklistViews.length === 0) {
              await sendTelegramMessage(BOT_TOKEN, chatId, '📋 У вас нет чеклистов.');
            } else {
              let message = '📋 Выберите чеклист:\n\n';
              const keyboard = {
                inline_keyboard: checklistViews.slice(0, 10).map(v => [{
                  text: `${v.name}`,
                  callback_data: `view_${v.id}`
                }])
              };

              await sendTelegramMessageWithKeyboard(BOT_TOKEN, chatId, message, keyboard);
            }
          }
        }
      } else if (text.startsWith('/view_')) {
        const viewIdPrefix = text.substring(6);

        const { data: view } = await supabaseClient
          .from('composite_views')
          .select('id, name, config')
          .like('id', `${viewIdPrefix}%`)
          .single();

        if (!view) {
          await sendTelegramMessage(BOT_TOKEN, chatId, '❌ Представление не найдено.');
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

          await sendTelegramMessage(BOT_TOKEN, chatId, message);
        }
      } else if (text.startsWith('/stats')) {
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

        await sendTelegramMessage(BOT_TOKEN, chatId,
          `📊 Ваша статистика:\n\n` +
          `💰 Кредиты: ${Number(credits?.free_credits || 0) + Number(credits?.paid_credits || 0)}\n` +
          `📁 Проектов: ${projectCount || 0}\n` +
          `📊 Таблиц: ${databaseCount}`
        );
      } else if (text.startsWith('/import')) {
        await sendTelegramMessage(BOT_TOKEN, chatId,
          `📤 Импорт данных:\n\n` +
          `Прикрепите файл CSV или Excel к следующему сообщению для импорта данных.\n\n` +
          `Поддерживаемые форматы: .csv, .xlsx, .xls`
        );
      } else if (text.startsWith('/help')) {
        await sendTelegramMessage(BOT_TOKEN, chatId,
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
        await sendTelegramMessage(BOT_TOKEN, chatId,
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

// Handle callback queries (inline button presses)
async function handleCallbackQuery(callback: any, supabaseClient: any, botToken: string) {
  const callbackId = callback.id;
  const chatId = callback.message.chat.id;
  const data = callback.data;

  try {
    const parts = data.split(':');
    
    if (parts[0] === 'checklist') {
      const [, viewId, rowId, columnName] = parts;
      
      const { data: customData } = await supabaseClient
        .from('composite_view_custom_data')
        .select('*')
        .eq('composite_view_id', viewId)
        .eq('row_identifier', rowId)
        .eq('column_name', columnName)
        .maybeSingle();

      const items = customData?.data?.items || [];
      let itemsText = `📝 *Checklist Items:*\n\n`;
      const keyboard: any[] = [];

      items.forEach((item: any, index: number) => {
        const checkbox = item.completed ? '✅' : '⬜';
        itemsText += `${index + 1}. ${checkbox} ${item.text}\n`;
        
        keyboard.push([{
          text: item.completed ? `✅ ${item.text}` : `⬜ ${item.text}`,
          callback_data: `toggle:${viewId}:${rowId}:${columnName}:${index}`
        }]);
      });

      keyboard.push([
        { text: '✅ Complete All', callback_data: `complete_all:${viewId}:${rowId}:${columnName}` },
        { text: '🔄 Reset All', callback_data: `reset_all:${viewId}:${rowId}:${columnName}` }
      ]);
      keyboard.push([{ text: '◀️ Back', callback_data: 'back' }]);

      await editTelegramMessage(botToken, chatId, callback.message.message_id, itemsText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      await answerCallbackQuery(botToken, callbackId, 'Checklist loaded');
    } 
    else if (parts[0] === 'toggle') {
      const [, viewId, rowId, columnName, itemIndexStr] = parts;
      const itemIndex = parseInt(itemIndexStr);

      const { data: customData } = await supabaseClient
        .from('composite_view_custom_data')
        .select('*')
        .eq('composite_view_id', viewId)
        .eq('row_identifier', rowId)
        .eq('column_name', columnName)
        .maybeSingle();

      const items = customData?.data?.items || [];
      if (items[itemIndex]) {
        items[itemIndex].completed = !items[itemIndex].completed;
        items[itemIndex].completed_at = items[itemIndex].completed ? new Date().toISOString() : null;

        await supabaseClient
          .from('composite_view_custom_data')
          .update({ data: { items }, updated_at: new Date().toISOString() })
          .eq('id', customData.id);

        let itemsText = `📝 *Checklist Items:*\n\n`;
        const keyboard: any[] = [];

        items.forEach((item: any, index: number) => {
          const checkbox = item.completed ? '✅' : '⬜';
          itemsText += `${index + 1}. ${checkbox} ${item.text}\n`;
          
          keyboard.push([{
            text: item.completed ? `✅ ${item.text}` : `⬜ ${item.text}`,
            callback_data: `toggle:${viewId}:${rowId}:${columnName}:${index}`
          }]);
        });

        keyboard.push([
          { text: '✅ Complete All', callback_data: `complete_all:${viewId}:${rowId}:${columnName}` },
          { text: '🔄 Reset All', callback_data: `reset_all:${viewId}:${rowId}:${columnName}` }
        ]);
        keyboard.push([{ text: '◀️ Back', callback_data: 'back' }]);

        await editTelegramMessage(botToken, chatId, callback.message.message_id, itemsText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
        await answerCallbackQuery(botToken, callbackId, items[itemIndex].completed ? 'Completed ✅' : 'Uncompleted ⬜');
      }
    }
    else if (parts[0] === 'complete_all' || parts[0] === 'reset_all') {
      const [, viewId, rowId, columnName] = parts;
      const isComplete = parts[0] === 'complete_all';

      const { data: customData } = await supabaseClient
        .from('composite_view_custom_data')
        .select('*')
        .eq('composite_view_id', viewId)
        .eq('row_identifier', rowId)
        .eq('column_name', columnName)
        .maybeSingle();

      const items = customData?.data?.items || [];
      items.forEach((item: any) => {
        item.completed = isComplete;
        item.completed_at = isComplete ? new Date().toISOString() : null;
      });

      await supabaseClient
        .from('composite_view_custom_data')
        .update({ data: { items }, updated_at: new Date().toISOString() })
        .eq('id', customData.id);

      await answerCallbackQuery(botToken, callbackId, isComplete ? 'All completed! ✅' : 'All reset! 🔄');
      await sendTelegramMessage(botToken, chatId, isComplete ? '✅ All items completed!' : '🔄 All items reset!');
    }
    else if (parts[0] === 'back') {
      await answerCallbackQuery(botToken, callbackId, 'Going back...');
      await sendTelegramMessage(botToken, chatId, '◀️ Use /checklist to view checklists');
    }
  } catch (error) {
    console.error('Callback error:', error);
    await answerCallbackQuery(botToken, callbackId, 'Error occurred');
  }
}

async function answerCallbackQuery(botToken: string, callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text })
  });
}

async function editTelegramMessage(botToken: string, chatId: number, messageId: number, text: string, options?: any) {
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      ...options
    })
  });
}
