# Deployment Guide

## Prerequisites

- Lovable Cloud account
- Stripe account (for payments)
- Telegram Bot Token (optional, for Telegram integration)

---

## 1. Lovable Cloud Deployment

### Automatic Deployment

Lovable Cloud automatically deploys your application when you save changes. No manual deployment needed!

**What's Included:**
- ✅ Frontend (React + Vite)
- ✅ Backend (Supabase)
- ✅ Edge Functions
- ✅ Database migrations
- ✅ RLS policies
- ✅ Storage buckets

### Preview URL

Your preview URL: `https://[your-project-id].lovable.app`

### Custom Domain

1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records (Lovable will provide instructions)

---

## 2. Environment Variables

All environment variables are auto-configured by Lovable Cloud:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

### Secrets

Configure secrets in Lovable Cloud dashboard:

1. **LOVABLE_API_KEY** ✅ (auto-configured)
2. **STRIPE_SECRET_KEY** - From Stripe Dashboard
3. **STRIPE_WEBHOOK_SECRET** - From Stripe Webhooks
4. **TELEGRAM_BOT_TOKEN** - From @BotFather

---

## 3. Stripe Configuration

### Setup Stripe

1. **Create Stripe Account**
   - Go to https://stripe.com
   - Create account and verify email

2. **Get API Keys**
   - Dashboard → Developers → API keys
   - Copy "Secret key" (starts with `sk_`)
   - Add to Lovable Cloud secrets as `STRIPE_SECRET_KEY`

3. **Setup Webhook**
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://[your-project-id].lovable.app/functions/v1/stripe-webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy "Signing secret" (starts with `whsec_`)
   - Add to Lovable Cloud secrets as `STRIPE_WEBHOOK_SECRET`

4. **Create Products**
   - Dashboard → Products
   - Create credit packages (e.g., 100 credits for $10)
   - Note the Price IDs

---

## 4. Telegram Bot Configuration

### Setup Telegram Bot

1. **Create Bot**
   - Open Telegram
   - Message @BotFather
   - Send `/newbot`
   - Follow instructions
   - Copy API Token

2. **Configure Bot**
   - Add token to Lovable Cloud secrets as `TELEGRAM_BOT_TOKEN`
   - Set webhook:
     ```bash
     curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
       -H "Content-Type: application/json" \
       -d '{"url":"https://[your-project-id].lovable.app/functions/v1/telegram-webhook"}'
     ```

---

## 5. Database Setup

### Auto-Migration

All migrations run automatically when you deploy!

**Migrations include:**
- ✅ Table creation
- ✅ RLS policies
- ✅ Database functions
- ✅ Triggers
- ✅ Indexes

### Manual Migration (if needed)

If you need to run migrations manually:

1. Open Lovable Cloud dashboard
2. Navigate to Database → Migrations
3. Click "Run pending migrations"

---

## 6. Auth Configuration

### Email Confirmation

For development, disable email confirmation:

1. Open Lovable Cloud dashboard
2. Navigate to Auth → Settings
3. Enable "Auto-confirm email signups"

### Production

For production, configure email provider:

1. Navigate to Auth → Email Templates
2. Customize welcome email
3. Configure SMTP (optional)

---

## 7. Storage Configuration

Storage buckets are auto-created during deployment.

**Buckets:**
- None configured yet (will be created when needed)

### RLS Policies

All storage buckets have RLS enabled by default.

---

## 8. Monitoring

### View Logs

1. Open Lovable Cloud dashboard
2. Navigate to Functions → Logs
3. Select function to view logs

### Analytics

1. Navigate to Analytics
2. View real-time metrics:
   - API requests
   - Credits usage
   - Database operations

---

## 9. Production Checklist

Before going live:

- [ ] Configure custom domain
- [ ] Enable Stripe live mode
- [ ] Configure production Telegram bot
- [ ] Set up monitoring alerts
- [ ] Review RLS policies
- [ ] Test payment flow
- [ ] Test AI features
- [ ] Test file imports
- [ ] Review security settings
- [ ] Set up backups

---

## 10. Troubleshooting

### Edge Functions Not Working

1. Check function logs
2. Verify secrets are configured
3. Test function endpoint manually

### Database Errors

1. Check migration status
2. Review RLS policies
3. Check database logs

### Stripe Webhook Issues

1. Verify webhook URL is correct
2. Check webhook secret
3. Test webhook with Stripe CLI

### Telegram Bot Not Responding

1. Verify bot token
2. Check webhook URL
3. Test with `/start` command

---

## Support

Need help? Contact:
- Lovable Support: support@lovable.dev
- Documentation: https://docs.lovable.dev
