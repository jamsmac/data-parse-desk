# DISASTER RECOVERY PLAN

## DataParseDesk Backup & Recovery Procedures

**Last Updated:** 2025-10-23
**Owner:** DevOps Team
**Emergency Contact:** support@dataparsedesk.com
**Status:** Production Ready

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Recovery Procedures](#recovery-procedures)
4. [Emergency Contacts](#emergency-contacts)
5. [Testing Schedule](#testing-schedule)

---

## OVERVIEW

### Recovery Time Objective (RTO)
**Target:** 4 hours
The maximum acceptable downtime before critical business impact.

### Recovery Point Objective (RPO)
**Target:** 1 hour
The maximum acceptable data loss in case of disaster.

### Backup Scope
- ✅ PostgreSQL database (Supabase hosted)
- ✅ User-uploaded files (Supabase Storage)
- ✅ Schema versions (automatic snapshots)
- ✅ Edge function code (Git repository)
- ✅ Environment variables (encrypted in 1Password)

---

## BACKUP STRATEGY

### 1. DATABASE BACKUPS

#### Automatic Backups (Supabase)
**Frequency:** Daily at 00:00 UTC
**Retention:** 7 days (Professional Plan)
**Storage:** Supabase managed backups

**What's Included:**
- All PostgreSQL tables
- User data, schemas, configurations
- RLS policies, functions, triggers
- Audit logs, usage statistics

**How to Verify:**
```bash
# Via Supabase Dashboard
1. Navigate to: https://supabase.com/dashboard/project/puavudiivxuknvtbnotv/database/backups
2. Verify latest backup timestamp
3. Check backup size and status
```

#### Manual Backup (On-Demand)
```bash
# Using Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Using pg_dump directly
pg_dump "postgresql://postgres:[PASSWORD]@db.puavudiivxuknvtbnotv.supabase.co:5432/postgres" \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Schema Version Snapshots
**Frequency:** On every schema change
**Storage:** `schema_versions` table
**Endpoint:** `/schema-version-create`

```typescript
// Trigger schema snapshot
await supabase.functions.invoke('schema-version-create', {
  body: {
    database_id: 'your-database-id',
    description: 'Pre-migration backup'
  }
});
```

**Restore from snapshot:**
```typescript
await supabase.functions.invoke('schema-version-restore', {
  body: {
    database_id: 'your-database-id',
    version_id: 'snapshot-version-id'
  }
});
```

### 2. FILE STORAGE BACKUPS

#### Supabase Storage
**Frequency:** Continuous (object storage)
**Replication:** Multi-region (AWS S3)
**Versioning:** Enabled on critical buckets

**Buckets:**
- `item-attachments` - User uploaded files
- `profile-avatars` - User profile pictures
- `exports` - Generated reports and exports

**Manual Download All Files:**
```bash
# Using Supabase CLI
supabase storage ls item-attachments --recursive | \
  xargs -I {} supabase storage download item-attachments/{}
```

### 3. CODE REPOSITORY BACKUPS

#### Git Repository
**Primary:** GitHub (github.com/yourorg/data-parse-desk-2)
**Backup:** GitLab mirror (automatic daily sync)
**Local Clones:** Developer machines

**Protected Branches:**
- `main` - Production
- `staging` - Staging environment
- `develop` - Development

**Backup Verification:**
```bash
# Check remote backups
git remote -v

# Verify GitLab mirror
git fetch gitlab
git log gitlab/main
```

### 4. ENVIRONMENT VARIABLES

#### Storage
**Primary:** Supabase Dashboard (Secrets)
**Backup:** 1Password Vault (encrypted)
**Access:** DevOps team only

**Critical Variables:**
```bash
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
TELEGRAM_BOT_TOKEN
GEMINI_API_KEY
SENTRY_DSN
```

**Backup Process:**
1. Export from Supabase: Settings → Edge Functions → Secrets
2. Save to 1Password: DevOps Vault → DataParseDesk Secrets
3. Update date: Document last backup date

---

## RECOVERY PROCEDURES

### SCENARIO 1: Database Corruption

**Symptoms:**
- Unable to query database
- Integrity errors in logs
- RLS policy failures

**Recovery Steps:**

1. **Immediate Response (0-15 min)**
   ```bash
   # Activate incident response
   - Notify DevOps team
   - Enable maintenance mode
   - Stop all writes to database
   ```

2. **Assess Damage (15-30 min)**
   ```bash
   # Check database integrity
   supabase db status

   # Review error logs
   supabase logs --type database --limit 1000
   ```

3. **Restore from Backup (30 min - 2 hours)**
   ```bash
   # Option A: Restore from Supabase automatic backup
   1. Go to: Dashboard → Database → Backups
   2. Select latest backup before corruption
   3. Click "Restore"
   4. Confirm restoration (creates new instance)

   # Option B: Restore from manual backup
   psql "postgresql://postgres:[PASSWORD]@db.puavudiivxuknvtbnotv.supabase.co:5432/postgres" \
     < backup_20251023_120000.sql
   ```

4. **Verify Restoration (2-3 hours)**
   ```bash
   # Check table counts
   SELECT
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
     (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = schemaname AND table_name = tablename) AS row_count
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

   # Run application smoke tests
   npm run test:e2e
   ```

5. **Resume Operations (3-4 hours)**
   ```bash
   # Disable maintenance mode
   # Notify users via email/Telegram
   # Monitor for 24 hours
   ```

**Data Loss:** Up to 1 hour (based on RPO)

---

### SCENARIO 2: Accidental Data Deletion

**Symptoms:**
- User reports missing data
- Audit logs show DELETE operations
- Empty tables or missing rows

**Recovery Steps:**

1. **Immediate Response (0-5 min)**
   ```bash
   # Identify affected resources
   - Which databases/tables?
   - Time of deletion?
   - User ID responsible?

   # Check audit logs
   SELECT * FROM audit_log
   WHERE action = 'delete'
   AND created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

2. **Restore from Schema Version (5-30 min)**
   ```bash
   # If schema version snapshot exists (within last 7 days)
   await supabase.functions.invoke('schema-version-restore', {
     body: {
       database_id: 'affected-database-id',
       version_id: 'snapshot-before-deletion'
     }
   });
   ```

3. **Selective Restore from Backup (30 min - 2 hours)**
   ```bash
   # Restore specific table from backup
   pg_restore --table=table_data --data-only \
     backup_20251023_120000.sql | \
     psql "postgresql://postgres:[PASSWORD]@..."
   ```

4. **Manual Data Recovery (2-4 hours)**
   ```bash
   # If backup is stale, reconstruct from:
   - File uploads (item_attachments table)
   - Import history (files table)
   - Webhook logs (api_usage table)
   ```

**Data Loss:** Minimal (depends on backup age)

---

### SCENARIO 3: Complete Platform Failure (Supabase Outage)

**Symptoms:**
- Supabase dashboard unreachable
- All API requests failing
- Edge functions not responding

**Recovery Steps:**

1. **Immediate Response (0-10 min)**
   ```bash
   # Verify Supabase status
   https://status.supabase.com

   # Activate static maintenance page
   # Notify users via Telegram bot (fallback)
   ```

2. **Alternative Hosting Setup (1-4 hours)**
   ```bash
   # Deploy to backup infrastructure
   # Option A: Self-hosted Supabase instance
   # Option B: Alternative provider (Neon, PlanetScale)

   # Restore from latest backup
   pg_restore backup_20251023_120000.sql

   # Update DNS records
   # Deploy edge functions to Cloudflare Workers
   ```

3. **Data Synchronization (4-8 hours)**
   ```bash
   # Once Supabase recovers:
   # Sync data from backup instance to primary
   # Verify data integrity
   # Switch DNS back to primary
   ```

**RTO:** 8 hours
**Data Loss:** Up to 1 hour

---

### SCENARIO 4: Security Breach / Data Leak

**Symptoms:**
- Unauthorized access detected
- Unusual API usage patterns
- Credential leak reported

**Recovery Steps:**

1. **Immediate Response (0-5 min)**
   ```bash
   # STOP ALL ACCESS
   # Rotate all API keys
   UPDATE api_keys SET is_active = false;

   # Disable compromised users
   # Enable audit logging
   ```

2. **Forensic Analysis (5 min - 1 hour)**
   ```bash
   # Review access logs
   SELECT * FROM api_usage
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY status_code, response_time_ms DESC;

   # Check audit trail
   SELECT * FROM audit_log
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **Containment (1-2 hours)**
   ```bash
   # Rotate all secrets
   - Stripe API keys
   - Telegram bot tokens
   - Gemini API keys
   - JWT secrets

   # Force password reset for all users
   # Enable 2FA requirement
   ```

4. **Recovery (2-4 hours)**
   ```bash
   # Restore from backup BEFORE breach
   # Re-apply RLS policies
   # Verify security configuration
   # Penetration testing
   ```

5. **Notification (4-24 hours)**
   ```bash
   # Notify affected users
   # Report to authorities (if required)
   # Public disclosure (if necessary)
   ```

---

## BACKUP VERIFICATION CHECKLIST

### Daily (Automated)
- [ ] Supabase automatic backup completed
- [ ] Backup size within expected range (±20%)
- [ ] No backup errors in logs
- [ ] Storage space sufficient (> 20% free)

### Weekly (Manual)
- [ ] Download and verify one backup file
- [ ] Restore backup to staging environment
- [ ] Run smoke tests on restored data
- [ ] Verify edge functions working
- [ ] Check file storage integrity

### Monthly (Manual)
- [ ] Full disaster recovery drill
- [ ] Restore to completely new environment
- [ ] Time the recovery process (RTO check)
- [ ] Verify data integrity (RPO check)
- [ ] Update documentation

---

## EMERGENCY CONTACTS

### Internal Team

| Role | Name | Email | Phone | Timezone |
|------|------|-------|-------|----------|
| CTO | [Name] | cto@company.com | +1-XXX-XXX-XXXX | UTC-5 |
| DevOps Lead | [Name] | devops@company.com | +1-XXX-XXX-XXXX | UTC-5 |
| Backend Lead | [Name] | backend@company.com | +1-XXX-XXX-XXXX | UTC-5 |
| On-Call Engineer | Rotation | oncall@company.com | PagerDuty | 24/7 |

### External Vendors

| Vendor | Contact | Purpose | SLA |
|--------|---------|---------|-----|
| Supabase Support | support@supabase.com | Database/hosting issues | 1 hour |
| GitHub Support | support@github.com | Repository access issues | 24 hours |
| Stripe Support | support@stripe.com | Payment processing | 2 hours |
| Sentry Support | support@sentry.io | Error tracking | 24 hours |

### Escalation Path
1. On-call engineer (immediate)
2. DevOps Lead (within 15 min)
3. CTO (within 30 min)
4. CEO (within 1 hour for critical incidents)

---

## MONITORING & ALERTS

### Automated Alerts (PagerDuty)
- Database connection failures
- Backup job failures
- Storage space < 20%
- API error rate > 5%
- Edge function failures > 10/min

### Dashboard Monitoring
- Supabase Dashboard: Real-time metrics
- Sentry: Error tracking
- Grafana: Custom dashboards
- Status Page: Public status

---

## POST-RECOVERY CHECKLIST

After completing recovery:

- [ ] Document incident timeline
- [ ] Root cause analysis (RCA)
- [ ] Update DR procedures
- [ ] Notify stakeholders
- [ ] Schedule retrospective meeting
- [ ] Implement preventive measures
- [ ] Update monitoring/alerts
- [ ] Test improvements

---

## TESTING SCHEDULE

| Test Type | Frequency | Last Performed | Next Due |
|-----------|-----------|----------------|----------|
| Backup Restoration | Weekly | 2025-10-23 | 2025-10-30 |
| Full DR Drill | Monthly | 2025-10-01 | 2025-11-01 |
| Schema Snapshot | On-demand | 2025-10-23 | As needed |
| Security Breach Drill | Quarterly | 2025-10-01 | 2026-01-01 |

---

## VERSION HISTORY

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-23 | Initial DR plan | DevOps Team |

---

## APPENDIX

### A. Useful Commands

```bash
# Check database size
SELECT pg_size_pretty(pg_database_size('postgres'));

# List all tables with sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Export environment variables
supabase secrets list

# Check edge function status
supabase functions list

# View recent logs
supabase logs --type edge --function ai-orchestrator --limit 100
```

### B. Third-Party Backup Tools

- **pgBackRest**: Advanced PostgreSQL backup tool
- **Restic**: Encrypted backup solution
- **rclone**: Cloud storage sync
- **Velero**: Kubernetes backup (if using K8s)

### C. Data Retention Policy

| Data Type | Retention | Archive Location |
|-----------|-----------|------------------|
| User data | Indefinite | Primary database |
| Audit logs | 1 year | Cold storage (S3 Glacier) |
| Backups | 7 days | Supabase managed |
| Manual backups | 30 days | S3 Standard |
| File uploads | Indefinite | Supabase Storage |

---

**Document Maintained By:** DevOps Team
**Review Frequency:** Quarterly
**Last Review:** 2025-10-23
**Next Review:** 2026-01-23
