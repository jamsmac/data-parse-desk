# ⚡ Quick Deploy - 15 Minutes to Production

**Platform:** Vercel (recommended)
**Time:** 15 minutes
**Cost:** Free

---

## 🚀 Step-by-Step (15 min)

### 1️⃣ Get Supabase Credentials (3 min)

Visit your Supabase dashboard:
```
https://app.supabase.com/project/YOUR_PROJECT/settings/api
```

Copy these values:
```
Project URL: https://xxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 2️⃣ Sign up for Vercel (2 min)

1. Go to https://vercel.com/signup
2. Click "Continue with GitHub"
3. Authorize Vercel

---

### 3️⃣ Deploy Project (5 min)

**In Vercel Dashboard:**

1. Click **"Add New Project"**

2. Click **"Import Git Repository"**

3. Find and select: **`jamsmac/data-parse-desk`**

4. Configure project:
   - Framework Preset: **Vite**
   - Root Directory: **`./`**
   - Build Command: **`npm run build`** (auto-detected)
   - Output Directory: **`dist`** (auto-detected)

5. Click **"Environment Variables"** (expand)

6. Add these variables:
   ```
   Name: VITE_SUPABASE_URL
   Value: https://xxxxx.supabase.co
   ✅ Production

   Name: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ✅ Production
   ```

7. Click **"Deploy"**

8. Wait 2-3 minutes ☕

9. **🎉 DONE!** Your app is live at:
   ```
   https://data-parse-desk.vercel.app
   ```

---

### 4️⃣ Configure Supabase (3 min)

**In Supabase Dashboard:**

1. Go to: `Authentication → URL Configuration`

2. Add your Vercel URL to **Site URL**:
   ```
   https://data-parse-desk.vercel.app
   ```

3. Add to **Redirect URLs**:
   ```
   https://data-parse-desk.vercel.app/**
   ```

4. Click **Save**

---

### 5️⃣ Test Deployment (2 min)

Visit your app: `https://data-parse-desk.vercel.app`

Test:
- ✅ Site loads
- ✅ Login works
- ✅ Database CRUD works
- ✅ Charts render

---

## ✅ You're Live!

**Production URL:** `https://data-parse-desk.vercel.app`

**Next Steps:**
- [ ] Share with users
- [ ] Set up custom domain (optional)
- [ ] Configure Sentry error tracking (optional)
- [ ] Monitor with Vercel Analytics

---

## 🔧 Optional: Custom Domain (5 min)

**If you have a domain:**

1. In Vercel: **Settings → Domains**
2. Add domain: `vhdata.com`
3. Copy DNS records shown
4. Add to your DNS provider:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
5. Wait 1-5 minutes for SSL
6. **Done!** App now at: `https://vhdata.com`

---

## 🚨 Troubleshooting

### Build Failed?
Check build logs in Vercel dashboard.
Common fix: Verify `package.json` has all dependencies.

### Authentication Not Working?
1. Check Supabase URL is correct
2. Verify anon key is correct
3. Check Redirect URLs in Supabase include your Vercel domain

### Environment Variables Not Loading?
1. Must start with `VITE_`
2. Redeploy after adding variables
3. Check they're set for "Production" environment

---

## 📊 What You Get

**With Vercel Free:**
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments (on git push)
- ✅ Preview deployments (for PRs)
- ✅ 100GB bandwidth/month
- ✅ Serverless functions
- ✅ Web Analytics

**With Supabase Free:**
- ✅ 500MB PostgreSQL database
- ✅ 1GB file storage
- ✅ 50K monthly active users
- ✅ Authentication
- ✅ Real-time subscriptions

**Total Cost: $0/month** 💰

---

## 🎯 Performance Targets

After deployment, check:
- **Lighthouse Score:** 90+ ✅
- **First Contentful Paint:** <1.5s ✅
- **Time to Interactive:** <3s ✅
- **Bundle Size:** 1492KB (acceptable) ✅

---

**Questions?** Check [DEPLOYMENT_ROADMAP.md](./DEPLOYMENT_ROADMAP.md) for detailed guide.

**Ready to deploy?** Follow the 5 steps above! 🚀
