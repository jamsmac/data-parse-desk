/**
 * Push Notifications Utility
 * Handles Web Push Notifications for PWA
 */

import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Check if Push Notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if notification permission is granted
 */
export function hasNotificationPermission(): boolean {
  return Notification.permission === 'granted';
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  const permission = await Notification.requestPermission();
  console.log('[PushNotifications] Permission:', permission);
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    console.error('[PushNotifications] Push not supported');
    return null;
  }

  try {
    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('[PushNotifications] Permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // Create new subscription if none exists
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log('[PushNotifications] New subscription created');
    }

    // Convert subscription to our format
    const subscriptionData: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    };

    // Save subscription to database
    await savePushSubscription(subscriptionData);

    return subscriptionData;
  } catch (error) {
    console.error('[PushNotifications] Subscription error:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await deletePushSubscription(subscription.endpoint);
      console.log('[PushNotifications] Unsubscribed successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PushNotifications] Unsubscribe error:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[PushNotifications] Get subscription error:', error);
    return null;
  }
}

/**
 * Save push subscription to database
 */
async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: session.session.user.id,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    console.log('[PushNotifications] Subscription saved to database');
  } catch (error) {
    console.error('[PushNotifications] Save subscription error:', error);
    throw error;
  }
}

/**
 * Delete push subscription from database
 */
async function deletePushSubscription(endpoint: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) throw error;

    console.log('[PushNotifications] Subscription deleted from database');
  } catch (error) {
    console.error('[PushNotifications] Delete subscription error:', error);
    throw error;
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<void> {
  if (!hasNotificationPermission()) {
    throw new Error('Notification permission not granted');
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification('Test Notification', {
    body: 'This is a test notification from Data Parse Desk',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'test',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' },
    ],
  });

  console.log('[PushNotifications] Test notification sent');
}

/**
 * Setup periodic background sync
 */
export async function setupPeriodicBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.log('[PushNotifications] Periodic sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as any,
    });

    if (status.state === 'granted') {
      await (registration as any).periodicSync.register('sync-data', {
        minInterval: 24 * 60 * 60 * 1000, // 24 hours
      });
      console.log('[PushNotifications] Periodic sync registered');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PushNotifications] Periodic sync error:', error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert URL-safe base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}
