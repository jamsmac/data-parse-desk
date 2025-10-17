# Email Integration - Quick Start Guide

## 5-Minute Setup

### Step 1: Get Resend API Key (2 min)

1. Go to [resend.com](https://resend.com)
2. Sign up (free account)
3. Click **API Keys** → **Create API Key**
4. Copy the key (starts with `re_`)

### Step 2: Configure Supabase (1 min)

```bash
# Set the API key as a secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Verify it's set
supabase secrets list
```

### Step 3: Deploy Edge Functions (2 min)

```bash
# Deploy both functions
supabase functions deploy send-email
supabase functions deploy send-scheduled-report

# Verify deployment
supabase functions list
```

### Step 4: Test (30 seconds)

1. Open VHData app
2. Go to **Profile** → **Email Settings**
3. Enter your email address
4. Click **Test** button
5. Check your inbox

## Usage Examples

### Send Test Email

```typescript
import { EmailAPI } from '@/api/emailAPI';

await EmailAPI.sendTestEmail({
  to: 'user@example.com',
  testType: 'simple',
});
```

### Send Notification

```typescript
await EmailAPI.sendNotification(
  'user@example.com',
  'New Comment',
  'Someone commented on your post',
  'info'
);
```

### Send Report

```typescript
await EmailAPI.sendScheduledReport({
  scheduleId: 'uuid',
  reportData: { /* data */ },
  format: 'pdf',
  recipients: ['user@example.com'],
  templateName: 'Sales Report',
});
```

## Files Overview

| File | Purpose |
|------|---------|
| `supabase/functions/send-email/index.ts` | Generic email sender |
| `supabase/functions/send-scheduled-report/index.ts` | Report sender |
| `src/api/emailAPI.ts` | Frontend API client |
| `SMTP_SETUP.md` | Complete setup guide |
| `EMAIL_INTEGRATION_SUMMARY.md` | Developer reference |

## Troubleshooting

### Emails not sending?

```bash
# Check secret is set
supabase secrets list

# Check function logs
supabase functions logs send-email

# Check Resend dashboard
# https://resend.com/emails
```

### Rate limits?

- Free tier: 100 emails/day
- Upgrade at [resend.com/pricing](https://resend.com/pricing)

## Next Steps

- Read [SMTP_SETUP.md](../SMTP_SETUP.md) for detailed guide
- Verify your domain for production
- Customize email templates
- Set up monitoring

---

**Need Help?** Check [SMTP_SETUP.md](../SMTP_SETUP.md) troubleshooting section
