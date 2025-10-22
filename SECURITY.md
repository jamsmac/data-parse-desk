# Security Policy

## Supported Versions

We take security seriously and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please email us at:

**security@dateparsedesk.com**

### What to Include

Please include as much of the following information as possible:

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass)
- **Affected component(s)** (specific file, function, or feature)
- **Step-by-step instructions** to reproduce the issue
- **Proof of concept** (if possible)
- **Impact assessment** (what an attacker could do)
- **Suggested fix** (if you have one)

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt within **48 hours**
2. **Assessment**: We will assess the vulnerability within **7 days**
3. **Fix Timeline**:
   - **Critical**: Patch within **24-48 hours**
   - **High**: Patch within **7 days**
   - **Medium**: Patch within **30 days**
   - **Low**: Patch in next regular release
4. **Disclosure**: We will work with you on disclosure timeline
5. **Credit**: We will credit you in the security advisory (if you wish)

---

## Security Features

### 🔒 Authentication & Authorization

**Implemented:**
- ✅ JWT-based authentication via Supabase
- ✅ Row Level Security (RLS) on all tables
- ✅ OAuth providers (Google, GitHub)
- ✅ Email verification
- ✅ Password reset functionality
- ✅ Session management

**Best Practices:**
```typescript
// Always check authentication
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  redirect('/login');
}

// Use RLS policies
CREATE POLICY "Users can only view their own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

### 🛡️ Data Protection

**Implemented:**
- ✅ PostgreSQL Row Level Security (29 policies)
- ✅ SECURITY DEFINER functions (8 functions)
- ✅ Input validation and sanitization
- ✅ Output encoding (XSS prevention)
- ✅ Parameterized queries (SQL injection prevention)
- ✅ CORS configuration
- ✅ CSP headers

**Example RLS Policy:**
```sql
CREATE POLICY "Secure access policy"
  ON public.databases
  FOR ALL
  USING (
    auth.uid() = user_id
    OR
    id IN (
      SELECT database_id FROM public.database_shares
      WHERE shared_with = auth.uid()
    )
  );
```

### 🔐 Secrets Management

**Best Practices:**
- ✅ Environment variables for secrets (never commit)
- ✅ Separate keys for dev/staging/production
- ✅ API keys rotated regularly
- ✅ Supabase service role key never exposed to frontend
- ✅ Sentry DSN is public (safe to expose)

**What NOT to do:**
```typescript
// ❌ NEVER expose service role key
const supabase = createClient(url, SERVICE_ROLE_KEY); // BAD!

// ✅ Always use anon key in frontend
const supabase = createClient(url, ANON_KEY); // GOOD!
```

### 🚫 Attack Prevention

**SQL Injection:**
```typescript
// ❌ BAD - Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ GOOD - Parameterized query
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);
```

**XSS Prevention:**
```typescript
// ❌ BAD - Vulnerable to XSS
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ GOOD - Sanitized output
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

**CSRF Protection:**
```typescript
// Supabase handles CSRF automatically via JWT tokens
// No additional configuration needed
```

### 🔍 Formula Engine Security

**ReDoS Protection:**
```typescript
import safeRegex from 'safe-regex';

function validateRegex(pattern: string): boolean {
  // Check if regex is safe (no ReDoS vulnerability)
  return safeRegex(pattern);
}
```

**Code Injection Prevention:**
```typescript
// ❌ NEVER use eval or Function constructor
eval(userFormula); // DANGEROUS!
new Function(userFormula)(); // DANGEROUS!

// ✅ Use safe formula parser
import { parseFormula } from './formula-parser';
const result = parseFormula(userFormula, context);
```

### 📡 Network Security

**HTTPS:**
- ✅ Force HTTPS in production
- ✅ HSTS headers
- ✅ Secure cookies

**CORS:**
```typescript
// Configure in Supabase dashboard
// Only allow requests from your domain
{
  "allowed_origins": [
    "https://your-domain.com",
    "https://www.your-domain.com"
  ]
}
```

**CSP Headers:**
```typescript
// vercel.json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [{
      "key": "Content-Security-Policy",
      "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    }]
  }]
}
```

---

## Security Checklist

### Before Deploying to Production

**Environment:**
- [ ] All secrets in environment variables
- [ ] Production API keys configured
- [ ] Service role key never exposed
- [ ] CORS configured correctly
- [ ] CSP headers set

**Database:**
- [ ] All tables have RLS enabled
- [ ] RLS policies tested
- [ ] Sensitive data encrypted
- [ ] Database backups configured
- [ ] Connection pooling enabled

**Application:**
- [ ] Input validation on all forms
- [ ] Output encoding for user content
- [ ] Authentication on all protected routes
- [ ] CSRF protection enabled
- [ ] Rate limiting configured

**Code:**
- [ ] No hardcoded secrets
- [ ] No commented-out credentials
- [ ] Dependencies up to date
- [ ] Security audit passed (`npm audit`)
- [ ] No console.log in production

**Monitoring:**
- [ ] Error tracking (Sentry) configured
- [ ] Security alerts set up
- [ ] Log aggregation configured
- [ ] Unusual activity monitoring

---

## Known Security Measures

### Rate Limiting

**Supabase:**
- Anonymous: 100 requests/minute
- Authenticated: 1000 requests/minute

**Custom Rate Limiting:**
```typescript
// Edge Function example
import { rateLimit } from '@supabase/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  max: 10, // 10 requests
});

const { success } = await limiter.check(request);
if (!success) {
  return new Response('Too many requests', { status: 429 });
}
```

### File Upload Security

**Validation:**
```typescript
const ALLOWED_TYPES = ['text/csv', 'application/json', 'application/vnd.ms-excel'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function validateFile(file: File): boolean {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File too large');
  }
  return true;
}
```

**Storage Security:**
```sql
-- RLS policy for file storage
CREATE POLICY "Users can only access their files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'item-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Password Security

**Requirements:**
- Minimum 8 characters
- Must include uppercase
- Must include lowercase
- Must include numbers
- Symbols recommended

**Hashing:**
- Supabase uses bcrypt (automatic)
- Never store passwords in plain text
- Never log passwords

---

## Security Incidents

### If You Suspect a Breach

1. **Immediately** change all API keys and passwords
2. **Contact** security@dateparsedesk.com
3. **Review** logs for suspicious activity
4. **Notify** affected users (if personal data exposed)
5. **Document** incident for post-mortem

### Incident Response Plan

**Phase 1: Detection (0-1 hour)**
- Alert received
- Confirm incident
- Assess severity

**Phase 2: Containment (1-4 hours)**
- Isolate affected systems
- Revoke compromised credentials
- Block malicious traffic

**Phase 3: Eradication (4-24 hours)**
- Remove attacker access
- Patch vulnerabilities
- Update security measures

**Phase 4: Recovery (24-72 hours)**
- Restore from backups
- Verify system integrity
- Monitor for re-infection

**Phase 5: Post-Incident (1 week)**
- Document incident
- Update security procedures
- Notify stakeholders
- Implement preventive measures

---

## Security Updates

We release security updates as needed:

- **Critical**: Immediate patch release
- **High**: Within 7 days
- **Medium**: Next minor version
- **Low**: Next major version

Subscribe to security advisories:
- GitHub Security Advisories
- Email: security-updates@dateparsedesk.com
- RSS: https://dateparsedesk.com/security.rss

---

## Bug Bounty Program

We currently do not have a formal bug bounty program, but we:

- ✅ Credit researchers in security advisories
- ✅ Provide public recognition
- ✅ Consider swag for significant findings
- ✅ May offer compensation for critical vulnerabilities

---

## Compliance

### GDPR Compliance

- ✅ User data deletion on request
- ✅ Data export functionality
- ✅ Privacy policy
- ✅ Cookie consent
- ✅ Data processing agreements

### Data Retention

- User data: Retained until account deletion
- Logs: 90 days
- Backups: 30 days
- Analytics: 14 months

### Right to be Forgotten

Users can request complete data deletion:
1. Settings → Account → Delete Account
2. Email: privacy@dateparsedesk.com

---

## Security Resources

### Internal Documentation
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Secure API usage
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production security
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Secure development practices

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

---

## Contact

**Security Team**: security@dateparsedesk.com

**PGP Key**: Available at https://dateparsedesk.com/security.asc

**Response Time**:
- Critical: 24 hours
- High: 48 hours
- Medium: 7 days

---

**Last Updated**: January 22, 2025
**Version**: 1.0
