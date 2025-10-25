import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';


interface WebhookTriggerRequest {
  event_type: string;
  payload: Record<string, any>;
  user_id?: string;
  project_id?: string;
}

interface Webhook {
  id: string;
  url: string;
  secret_key?: string;
  retry_enabled: boolean;
  max_retries: number;
  timeout_ms: number;
  headers: Record<string, string>;
}

function generateSignature(payload: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  return hmac.digest("hex");
}

async function executeWebhook(
  webhook: Webhook,
  eventType: string,
  payload: any,
  supabase: any,
  retryCount = 0
): Promise<void> {
  const startTime = Date.now();
  const payloadString = JSON.stringify(payload);

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'DataParseDesk-Webhook/1.0',
      'X-Webhook-Event': eventType,
      'X-Webhook-ID': webhook.id,
      'X-Webhook-Delivery': crypto.randomUUID(),
      ...webhook.headers,
    };

    // Add signature if secret key is present
    if (webhook.secret_key) {
      const signature = generateSignature(payloadString, webhook.secret_key);
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    // Make the webhook request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeout_ms);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();

    // Log the webhook execution
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      request_payload: payload,
      response_status: response.status,
      response_body: responseBody.substring(0, 1000), // Limit to 1000 chars
      response_time_ms: responseTime,
      retry_count: retryCount,
      success: response.ok,
    });

    // Update last triggered timestamp
    await supabase
      .from('webhooks')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', webhook.id);

    // Retry on failure if enabled
    if (!response.ok && webhook.retry_enabled && retryCount < webhook.max_retries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWebhook(webhook, eventType, payload, supabase, retryCount + 1);
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log the error
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      request_payload: payload,
      response_time_ms: responseTime,
      error_message: errorMessage,
      retry_count: retryCount,
      success: false,
    });

    // Retry on error if enabled
    if (webhook.retry_enabled && retryCount < webhook.max_retries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWebhook(webhook, eventType, payload, supabase, retryCount + 1);
    }

    console.error(`Webhook ${webhook.id} failed:`, errorMessage);
  }
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

    const request: WebhookTriggerRequest = await req.json();
    console.log('Triggering webhooks for event:', request.event_type);

    // Build query to find matching webhooks
    let query = supabaseClient
      .from('webhooks')
      .select('*')
      .eq('is_active', true)
      .contains('events', [request.event_type]);

    // Filter by user_id if provided
    if (request.user_id) {
      query = query.eq('user_id', request.user_id);
    }

    // Filter by project_id if provided
    if (request.project_id) {
      query = query.eq('project_id', request.project_id);
    }

    const { data: webhooks, error } = await query;

    if (error) throw error;

    if (!webhooks || webhooks.length === 0) {
      console.log('No active webhooks found for this event');
      return new Response(
        JSON.stringify({ success: true, triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${webhooks.length} webhook(s) to trigger`);

    // Trigger all matching webhooks in parallel
    const promises = webhooks.map(webhook =>
      executeWebhook(
        webhook as Webhook,
        request.event_type,
        {
          ...request.payload,
          timestamp: new Date().toISOString(),
          event: request.event_type,
        },
        supabaseClient
      )
    );

    await Promise.allSettled(promises);

    return new Response(
      JSON.stringify({ success: true, triggered: webhooks.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook trigger error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
