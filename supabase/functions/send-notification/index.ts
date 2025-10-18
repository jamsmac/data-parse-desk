import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  type: 'comment' | 'mention' | 'report' | 'member_added';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const notification: NotificationRequest = await req.json();
    console.log('Sending notification:', notification);

    // Get user notification preferences
    const { data: prefs } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .single();

    if (!prefs) {
      console.log('No notification preferences found for user');
      return new Response(
        JSON.stringify({ success: false, reason: 'No preferences found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: any[] = [];

    // Send Telegram notification if enabled
    if (prefs.telegram_enabled) {
      const { data: telegramAccount } = await supabaseClient
        .from('telegram_accounts')
        .select('telegram_id')
        .eq('user_id', notification.user_id)
        .eq('is_active', true)
        .single();

      if (telegramAccount) {
        const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (BOT_TOKEN) {
          const telegramMessage = `🔔 *${notification.title}*\n\n${notification.message}`;
          
          const telegramResponse = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegramAccount.telegram_id,
                text: telegramMessage,
                parse_mode: 'Markdown',
              }),
            }
          );

          const telegramResult = await telegramResponse.json();
          results.push({ channel: 'telegram', success: telegramResult.ok });
        }
      }
    }

    // Email notification (placeholder - would need email service configured)
    if (prefs.email_enabled) {
      // TODO: Implement email sending via Resend or similar
      console.log('Email notifications not yet implemented');
      results.push({ channel: 'email', success: false, reason: 'Not implemented' });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});