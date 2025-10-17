# ⚡ Quick Vercel Deployment Fix

## Current Error:
```
Environment Variable "VITE_SUPABASE_URL" references Secret "supabase_url", which does not exist.
```

## Your Supabase Client Code:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)
```

This code expects these 2 environment variables to be set.

---

## ✅ SOLUTION (5 minutes)

### Step 1: Get Your Supabase Credentials

Based on your project, your Supabase URL should be:
```
https://uzcmaxfskqnwkjtwklqx.supabase.co
```

To get your Anon Key:
1. Go to: https://supabase.com/dashboard/project/uzcmaxfskqnwkjtwklqx
2. Click **Settings** (gear icon in sidebar)
3. Click **API**
4. Copy the **anon/public** key

### Step 2: Add to Vercel (Choose ONE method)

#### Method A: Via Vercel Dashboard (Easiest)

1. Go to: https://vercel.com/dashboard
2. Select your project: **data-parse-desk**
3. Go to: **Settings** → **Environment Variables**
4. Add these 2 variables:

```
Name: VITE_SUPABASE_URL
Value: https://uzcmaxfskqnwkjtwklqx.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development
```

```
Name: VITE_SUPABASE_ANON_KEY
Value: [paste your anon key here]
Environments: ✅ Production ✅ Preview ✅ Development
```

5. Click **Save**

#### Method B: Via Vercel CLI

```bash
# Install CLI if needed
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Add variables
vercel env add VITE_SUPABASE_URL
# When prompted, paste: https://uzcmaxfskqnwkjtwklqx.supabase.co
# Select: Production, Preview, Development (all 3)

vercel env add VITE_SUPABASE_ANON_KEY
# When prompted, paste your anon key
# Select: Production, Preview, Development (all 3)
```

### Step 3: Trigger Redeploy

After adding the variables:

**Option 1: Via Dashboard**
- Go to **Deployments** tab
- Click **"..."** on the latest deployment
- Click **Redeploy**

**Option 2: Via CLI**
```bash
vercel --prod
```

**Option 3: Push a commit** (automatic)
```bash
git commit --allow-empty -m "trigger vercel redeploy"
git push
```

---

## ✅ Verification

After redeployment, check:

1. **Build logs** - Should show no errors
2. **Deployment URL** - App should load
3. **Browser console** - No Supabase connection errors

```bash
# Check deployment status
gh pr checks

# Or via Vercel CLI
vercel logs
```

---

## 🔥 Quick Reference

**Your Supabase Project:**
- URL: `https://uzcmaxfskqnwkjtwklqx.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/uzcmaxfskqnwkjtwklqx

**Required Env Vars (Minimum):**
```env
VITE_SUPABASE_URL=https://uzcmaxfskqnwkjtwklqx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... [your key]
```

**Optional (for full features):**
- Firebase vars (push notifications)
- Sentry DSN (error tracking)

---

## 🚨 Common Mistakes

❌ **Don't do this:**
- Adding secrets with `@` symbol in vercel.json (we already removed this)
- Forgetting to select all 3 environments
- Adding quotes around values in Vercel Dashboard

✅ **Do this:**
- Paste values directly (no quotes)
- Select all environments
- Use the Vercel Dashboard (easiest)

---

## 📞 Need Help?

If still failing:
1. Check variable names are **exact** (case-sensitive)
2. Verify Supabase project is active
3. Check browser console for specific errors
4. Try clearing Vercel build cache

---

**Time to fix:** ~5 minutes
**After fix:** Vercel will automatically rebuild and deploy! 🚀