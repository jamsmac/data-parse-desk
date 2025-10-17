/**
 * Supabase Edge Function for sending push notifications
 * Uses Firebase Admin SDK with service account credentials
 *
 * IMPORTANT: Service account credentials should be stored in Supabase Vault
 * or environment variables, NEVER in code!
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import * as admin from 'https://esm.sh/firebase-admin@11.11.0';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Firebase Admin
// Service account should be stored securely in environment variables
const firebaseServiceAccount = {
  type: 'service_account',
  project_id: Deno.env.get('FIREBASE_PROJECT_ID'),
  private_key_id: Deno.env.get('FIREBASE_PRIVATE_KEY_ID'),
  private_key: Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
  client_email: Deno.env.get('FIREBASE_CLIENT_EMAIL'),
  client_id: Deno.env.get('FIREBASE_CLIENT_ID'),
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: Deno.env.get('FIREBASE_CLIENT_CERT_URL')
};

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseServiceAccount),
    projectId: Deno.env.get('FIREBASE_PROJECT_ID')
  });
}

const messaging = admin.messaging();

interface NotificationRequest {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
}

serve(async (req) => {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: NotificationRequest = await req.json();

    if (!payload.userId || !payload.title || !payload.type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_notification_preferences')
      .select('preferences')
      .eq('user_id', payload.userId)
      .single();

    if (prefError || !preferences?.preferences?.enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Notifications disabled for user'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if notification type is enabled
    const typeMap: Record<string, string> = {
      'database_cloned': 'databaseCloned',
      'import_completed': 'importCompleted',
      'import_failed': 'importFailed',
      'export_completed': 'exportCompleted',
      'relation_created': 'relationCreated',
      'quota_warning': 'quotaWarning',
      'system_update': 'systemUpdate',
      'collaboration_invite': 'collaborationInvite'
    };

    const prefKey = typeMap[payload.type];
    if (prefKey && preferences.preferences[prefKey] === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Notification type ${payload.type} is disabled`
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's FCM tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_fcm_tokens')
      .select('token')
      .eq('user_id', payload.userId)
      .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No FCM tokens found for user'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification message
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl
      },
      data: {
        type: payload.type,
        ...payload.data
      },
      webpush: {
        fcmOptions: {
          link: payload.actionUrl || `${Deno.env.get('APP_URL')}/dashboard`
        },
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          requireInteraction: false,
          tag: payload.type,
          vibrate: [200, 100, 200]
        }
      },
      tokens: tokens.map(t => t.token)
    };

    // Send notification via FCM
    const response = await messaging.sendMulticast(message);

    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx].token);
          console.error('Failed to send to token:', resp.error);

          // Remove invalid tokens
          if (resp.error?.code === 'messaging/registration-token-not-registered' ||
              resp.error?.code === 'messaging/invalid-registration-token') {
            supabase
              .from('user_fcm_tokens')
              .delete()
              .eq('token', tokens[idx].token)
              .then(() => console.log('Removed invalid token'));
          }
        }
      });
    }

    // Save to notification history
    const { error: historyError } = await supabase
      .from('notification_history')
      .insert({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        status: response.successCount > 0 ? 'sent' : 'failed'
      });

    if (historyError) {
      console.error('Failed to save notification history:', historyError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        message: `Notification sent to ${response.successCount} devices`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        success: false
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});