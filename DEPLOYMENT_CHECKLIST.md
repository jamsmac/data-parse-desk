# 🚀 Deployment Checklist - Data Parse Desk 2.0

**Security-First Deployment Guide**
**Updated:** 2025-10-27 with 7 critical security migrations

Use this checklist before deploying to production.

---

## 🔐 CRITICAL: Security Migrations (Do First!)

**⚠️ MUST BE COMPLETED BEFORE PRODUCTION TRAFFIC**

### Pre-Migration Backup
- [ ] Create full database backup via Supabase Dashboard
- [ ] Download backup file locally
- [ ] Verify backup file size > 0
- [ ] Document backup timestamp: `_______________`

### Apply Security Migrations (In Order!)
- [ ] Migration 1: Fix query_performance_log RLS
  ```bash
  npx supabase db push --file supabase/migrations/20251027000001_fix_query_performance_log_rls.sql
  ```
  **Verify:** Look for "✅ RLS is enabled on query_performance_log"

- [ ] Migration 2: Fix dynamic table RLS policies
  ```bash
  npx supabase db push --file supabase/migrations/20251027000002_fix_dynamic_table_rls.sql
  ```
  **Verify:** Look for "✅ Dynamic table RLS policies working correctly"

- [ ] Migration 3: GDPR data retention system
  ```bash
  npx supabase db push --file supabase/migrations/20251027000003_gdpr_data_retention.sql
  ```
  **Verify:** Look for "✅ Data retention system initialized"

- [ ] Migration 4: API key encryption (AES-256)
  ```bash
  npx supabase db push --file supabase/migrations/20251027000004_encrypt_api_keys.sql
  ```
  **Verify:** Look for "✅ API key encryption enabled"

- [ ] Migration 5: Fix SECURITY DEFINER search_path
  ```bash
  npx supabase db push --file supabase/migrations/20251027000005_fix_security_definer_search_path.sql
  ```
  **Verify:** Look for "✅ All SECURITY DEFINER functions secured"

- [ ] Migration 6: Security test suite
  ```bash
  npx supabase db push --file supabase/migrations/20251027000006_test_security_fixes.sql
  ```
  **Verify:** All 6 tests pass - look for "🎉 ALL SECURITY TESTS PASSED"

- [ ] Migration 7: GDPR Right to be Forgotten
  ```bash
  npx supabase db push --file supabase/migrations/20251027000007_gdpr_right_to_be_forgotten.sql
  ```
  **Verify:** Look for "✅ GDPR Right to be Forgotten system initialized"

### Post-Migration Verification
- [ ] Verify RLS policy count: `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';`
  **Expected:** 192+ policies
- [ ] Test user authentication flow
- [ ] Test API key creation with encryption
- [ ] Check Supabase logs for migration errors
- [ ] Run: `npx supabase test db` (all tests should pass)

---

## ✅ Pre-Deployment

### Environment Setup - PRODUCTION VARIABLES
- [ ] Copy `.env.example` to `.env.production`
- [ ] Set `VITE_SUPABASE_URL` (required)
- [ ] Set `VITE_SUPABASE_ANON_KEY` (required)
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` (required, for Edge Functions)
- [ ] **CRITICAL:** Set `API_KEY_ENCRYPTION_PASSWORD` (generate with `openssl rand -base64 32`)
- [ ] Set `ANTHROPIC_API_KEY` (required for AI features)
- [ ] Set security variables:
  ```bash
  ENABLE_DATA_RETENTION_CLEANUP="true"
  DATA_RETENTION_DAYS_DEFAULT="90"
  RATE_LIMIT_REQUESTS_PER_HOUR="1000"
  ENABLE_STRICT_CSP="true"
  ALLOWED_FRAME_ANCESTORS="none"
  ```
- [ ] Set environment type:
  ```bash
  VITE_ENVIRONMENT="production"
  VITE_DEBUG_MODE="false"
  VITE_LOG_LEVEL="error"
  ```
- [ ] Set CORS origins (production domains only):
  ```bash
  VITE_CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
  ```
- [ ] Optional: Set `VITE_DROPBOX_CLIENT_ID` (for Dropbox sync)
- [ ] Optional: Set `VITE_ONEDRIVE_CLIENT_ID` (for OneDrive sync)
- [ ] Optional: Set `VITE_TELEGRAM_BOT_TOKEN` (for Telegram bot)

### Database Setup
- [ ] Enable `pg_cron` extension in Supabase Dashboard > Database > Extensions
- [ ] Verify pg_cron job exists: `SELECT * FROM cron.job WHERE jobname = 'daily-data-retention-cleanup';`
- [ ] Verify RLS is enabled: 192+ policies active
- [ ] Test database connection
- [ ] Create admin user account
- [ ] Verify user_credits table exists
- [ ] Verify matching_templates table exists
- [ ] Verify data_retention_config table exists (from migration 3)
- [ ] Verify deletion_requests table exists (from migration 7)

### Code Quality
- [ ] Run `npm run type-check` (should pass with 0 errors)
- [ ] Run `npm run test` (should pass all 63+ tests)
- [ ] Run `npm run lint` (should pass without errors)
- [ ] Review all console.log statements (remove debug logs)
- [ ] Check for TODO comments

### Security
- [ ] Verify all 192+ RLS policies are in place and enabled
- [ ] Verify API keys are encrypted at rest (check `encrypted_key` column)
- [ ] Test RLS isolation: User A cannot see User B's data
- [ ] Verify SECURITY DEFINER functions have `search_path` protection
- [ ] Check that sensitive data is not logged (API keys, passwords)
- [ ] Verify OAuth redirect URIs are whitelisted
- [ ] Enable HTTPS for production
- [ ] Set up CORS policies (production domains only)
- [ ] Review database permissions
- [ ] Test GDPR data deletion workflow
- [ ] Verify data retention cleanup is scheduled (pg_cron)
- [ ] Test rate limiting on API endpoints

---

## 🏗️ Build & Deploy

### Build Process
- [ ] Run `npm install` to ensure dependencies
- [ ] Run `npm run build` successfully
- [ ] Check build output for errors/warnings
- [ ] Verify bundle sizes are reasonable (<5MB total)
- [ ] Test built application locally with `npm run preview`

### Static Assets
- [ ] Verify all images are optimized
- [ ] Check that fonts are loading correctly
- [ ] Verify PWA manifest is correct
- [ ] Test service worker functionality
- [ ] Verify favicon and app icons

### Deployment
- [ ] Choose hosting platform (Vercel, Netlify, AWS, etc.)
- [ ] Configure build settings
- [ ] Set environment variables in hosting platform
- [ ] Deploy to staging environment first
- [ ] Test staging deployment thoroughly
- [ ] Deploy to production
- [ ] Verify production deployment

---

## 🧪 Post-Deployment Testing

### Security Testing (CRITICAL)
- [ ] **RLS Testing:** Create 2 test users, verify User A cannot access User B's data
- [ ] **API Key Security:** Generate API key, verify it's encrypted in database
  ```sql
  SELECT key_prefix, encrypted_key IS NOT NULL as is_encrypted FROM api_keys LIMIT 5;
  ```
- [ ] **GDPR Testing:** Request user deletion, verify data is anonymized/deleted
  ```sql
  SELECT request_user_deletion('<test-user-id>');
  ```
- [ ] **Data Retention:** Test cleanup dry-run
  ```sql
  SELECT * FROM cleanup_old_data();
  ```
- [ ] **Injection Protection:** Test SQL injection in search fields (should be blocked)
- [ ] **XSS Protection:** Test script injection in user inputs (should be sanitized)
- [ ] **CSRF Protection:** Verify forms have CSRF tokens

### Core Functionality
- [ ] User authentication (signup/login/logout)
- [ ] Database CRUD operations
- [ ] File upload/download
- [ ] Data import (CSV, Excel)
- [ ] Data export (CSV, Excel, HTML reports)
- [ ] Column type rendering (all 23 types)
- [ ] Filtering and sorting
- [ ] Project member permissions (owner, admin, editor, viewer)

### New Features
- [ ] Smart Matching Wizard (4 steps)
- [ ] Template save/load system
- [ ] Heatmap chart rendering
- [ ] HTML report generation
- [ ] Dropbox sync (if enabled)
- [ ] OneDrive sync (if enabled)
- [ ] Mobile camera capture
- [ ] QR code scanning
- [ ] Barcode scanning

### Cross-Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Performance
- [ ] Page load time < 3 seconds
- [ ] Time to Interactive < 5 seconds
- [ ] No console errors
- [ ] No memory leaks
- [ ] Smooth animations (60fps)

### Mobile Testing
- [ ] Responsive layout on small screens
- [ ] Touch interactions work correctly
- [ ] Camera access works on mobile
- [ ] No horizontal scrolling
- [ ] Virtual keyboard doesn't break layout

---

## 🔒 GDPR & Compliance

### Data Protection (GDPR Articles 5, 17, 20, 32)
- [ ] **Privacy Policy:** Updated with data retention periods
- [ ] **Terms of Service:** Reviewed and current
- [ ] **Cookie Consent:** Banner implemented (if using cookies)
- [ ] **Data Processing Agreement:** Reviewed with Supabase

### User Rights Implementation
- [ ] **Right to Access (Article 15):** User can view their data
- [ ] **Right to Rectification (Article 16):** User can edit their data
- [ ] **Right to Erasure (Article 17):** User can request deletion
  - Verify `deletion_requests` table exists
  - Test deletion workflow with test account
- [ ] **Right to Data Portability (Article 20):** User can export data
  - Test CSV export
  - Test JSON export

### Data Retention
- [ ] Configure retention periods in `data_retention_config`:
  ```sql
  SELECT table_name, retention_days FROM data_retention_config;
  ```
- [ ] Verify pg_cron job runs daily: `SELECT * FROM cron.job;`
- [ ] Test cleanup function (dry-run): `SELECT * FROM cleanup_old_data();`
- [ ] Set up alerts for cleanup failures

### Security Measures (Article 32)
- [ ] Encryption at rest: API keys encrypted with AES-256
- [ ] Encryption in transit: HTTPS enabled
- [ ] Access controls: RLS policies active on all tables
- [ ] Audit logging: Query performance logs enabled
- [ ] Pseudonymization: User data anonymized on deletion

---

## 📊 Monitoring Setup

### Error Tracking
- [ ] Set up error tracking (Sentry/LogRocket)
- [ ] Test error reporting
- [ ] Configure alert thresholds
- [ ] Set up error notification emails

### Analytics
- [ ] Set up Google Analytics or similar
- [ ] Track key user actions
- [ ] Set up conversion funnels
- [ ] Monitor user retention

### Performance Monitoring
- [ ] Set up Web Vitals monitoring
- [ ] Track Core Web Vitals (LCP, FID, CLS)
- [ ] Monitor API response times
- [ ] Set up uptime monitoring

---

## 🔒 Security Hardening

### SSL/TLS
- [ ] Enable HTTPS (required for production)
- [ ] Configure SSL certificate (auto with Vercel/Netlify)
- [ ] Test SSL Labs rating: https://www.ssllabs.com/ssltest/
  - **Target:** A+ rating
- [ ] Enable HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### Security Headers
- [ ] Set Content-Security-Policy:
  ```
  default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
  ```
- [ ] Set X-Frame-Options: `DENY` (prevent clickjacking)
- [ ] Set X-Content-Type-Options: `nosniff`
- [ ] Set Referrer-Policy: `strict-origin-when-cross-origin`
- [ ] Set Permissions-Policy: `geolocation=(), microphone=(), camera=()`
- [ ] Test headers: https://securityheaders.com/
  - **Target:** A+ grade

### Database Security
- [ ] Enable connection pooling (Supabase default)
- [ ] Set up automated database backups (daily)
- [ ] Configure backup retention policy (30 days minimum)
- [ ] Test database restore procedure
- [ ] Verify all 192+ RLS policies are active
- [ ] Review and rotate database passwords (quarterly)

### Edge Functions Security
- [ ] Deploy all 34 edge functions with latest code
- [ ] Verify CORS headers are production-only
- [ ] Set production secrets (never commit to git):
  ```bash
  npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
  npx supabase secrets set API_KEY_ENCRYPTION_PASSWORD=...
  npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
  ```
- [ ] Test API key authentication middleware (apiKeyAuth.ts)
- [ ] Verify rate limiting is enforced
- [ ] Check function logs for errors

---

## 📚 Documentation

### User Documentation
- [ ] Create user guide
- [ ] Document all features
- [ ] Create video tutorials (optional)
- [ ] Set up help center/FAQ

### Developer Documentation
- [ ] Update README.md
- [ ] Document API endpoints
- [ ] Create architecture diagrams
- [ ] Document deployment process

### Maintenance
- [ ] Set up dependency update schedule
- [ ] Create incident response plan
- [ ] Document rollback procedure
- [ ] Create disaster recovery plan

---

## 🎯 Go-Live Checklist

### Final Security Verification (CRITICAL)
- [ ] ✅ All 7 security migrations applied successfully
- [ ] ✅ Migration 6 test suite: ALL TESTS PASSED
- [ ] ✅ RLS policy count: 192+ policies active
- [ ] ✅ API keys encrypted: `encrypted_key` column populated
- [ ] ✅ GDPR deletion workflow tested
- [ ] ✅ Data retention cleanup scheduled (pg_cron)
- [ ] ✅ SECURITY DEFINER functions have search_path protection
- [ ] ✅ No sensitive data in logs (check Supabase logs)
- [ ] ✅ SSL Labs grade: A+
- [ ] ✅ Security Headers grade: A+

### Final Technical Verification
- [ ] All environment variables set correctly (check .env.production)
- [ ] `API_KEY_ENCRYPTION_PASSWORD` generated and stored securely
- [ ] Database migrations applied (7 security + all others)
- [ ] All tests passing (63+ tests)
- [ ] TypeScript compilation successful: `npm run type-check`
- [ ] Production build successful: `npm run build`
- [ ] No console errors in production
- [ ] SSL certificate valid
- [ ] DNS configured correctly
- [ ] CDN configured (if applicable)
- [ ] Database backups configured (daily)
- [ ] Edge functions deployed (34 functions)
- [ ] Secrets set in Supabase Dashboard

### Communication
- [ ] Notify team of deployment
- [ ] Send deployment announcement
- [ ] Update status page
- [ ] Monitor for issues

### Post-Launch
- [ ] Monitor error rates for 1 hour
- [ ] Check analytics for user activity
- [ ] Verify all critical paths work
- [ ] Be ready to rollback if needed
- [ ] Document any issues encountered

---

## 🆘 Rollback Plan

If deployment fails:

1. **Immediate Actions**
   - Switch DNS back to previous version
   - Restore database from backup (if needed)
   - Notify team of rollback

2. **Investigation**
   - Review error logs
   - Identify root cause
   - Document issue

3. **Resolution**
   - Fix issue in development
   - Re-test thoroughly
   - Schedule new deployment

---

## 📞 Support Contacts

- **Technical Lead:** [Name/Email]
- **DevOps:** [Name/Email]
- **Database Admin:** [Name/Email]
- **Hosting Support:** [Platform Support]

---

## 🎉 Deployment Complete!

Once all items are checked:

✅ **Data Parse Desk 2.0 is LIVE!**

Monitor for the next 24-48 hours and be ready to respond to any issues.

---

## 📋 Summary

This deployment checklist has been updated with 7 critical security migrations that:

1. **Fix RLS Gaps** - Secured query_performance_log and all dynamic tables
2. **Encrypt API Keys** - AES-256 encryption for all API keys at rest
3. **GDPR Compliance** - Data retention and Right to be Forgotten implementation
4. **Security Definer Protection** - Prevent search_path hijacking attacks
5. **Comprehensive Testing** - Automated test suite verifies all security fixes

**Security Improvement:** 7.2/10 → 8.8/10 (see SECURITY_AUDIT_REPORT.md)

**Key Documents:**
- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) - Full security analysis
- [SECURITY_FIX_GUIDE.md](./SECURITY_FIX_GUIDE.md) - Implementation guide
- [.env.example](./.env.example) - Environment variables template

---

*Last Updated: October 27, 2025 - Security Migrations Added*
*Previous Update: October 22, 2025*
