# 🔄 Rollback Procedure

**Data Parse Desk 2.0 - Emergency Rollback Guide**

This document provides step-by-step procedures for rolling back security migrations or entire deployments in case of critical issues.

---

## 🚨 When to Rollback

### Critical Issues Requiring Immediate Rollback

1. **Data Loss or Corruption**
   - Users reporting missing or corrupted data
   - RLS policies blocking legitimate access
   - Critical queries failing

2. **Application Downtime**
   - Application completely inaccessible
   - Critical features non-functional
   - Database connection failures

3. **Security Breach**
   - Unauthorized data access detected
   - RLS policies not enforcing isolation
   - API key compromise

4. **Performance Degradation**
   - Response times > 10 seconds
   - Database CPU > 95% sustained
   - Connection pool exhaustion

### Issues NOT Requiring Rollback

- Minor UI bugs
- Non-critical feature issues
- Slow queries (can be optimized)
- Single user reports (verify first)

---

## 📋 Pre-Rollback Checklist

Before initiating rollback:

- [ ] **Document the issue** - Screenshot errors, save logs
- [ ] **Verify it's critical** - Can it be fixed without rollback?
- [ ] **Check recent changes** - What was deployed?
- [ ] **Notify stakeholders** - Alert team and users
- [ ] **Prepare backup** - Ensure backup is available and valid
- [ ] **Estimate downtime** - How long will rollback take?

---

## 🔧 Rollback Scenarios

### Scenario 1: Rollback Single Migration

**When:** One specific migration is causing issues, others are fine

**Time Required:** 10-15 minutes

#### Step 1: Identify Problem Migration

```bash
# Check Supabase logs
# Dashboard > Logs > filter by error

# Check which migration failed
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```

#### Step 2: Create Rollback Migration

For each migration, here's how to rollback:

**Migration 20251027000001** (query_performance_log RLS):
```sql
-- Rollback: Remove RLS policies from query_performance_log
DROP POLICY IF EXISTS "Users can view own performance logs" ON query_performance_log;
DROP POLICY IF EXISTS "Users can insert own performance logs" ON query_performance_log;
DROP INDEX IF EXISTS idx_query_performance_log_user_id;
```

**Migration 20251027000002** (dynamic table RLS):
```sql
-- Rollback: Restore original create_database function
-- NOTE: This requires keeping a copy of the original function
-- Best practice: Always backup functions before modifying

-- You would need the original function definition
-- Restore from backup or version control
```

**Migration 20251027000003** (GDPR data retention):
```sql
-- Rollback: Remove data retention system
SELECT cron.unschedule('daily-data-retention-cleanup');
DROP FUNCTION IF EXISTS cleanup_old_data() CASCADE;
DROP FUNCTION IF EXISTS get_retention_policy(TEXT) CASCADE;
DROP TABLE IF EXISTS data_retention_config CASCADE;
```

**Migration 20251027000004** (API key encryption):
```sql
-- Rollback: Remove encryption (DANGEROUS - will lose encrypted keys!)
-- WARNING: This will make existing encrypted keys unreadable
ALTER TABLE api_keys DROP COLUMN IF EXISTS encrypted_key;
DROP FUNCTION IF EXISTS encrypt_api_key(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS decrypt_api_key(BYTEA, TEXT) CASCADE;
DROP FUNCTION IF EXISTS hash_api_key(TEXT) CASCADE;
-- NOTE: You'll need to regenerate all API keys after this rollback
```

**Migration 20251027000005** (SECURITY DEFINER search_path):
```sql
-- Rollback: This is SAFE to rollback - just removes security improvement
-- No specific rollback needed - functions will work without SET search_path
-- But they'll be vulnerable again

-- To actually rollback (not recommended):
-- You'd need to ALTER each function to remove SET search_path
-- Example:
-- ALTER FUNCTION has_role(UUID, UUID, app_role) RESET search_path;
```

**Migration 20251027000006** (test suite):
```sql
-- Rollback: Remove test function
DROP FUNCTION IF EXISTS test_security_fixes() CASCADE;
```

**Migration 20251027000007** (GDPR Right to be Forgotten):
```sql
-- Rollback: Remove GDPR deletion system
DROP FUNCTION IF EXISTS execute_user_deletion(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS request_user_deletion(UUID) CASCADE;
DROP TABLE IF EXISTS deletion_requests CASCADE;
```

#### Step 3: Apply Rollback

```bash
# Create rollback migration file
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_rollback_XXXXX.sql << 'EOF'
-- Rollback migration XXXXX
-- Reason: [describe issue]

[paste rollback SQL from above]
EOF

# Apply rollback
npx supabase db push --file supabase/migrations/[rollback-file].sql

# Verify
# Check application functionality
# Review logs for errors
```

---

### Scenario 2: Rollback All Security Migrations

**When:** Multiple migrations causing issues, need complete rollback

**Time Required:** 20-30 minutes

#### Complete Rollback Script

```bash
#!/bin/bash
# rollback-all-security-migrations.sh

echo "⚠️  WARNING: This will rollback ALL security migrations!"
echo "This will:"
echo "  - Remove RLS policies added"
echo "  - Remove GDPR compliance features"
echo "  - Remove API key encryption (keys will need regeneration)"
echo "  - Remove security improvements"
echo ""
read -p "Are you ABSOLUTELY sure? (type 'YES' to confirm): " confirm

if [ "$confirm" != "YES" ]; then
  echo "Rollback cancelled."
  exit 1
fi

# Create comprehensive rollback migration
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_rollback_all_security.sql << 'EOF'
-- ============================================================================
-- COMPLETE SECURITY MIGRATIONS ROLLBACK
-- WARNING: This removes all security improvements from 2025-10-27
-- ============================================================================

BEGIN;

-- 7. Rollback GDPR Right to be Forgotten
DROP FUNCTION IF EXISTS execute_user_deletion(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS request_user_deletion(UUID) CASCADE;
DROP TABLE IF EXISTS deletion_requests CASCADE;

-- 6. Rollback test suite
DROP FUNCTION IF EXISTS test_security_fixes() CASCADE;

-- 5. Rollback SECURITY DEFINER protection (no action needed - safe to keep)
-- Functions will continue to work, just less secure

-- 4. Rollback API key encryption
-- ⚠️ WARNING: This will make existing encrypted keys unreadable
ALTER TABLE api_keys DROP COLUMN IF EXISTS encrypted_key;
DROP FUNCTION IF EXISTS encrypt_api_key(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS decrypt_api_key(BYTEA, TEXT) CASCADE;
DROP FUNCTION IF EXISTS hash_api_key(TEXT) CASCADE;

-- 3. Rollback GDPR data retention
SELECT cron.unschedule('daily-data-retention-cleanup');
DROP FUNCTION IF EXISTS cleanup_old_data() CASCADE;
DROP FUNCTION IF EXISTS get_retention_policy(TEXT) CASCADE;
DROP TABLE IF EXISTS data_retention_config CASCADE;

-- 2. Rollback dynamic table RLS
-- NOTE: This requires restoring original create_database function
-- Must be restored manually from backup or version control

-- 1. Rollback query_performance_log RLS
DROP POLICY IF EXISTS "Users can view own performance logs" ON query_performance_log;
DROP POLICY IF EXISTS "Users can insert own performance logs" ON query_performance_log;
DROP INDEX IF EXISTS idx_query_performance_log_user_id;

COMMIT;

-- Post-rollback actions required:
-- 1. Regenerate all API keys (existing encrypted keys are unusable)
-- 2. Restore original create_database function from backup
-- 3. Inform users of required actions
-- 4. Review and fix root cause before re-applying migrations
EOF

echo "Rollback migration created."
echo "Applying rollback..."

npx supabase db push --file supabase/migrations/*_rollback_all_security.sql

echo ""
echo "⚠️  POST-ROLLBACK ACTIONS REQUIRED:"
echo "1. All API keys must be regenerated (encrypted data lost)"
echo "2. Restore original create_database function from backup"
echo "3. Notify all users of the rollback"
echo "4. Investigate root cause before re-applying"
echo ""
```

---

### Scenario 3: Complete Application Rollback

**When:** Entire deployment is broken, need to restore previous version

**Time Required:** 30-60 minutes

#### Step 1: Immediate Actions

```bash
# 1. Enable maintenance mode (if available)
# Set this in your hosting platform

# 2. Stop incoming traffic
# Update DNS or load balancer to show maintenance page

# 3. Capture current state
echo "Capturing logs and state..."

# Save Supabase logs
# Dashboard > Logs > Download

# Save deployment logs
# From your hosting platform (Vercel, Netlify, etc.)

# Document error messages
```

#### Step 2: Database Rollback

```bash
# 1. Verify backup is available
ls -lh ./backups/backup_*.sql*

# Most recent backup:
LATEST_BACKUP=$(ls -t ./backups/backup_*.sql* | head -1)
echo "Latest backup: $LATEST_BACKUP"

# 2. Check backup metadata
cat "${LATEST_BACKUP%.*}_metadata.json"

# 3. Decompress if needed
if [[ $LATEST_BACKUP == *.gz ]]; then
  gunzip "$LATEST_BACKUP"
  LATEST_BACKUP="${LATEST_BACKUP%.gz}"
fi

# 4. Restore database
# ⚠️ CRITICAL: This will overwrite current database!
echo "⚠️  WARNING: About to restore database from backup"
echo "Current database will be OVERWRITTEN"
echo "Backup: $LATEST_BACKUP"
echo ""
read -p "Type 'RESTORE' to confirm: " confirm

if [ "$confirm" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

# Option A: Via Supabase Dashboard (RECOMMENDED)
echo "Restore via Supabase Dashboard:"
echo "1. Go to: https://app.supabase.com/project/uzcmaxfhfcsxzfqvaloz/database/backups"
echo "2. Click 'Restore' and upload: $LATEST_BACKUP"
echo "3. Wait for completion (5-15 minutes)"

# Option B: Via psql (requires credentials)
# psql "$DATABASE_URL" < "$LATEST_BACKUP"
```

#### Step 3: Application Rollback

```bash
# Revert to previous deployment

# For Vercel:
vercel rollback

# For Netlify:
netlify rollback

# For manual deployment:
# 1. Checkout previous git commit
git log --oneline -10  # Find last working commit
git checkout <commit-hash>

# 2. Rebuild
npm run build

# 3. Deploy
# ... deploy to your platform

# For Git-based platforms:
git revert HEAD  # Revert last commit
git push origin main  # Trigger automatic deployment
```

#### Step 4: Verification

```bash
# 1. Test database connection
# Via application health check endpoint

# 2. Test authentication
# Login with test user

# 3. Test critical paths
# - User can view their data
# - User can create/edit/delete
# - RLS is enforcing isolation

# 4. Check error logs
# Verify no errors in Supabase logs

# 5. Monitor performance
# Check response times and database load
```

#### Step 5: Communication

```markdown
# Template: Rollback Notification

Subject: Data Parse Desk - Service Restored

Dear Users,

We experienced a technical issue during our recent deployment and have
rolled back to the previous stable version.

**Current Status:** Service is fully operational

**Impact:**
- Downtime: [X] minutes
- Data loss: None (restored from backup)
- Required actions: [if any, e.g., API key regeneration]

**Timeline:**
- [Time]: Issue detected
- [Time]: Rollback initiated
- [Time]: Service restored

**Next Steps:**
We are investigating the root cause and will re-deploy the improvements
after thorough testing.

We apologize for any inconvenience.

Best regards,
The Data Parse Desk Team
```

---

## 🔍 Post-Rollback Investigation

### Root Cause Analysis Template

```markdown
# Rollback Incident Report

**Date:** YYYY-MM-DD
**Time:** HH:MM UTC
**Duration:** X minutes
**Impact:** [Users affected / Data loss / Revenue impact]

## What Happened

[Describe the issue that triggered rollback]

## Timeline

- **HH:MM** - Deployment started
- **HH:MM** - Issue first detected
- **HH:MM** - Issue confirmed critical
- **HH:MM** - Rollback decision made
- **HH:MM** - Rollback initiated
- **HH:MM** - Service restored
- **HH:MM** - Verification complete

## Root Cause

[Technical explanation of what went wrong]

## What Worked Well

- [Positive aspects, e.g., backup was available]
- [Quick detection]

## What Didn't Work

- [Issues during rollback]
- [Communication delays]

## Action Items

- [ ] Fix root cause issue
- [ ] Add test to prevent recurrence
- [ ] Update deployment checklist
- [ ] Improve monitoring/alerting
- [ ] Update documentation

## Lessons Learned

[Key takeaways for future deployments]
```

---

## 🛡️ Rollback Prevention

### Before Every Deployment

- [ ] **Create Fresh Backup**
  ```bash
  ./backup-database.sh --compress
  ```

- [ ] **Test in Staging**
  - Apply migrations to staging database
  - Run full test suite
  - Verify critical paths
  - Load test if significant changes

- [ ] **Review Changes**
  - Code review completed
  - Security review completed
  - Performance impact assessed

- [ ] **Prepare Rollback Plan**
  - Document rollback steps for this specific deployment
  - Identify rollback owner
  - Estimate rollback time

### During Deployment

- [ ] **Monitor Continuously**
  - Watch error rates
  - Monitor response times
  - Check database metrics

- [ ] **Deploy Gradually** (if possible)
  - Deploy to 10% of users first
  - Monitor for 30 minutes
  - Gradually increase to 100%

- [ ] **Verify Immediately**
  - Run automated tests
  - Manual smoke tests
  - Check critical features

### After Deployment

- [ ] **Extended Monitoring**
  - Monitor for 2 hours after deployment
  - Check logs every 15 minutes
  - Be ready to rollback quickly

- [ ] **Document Issues**
  - Log all errors and warnings
  - Document any workarounds applied
  - Update runbook with learnings

---

## 📞 Emergency Contacts

### Rollback Decision Makers

| Role | Name | Contact | Backup |
|------|------|---------|--------|
| **Technical Lead** | _________ | _________ | _________ |
| **Database Admin** | _________ | _________ | _________ |
| **DevOps Lead** | _________ | _________ | _________ |

### Escalation Path

1. **Detection** (0-5 min) - On-call engineer
2. **Assessment** (5-10 min) - Technical lead
3. **Decision** (10-15 min) - Technical lead + Product owner
4. **Execution** (15-45 min) - DevOps team

### Communication Channels

- **Internal:** Slack #incidents
- **External:** Status page + Email
- **Emergency:** Phone tree

---

## 🧪 Testing Rollback Procedure

**Recommendation:** Test rollback procedure quarterly in staging

```bash
# Quarterly Rollback Drill

1. Schedule drill (e.g., first Monday of quarter)
2. Deploy test changes to staging
3. Simulate critical issue
4. Execute rollback procedure
5. Verify restoration
6. Time the process
7. Document improvements needed
8. Update this document

Target Times:
- Single migration rollback: < 15 minutes
- Full rollback: < 45 minutes
```

---

## 📝 Rollback Checklist

### Quick Reference

**Phase 1: Assessment (5 min)**
- [ ] Issue documented
- [ ] Severity confirmed
- [ ] Stakeholders notified
- [ ] Backup verified

**Phase 2: Preparation (5 min)**
- [ ] Rollback plan identified
- [ ] Team assembled
- [ ] Maintenance mode enabled
- [ ] Downtime estimate communicated

**Phase 3: Execution (15-30 min)**
- [ ] Database backup created (new)
- [ ] Rollback migration applied
- [ ] Application reverted
- [ ] Service restored

**Phase 4: Verification (10 min)**
- [ ] Authentication working
- [ ] Critical features tested
- [ ] Error logs clean
- [ ] Performance normal

**Phase 5: Communication (5 min)**
- [ ] Users notified (service restored)
- [ ] Incident report started
- [ ] Post-mortem scheduled

---

## 🎯 Success Criteria

Rollback is successful when:

- ✅ Application is accessible
- ✅ Users can authenticate
- ✅ Critical features functional
- ✅ No data loss
- ✅ Error rate < 1%
- ✅ Response times normal
- ✅ Database stable
- ✅ All users notified

---

## 📚 Related Documents

- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Prevent issues with thorough testing
- [SECURITY_FIX_GUIDE.md](./SECURITY_FIX_GUIDE.md) - Troubleshooting before rollback
- [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Early issue detection
- [backup-database.sh](./backup-database.sh) - Automated backup script

---

**Remember:** The best rollback is the one you never need to execute. Thorough testing and gradual deployment prevent most critical issues.

---

*Last Updated: October 27, 2025*
