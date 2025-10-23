# BACKEND IMPROVEMENT PLAN - 100% QUALITY

## MASTER PROMPT

You are a Senior Backend Engineer tasked with bringing the DataParseDesk backend to 100% production quality.

### Current Status: B+ (77.2/100)
### Target: A+ (95+/100)

---

## PHASE 1: CRITICAL FIXES (P1 - Deploy Blockers)

### 1.1 Security Vulnerability Fix
**Issue:** npm vulnerability in vite 7.1.10
**Impact:** Moderate security risk
**Action:** Update vite to 7.1.11+
**Command:** `npm audit fix`
**Verification:** `npm audit --production`

### 1.2 Database Performance Indexes
**Issue:** Missing critical indexes causing slow queries
**Impact:** Query performance degradation at scale
**Action:** Add 4 missing indexes
```sql
CREATE INDEX CONCURRENTLY idx_table_data_db_time ON table_data(database_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_table_data_json ON table_data USING GIN (data);
CREATE INDEX CONCURRENTLY idx_project_members_composite ON project_members(project_id, user_id);
CREATE INDEX CONCURRENTLY idx_api_usage_time ON api_usage(created_at DESC);
ANALYZE table_data;
ANALYZE project_members;
ANALYZE api_usage;
```

### 1.3 Fix Failing Tests
**Issue:** 38 failing tests in useTableData hook (reactivity issues)
**Impact:** Data integrity risk
**Action:** Fix reactive dependencies in useTableData.tsx
**Files:** `src/hooks/useTableData.tsx`, `src/hooks/__tests__/useTableData.test.ts`

### 1.4 Disaster Recovery Documentation
**Issue:** No backup/restore documentation
**Impact:** High risk in case of failure
**Action:** Create comprehensive DR documentation
**File:** Create `DISASTER_RECOVERY.md`

---

## PHASE 2: SECURITY & STABILITY (P2 - Week 1)

### 2.1 Structured Logging
**Issue:** 20+ edge functions use console.log directly
**Impact:** Poor log aggregation, no log levels
**Action:** Replace all console.log with logger utility
**Files:** All files in `supabase/functions/*/index.ts`
**Pattern:**
```typescript
// Before
console.log('Debug info');

// After
import { logger } from '../_shared/logger.ts';
logger.info('Debug info', { context: 'function-name' });
```

### 2.2 Security Headers
**Issue:** Missing CSP, X-Frame-Options, HSTS
**Impact:** Vulnerable to XSS, clickjacking
**Action:** Add security headers to all edge functions
**Pattern:**
```typescript
const securityHeaders = {
  ...corsHeaders,
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'no-referrer',
};
```

### 2.3 Fix SQL Injection Risk
**Issue:** Custom SQL parser in ai-orchestrator is vulnerable
**Impact:** Critical security risk
**Action:** Replace with parameterized queries or proper SQL parser
**File:** `supabase/functions/ai-orchestrator/index.ts`

### 2.4 Input Validation with Zod
**Issue:** No runtime validation for API inputs
**Impact:** Type errors, injection attacks
**Action:** Add Zod validation schemas for all API endpoints
**Package:** Install `zod` for edge functions

### 2.5 Restrict CORS
**Issue:** `Access-Control-Allow-Origin: *` too permissive
**Impact:** Security risk
**Action:** Restrict to specific domains
```typescript
const allowedOrigins = [
  'https://yourapp.com',
  'https://app.yourapp.com',
];
const origin = req.headers.get('origin');
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  // ... other headers
};
```

---

## PHASE 3: DOCUMENTATION & TESTING (P2 - Week 2)

### 3.1 OpenAPI/Swagger Documentation
**Issue:** No API documentation
**Impact:** Poor developer experience
**Action:** Generate OpenAPI 3.0 specification
**Tool:** Create `openapi.yaml` with Swagger UI
**File:** Create `docs/openapi.yaml`

### 3.2 Load Testing
**Issue:** No performance baseline
**Impact:** Unknown scalability limits
**Action:** Create k6 load test suite
**File:** Create `tests/load/api-load-test.js`
**Target:** p95 < 200ms with 100 concurrent users

### 3.3 Integration Tests for Edge Functions
**Issue:** No integration tests for backend
**Impact:** Regression risk
**Action:** Create Deno test suite for edge functions
**Files:** Create `supabase/functions/*/*.test.ts`

---

## PHASE 4: OPTIMIZATION (P3 - Month 1)

### 4.1 Distributed Rate Limiter
**Issue:** In-memory rate limiter resets on restart
**Impact:** Rate limiting ineffective
**Action:** Move to Redis or Supabase-based rate limiter

### 4.2 Response Caching
**Issue:** No caching for expensive queries
**Impact:** Poor performance
**Action:** Implement Redis cache with TTL

### 4.3 API Versioning
**Issue:** No version strategy
**Impact:** Breaking changes risk
**Action:** Add /v2/ support with version routing

### 4.4 Query Optimization
**Issue:** Large table scans without LIMIT
**Impact:** Performance degradation
**Action:** Add pagination to all queries

---

## EXECUTION PLAN

### Priority Order:
1. **PHASE 1 (P1):** 1-2 days - Deploy blockers
2. **PHASE 2 (P2):** 3-5 days - Security & stability
3. **PHASE 3 (P2):** 3-5 days - Documentation & testing
4. **PHASE 4 (P3):** 1-2 weeks - Optimization

### Success Metrics:
- ✅ 0 npm vulnerabilities
- ✅ 100% test pass rate
- ✅ p95 API response time < 200ms
- ✅ All edge functions with structured logging
- ✅ Security headers on all endpoints
- ✅ OpenAPI documentation complete
- ✅ Load tests passing

### Final Target: A+ (95/100)

---

## CHECKPOINTS

After each phase:
1. Run full test suite: `npm run test:all`
2. Check security: `npm audit --production`
3. Verify build: `npm run build`
4. Manual smoke test on staging

---

**Created:** 2025-10-23
**Target Completion:** 2025-11-15
**Status:** In Progress
