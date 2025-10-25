import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getEmailTemplate } from './email-templates.ts';
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';


interface NotificationRequest {
  user_id: string;
  type: 'comment' | 'mention' | 'report' | 'member_added';
  title: string;
  message: string;
  metadata?: Record<string, any>;
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

    // Email notification via Resend
    if (prefs.email_enabled) {
      try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        if (!RESEND_API_KEY) {
          console.log('Resend API key not configured');
          results.push({ channel: 'email', success: false, reason: 'API key not configured' });
        } else {
          // Get user email
          const { data: userData } = await supabaseClient.auth.admin.getUserById(notification.user_id);

          if (!userData?.user?.email) {
            console.log('User email not found');
            results.push({ channel: 'email', success: false, reason: 'Email not found' });
          } else {
            // Get user name
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('full_name')
              .eq('id', notification.user_id)
              .single();

            const userName = profile?.full_name || userData.user.email.split('@')[0];

            // Generate HTML email from template
            const htmlContent = getEmailTemplate(notification.type, {
              userName,
              title: notification.title,
              message: notification.message,
              actionUrl: notification.metadata?.actionUrl,
              actionText: notification.metadata?.actionText,
              metadata: {
                ...notification.metadata,
                unsubscribeUrl: `${Deno.env.get('SUPABASE_URL')}/settings?tab=notifications`,
              },
            });

            // Send email via Resend API
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Data Parse Desk <notifications@dataparsedesk.com>',
                to: [userData.user.email],
                subject: notification.title,
                html: htmlContent,
              }),
            });

            const emailResult = await emailResponse.json();

            if (emailResponse.ok) {
              console.log('Email sent successfully:', emailResult);
              results.push({ channel: 'email', success: true, id: emailResult.id });
            } else {
              console.error('Email send failed:', emailResult);
              results.push({ channel: 'email', success: false, error: emailResult.message });
            }
          }
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        results.push({
          channel: 'email',
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      }
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