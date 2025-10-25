# 🔐 Security Policies

**Data Parse Desk 2.0 - Security Policy Templates**

This document provides security policy templates and guidelines for your organization.

---

## 📋 Table of Contents

1. [Information Security Policy](#information-security-policy)
2. [Access Control Policy](#access-control-policy)
3. [Data Classification Policy](#data-classification-policy)
4. [Password Policy](#password-policy)
5. [Encryption Policy](#encryption-policy)
6. [Incident Response Policy](#incident-response-policy)
7. [Data Retention Policy](#data-retention-policy)
8. [API Security Policy](#api-security-policy)
9. [Third-Party Security Policy](#third-party-security-policy)
10. [Security Awareness Policy](#security-awareness-policy)

---

## 1. Information Security Policy

### 1.1 Purpose

To establish a framework for protecting information assets and ensure confidentiality, integrity, and availability of data.

### 1.2 Scope

This policy applies to:
- All employees, contractors, and third parties
- All information systems and data
- All physical and digital assets

### 1.3 Responsibilities

**Management:**
- Approve and enforce security policies
- Allocate resources for security
- Review policies annually

**Security Team:**
- Implement security controls
- Monitor compliance
- Respond to incidents

**All Users:**
- Follow security policies
- Report security incidents
- Protect credentials

### 1.4 Security Principles

1. **Least Privilege:** Users have only the minimum access needed
2. **Defense in Depth:** Multiple layers of security controls
3. **Separation of Duties:** No single person controls entire process
4. **Secure by Default:** Security built into systems from start
5. **Continuous Monitoring:** Regular security monitoring and auditing

### 1.5 Compliance

- GDPR (General Data Protection Regulation)
- SOC 2 (Service Organization Control 2)
- ISO 27001 (Information Security Management)

### 1.6 Policy Review

- **Frequency:** Annually or after major incidents
- **Owner:** Chief Security Officer
- **Approval:** Executive Management

---

## 2. Access Control Policy

### 2.1 User Access Management

**Account Creation:**
```
1. New user request submitted via [system]
2. Manager approval required
3. Access provisioned based on role
4. User notified and trained
5. Access reviewed after 90 days
```

**Account Types:**

| Role | Access Level | Approval Required |
|------|--------------|-------------------|
| Owner | Full access | Executive approval |
| Admin | Database management | Security team approval |
| Editor | Read/write data | Manager approval |
| Viewer | Read-only | Manager approval |

**Account Termination:**
```
1. HR notifies security team
2. Access revoked within 1 hour
3. Data backed up if needed
4. Account deactivated (not deleted for 90 days)
5. Audit log review
```

### 2.2 Authentication Requirements

**Password Requirements:**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- No common words or patterns
- Changed every 90 days
- No reuse of last 5 passwords

**Multi-Factor Authentication (MFA):**
- Required for all admin accounts
- Required for remote access
- Recommended for all users
- Supported methods: TOTP apps, hardware tokens

### 2.3 Authorization

**Role-Based Access Control (RBAC):**
```sql
-- Define roles with specific permissions
CREATE TYPE app_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Assign permissions to roles
Role: owner
  - Full database control
  - User management
  - Billing access
  - Delete project

Role: admin
  - Modify schema
  - Manage members
  - View all data

Role: editor
  - Create/edit/delete data
  - Export data
  - Create views

Role: viewer
  - Read-only access
  - Export own data
```

### 2.4 Session Management

- **Session Timeout:** 30 minutes inactivity
- **Maximum Session:** 8 hours
- **Concurrent Sessions:** 3 per user
- **Re-authentication:** Required for sensitive operations

---

## 3. Data Classification Policy

### 3.1 Classification Levels

| Level | Description | Examples | Protection |
|-------|-------------|----------|------------|
| **Public** | No harm if disclosed | Marketing materials | Basic security |
| **Internal** | Minor harm if disclosed | Internal docs | Access control |
| **Confidential** | Significant harm | Customer data | Encryption + RLS |
| **Restricted** | Severe harm | Payment info, PII | Strong encryption + audit |

### 3.2 Data Handling Requirements

**Confidential Data:**
- ✅ Encrypted at rest (AES-256)
- ✅ Encrypted in transit (TLS 1.3)
- ✅ Access logged and monitored
- ✅ RLS policies enforced
- ✅ Regular access reviews

**Restricted Data:**
- ✅ All Confidential requirements PLUS:
- ✅ MFA required for access
- ✅ Data masking in non-production
- ✅ Audit trail required
- ✅ Data loss prevention (DLP)

### 3.3 Data Labeling

**In Database:**
```sql
-- Tag sensitive columns
COMMENT ON COLUMN users.email IS 'Classification: Confidential, PII';
COMMENT ON COLUMN api_keys.encrypted_key IS 'Classification: Restricted';
```

**In Code:**
```typescript
// Mark sensitive data in comments
interface User {
  id: string;
  email: string;  // @classification confidential @pii
  name: string;   // @classification confidential @pii
  role: string;   // @classification internal
}
```

---

## 4. Password Policy

### 4.1 Password Requirements

**Complexity:**
- **Length:** Minimum 12 characters (16+ recommended)
- **Composition:**
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (!@#$%^&*)

**Prohibited:**
- User's name or username
- Common words (password, admin, etc.)
- Sequential characters (123456, abcdef)
- Repeated characters (aaaaaa)
- Previously used passwords (last 5)

### 4.2 Password Storage

**Application Passwords:**
```typescript
// NEVER store plaintext passwords
// Use bcrypt with appropriate work factor
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;  // Adjust based on security needs
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
```

**Service Accounts:**
- Stored in secure vault (e.g., 1Password, HashiCorp Vault)
- Rotated every 90 days
- Access logged and monitored

### 4.3 Password Recovery

**Reset Process:**
1. User initiates reset via verified email
2. Time-limited reset token sent (valid 1 hour)
3. Token can only be used once
4. New password must differ from old
5. Security event logged

**Account Lockout:**
- Lock after 5 failed attempts
- Lockout duration: 30 minutes
- Unlock via email verification or admin
- All attempts logged

---

## 5. Encryption Policy

### 5.1 Encryption Standards

**Data at Rest:**
- **Algorithm:** AES-256
- **Key Management:** Secure vault (rotated annually)
- **Scope:** All confidential and restricted data

**Data in Transit:**
- **Protocol:** TLS 1.3 (minimum TLS 1.2)
- **Cipher Suites:** Strong ciphers only
- **Certificate Management:** Auto-renewal, 90-day rotation

### 5.2 Implementation

**API Keys:**
```sql
-- Encrypt with AES-256
CREATE FUNCTION encrypt_api_key(
  p_plaintext_key TEXT,
  p_encryption_password TEXT
) RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(
    p_plaintext_key,
    p_encryption_password,
    'compress-algo=1, cipher-algo=aes256'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

**Database Connections:**
```
# Always use SSL/TLS
PGSSLMODE=require
PGSSLROOTCERT=/path/to/ca-certificate.crt
```

### 5.3 Key Management

**Encryption Key Requirements:**
- **Length:** Minimum 256 bits
- **Generation:** Cryptographically secure random
- **Storage:** Secure vault, never in code
- **Rotation:** Every 90 days
- **Backup:** Encrypted backup in separate location

**Key Rotation Process:**
```bash
# 1. Generate new key
NEW_KEY=$(openssl rand -base64 32)

# 2. Re-encrypt data with new key
# (Use migration with both old and new keys)

# 3. Update environment variables
# (Zero-downtime deployment)

# 4. Securely delete old key
# (After verifying all data re-encrypted)
```

---

## 6. Incident Response Policy

### 6.1 Incident Classification

See [INCIDENT_RESPONSE_PLAYBOOK.md](./INCIDENT_RESPONSE_PLAYBOOK.md) for detailed procedures.

**Response Times:**
- P0 (Critical): Immediate (0-15 min)
- P1 (High): 1 hour
- P2 (Medium): 4 hours
- P3 (Low): 24 hours

### 6.2 Reporting Requirements

**Internal Reporting:**
- Report to: security@yourdomain.com
- Report within: 1 hour of discovery
- Include: Who, What, When, Where, How

**External Reporting:**
- GDPR breaches: 72 hours to authorities
- User notification: Without undue delay
- Law enforcement: If required by law

### 6.3 Evidence Preservation

```bash
# Preserve evidence before any remediation
1. Take database snapshot
2. Download all relevant logs
3. Capture network traffic (if possible)
4. Document all actions taken
5. Restrict access to evidence
```

---

## 7. Data Retention Policy

### 7.1 Retention Periods

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| User data | While account active | Service provision |
| Deleted user data | 30 days | Recovery period |
| Audit logs | 1 year | Security & compliance |
| Performance logs | 90 days | Troubleshooting |
| Backups | 30 days | Disaster recovery |
| Financial records | 7 years | Legal requirement |

### 7.2 Implementation

**Automated Cleanup:**
```sql
-- Configure retention policies
INSERT INTO data_retention_config (
  table_name,
  retention_days,
  cleanup_enabled
) VALUES
  ('query_performance_log', 90, true),
  ('security_events', 365, true),
  ('api_key_usage_log', 90, true);

-- Scheduled cleanup runs daily at 2 AM UTC
SELECT cron.schedule(
  'daily-data-retention-cleanup',
  '0 2 * * *',
  'SELECT cleanup_old_data();'
);
```

### 7.3 Data Deletion

**Right to Erasure (GDPR Article 17):**
```sql
-- User requests deletion
SELECT request_user_deletion('[user_id]');

-- After 30-day grace period, execute deletion
SELECT execute_user_deletion('[user_id]', false);

-- Verify deletion
SELECT * FROM deletion_requests
WHERE user_id = '[user_id]'
  AND status = 'completed';
```

**Deletion Methods:**
- Personal data: Permanently deleted
- Anonymized data: User ID replaced with hash
- Audit logs: User ID pseudonymized
- Backups: Deleted after retention period

---

## 8. API Security Policy

### 8.1 Authentication

**API Key Requirements:**
- Unique per user/application
- Encrypted at rest (AES-256)
- Transmitted only over HTTPS
- Rotated every 90 days
- Never logged in plaintext

**API Key Format:**
```
dpd_[prefix]_[random_32_chars]

Example: dpd_sk_7K4mN9pQ2wX5yZ8tA1bC3dE6fG9hJ0k
         ^^^ ^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         |   |  |
         |   |  +-- 32 char random string
         |   +-- Key type (sk=secret key, pk=public key)
         +-- Product prefix
```

### 8.2 Rate Limiting

**Limits:**

| User Type | Requests/Hour | Burst |
|-----------|---------------|-------|
| Free | 1,000 | 20 |
| Pro | 10,000 | 50 |
| Enterprise | 100,000 | 100 |

**Implementation:**
```typescript
const RATE_LIMITS = {
  free: { requests: 1000, window: 3600000 },
  pro: { requests: 10000, window: 3600000 },
  enterprise: { requests: 100000, window: 3600000 },
};
```

### 8.3 API Security Headers

**Required Headers:**
```typescript
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

### 8.4 Input Validation

**Validation Rules:**
```typescript
// Always validate and sanitize input
import { z } from 'zod';

const userInputSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150),
});

// Validate before processing
const validatedData = userInputSchema.parse(userInput);
```

---

## 9. Third-Party Security Policy

### 9.1 Vendor Assessment

**Before Integration:**
- [ ] Security questionnaire completed
- [ ] Data Processing Agreement signed
- [ ] SOC 2 / ISO 27001 certification verified
- [ ] Security controls reviewed
- [ ] Data flow mapped
- [ ] Privacy policy reviewed

**Assessment Criteria:**
| Criteria | Minimum Requirement |
|----------|---------------------|
| Encryption | TLS 1.2+, AES-256 |
| Authentication | MFA support |
| Compliance | GDPR, SOC 2 |
| SLA | 99.9% uptime |
| Support | 24/7 availability |
| Backups | Daily, 30-day retention |

### 9.2 Data Sharing

**Approved Third Parties:**

| Vendor | Purpose | Data Shared | DPA Status |
|--------|---------|-------------|------------|
| Supabase | Database hosting | All application data | ✅ Signed |
| Anthropic | AI features | User prompts only | ✅ Signed |
| Sentry | Error tracking | Error logs (no PII) | ✅ Signed |

**Data Sharing Requirements:**
- Minimum necessary data only
- Encrypted in transit
- Data Processing Agreement required
- Regular access audits
- Vendor compliance verification

### 9.3 API Integrations

**Integration Security Checklist:**
- [ ] Use official SDKs when available
- [ ] API keys stored in vault
- [ ] Rate limiting implemented
- [ ] Error handling (no data leakage)
- [ ] Logging (audit trail)
- [ ] Regular security reviews

---

## 10. Security Awareness Policy

### 10.1 Training Requirements

**All Employees:**
- Security awareness training (onboarding)
- Annual refresher training
- Phishing simulation tests (quarterly)
- Policy acknowledgment

**Developers:**
- Secure coding training (annually)
- OWASP Top 10 awareness
- Security tools training
- Code review participation

**Administrators:**
- Privileged access management
- Incident response training
- Security monitoring
- Compliance requirements

### 10.2 Phishing Prevention

**Red Flags:**
- Unexpected attachments
- Urgent requests for credentials
- Suspicious sender addresses
- Poor grammar/spelling
- Requests to bypass security

**Response:**
1. Do NOT click links or open attachments
2. Do NOT provide credentials
3. Report to security@yourdomain.com
4. Delete the message

### 10.3 Social Engineering

**Protection Measures:**
- Verify identity before sharing information
- Use established communication channels
- Never share passwords or credentials
- Report suspicious requests
- Follow data classification policy

---

## 📊 Policy Compliance Checklist

### Monthly
- [ ] Review access logs for anomalies
- [ ] Verify backup completion
- [ ] Test incident response procedures
- [ ] Review new third-party integrations

### Quarterly
- [ ] Access rights review
- [ ] Security training updates
- [ ] Vulnerability assessments
- [ ] Password rotation for service accounts

### Annually
- [ ] Policy review and updates
- [ ] Security audit
- [ ] Penetration testing
- [ ] Compliance certification renewal
- [ ] Encryption key rotation
- [ ] Disaster recovery drill

---

## 📞 Policy Enforcement

**Violation Reporting:**
- Email: security@yourdomain.com
- Anonymous hotline: [number]
- Internal portal: [link]

**Consequences:**
| Severity | First Offense | Second Offense | Third Offense |
|----------|---------------|----------------|---------------|
| Minor | Warning | Written warning | Suspension |
| Moderate | Written warning | Suspension | Termination |
| Severe | Suspension | Termination | Legal action |

**Examples:**
- Minor: Weak password, unlocked workstation
- Moderate: Sharing credentials, bypassing security
- Severe: Data theft, intentional breach

---

## 📚 Related Documents

- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)
- [INCIDENT_RESPONSE_PLAYBOOK.md](./INCIDENT_RESPONSE_PLAYBOOK.md)
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- [MONITORING_SETUP.md](./MONITORING_SETUP.md)

---

## ✅ Policy Acknowledgment

```
I, [Name], acknowledge that I have read, understood, and agree to comply
with the Data Parse Desk 2.0 Security Policies.

I understand that violation of these policies may result in disciplinary
action up to and including termination of employment/contract.

Signature: _____________________
Date: __________________________
```

---

*Policy Version: 1.0*
*Effective Date: October 27, 2025*
*Next Review: October 27, 2026*
*Policy Owner: Chief Security Officer*
