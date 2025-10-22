# Production Deployment Guide

This guide covers deploying **Data Parse Desk 2.0** to production.

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Supabase Setup](#supabase-setup)
5. [Frontend Deployment](#frontend-deployment)
6. [Edge Functions Deployment](#edge-functions-deployment)
7. [Database Migrations](#database-migrations)
8. [SSL/HTTPS Configuration](#sslhttps-configuration)
9. [Monitoring Setup](#monitoring-setup)
10. [Backup Strategy](#backup-strategy)
11. [CI/CD Pipeline](#cicd-pipeline)
12. [Post-Deployment](#post-deployment)
13. [Rollback Procedure](#rollback-procedure)
14. [Troubleshooting](#troubleshooting)

---

## Deployment Overview

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Users (Global)                        │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   CDN (Cloudflare)      │  Static Assets
        │   or Vercel Edge        │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │   React Application     │  Hosted on Vercel
        │   (Static Build)        │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │   Supabase Platform     │
        │  ┌──────────────────┐   │
        │  │   PostgreSQL     │   │  Database + RLS
        │  └──────────────────┘   │
        │  ┌──────────────────┐   │
        │  │  Edge Functions  │   │  Serverless APIs
        │  └──────────────────┘   │
        │  ┌──────────────────┐   │
        │  │   Realtime       │   │  WebSocket Server
        │  └──────────────────┘   │
        │  ┌──────────────────┐   │
        │  │   Storage        │   │  File Storage
        │  └──────────────────┘   │
        └─────────────────────────┘
```

### Hosting Options

**Recommended Stack**:
- **Frontend**: Vercel (recommended) or Netlify
- **Backend**: Supabase (managed PostgreSQL + Edge Functions)
- **CDN**: Cloudflare (optional, for additional caching)
- **Monitoring**: Sentry
- **Analytics**: Vercel Analytics or Google Analytics

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`npm run test:all`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Code reviewed and approved
- [ ] Performance benchmarks met (see PERFORMANCE_MONITORING.md)

### Security

- [ ] Environment variables secured (not in code)
- [ ] RLS policies tested and verified
- [ ] API keys rotated
- [ ] CORS configured correctly
- [ ] CSP headers configured
- [ ] Rate limiting enabled

### Documentation

- [ ] API documentation up to date
- [ ] README updated
- [ ] Migration notes prepared
- [ ] Rollback plan documented

### Infrastructure

- [ ] Domain configured
- [ ] SSL certificates ready
- [ ] Backup strategy in place
- [ ] Monitoring tools configured
- [ ] Error tracking enabled (Sentry)

---

## Environment Setup

### Production Environment Variables

Create `.env.production`:

```env
# Application
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key

# Google Gemini (AI Features)
VITE_GEMINI_API_KEY=your_production_gemini_key

# Sentry (Error Tracking)
VITE_SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=2.0.0

# Analytics (Optional)
VITE_GA_TRACKING_ID=G-XXXXXXXXXX

# Feature Flags (Optional)
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_TELEGRAM_BOT=true
```

### Vercel Environment Variables

In Vercel dashboard (Settings > Environment Variables):

1. Add all variables from `.env.production`
2. Set environment: **Production**
3. Apply to: **All branches** or **Production branch only**

**Important**: Never commit `.env.production` to Git!

---

## Supabase Setup

### 1. Create Production Project

```bash
# Create new Supabase project
# Go to https://supabase.com/dashboard
# Click "New Project"
# Select region closest to your users
# Set strong database password
```

### 2. Configure Project Settings

**Database Settings**:
- **Region**: Choose closest to target users
- **Database Password**: Strong, unique password (save in password manager)
- **Connection Pooling**: Enable (mode: Transaction)

**API Settings**:
- **JWT expiry**: 1 hour (default) or custom
- **JWT secret**: Auto-generated (don't change)

**Storage Settings**:
- **File size limit**: 50MB (adjust as needed)
- **Allowed MIME types**: Configure based on needs

### 3. Configure Authentication

```bash
# In Supabase Dashboard > Authentication > Settings
```

**Email Auth**:
- Enable Email/Password
- Configure SMTP for emails (optional: use Supabase SMTP)
- Set email templates (welcome, reset password, etc.)

**OAuth Providers** (optional):
- Google OAuth
- GitHub OAuth
- Configure redirect URLs

**Password Requirements**:
```
- Minimum length: 8 characters
- Require uppercase: true
- Require lowercase: true
- Require numbers: true
- Require symbols: false (optional)
```

### 4. Configure Storage Buckets

```sql
-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-attachments', 'item-attachments', false);

-- Create RLS policies
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'item-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'item-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 5. Database Configuration

**Connection Pooling**:
```bash
# Supabase Dashboard > Database > Connection Pooling
# Mode: Transaction
# Pool size: 15 (adjust based on load)
```

**Performance Tuning**:
```sql
-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_table_data_database_id
  ON public.table_data(database_id);

CREATE INDEX IF NOT EXISTS idx_table_data_created_at
  ON public.table_data(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_table_data_data_gin
  ON public.table_data USING gin(data);

-- Analyze tables
ANALYZE public.table_data;
ANALYZE public.databases;
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

#### Initial Setup

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Link Project**:
```bash
vercel link
```

4. **Configure Project**:
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "regions": ["iad1"],  // Choose region
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

5. **Deploy**:
```bash
# Production deployment
vercel --prod

# Preview deployment
vercel
```

#### Automatic Deployments

Connect GitHub repository in Vercel dashboard:

1. Go to Vercel dashboard
2. Import Git Repository
3. Select your repo
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

**Branch Strategy**:
- `main` → Production
- `develop` → Preview
- `feature/*` → Preview (optional)

### Option 2: Netlify

#### Deploy to Netlify

1. **Install Netlify CLI**:
```bash
npm install -g netlify-cli
```

2. **Login**:
```bash
netlify login
```

3. **Configure**:
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

4. **Deploy**:
```bash
netlify deploy --prod
```

### Option 3: Docker (Self-Hosted)

#### Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Build and Deploy

```bash
# Build Docker image
docker build -t data-parse-desk:latest .

# Run container
docker run -d -p 80:80 --name data-parse-desk data-parse-desk:latest

# Or use docker-compose
docker-compose up -d
```

---

## Edge Functions Deployment

### Deploy All Functions

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy analyze-csv-schema
```

### Configure Function Secrets

```bash
# Set Gemini API key for AI functions
supabase secrets set GEMINI_API_KEY=your_production_key

# List secrets
supabase secrets list

# Unset secret
supabase secrets unset SECRET_NAME
```

### Test Functions

```bash
# Test locally
supabase functions serve analyze-csv-schema

# Test production
curl -X POST \
  'https://your-project.supabase.co/functions/v1/analyze-csv-schema' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -F 'file=@test.csv'
```

### Monitor Functions

View logs in Supabase Dashboard:
- Go to **Edge Functions**
- Select function
- View **Invocations** tab
- Check **Logs** for errors

---

## Database Migrations

### Run Migrations in Production

**⚠️ Important**: Always backup database before running migrations!

#### Option 1: Supabase Dashboard

1. Go to **SQL Editor**
2. Create new query
3. Copy migration SQL
4. Review carefully
5. Run query

#### Option 2: Supabase CLI

```bash
# Push migrations to production
supabase db push

# Or reset database (⚠️ DESTRUCTIVE)
supabase db reset --db-url "postgresql://..."
```

#### Option 3: Migration Script

```bash
# Create migration runner script
# migrations/run-production.sh

#!/bin/bash
set -e

echo "Running production migrations..."

for file in supabase/migrations/*.sql; do
  echo "Running $file..."
  psql "$DATABASE_URL" -f "$file"
done

echo "Migrations completed!"
```

### Migration Best Practices

1. **Test on Staging First**
   ```bash
   # Test on staging database
   supabase db push --db-url "postgresql://staging..."
   ```

2. **Use Transactions**
   ```sql
   BEGIN;

   -- Your migration
   ALTER TABLE ...;
   CREATE INDEX ...;

   COMMIT;
   ```

3. **Make Migrations Reversible**
   ```sql
   -- Up migration
   ALTER TABLE users ADD COLUMN age INTEGER;

   -- Down migration (in separate file)
   ALTER TABLE users DROP COLUMN age;
   ```

4. **Add Migration Notes**
   ```sql
   -- Migration: Add age column to users
   -- Date: 2025-01-22
   -- Author: John Doe
   -- Reason: Store user age for analytics

   ALTER TABLE users ADD COLUMN age INTEGER;
   ```

---

## SSL/HTTPS Configuration

### Vercel (Automatic)

Vercel automatically provides SSL certificates for all domains.

**Custom Domain**:
1. Add domain in Vercel dashboard
2. Update DNS records (A/CNAME)
3. Wait for SSL provisioning (few minutes)

### Netlify (Automatic)

Netlify provides free SSL via Let's Encrypt.

**Custom Domain**:
1. Add domain in Netlify dashboard
2. Update DNS records
3. Enable HTTPS

### Cloudflare (Optional)

Use Cloudflare for additional features:
- DDoS protection
- WAF (Web Application Firewall)
- Caching
- Bot protection

**Setup**:
1. Add site to Cloudflare
2. Update nameservers
3. Set SSL mode: **Full (Strict)**
4. Enable HTTP/2 and HTTP/3
5. Configure caching rules

---

## Monitoring Setup

### Sentry Configuration

#### Install Sentry

```bash
npm install @sentry/react
```

#### Configure in Production

```typescript
// src/lib/monitoring.ts
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: 'production',
    release: import.meta.env.VITE_APP_VERSION,

    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
  });
}
```

#### Configure Alerts

In Sentry dashboard:

1. **Error Rate Alert**
   - Condition: Error rate > 1%
   - Action: Email + Slack

2. **Performance Alert**
   - Condition: P95 response time > 3s
   - Action: Email

3. **Budget Alert**
   - Condition: 80% of quota used
   - Action: Email

### Uptime Monitoring

Use services like:
- **UptimeRobot** (free tier available)
- **Pingdom**
- **Better Uptime**

**Configure Checks**:
```yaml
- URL: https://your-domain.com
  Interval: 5 minutes
  Timeout: 30 seconds
  Alert: Email + SMS
```

### Application Performance Monitoring

Use built-in Performance Dashboard:
- Navigate to `/performance`
- Monitor Web Vitals
- Track API performance
- Check database query times

### Log Aggregation

**Supabase Logs**:
- Edge Function logs: Supabase Dashboard
- Database logs: Dashboard > Database > Logs

**Application Logs**:
- Use Sentry for error logs
- Use Vercel Analytics for performance metrics

---

## Backup Strategy

### Database Backups

#### Automated Backups (Supabase)

Supabase Pro plan includes:
- Daily automatic backups (retained 7 days)
- Point-in-time recovery

**Enable in Dashboard**:
- Go to **Database** > **Backups**
- Enable automatic backups
- Set retention period

#### Manual Backups

```bash
# Export database
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql

# Or use Supabase CLI
supabase db dump -f backup.sql

# Compress backup
gzip backup.sql
```

#### Backup Script

```bash
#!/bin/bash
# backup-production.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

echo "Starting backup..."

# Dump database
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_FILE.gz" "s3://your-backup-bucket/"

# Keep only last 30 backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

#### Schedule Backups

```bash
# Add to crontab
crontab -e

# Run backup daily at 2 AM
0 2 * * * /path/to/backup-production.sh
```

### Storage Backups

Supabase Storage has automatic backups with Pro plan.

**Manual Storage Backup**:
```typescript
// Export all storage files
const { data: files } = await supabase
  .storage
  .from('item-attachments')
  .list();

for (const file of files) {
  const { data } = await supabase
    .storage
    .from('item-attachments')
    .download(file.name);

  // Save to backup location
}
```

### Disaster Recovery Plan

1. **Database Failure**:
   - Restore from latest backup
   - Run migrations if needed
   - Verify data integrity

2. **Storage Failure**:
   - Restore files from backup
   - Update file references in database

3. **Complete Outage**:
   - Switch to backup Supabase project
   - Update environment variables
   - Redeploy frontend

**Recovery Time Objective (RTO)**: 1 hour
**Recovery Point Objective (RPO)**: 24 hours

---

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/production.yml`:

```yaml
name: Production Deployment

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm run test

      - name: Run E2E tests
        run: |
          npx playwright install --with-deps
          npm run test:e2e

  deploy-functions:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy Edge Functions
        run: |
          npm install -g supabase
          supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Required Secrets

Add in GitHub repository settings (Settings > Secrets):

- `SUPABASE_ACCESS_TOKEN`: Supabase API token
- `VERCEL_TOKEN`: Vercel deployment token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID
- `SENTRY_AUTH_TOKEN`: Sentry auth token (for releases)

---

## Post-Deployment

### Smoke Tests

Run these tests after deployment:

1. **Authentication**
   ```bash
   curl -X POST https://your-domain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

2. **Database Access**
   - Create a test database
   - Add test rows
   - Query data
   - Delete test data

3. **Real-time Features**
   - Open two browser windows
   - Make changes in one
   - Verify updates in other

4. **File Upload**
   - Upload test file
   - Verify storage
   - Download file
   - Delete file

### Performance Verification

1. **Run Lighthouse**
   ```bash
   npm install -g @lhci/cli
   lhci autorun --collect.url=https://your-domain.com
   ```

2. **Check Web Vitals**
   - LCP < 2.5s
   - FID < 100ms
   - CLS < 0.1

3. **Load Testing**
   ```bash
   # Using k6
   k6 run --vus 10 --duration 30s load-test.js
   ```

### Update Documentation

- [ ] Update version in README
- [ ] Add deployment notes to CHANGELOG
- [ ] Update API documentation if changed
- [ ] Notify team of deployment

### Monitor First 24 Hours

1. **Check Sentry** for errors
2. **Monitor Vercel Analytics** for traffic
3. **Review Supabase logs** for database issues
4. **Check performance dashboard** for degradation
5. **Monitor user feedback** channels

---

## Rollback Procedure

### Quick Rollback (Vercel)

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback DEPLOYMENT_URL
```

### Manual Rollback

1. **Revert Code**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Revert Database** (if needed)
   ```bash
   # Restore from backup
   psql "$DATABASE_URL" < backup.sql
   ```

3. **Revert Edge Functions**
   ```bash
   # Deploy previous version
   git checkout PREVIOUS_COMMIT
   supabase functions deploy
   ```

### Rollback Decision Criteria

Rollback immediately if:
- Error rate > 5%
- Performance degradation > 50%
- Critical feature broken
- Security vulnerability introduced
- Data corruption detected

---

## Troubleshooting

### Issue: High Error Rate

**Symptoms**: Sentry showing increased errors

**Solutions**:
1. Check Sentry dashboard for error patterns
2. Review recent code changes
3. Check Supabase status page
4. Review logs for specific errors
5. Rollback if necessary

### Issue: Slow Performance

**Symptoms**: Users reporting slow load times

**Solutions**:
1. Check Performance Dashboard
2. Review database query times
3. Check Vercel Analytics
4. Optimize slow queries
5. Add database indexes
6. Enable caching

### Issue: Database Connection Errors

**Symptoms**: "Too many connections" error

**Solutions**:
1. Enable connection pooling
2. Increase pool size
3. Check for connection leaks in code
4. Restart database (last resort)

### Issue: Edge Function Timeout

**Symptoms**: Functions timing out (> 10s)

**Solutions**:
1. Optimize function code
2. Reduce external API calls
3. Implement caching
4. Split into multiple functions
5. Use async processing

### Issue: CORS Errors

**Symptoms**: Browser console showing CORS errors

**Solutions**:
1. Check Supabase CORS settings
2. Verify domain configuration
3. Add domain to allowed origins
4. Check API key configuration

---

## Security Checklist

### Before Going Live

- [ ] All secrets stored securely (not in code)
- [ ] RLS policies tested
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] CSP headers set
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] HTTPS enforced
- [ ] Authentication tokens secure
- [ ] File upload validation
- [ ] Input sanitization implemented
- [ ] Error messages don't leak info
- [ ] Database backups automated
- [ ] Monitoring alerts configured

### Regular Security Tasks

**Weekly**:
- Review Sentry errors
- Check failed login attempts
- Monitor API usage

**Monthly**:
- Update dependencies
- Review RLS policies
- Audit user permissions
- Test backup restoration

**Quarterly**:
- Security audit
- Penetration testing
- Review access logs
- Update documentation

---

## Cost Optimization

### Supabase

**Free Tier Limits**:
- 500MB database
- 1GB file storage
- 2GB bandwidth

**Optimize Costs**:
1. Use connection pooling
2. Implement caching
3. Optimize queries (reduce scans)
4. Archive old data
5. Use storage CDN

### Vercel

**Free Tier Limits**:
- 100GB bandwidth/month
- 6000 build minutes/month

**Optimize Costs**:
1. Enable caching headers
2. Optimize image sizes
3. Use CDN for static assets
4. Minimize serverless function usage

### Monitoring

Track costs in dashboards:
- Supabase: Dashboard > Billing
- Vercel: Dashboard > Usage
- Sentry: Dashboard > Usage & Billing

Set up budget alerts at 80% usage.

---

## Support & Escalation

### Issue Severity Levels

**P0 - Critical** (respond immediately):
- Complete outage
- Data loss
- Security breach

**P1 - High** (respond within 1 hour):
- Major feature broken
- High error rate
- Performance degradation > 50%

**P2 - Medium** (respond within 1 day):
- Minor feature broken
- Moderate performance issues
- Non-critical bugs

**P3 - Low** (respond within 1 week):
- UI issues
- Feature requests
- Documentation updates

### Escalation Contacts

1. **On-Call Engineer**: First responder
2. **Lead Developer**: Technical decisions
3. **DevOps**: Infrastructure issues
4. **Product Manager**: Business decisions

### External Support

- **Supabase Support**: support@supabase.io
- **Vercel Support**: vercel.com/support
- **Sentry Support**: Sentry dashboard

---

## Conclusion

This guide covers the essential steps for deploying Data Parse Desk 2.0 to production. Follow each section carefully and maintain the checklists for future deployments.

**Key Takeaways**:
- Always test before deploying
- Monitor closely after deployment
- Have a rollback plan ready
- Automate where possible
- Document everything

**Next Steps**:
1. Set up staging environment
2. Configure CI/CD pipeline
3. Run deployment dry-run
4. Deploy to production
5. Monitor and optimize

---

**Last Updated**: 2025-01-22
**Version**: 2.0
**Deployment Status**: ✅ Production Ready
