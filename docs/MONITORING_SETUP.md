# 📊 Monitoring Setup Guide - DataParseDesk 2.0

Complete guide for setting up error tracking, performance monitoring, and alerting.

---

## 🎯 Overview

DataParseDesk 2.0 uses the following monitoring stack:

1. **Sentry** - Error tracking & performance monitoring
2. **Lighthouse CI** - Performance & accessibility monitoring
3. **UptimeRobot** (optional) - Uptime monitoring
4. **Web Vitals** - Core Web Vitals tracking

---

## 🔴 SENTRY ERROR TRACKING

### Step 1: Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Sign up or log in
3. Click **"Create Project"**
4. Select **"React"** as platform
5. Name your project: `dataparsedesk-2.0`
6. Click **"Create Project"**

### Step 2: Get Your DSN

After creating the project, you'll see:

```
dsn: "https://examplePublicKey@o0.ingest.sentry.io/0"
```

Copy this DSN.

### Step 3: Configure Environment Variables

Add to `.env` (development):

```bash
VITE_SENTRY_DSN="https://your-dsn@sentry.io/your-project-id"
VITE_SENTRY_ENVIRONMENT="development"
VITE_SENTRY_SAMPLE_RATE="1.0"
VITE_APP_VERSION="1.0.0"
```

Add to `.env.production` (production):

```bash
VITE_SENTRY_DSN="https://your-dsn@sentry.io/your-project-id"
VITE_SENTRY_ENVIRONMENT="production"
VITE_SENTRY_SAMPLE_RATE="0.1"
VITE_SENTRY_REPLAY_SESSION_RATE="0.1"
VITE_SENTRY_REPLAY_ERROR_RATE="1.0"
VITE_APP_VERSION="1.0.0"
```

### Step 4: Configure GitHub Secrets

For CI/CD integration, add these secrets to GitHub:

```bash
# Go to: Settings > Secrets and variables > Actions > New repository secret

SENTRY_AUTH_TOKEN="your-auth-token"
SENTRY_ORG="your-organization-slug"
SENTRY_PROJECT="dataparsedesk-2.0"
```

**How to get Auth Token:**
1. Go to Sentry → Settings → Account → API → Auth Tokens
2. Click **"Create New Token"**
3. Name: `GitHub Actions`
4. Scopes: `project:releases`, `org:read`
5. Copy the token

### Step 5: Enable Source Maps Upload

Source maps are automatically uploaded via `@sentry/vite-plugin` in production builds.

Verify in `vite.config.ts`:

```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    // ... other plugins
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    }),
  ],
});
```

### Step 6: Test Error Tracking

**In Development:**

```typescript
// Test in browser console
window.Sentry.captureException(new Error('Test error'));
```

**In Production:**

```typescript
// Add temporary button in your app
<button onClick={() => {
  throw new Error('Test production error');
}}>
  Test Sentry
</button>
```

Click the button and verify error appears in Sentry dashboard.

### Step 7: Configure Alerts

1. Go to Sentry project → **Alerts**
2. Click **"Create Alert"**
3. Select **"Issues"**
4. Configure:
   - **When:** An issue is first seen
   - **Then:** Send notification to email/Slack
5. Add another alert:
   - **When:** An issue is seen more than 10 times in 1 hour
   - **Then:** Send notification to email/Slack/PagerDuty

### Step 8: Set Up Slack Integration (Optional)

1. Go to Sentry → Settings → Integrations
2. Search for "Slack"
3. Click **"Add to Slack"**
4. Select channel (e.g., `#alerts-production`)
5. Configure notification preferences

---

## ⚡ PERFORMANCE MONITORING

### Web Vitals Tracking

Web Vitals are automatically tracked via Sentry. To view:

1. Go to Sentry → Performance
2. Click on **"Web Vitals"**
3. See metrics: LCP, FID, CLS, FCP, TTFB

### Custom Performance Tracking

```typescript
import { startTransaction } from '@/lib/sentry';

// Track slow operations
const transaction = startTransaction('data-import', 'task');

try {
  await importData(file);
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

---

## 🚦 LIGHTHOUSE CI

### Step 1: Configure Lighthouse CI

Already configured in `.lighthouserc.json`.

### Step 2: Run Locally

```bash
npm run build
npm run preview

# In another terminal
npx lhci autorun
```

### Step 3: Integrate with CI/CD

Already configured in `.github/workflows/ci.yml`.

To see results:
1. Go to GitHub Actions
2. Click on a workflow run
3. Click on **"Lighthouse Performance"** job
4. View report artifact

### Step 4: Set Performance Budgets

Edit `.lighthouserc.json`:

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}]
      }
    }
  }
}
```

If performance degrades below thresholds, CI will fail.

---

## 📈 UPTIME MONITORING (Optional)

### UptimeRobot Setup

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up (free plan: 50 monitors)
3. Add New Monitor:
   - **Type:** HTTPS
   - **URL:** `https://your-domain.com`
   - **Name:** DataParseDesk Production
   - **Interval:** 5 minutes
4. Add Alert Contacts:
   - Email
   - Slack webhook
   - Discord webhook

### Add API Endpoint Monitors

Monitor critical endpoints:

```
https://your-domain.com/api/health
https://your-domain.com/api/v1/databases
https://uzcmaxfhfcsxzfqvaloz.supabase.co/rest/v1/
```

---

## 🔔 ALERTING STRATEGY

### Alert Levels

**🔴 CRITICAL (P0) - Immediate Action**
- Site is down (5xx errors)
- Database connection failed
- Auth service down
- Payment processing failed

**Actions:**
- Send to PagerDuty
- SMS to on-call engineer
- Slack: @channel in #incidents

**🟠 HIGH (P1) - Within 1 Hour**
- Error rate >1% (100+ errors/hour)
- Performance degradation >30%
- API response time >5s (p95)

**Actions:**
- Slack: #alerts-production
- Email to team
- Create incident ticket

**🟡 MEDIUM (P2) - Within 4 Hours**
- Error rate >0.1% (10+ errors/hour)
- New error type introduced
- Memory usage >80%

**Actions:**
- Slack: #alerts-production
- Log in issue tracker

**🟢 LOW (P3) - Within 24 Hours**
- Performance warning
- Lighthouse score drop
- Bundle size increase

**Actions:**
- Weekly summary email
- Log for investigation

### Alert Configuration Examples

**Sentry Alert Rules:**

1. **Critical Error Rate**
   ```
   When: Issue count > 100 in 1 hour
   Then: Notify @channel in #incidents + PagerDuty
   ```

2. **New Error Type**
   ```
   When: Issue is first seen
   And: Environment = production
   Then: Notify #alerts-production
   ```

3. **Performance Degradation**
   ```
   When: Transaction duration p95 > 5s
   Then: Notify #alerts-production
   ```

---

## 📊 MONITORING DASHBOARD

### Recommended Metrics to Track

**Error Metrics:**
- Total errors (last 24h, 7d, 30d)
- Error rate (errors per session)
- Unique affected users
- Top 10 errors by frequency

**Performance Metrics:**
- Response time (p50, p95, p99)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Time to First Byte (TTFB)

**Business Metrics:**
- Active users (DAU, MAU)
- API usage by endpoint
- Feature adoption rates
- Conversion funnel

### Create Custom Dashboard

**In Sentry:**
1. Go to Dashboards → Create Dashboard
2. Add widgets:
   - Error rate over time
   - Performance metrics
   - Top errors
   - Affected users

**Sample Dashboard Layout:**

```
┌─────────────────────────────────────────────────────┐
│ Error Rate (24h)  │ Response Time (p95) │ Active Users│
├─────────────────────────────────────────────────────┤
│            Error Rate Trend (7 days)                │
├─────────────────────────────────────────────────────┤
│ Top Errors by Frequency │ Performance by Page       │
├─────────────────────────────────────────────────────┤
│        Web Vitals (LCP, FID, CLS, TTFB)            │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 DEBUGGING WITH SENTRY

### Using Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/sentry';

// Log user actions
addBreadcrumb('User clicked export button', 'user-action', {
  databaseId: '123',
  format: 'csv',
});

// Log API calls
addBreadcrumb('API call: GET /api/databases', 'http', {
  url: '/api/databases',
  status: 200,
});
```

### Session Replay

When errors occur, Sentry captures:
- Video replay of user session
- Console logs
- Network requests
- DOM mutations
- User interactions

**To view:**
1. Go to Sentry → Issues
2. Click on an issue
3. Click **"Replays"** tab
4. Watch what user did before error

### User Feedback

When error occurs, show feedback form:

```typescript
import { Sentry } from '@/lib/sentry';

// In your error boundary or error page
<button onClick={() => {
  Sentry.showReportDialog({
    eventId: lastEventId,
    user: {
      name: currentUser.name,
      email: currentUser.email,
    },
  });
}}>
  Report Feedback
</button>
```

---

## 🧪 TESTING MONITORING

### Test Checklist

- [ ] Trigger test error in development (console)
- [ ] Trigger test error in staging (UI button)
- [ ] Verify error appears in Sentry dashboard
- [ ] Check source maps are working (stack trace shows source code, not minified)
- [ ] Test alert notifications (email, Slack)
- [ ] Verify performance transaction tracking
- [ ] Test session replay capture
- [ ] Verify Web Vitals reporting
- [ ] Check Lighthouse CI report in GitHub Actions

### Smoke Test Script

```bash
#!/bin/bash
# smoke-test.sh

echo "🧪 Testing monitoring setup..."

# 1. Test Sentry DSN is configured
if [ -z "$VITE_SENTRY_DSN" ]; then
  echo "❌ VITE_SENTRY_DSN not set"
  exit 1
fi

# 2. Test build with Sentry
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# 3. Test Lighthouse CI
npm run preview &
PREVIEW_PID=$!
sleep 5

npx lhci autorun
LHCI_STATUS=$?

kill $PREVIEW_PID

if [ $LHCI_STATUS -ne 0 ]; then
  echo "❌ Lighthouse CI failed"
  exit 1
fi

echo "✅ All monitoring tests passed!"
```

---

## 📚 TROUBLESHOOTING

### Sentry Not Capturing Errors

**Problem:** Errors not appearing in Sentry.

**Solutions:**

1. Check DSN is set:
   ```bash
   echo $VITE_SENTRY_DSN
   ```

2. Verify Sentry is initialized:
   ```typescript
   // In browser console
   console.log(window.Sentry);
   ```

3. Check network tab for Sentry requests:
   - Should see POST to `https://o0.ingest.sentry.io/api/0/envelope/`

4. Verify environment:
   ```typescript
   // Sentry doesn't send in development by default
   // Check: import.meta.env.MODE === 'production'
   ```

### Source Maps Not Working

**Problem:** Stack traces show minified code.

**Solutions:**

1. Verify source maps are generated:
   ```bash
   ls -la dist/assets/*.map
   ```

2. Check Sentry release:
   ```bash
   # Should match VITE_APP_VERSION
   sentry-cli releases list
   ```

3. Upload source maps manually:
   ```bash
   sentry-cli releases files <version> upload-sourcemaps ./dist/assets
   ```

### Performance Monitoring Not Working

**Problem:** No transactions in Sentry Performance.

**Solutions:**

1. Check sample rate:
   ```typescript
   // Should be > 0 (e.g., 0.1 = 10%)
   tracesSampleRate: 0.1
   ```

2. Verify BrowserTracing integration:
   ```typescript
   integrations: [Sentry.browserTracingIntegration()]
   ```

---

## 📞 SUPPORT

### Getting Help

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Lighthouse CI:** https://github.com/GoogleChrome/lighthouse-ci
- **Web Vitals:** https://web.dev/vitals/

### Team Contacts

- **On-Call Engineer:** [Your contact]
- **DevOps Lead:** [Your contact]
- **Slack Channel:** #alerts-production

---

## ✅ POST-SETUP CHECKLIST

After completing setup, verify:

- [ ] Sentry project created and DSN configured
- [ ] Error tracking working (test error sent successfully)
- [ ] Source maps uploading correctly
- [ ] Performance monitoring enabled
- [ ] Session replay working
- [ ] Alerts configured (email, Slack)
- [ ] Lighthouse CI running in GitHub Actions
- [ ] UptimeRobot monitoring active (optional)
- [ ] Team trained on monitoring tools
- [ ] Runbook created for common issues
- [ ] On-call rotation defined

---

**Your monitoring stack is now production-ready! 🎉**

Monitor your application health at:
- **Sentry:** https://sentry.io/organizations/[your-org]/projects/dataparsedesk-2.0/
- **GitHub Actions:** https://github.com/[your-org]/dataparsedesk-2.0/actions
