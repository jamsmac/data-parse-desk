# 🔧 Vercel Environment Variables Setup

## ⚠️ Vercel Deployment Error Fix

**Error:** `Environment Variable "VITE_SUPABASE_URL" references Secret "supabase_url", which does not exist.`

**Solution:** Environment variables must be added through Vercel Dashboard, not in `vercel.json`.

## Quick Fix Steps:

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to your Vercel project**
   - https://vercel.com/dashboard
   - Select your project: `data-parse-desk`

2. **Navigate to Settings → Environment Variables**
   - Click on "Settings" tab
   - Select "Environment Variables" from the sidebar

3. **Add Required Variables:**

```env
# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://uzcmaxfskqnwkjtwklqx.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key-from-supabase]

# Firebase (REQUIRED for push notifications)
VITE_FIREBASE_API_KEY=[your-firebase-api-key]
VITE_FIREBASE_AUTH_DOMAIN=[your-project].firebaseapp.com
VITE_FIREBASE_PROJECT_ID=[your-project-id]
VITE_FIREBASE_STORAGE_BUCKET=[your-project].appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=[your-sender-id]
VITE_FIREBASE_APP_ID=[your-app-id]
VITE_FIREBASE_MEASUREMENT_ID=G-[your-measurement-id]
VITE_FIREBASE_VAPID_KEY=[your-vapid-key]

# Optional but recommended
VITE_ENVIRONMENT=staging
VITE_APP_VERSION=1.0.0-rc.1
```

4. **Select environments:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Click "Save"**

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to project
vercel link

# Add environment variables one by one
vercel env add VITE_SUPABASE_URL
# Paste value when prompted

vercel env add VITE_SUPABASE_ANON_KEY
# Paste value when prompted

# Repeat for all variables...
```

### Option 3: Via .env.production.local file

Create `.env.production.local` in your project root:

```env
VITE_SUPABASE_URL=https://uzcmaxfskqnwkjtwklqx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123
VITE_FIREBASE_VAPID_KEY=BKag...
```

Then push to trigger rebuild.

## Getting the Values:

### Supabase Values:
1. Go to https://supabase.com/dashboard/project/uzcmaxfskqnwkjtwklqx
2. Click on "Settings" → "API"
3. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - Anon/Public Key → `VITE_SUPABASE_ANON_KEY`

### Firebase Values:
1. Go to https://console.firebase.google.com/
2. Select your project
3. Click on "Project Settings" (gear icon)
4. Under "General" tab, find your web app
5. Copy all config values
6. For VAPID key: Go to "Cloud Messaging" tab → "Web configuration"

## Trigger Rebuild:

After adding environment variables:

```bash
# Option 1: Push a commit
git commit --allow-empty -m "trigger vercel rebuild"
git push

# Option 2: Via Vercel Dashboard
# Go to Deployments → Click "..." on latest → Redeploy

# Option 3: Via CLI
vercel --prod
```

## Verify Deployment:

1. Check deployment logs:
```bash
vercel logs
```

2. Check environment variables are set:
```bash
vercel env ls
```

3. Visit deployment URL to test.

## Common Issues:

### Still failing after adding env vars?
- Make sure variables are added to all environments (Production, Preview, Development)
- Variable names must match exactly (case-sensitive)
- No quotes around values in Vercel Dashboard
- Trigger a new deployment after adding variables

### Build succeeds but app doesn't work?
- Check browser console for errors
- Verify Supabase URL is correct
- Check CORS settings in Supabase
- Ensure Firebase project is configured correctly

---

**Note:** You can use dummy/test values for staging, but production requires real credentials.