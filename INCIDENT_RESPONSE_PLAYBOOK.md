# 🚨 Incident Response Playbook

**Data Parse Desk 2.0 - Security Incident Response**

This playbook provides step-by-step procedures for responding to security incidents and data breaches.

---

## 📞 Emergency Contacts

### Security Team

| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|--------|
| **Incident Commander** | _________ | _________ | _________ | _________ |
| **Security Lead** | _________ | _________ | _________ | _________ |
| **Database Admin** | _________ | _________ | _________ | _________ |
| **Legal/Compliance** | _________ | _________ | _________ | _________ |
| **Communications** | _________ | _________ | _________ | _________ |

### External Contacts

- **Supabase Support:** support@supabase.com
- **Cloud Provider:** [Your cloud provider support]
- **Legal Counsel:** _________
- **PR/Communications:** _________
- **Law Enforcement:** [If required by regulation]

---

## 🎯 Incident Classification

### Severity Levels

#### **P0 - Critical** (Response time: Immediate)
- Active data breach in progress
- Unauthorized admin access
- Ransomware/malware infection
- Complete service outage
- Mass data exposure

#### **P1 - High** (Response time: 1 hour)
- Suspected data breach
- RLS policy bypass detected
- Multiple failed authentication attempts
- API key compromise
- Significant service degradation

#### **P2 - Medium** (Response time: 4 hours)
- Single user account compromise
- Suspicious access patterns
- Configuration vulnerabilities
- Minor data exposure

#### **P3 - Low** (Response time: 24 hours)
- Security scanning attempts
- Failed intrusion attempts
- Policy violations
- Potential vulnerabilities

---

## 📋 Incident Response Phases

### Phase 1: Detection & Initial Response (0-15 minutes)

#### 1.1 Incident Detection

**How incidents are detected:**
- Automated alerts from monitoring systems
- User reports
- Security audit findings
- Anomaly detection
- Third-party notifications

#### 1.2 Initial Assessment

```markdown
**Incident Report Template**

Report ID: INC-YYYYMMDD-XXX
Date/Time: YYYY-MM-DD HH:MM UTC
Reporter: [Name/System]
Severity: [P0/P1/P2/P3]

**Incident Summary:**
[Brief description of what was detected]

**Initial Indicators:**
- [What triggered the alert?]
- [What systems are affected?]
- [How many users impacted?]

**Immediate Actions Taken:**
- [ ] None yet
- [ ] [Action taken]
```

#### 1.3 Immediate Actions (P0/P1 Only)

```bash
# 1. Preserve Evidence
# Take immediate snapshots before any changes

# Capture current database state
echo "$(date): Incident detected" >> incident_log.txt

# Capture Supabase logs
# Dashboard > Logs > Download last 24 hours

# Capture application logs
# From your hosting platform

# 2. Contain the Threat (if ongoing)
# See "Containment Procedures" below
```

---

### Phase 2: Containment (15-60 minutes)

#### 2.1 P0 - Critical Containment

**Scenario: Active Data Breach**

```bash
# IMMEDIATE ACTIONS:

# 1. Enable maintenance mode (if available)
# This stops all user access immediately

# 2. Revoke compromised credentials
# Via Supabase Dashboard > Authentication > Users
# - Revoke all sessions for compromised user
# - Reset password
# - Disable account temporarily

# 3. Block suspicious IP addresses
# Via Supabase Dashboard > Settings > Network Restrictions
# Add IP to blocklist

# 4. Rotate all API keys
UPDATE api_keys
SET is_active = false
WHERE last_used_at > NOW() - INTERVAL '24 hours';
-- Generate new keys for legitimate users

# 5. Enable enhanced logging
UPDATE audit_config
SET log_level = 'DEBUG',
    log_all_queries = true;
```

**Scenario: RLS Policy Bypass**

```sql
-- IMMEDIATE ACTIONS:

-- 1. Disable the affected table(s)
ALTER TABLE [affected_table] DISABLE TRIGGER ALL;

-- 2. Audit who accessed the data
SELECT
  user_id,
  query,
  created_at,
  ip_address
FROM query_performance_log
WHERE table_name = '[affected_table]'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 3. Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = '[affected_table]';

-- 4. Re-enable RLS if disabled
ALTER TABLE [affected_table] ENABLE ROW LEVEL SECURITY;

-- 5. Verify policies exist
SELECT * FROM pg_policies
WHERE tablename = '[affected_table]';
```

**Scenario: Ransomware/Malware**

```bash
# IMMEDIATE ACTIONS:

# 1. DISCONNECT FROM NETWORK
# Isolate affected systems immediately

# 2. DO NOT pay ransom
# Contact law enforcement and legal counsel

# 3. Restore from clean backup
# See ROLLBACK_PROCEDURE.md

# 4. Scan all systems
# Run antivirus/antimalware on all machines

# 5. Change all credentials
# Assume all passwords and keys are compromised
```

#### 2.2 P1 - High Containment

**Scenario: Suspected Account Compromise**

```sql
-- 1. Audit recent activity
SELECT
  user_id,
  event_type,
  ip_address,
  user_agent,
  created_at
FROM security_events
WHERE user_id = '[suspected_user_id]'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 2. Check for unusual access patterns
SELECT
  table_name,
  operation,
  COUNT(*) as access_count,
  ARRAY_AGG(DISTINCT ip_address) as ips_used
FROM query_performance_log
WHERE user_id = '[suspected_user_id]'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, operation
ORDER BY access_count DESC;

-- 3. Temporarily disable account
UPDATE auth.users
SET is_banned = true
WHERE id = '[suspected_user_id]';

-- 4. Revoke all active sessions
DELETE FROM auth.sessions
WHERE user_id = '[suspected_user_id]';

-- 5. Notify user (if legitimate)
-- Send email about suspicious activity
-- Provide password reset link
```

**Scenario: API Key Compromise**

```sql
-- 1. Immediately revoke compromised key
UPDATE api_keys
SET is_active = false,
    revoked_at = NOW(),
    revoked_reason = 'Security incident: [INC-ID]'
WHERE id = '[compromised_key_id]';

-- 2. Audit key usage
SELECT
  endpoint,
  method,
  status_code,
  ip_address,
  created_at
FROM api_key_usage_log
WHERE api_key_id = '[compromised_key_id]'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- 3. Check for data exfiltration
SELECT
  endpoint,
  COUNT(*) as request_count,
  SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as successful_requests
FROM api_key_usage_log
WHERE api_key_id = '[compromised_key_id]'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY endpoint
ORDER BY request_count DESC;

-- 4. Generate new key for legitimate user
-- Via application or SQL:
SELECT generate_api_key('[user_id]', 'Replacement for compromised key');
```

---

### Phase 3: Eradication (1-4 hours)

#### 3.1 Root Cause Analysis

**Investigation Checklist:**

- [ ] How did the breach occur?
- [ ] What vulnerability was exploited?
- [ ] When did it start?
- [ ] What data was accessed/modified?
- [ ] How many users affected?
- [ ] Was data exfiltrated?
- [ ] Are there other affected systems?

#### 3.2 Remove Threat

```bash
# 1. Patch vulnerability
# Apply security patches or code fixes

# 2. Remove backdoors
# Check for:
# - Unauthorized user accounts
# - Rogue API keys
# - Modified edge functions
# - Suspicious database objects

# 3. Clean infected systems
# If malware detected:
# - Wipe and reinstall
# - Restore from clean backup
# - Verify no persistence mechanisms
```

#### 3.3 Verify Integrity

```sql
-- Check for unauthorized changes

-- 1. Audit database schema changes
SELECT
  schema_name,
  object_name,
  object_type,
  changed_at,
  changed_by
FROM schema_change_log
WHERE changed_at > '[incident_start_time]'
ORDER BY changed_at DESC;

-- 2. Verify RLS policies intact
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public';
-- Should be 192+

-- 3. Check for new SECURITY DEFINER functions
SELECT
  proname,
  prosecdef,
  proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY proname;

-- 4. Audit user accounts
SELECT
  id,
  email,
  created_at,
  last_sign_in_at,
  is_super_admin
FROM auth.users
WHERE created_at > '[incident_start_time]'
   OR is_super_admin = true
ORDER BY created_at DESC;
```

---

### Phase 4: Recovery (4-24 hours)

#### 4.1 Restore Normal Operations

```bash
# 1. Verify threat is eliminated
# Run security scans
# Review logs for anomalies

# 2. Restore from backup if needed
# See ROLLBACK_PROCEDURE.md

# 3. Gradually restore service
# Start with limited access
# Monitor closely for 1-2 hours
# Gradually increase to full access

# 4. Enable enhanced monitoring
# Increase log retention
# Add specific alerts for this incident type
```

#### 4.2 Strengthen Defenses

```sql
-- 1. Add new security policies if needed
-- Example: Restrict access from certain countries
INSERT INTO access_policies (policy_type, policy_config)
VALUES ('geo_restriction', '{"blocked_countries": ["XX", "YY"]}');

-- 2. Add rate limiting for affected endpoints
INSERT INTO rate_limit_overrides (endpoint, max_requests, window_seconds)
VALUES ('[affected_endpoint]', 10, 60);  -- 10 requests per minute

-- 3. Enable additional logging
INSERT INTO audit_rules (table_name, log_level, log_all_operations)
VALUES ('[affected_table]', 'DEBUG', true);
```

#### 4.3 Update Security Controls

- [ ] Update firewall rules
- [ ] Add new IDS/IPS signatures
- [ ] Update security policies
- [ ] Add new monitoring alerts
- [ ] Schedule security training

---

### Phase 5: Post-Incident (24-72 hours)

#### 5.1 Notification Requirements

**GDPR Breach Notification (if applicable):**

> If personal data was breached, you MUST notify:
> - **Supervisory Authority:** Within 72 hours
> - **Affected Users:** Without undue delay if high risk

```markdown
**Breach Notification Template (Users)**

Subject: Important Security Notice - Data Breach Notification

Dear [User],

We are writing to inform you of a security incident that may have affected
your personal data.

**What Happened:**
[Brief description of the incident]

**What Information Was Involved:**
[List specific data types: email, name, etc.]

**What We Are Doing:**
- [Actions taken to contain and remediate]
- [Security improvements implemented]

**What You Should Do:**
- Change your password immediately
- Enable two-factor authentication
- Monitor your account for suspicious activity
- [Other specific actions]

**Timeline:**
- Incident Detected: [Date/Time]
- Incident Contained: [Date/Time]
- Investigation Completed: [Date/Time]

We sincerely apologize for this incident and any inconvenience caused.

For questions, contact: security@yourdomain.com

Best regards,
[Your Company] Security Team
```

#### 5.2 Post-Incident Report

```markdown
# Security Incident Report

**Incident ID:** INC-YYYYMMDD-XXX
**Classification:** [P0/P1/P2/P3]
**Status:** Resolved
**Report Date:** YYYY-MM-DD

## Executive Summary

[2-3 sentence summary of what happened and impact]

## Incident Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Incident detected via [source] |
| HH:MM | Incident confirmed, severity P[X] |
| HH:MM | Containment actions initiated |
| HH:MM | Threat eradicated |
| HH:MM | Service restored |
| HH:MM | Post-incident review completed |

**Total Duration:** X hours Y minutes

## Impact Assessment

**Users Affected:** X users
**Data Exposed:** [Type and volume]
**Financial Impact:** $X (estimated)
**Reputation Impact:** [Assessment]

## Root Cause

**Primary Cause:**
[Technical explanation]

**Contributing Factors:**
- [Factor 1]
- [Factor 2]

## Response Actions

**Containment:**
- [Action 1]
- [Action 2]

**Eradication:**
- [Action 1]
- [Action 2]

**Recovery:**
- [Action 1]
- [Action 2]

## Lessons Learned

**What Went Well:**
- [Positive aspect 1]
- [Positive aspect 2]

**What Could Be Improved:**
- [Improvement 1]
- [Improvement 2]

## Preventive Measures

**Immediate (Completed):**
- [x] [Action 1]
- [x] [Action 2]

**Short-term (1 month):**
- [ ] [Action 1]
- [ ] [Action 2]

**Long-term (3 months):**
- [ ] [Action 1]
- [ ] [Action 2]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

---

**Prepared by:** [Name], [Role]
**Reviewed by:** [Name], [Role]
**Approved by:** [Name], [Role]
```

---

## 🔍 Investigation Tools & Queries

### Audit Recent Database Changes

```sql
-- All operations in last 24 hours
SELECT
  user_id,
  table_name,
  operation,
  created_at,
  ip_address
FROM query_performance_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 1000;
```

### Find Suspicious Access Patterns

```sql
-- Users accessing unusual amount of data
SELECT
  user_id,
  COUNT(DISTINCT table_name) as tables_accessed,
  COUNT(*) as total_queries,
  ARRAY_AGG(DISTINCT ip_address) as ips_used
FROM query_performance_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING COUNT(*) > 1000  -- Threshold for suspicious activity
ORDER BY total_queries DESC;
```

### Detect Data Exfiltration

```sql
-- Large exports or downloads
SELECT
  user_id,
  query_type,
  execution_time_ms,
  row_count,
  created_at
FROM query_performance_log
WHERE query_type = 'SELECT'
  AND row_count > 10000  -- Large result sets
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY row_count DESC;
```

### Check for Privilege Escalation

```sql
-- Recent role changes
SELECT
  pm.user_id,
  pm.role,
  pm.granted_at,
  u.email
FROM project_members pm
JOIN auth.users u ON pm.user_id = u.id
WHERE pm.granted_at > NOW() - INTERVAL '7 days'
  AND pm.role IN ('admin', 'owner')
ORDER BY pm.granted_at DESC;
```

---

## 📞 Communication Templates

### Internal Alert (Slack/Email)

```
🚨 SECURITY INCIDENT ALERT 🚨

Severity: [P0/P1/P2/P3]
Incident ID: INC-YYYYMMDD-XXX
Detected: YYYY-MM-DD HH:MM UTC

Summary: [Brief description]

Status: [Investigating/Contained/Resolved]

Actions Required:
- [Action for security team]
- [Action for dev team]
- [Action for support team]

War Room: [Meeting link]
Updates: #incident-response channel
```

### Status Page Update

```
[SERVICE STATUS UPDATE]

We are currently investigating a security issue affecting [service/feature].

Impact: [Description of user impact]
Status: Investigating
ETA: [Estimated resolution time]

We will provide updates every [timeframe].

Last updated: YYYY-MM-DD HH:MM UTC
```

---

## ✅ Incident Response Checklist

### Detection Phase
- [ ] Incident detected and logged
- [ ] Severity assessed
- [ ] Incident commander assigned
- [ ] Security team notified
- [ ] Evidence preservation started

### Containment Phase
- [ ] Threat contained
- [ ] Affected systems isolated
- [ ] Compromised credentials revoked
- [ ] Enhanced logging enabled
- [ ] Stakeholders notified

### Eradication Phase
- [ ] Root cause identified
- [ ] Vulnerability patched
- [ ] Backdoors removed
- [ ] Systems verified clean
- [ ] Integrity checks completed

### Recovery Phase
- [ ] Service restored
- [ ] Monitoring enhanced
- [ ] Security controls updated
- [ ] Systems verified operational
- [ ] Performance validated

### Post-Incident Phase
- [ ] Users notified (if required)
- [ ] Authorities notified (if required)
- [ ] Incident report completed
- [ ] Lessons learned documented
- [ ] Preventive measures implemented
- [ ] Team debrief conducted

---

## 📚 Related Documents

- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) - Security baseline
- [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md) - Recovery procedures
- [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Detection systems
- [backup-database.sh](./backup-database.sh) - Backup procedures

---

## 🎓 Training & Drills

**Recommendation:** Conduct incident response drills quarterly

**Drill Scenarios:**
1. Simulated data breach
2. Ransomware attack
3. Account takeover
4. API key compromise
5. RLS policy bypass

**Objectives:**
- Test response procedures
- Identify gaps
- Train new team members
- Improve response time

---

*Last Updated: October 27, 2025*
*Next Review: January 27, 2026*
