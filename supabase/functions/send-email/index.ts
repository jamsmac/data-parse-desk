import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    contentType?: string;
  }>;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate Resend API key
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Parse request body
    const emailRequest: EmailRequest = await req.json();

    // Validate required fields
    if (!emailRequest.to || !emailRequest.subject) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: to, subject',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!emailRequest.html && !emailRequest.text) {
      return new Response(
        JSON.stringify({
          error: 'Either html or text content is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Default from address
    const fromAddress = emailRequest.from || 'VHData <noreply@vhdata.app>';

    // Prepare Resend request
    const resendPayload: Record<string, unknown> = {
      from: fromAddress,
      to: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
      subject: emailRequest.subject,
    };

    if (emailRequest.html) {
      resendPayload.html = emailRequest.html;
    }

    if (emailRequest.text) {
      resendPayload.text = emailRequest.text;
    }

    if (emailRequest.cc) {
      resendPayload.cc = Array.isArray(emailRequest.cc) ? emailRequest.cc : [emailRequest.cc];
    }

    if (emailRequest.bcc) {
      resendPayload.bcc = Array.isArray(emailRequest.bcc) ? emailRequest.bcc : [emailRequest.bcc];
    }

    if (emailRequest.replyTo) {
      resendPayload.reply_to = emailRequest.replyTo;
    }

    if (emailRequest.attachments && emailRequest.attachments.length > 0) {
      resendPayload.attachments = emailRequest.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType || 'application/octet-stream',
      }));
    }

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
          error: 'Failed to send email',
          details: errorData,
        }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const resendData: ResendResponse = await resendResponse.json();

    // Log to audit_log if userId is provided
    if (emailRequest.userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        await supabase.from('audit_log').insert({
          user_id: emailRequest.userId,
          action: 'email_sent',
          entity_type: 'email',
          entity_id: resendData.id,
          new_values: {
            to: emailRequest.to,
            subject: emailRequest.subject,
            resend_id: resendData.id,
            metadata: emailRequest.metadata,
          },
        });
      } catch (logError) {
        console.error('Failed to log email send to audit_log:', logError);
        // Don't fail the request if logging fails
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendData.id,
        message: 'Email sent successfully',
        data: resendData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-email function:', error);

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
