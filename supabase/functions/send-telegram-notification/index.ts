// Send Telegram Notification Edge Function
// Sends notifications to subscribed Telegram chats

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

interface NotificationPayload {
  projectId: string;
  databaseId?: string;
  eventType: 'data_change' | 'comment' | 'mention' | 'insight' | 'custom';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  urgent?: boolean;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload: NotificationPayload = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active Telegram chats for this project
    const { data: chats, error: chatsError } = await supabase.rpc(
      'get_project_telegram_chats',
      { p_project_id: payload.projectId }
    );

    if (chatsError || !chats || chats.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, error: 'No active chats' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    for (const chat of chats) {
      try {
        // Check if chat is subscribed to this event type
        const subscribedEvents = chat.subscribed_events || [];
        if (
          !subscribedEvents.includes('all') &&
          !subscribedEvents.includes(payload.eventType)
        ) {
          continue;
        }

        // Check rate limit
        const { data: canSend } = await supabase.rpc(
          'check_telegram_rate_limit',
          {
            p_bot_id: chat.bot_id,
            p_chat_id: chat.chat_id,
          }
        );

        if (!canSend) {
          results.push({
            chat_id: chat.chat_id,
            status: 'rate_limited',
          });
          continue;
        }

        // Format message
        const icon = getEventIcon(payload.eventType, payload.urgent);
        const formattedMessage = `${icon} *${payload.title}*\n\n${payload.message}`;

        // Send message
        const response = await fetch(
          `${TELEGRAM_API_URL}${chat.bot_token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chat.chat_id,
              text: formattedMessage,
              parse_mode: 'Markdown',
              disable_web_page_preview: true,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          
          // Log successful message
          await supabase.rpc('log_telegram_message', {
            p_bot_id: chat.bot_id,
            p_chat_id: chat.chat_id,
            p_message_type: 'notification',
            p_direction: 'outgoing',
            p_text_content: formattedMessage,
            p_payload: { ...payload, telegram_response: result },
            p_project_id: payload.projectId,
            p_status: 'sent',
          });

          results.push({
            chat_id: chat.chat_id,
            status: 'sent',
            message_id: result.result.message_id,
          });
        } else {
          const error = await response.text();
          
          // Log failed message
          await supabase.rpc('log_telegram_message', {
            p_bot_id: chat.bot_id,
            p_chat_id: chat.chat_id,
            p_message_type: 'notification',
            p_direction: 'outgoing',
            p_text_content: formattedMessage,
            p_payload: { ...payload, error },
            p_project_id: payload.projectId,
            p_status: 'failed',
          });

          results.push({
            chat_id: chat.chat_id,
            status: 'failed',
            error,
          });
        }
      } catch (error) {
        results.push({
          chat_id: chat.chat_id,
          status: 'error',
          error: error.message,
        });
      }
    }

    const sent = results.filter((r) => r.status === 'sent').length;

    return new Response(
      JSON.stringify({
        sent,
        total: chats.length,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

function getEventIcon(
  eventType: NotificationPayload['eventType'],
  urgent?: boolean
): string {
  if (urgent) return '🚨';
  
  switch (eventType) {
    case 'data_change':
      return '📝';
    case 'comment':
      return '💬';
    case 'mention':
      return '👤';
    case 'insight':
      return '💡';
    default:
      return '📢';
  }
}
