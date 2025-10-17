# Firebase Push Notifications Setup Guide

## Firebase Project Information
- **Project Name**: VHData Platform
- **Project ID**: vhdata-platform
- **Project Number**: 643537450221
- **Sender ID**: 643537450221
- **App ID**: 1:643537450221:web:e9dc337c7d5f97400188e4

## Setup Steps

### 1. Firebase Console Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **vhdata-platform**
3. Navigate to **Project Settings** → **General**

### 2. Get Required Credentials

You need to obtain the following from Firebase Console:

#### A. API Key
- In Project Settings → General → Your apps → Web app
- Look for `apiKey` field

#### B. App ID
- In Project Settings → General → Your apps → Web app
- Look for `appId` field

#### C. VAPID Key (for Web Push)
- Go to Project Settings → Cloud Messaging
- Scroll to "Web configuration" section
- Under "Web Push certificates", generate a new key pair
- Copy the "Key pair" value (this is your VAPID key)

### 3. Create Environment File

Create a `.env.local` file in your project root with the following content:

```env
# Supabase Configuration (existing)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase Configuration (new)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=vhdata-platform.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vhdata-platform
VITE_FIREBASE_STORAGE_BUCKET=vhdata-platform.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=643537450221
VITE_FIREBASE_APP_ID=1:643537450221:web:e9dc337c7d5f97400188e4
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX  # Optional
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### 4. Update Service Worker

Edit `public/firebase-messaging-sw.js` and replace:
- `"your-api-key"` with your actual API Key
- `"your-app-id"` with your actual App ID

### 5. Enable Cloud Messaging in Firebase

1. In Firebase Console, go to **Cloud Messaging**
2. Make sure it's enabled for your project
3. Note: Web push notifications require HTTPS in production

### 6. Run Database Migration

Execute the Supabase migration to create notification tables:

```bash
# If using Supabase CLI
supabase db push

# Or apply directly in Supabase Dashboard
# SQL Editor → New Query → Paste migration content → Run
```

The migration file is located at:
`supabase/migrations/20251018000002_add_push_notifications.sql`

### 7. Test the Implementation

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to Settings → Security → Push tab

3. Click "Enable push notifications"

4. Grant browser permission when prompted

5. Use "Send test notification" button to verify

## Troubleshooting

### Common Issues

1. **"Notifications not supported"**
   - Ensure you're using a supported browser (Chrome, Firefox, Edge, Safari)
   - Check that you're on HTTPS (or localhost for development)

2. **"Permission denied"**
   - User has blocked notifications in browser
   - Check browser settings → Site settings → Notifications

3. **Token generation fails**
   - Verify Firebase configuration is correct
   - Check VAPID key is properly set
   - Ensure Firebase project has Cloud Messaging enabled

4. **Service Worker not registering**
   - Check that `firebase-messaging-sw.js` is in the `public` folder
   - Verify it's accessible at `/firebase-messaging-sw.js`
   - Clear browser cache and reload

### Browser Support

Push notifications are supported in:
- ✅ Chrome/Chromium (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (macOS 10.14+, iOS 16.4+)
- ✅ Edge (Desktop)
- ❌ Opera Mini
- ❌ UC Browser

### Security Notes

1. **Keep credentials secure**:
   - Never commit `.env.local` file
   - Use environment variables in production
   - Rotate API keys regularly

2. **HTTPS Required**:
   - Push notifications only work on HTTPS in production
   - localhost is allowed for development

3. **User Privacy**:
   - Always request permission before enabling notifications
   - Provide clear opt-out options
   - Store minimal user data

## Production Deployment

For production deployment:

1. Set environment variables in your hosting platform
2. Ensure HTTPS is configured
3. Update CSP headers to allow Firebase domains
4. Monitor notification delivery rates in Firebase Console
5. Implement cleanup for old/inactive tokens

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Best Practices](https://web.dev/push-notifications-overview/)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)