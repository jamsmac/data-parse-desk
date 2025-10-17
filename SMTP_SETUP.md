# SMTP Email Setup Guide

This guide explains how to set up email functionality in VHData Platform using Resend as the SMTP provider and Supabase Edge Functions.

## Overview

VHData Platform uses **Resend** as the email service provider for sending:
- Test emails
- Notification digests (daily/weekly)
- Scheduled reports
- System notifications

The email functionality is implemented using:
- **Supabase Edge Functions** (serverless functions for sending emails)
- **Resend API** (email delivery service)
- **EmailAPI Client** (TypeScript API client for the frontend)

## Architecture

```
Frontend (React)
    ↓
EmailAPI Client (src/api/emailAPI.ts)
    ↓
Supabase Edge Functions
    ├── send-email (generic email sender)
    └── send-scheduled-report (report delivery)
    ↓
Resend API
    ↓
Email Recipients
```

## Prerequisites

1. **Supabase Project**: You need a Supabase project (already set up)
2. **Resend Account**: Create a free account at [resend.com](https://resend.com)
3. **Domain Verification** (optional): For production, verify your domain in Resend

## Step 1: Get Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Go to **API Keys** in your Resend dashboard
3. Click **Create API Key**
4. Copy the API key (it starts with `re_`)

**Note**: Free tier includes 100 emails/day, which is sufficient for testing.

## Step 2: Configure Supabase Environment Variables

Add the Resend API key to your Supabase Edge Functions:

### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Edge Functions**
3. Add a new secret:
   - Name: `RESEND_API_KEY`
   - Value: `re_your_api_key_here`

### Option B: Using Supabase CLI

```bash
# Set the Resend API key
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Verify it's set
supabase secrets list
```

## Step 3: Deploy Edge Functions

Deploy the email Edge Functions to Supabase:

```bash
# Deploy send-email function
supabase functions deploy send-email

# Deploy send-scheduled-report function
supabase functions deploy send-scheduled-report

# Verify deployment
supabase functions list
```

## Step 4: Test Email Functionality

### Test from Frontend

Use the **Email Settings** page in the VHData app:

1. Navigate to **Profile** > **Email Settings**
2. Enter your email address
3. Click the **Test** button
4. Check your inbox for the test email

### Test via API

You can also test directly using curl:

```bash
# Get your Supabase project URL and anon key from .env.local
SUPABASE_URL="https://your-project.supabase.co"
ANON_KEY="your-anon-key"

# Send a test email
curl -X POST "${SUPABASE_URL}/functions/v1/send-email" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email from VHData",
    "html": "<h1>Hello!</h1><p>This is a test email.</p>"
  }'
```

## Step 5: Configure Email Settings in App

Users can configure their email preferences:

1. **Enable/Disable**: Turn email notifications on/off
2. **Email Address**: Set the recipient email
3. **Frequency**: Choose instant, daily, or weekly digests
4. **Notification Types**: Select which events to receive (comments, mentions, updates, etc.)

## Email Features

### 1. Test Emails

Send a test email to verify configuration:

```typescript
import { EmailAPI } from '@/api/emailAPI';

await EmailAPI.sendTestEmail({
  to: 'user@example.com',
  testType: 'simple', // 'simple' | 'digest' | 'report'
});
```

### 2. Notification Emails

Send single notifications:

```typescript
await EmailAPI.sendNotification(
  'user@example.com',
  'New Comment',
  'Someone commented on your database',
  'info' // 'info' | 'success' | 'warning' | 'error'
);
```

### 3. Digest Emails

Send batched notifications:

```typescript
const notifications = [
  { title: 'New Comment', message: 'John commented...', timestamp: '2025-01-15T10:00:00Z' },
  { title: 'Database Updated', message: 'Sales database...', timestamp: '2025-01-15T11:00:00Z' },
];

await EmailAPI.sendDigest(
  'user@example.com',
  notifications,
  'daily' // 'daily' | 'weekly'
);
```

### 4. Scheduled Reports

Send reports as email attachments:

```typescript
await EmailAPI.sendScheduledReport({
  scheduleId: 'schedule-uuid',
  reportData: { /* report data */ },
  format: 'pdf', // 'pdf' | 'excel' | 'csv' | 'html'
  recipients: ['user1@example.com', 'user2@example.com'],
  templateName: 'Monthly Sales Report',
});
```

## Edge Function Details

### send-email Function

**Location**: `supabase/functions/send-email/index.ts`

**Purpose**: Generic email sender with support for:
- Single or multiple recipients
- HTML and plain text content
- CC and BCC
- Attachments (base64 encoded)
- Audit logging

**Environment Variables**:
- `RESEND_API_KEY` (required): Resend API key
- `SUPABASE_URL` (auto-injected): Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected): Service role key for audit logging

**Request Format**:
```typescript
{
  to: string | string[],
  subject: string,
  html?: string,
  text?: string,
  from?: string, // defaults to 'VHData <noreply@vhdata.app>'
  cc?: string | string[],
  bcc?: string | string[],
  replyTo?: string,
  attachments?: Array<{
    filename: string,
    content: string, // base64
    contentType?: string
  }>,
  userId?: string, // for audit logging
  metadata?: Record<string, unknown>
}
```

**Response Format**:
```typescript
{
  success: boolean,
  emailId: string, // Resend email ID
  message: string,
  data?: unknown
}
```

### send-scheduled-report Function

**Location**: `supabase/functions/send-scheduled-report/index.ts`

**Purpose**: Send scheduled reports with:
- Professional email template
- Report data as attachment
- Multiple recipients
- Schedule tracking (lastRun, nextRun)
- Audit logging

**Environment Variables**:
- `RESEND_API_KEY` (required): Resend API key
- `SUPABASE_URL` (auto-injected): Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected): Service role key

**Request Format**:
```typescript
{
  scheduleId: string,
  reportData: unknown,
  format: 'pdf' | 'excel' | 'csv' | 'html',
  recipients: string[],
  subject?: string,
  userId?: string,
  templateName?: string,
  scheduleNextRun?: string
}
```

## Customization

### Change From Address

By default, emails are sent from `VHData <noreply@vhdata.app>`. To use a custom domain:

1. **Verify your domain in Resend**:
   - Go to Resend dashboard > **Domains**
   - Add your domain and follow verification instructions

2. **Update the from address** in Edge Functions:
   ```typescript
   // In send-email/index.ts
   const fromAddress = emailRequest.from || 'Your App <noreply@yourdomain.com>';
   ```

### Customize Email Templates

Email templates are generated in `src/api/emailAPI.ts`. You can customize:

- **Colors and styling**: Update inline CSS in template generators
- **Logo and branding**: Add your logo URL to templates
- **Content structure**: Modify HTML structure in generator functions

Example:
```typescript
// In src/api/emailAPI.ts
private static generateSimpleTestEmail(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    .header {
      background: linear-gradient(135deg, #YOUR_COLOR_1, #YOUR_COLOR_2);
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://yourdomain.com/logo.png" alt="Logo" />
    <h1>Your Custom Title</h1>
  </div>
  ...
</body>
</html>
  `;
}
```

## Troubleshooting

### Emails Not Sending

1. **Check Resend API key**:
   ```bash
   supabase secrets list
   # Should show RESEND_API_KEY
   ```

2. **Check Edge Function logs**:
   ```bash
   supabase functions logs send-email
   ```

3. **Check Resend dashboard**:
   - Go to Resend dashboard > **Logs**
   - Look for delivery status and errors

### Emails Going to Spam

1. **Verify domain in Resend** (production only)
2. **Set up SPF, DKIM, and DMARC records** (provided by Resend after domain verification)
3. **Avoid spam trigger words** in subject/content
4. **Use plain text alternative** alongside HTML

### Rate Limiting

Resend free tier limits:
- **100 emails/day**
- **3,000 emails/month**

For production, upgrade to a paid plan at [resend.com/pricing](https://resend.com/pricing).

### Error: "RESEND_API_KEY is not configured"

The Edge Function can't find the API key. Make sure you:
1. Set the secret: `supabase secrets set RESEND_API_KEY=re_your_key`
2. Redeployed the functions after setting the secret

## Testing in Development

For local development with Supabase CLI:

1. **Start local Supabase**:
   ```bash
   supabase start
   ```

2. **Set local secrets**:
   ```bash
   echo "RESEND_API_KEY=re_your_api_key" > .env.local
   ```

3. **Serve Edge Functions locally**:
   ```bash
   supabase functions serve send-email --env-file .env.local
   ```

4. **Test locally**:
   ```bash
   curl -X POST "http://localhost:54321/functions/v1/send-email" \
     -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "test@example.com",
       "subject": "Local Test",
       "html": "<p>Testing locally</p>"
     }'
   ```

## Production Checklist

Before deploying to production:

- [ ] Verify domain in Resend
- [ ] Set up SPF, DKIM, DMARC records
- [ ] Update from address to use verified domain
- [ ] Test all email types (test, notification, digest, report)
- [ ] Configure rate limiting if needed
- [ ] Set up monitoring/alerts for failed emails
- [ ] Review email templates for branding consistency
- [ ] Test on multiple email clients (Gmail, Outlook, etc.)
- [ ] Ensure audit logging is working
- [ ] Add unsubscribe links (if required by your region)

## Audit Logging

All email sends are automatically logged to the `audit_log` table:

```sql
SELECT * FROM audit_log
WHERE action IN ('email_sent', 'scheduled_report_sent')
ORDER BY created_at DESC
LIMIT 10;
```

Log entry includes:
- User ID
- Action type
- Email recipient(s)
- Subject
- Resend email ID
- Timestamp
- Metadata

## Support

- **Resend Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Supabase Edge Functions**: [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **VHData Issues**: File issues on GitHub repository

## Additional Resources

- [Resend Email Best Practices](https://resend.com/docs/best-practices)
- [Email Design Guide](https://www.goodemailcode.com/)
- [Testing Email Templates](https://litmus.com/)
- [Email Authentication (SPF/DKIM/DMARC)](https://www.cloudflare.com/learning/email-security/)

---

**Last Updated**: 2025-01-17

**Version**: 1.0.0
