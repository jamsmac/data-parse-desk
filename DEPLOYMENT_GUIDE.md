# 🚀 DEPLOYMENT GUIDE - VHData Platform

## 📋 Pre-Deployment Checklist

### ✅ Completed
- [x] Security vulnerabilities fixed (0 vulnerabilities)
- [x] Version updated to 1.0.0-rc.1
- [x] Console.log statements removed
- [x] TypeScript any types fixed
- [x] Build successful

### 🔄 In Progress
- [ ] Pull Request created
- [ ] Code review
- [ ] Staging deployment
- [ ] QA testing
- [ ] Performance testing

---

## 🌐 Vercel Deployment (Recommended)

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy to Staging
```bash
# Deploy to preview/staging
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project name? vhdata-platform-staging
# - Which directory is your code in? ./
# - Want to override settings? No
```

### Step 4: Set Environment Variables
```bash
# Add each environment variable
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
vercel env add VITE_FIREBASE_MEASUREMENT_ID
vercel env add VITE_FIREBASE_VAPID_KEY
```

### Step 5: Deploy to Production
```bash
# After testing on staging
vercel --prod
```

---

## 🔷 Netlify Deployment (Alternative)

### Step 1: Install Netlify CLI
```bash
npm i -g netlify-cli
```

### Step 2: Login to Netlify
```bash
netlify login
```

### Step 3: Initialize & Deploy
```bash
# Initialize new site
netlify init

# Deploy to preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Netlify Configuration
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## 🐳 Docker Deployment (Self-Hosted)

### Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf
```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Build & Run
```bash
# Build Docker image
docker build -t vhdata-platform:1.0.0-rc.1 .

# Run container
docker run -d -p 80:80 --name vhdata vhdata-platform:1.0.0-rc.1
```

---

## 🔍 Post-Deployment Testing

### 1. Smoke Tests
- [ ] Application loads
- [ ] Login works
- [ ] Database creation works
- [ ] File upload works
- [ ] Basic CRUD operations

### 2. Integration Tests
- [ ] Supabase connection
- [ ] Firebase notifications
- [ ] Email sending
- [ ] File parsing
- [ ] Formula engine

### 3. Performance Tests
```bash
# Lighthouse audit
lighthouse https://your-staging-url.vercel.app --output html --output-path ./lighthouse-report.html

# Bundle analysis
npm run build -- --minify terser --sourcemap
npx vite-bundle-visualizer
```

### 4. Security Tests
- [ ] Check CSP headers
- [ ] Test authentication
- [ ] Verify RLS policies
- [ ] Check for exposed secrets
- [ ] SSL certificate valid

---

## 📊 Monitoring Setup

### 1. Sentry (Error Tracking)
```javascript
// Already configured in src/lib/sentry.ts
// Just need to set VITE_SENTRY_DSN
```

### 2. Google Analytics
```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
```

### 3. Uptime Monitoring
- Use Vercel Analytics (built-in)
- Or setup UptimeRobot/Pingdom

---

## 🚨 Rollback Plan

### Vercel Rollback
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Manual Rollback
```bash
# Checkout previous version
git checkout [previous-commit-hash]

# Force deploy
vercel --prod --force
```

---

## 📱 Progressive Web App

### Enable PWA
1. Uncomment PWA plugin in `vite.config.ts`
2. Configure `manifest.json`
3. Test offline functionality

---

## 🔐 Environment Variables

### Required for Staging/Production
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Firebase (Push Notifications)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_VAPID_KEY=your-vapid-key

# Sentry (Optional but recommended)
VITE_SENTRY_DSN=https://your-key@sentry.io/project-id
VITE_ENVIRONMENT=staging
VITE_APP_VERSION=1.0.0-rc.1
```

---

## 📈 Success Metrics

### Target Metrics for Production
- **Lighthouse Score:** > 90
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.5s
- **Bundle Size:** < 500KB (main chunk)
- **Error Rate:** < 0.1%
- **Uptime:** > 99.9%

---

## 🎯 Deployment Stages

### Stage 1: Staging (Current)
- Deploy to staging URL
- Internal QA testing
- Performance optimization
- Bug fixes

### Stage 2: Beta (Next Week)
- Deploy to beta subdomain
- Limited user access (5-10 users)
- Collect feedback
- Monitor metrics

### Stage 3: Production (2 Weeks)
- Gradual rollout (5% → 25% → 50% → 100%)
- Monitor error rates
- A/B testing
- Full launch

---

## 📞 Support Contacts

- **DevOps Lead:** [your-email]
- **On-Call Engineer:** [phone-number]
- **Slack Channel:** #vhdata-deploy
- **Incident Response:** [procedure-link]

---

**Last Updated:** October 17, 2025
**Version:** 1.0.0-rc.1
**Status:** Ready for Staging