# 🔒 RLS POLICIES TESTING PLAN

**Migration:** 20251022000007_fix_insecure_rls_policies.sql
**Date:** 2025-10-22
**Status:** Ready for Testing
**Priority:** 🔴 CRITICAL

---

## 📊 OVERVIEW

### What Was Fixed
- **Dropped:** 19 insecure RLS policies with `USING (true)`
- **Created:** 28 secure RLS policies with `auth.uid()` checks
- **Added:** 15 performance indexes for RLS queries
- **Security Impact:** HIGH - Prevents unauthorized data access

### Affected Tables
1. `databases` (4 policies)
2. `table_schemas` (4 policies)
3. `files` (4 policies)
4. `audit_log` (2 policies)
5. `database_relations` (4 policies)
6. `data_insights` (2 policies)
7. `activity_log` (2 policies)

---

## 🧪 TESTING STRATEGY

### Test Environment Setup

```bash
# 1. Start local Supabase
npx supabase start

# 2. Apply migration
npx supabase db reset

# 3. Verify migration applied
npx supabase db diff

# 4. Check RLS policies
psql postgresql://postgres:postgres@localhost:54322/postgres -c "
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"
```

### Test Users Setup

Create 4 test users with different roles:

```sql
-- User A: Database Owner
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'user_a@test.com',
  crypt('password123', gen_salt('bf')),
  NOW()
);

-- User B: Project Admin
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'user_b@test.com',
  crypt('password123', gen_salt('bf')),
  NOW()
);

-- User C: Project Editor
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'user_c@test.com',
  crypt('password123', gen_salt('bf')),
  NOW()
);

-- User D: Project Viewer
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'user_d@test.com',
  crypt('password123', gen_salt('bf')),
  NOW()
);

-- Create test project
INSERT INTO public.projects (id, name, created_by)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test Project',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- Add project members
INSERT INTO public.project_members (project_id, user_id, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner'),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'editor'),
  ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'viewer');

-- Create test database
INSERT INTO public.databases (id, system_name, display_name, table_name, created_by)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'test_db',
  'Test Database',
  'user_test_db',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- Link database to project
INSERT INTO public.project_databases (project_id, database_id)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
```

---

## ✅ TEST CASES

### Category 1: DATABASES Table

#### Test 1.1: SELECT - Owner can view their database
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

SELECT id, display_name FROM public.databases
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: 1 row (owner's database)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 1.2: SELECT - Non-member cannot view database
```sql
-- Create User E (not in project)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"}';

SELECT id, display_name FROM public.databases
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: 0 rows (no access)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 1.3: SELECT - Project member can view database
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd"}';

SELECT id, display_name FROM public.databases
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: 1 row (project member)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 1.4: INSERT - User can create their own database
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

INSERT INTO public.databases (system_name, display_name, table_name, created_by)
VALUES ('user_b_db', 'User B Database', 'user_user_b_db', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
-- Expected: Success
```
**✅ PASS** | **❌ FAIL**

---

#### Test 1.5: INSERT - User cannot create database for another user
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc"}';

INSERT INTO public.databases (system_name, display_name, table_name, created_by)
VALUES ('fake_db', 'Fake Database', 'user_fake_db', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
-- Expected: Error (RLS violation)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 1.6: UPDATE - Owner can update their database
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

UPDATE public.databases
SET display_name = 'Updated Test Database'
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: Success (1 row updated)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 1.7: UPDATE - Project admin can update database
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

UPDATE public.databases
SET description = 'Updated by admin'
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: Success (admin role)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 1.8: UPDATE - Project editor cannot update database
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc"}';

UPDATE public.databases
SET description = 'Updated by editor'
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: 0 rows updated (editors can't modify database settings)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 1.9: DELETE - Owner can delete their database
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

DELETE FROM public.databases
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: Success (1 row deleted)
-- Note: This is destructive, run last or rollback
```
**✅ PASS** | **❌ FAIL**

---

#### Test 1.10: DELETE - Non-owner cannot delete database
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

DELETE FROM public.databases
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: 0 rows deleted (even admin can't delete)
```
**✅ PASS** | **❌ FAIL**

---

### Category 2: TABLE_SCHEMAS Table

#### Test 2.1: SELECT - Project member can view schemas
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd"}';

SELECT column_name, data_type FROM public.table_schemas
WHERE database_id = '22222222-2222-2222-2222-222222222222';
-- Expected: All schemas for accessible database
```
**✅ PASS** | **❌ FAIL**

---

#### Test 2.2: INSERT - Database owner can create schema
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

INSERT INTO public.table_schemas (database_id, column_name, data_type, display_name)
VALUES ('22222222-2222-2222-2222-222222222222', 'test_column', 'text', 'Test Column');
-- Expected: Success
```
**✅ PASS** | **❌ FAIL**

---

#### Test 2.3: INSERT - Project admin can create schema
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

INSERT INTO public.table_schemas (database_id, column_name, data_type, display_name)
VALUES ('22222222-2222-2222-2222-222222222222', 'admin_column', 'text', 'Admin Column');
-- Expected: Success (admin role)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 2.4: INSERT - Project editor cannot create schema
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc"}';

INSERT INTO public.table_schemas (database_id, column_name, data_type, display_name)
VALUES ('22222222-2222-2222-2222-222222222222', 'editor_column', 'text', 'Editor Column');
-- Expected: Error (editors can't modify structure)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 2.5: DELETE - Only owner can delete schema
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

DELETE FROM public.table_schemas
WHERE database_id = '22222222-2222-2222-2222-222222222222'
AND column_name = 'admin_column';
-- Expected: 0 rows deleted (even admin can't delete schemas)
```
**✅ PASS** | **❌ FAIL**

---

### Category 3: FILES Table

#### Test 3.1: SELECT - Uploader can view their file
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

SELECT id, file_name FROM public.files
WHERE uploaded_by = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Expected: All files uploaded by User A
```
**✅ PASS** | **❌ FAIL**

---

#### Test 3.2: INSERT - User can upload file
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc"}';

INSERT INTO public.files (database_id, file_name, file_path, uploaded_by)
VALUES ('22222222-2222-2222-2222-222222222222', 'test.csv', '/storage/test.csv', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
-- Expected: Success
```
**✅ PASS** | **❌ FAIL**

---

#### Test 3.3: DELETE - Database owner can delete any file
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

DELETE FROM public.files
WHERE database_id = '22222222-2222-2222-2222-222222222222'
AND uploaded_by = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
-- Expected: Success (database owner)
```
**✅ PASS** | **❌ FAIL**

---

### Category 4: DATABASE_RELATIONS Table

#### Test 4.1: SELECT - Project member can view relations
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd"}';

SELECT * FROM public.database_relations
WHERE source_database_id = '22222222-2222-2222-2222-222222222222';
-- Expected: All relations for accessible database
```
**✅ PASS** | **❌ FAIL**

---

#### Test 4.2: INSERT - Database owner can create relation
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

INSERT INTO public.database_relations (source_database_id, target_database_id, relation_type)
VALUES ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'one_to_many');
-- Expected: Success
```
**✅ PASS** | **❌ FAIL**

---

#### Test 4.3: DELETE - Only owner can delete relation
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

DELETE FROM public.database_relations
WHERE source_database_id = '22222222-2222-2222-2222-222222222222';
-- Expected: 0 rows deleted (even admin can't delete)
```
**✅ PASS** | **❌ FAIL**

---

### Category 5: AUDIT_LOG Table

#### Test 5.1: SELECT - User can view their own actions
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

SELECT action, table_name FROM public.audit_log
WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Expected: All actions by User A
```
**✅ PASS** | **❌ FAIL**

---

#### Test 5.2: SELECT - User cannot view other users' actions
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc"}';

SELECT action, table_name FROM public.audit_log
WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Expected: 0 rows (unless project admin)
```
**✅ PASS** | **❌ FAIL**

---

#### Test 5.3: INSERT - System can log actions
```sql
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

INSERT INTO public.audit_log (user_id, action, table_name, database_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'UPDATE', 'databases', '22222222-2222-2222-2222-222222222222');
-- Expected: Success (triggers use this)
```
**✅ PASS** | **❌ FAIL**

---

## 🚀 AUTOMATED TEST SCRIPT

Save this as `test_rls_policies.sql` and run with `psql`:

```sql
-- Test RLS Policies
-- Usage: psql -f test_rls_policies.sql

\set ON_ERROR_STOP on

BEGIN;

-- Setup test data (from above)
-- ...

-- Run all tests
\echo '========================================='
\echo 'Testing DATABASES table policies'
\echo '========================================='

-- Test 1.1
\echo 'Test 1.1: Owner can view their database'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
SELECT COUNT(*) = 1 AS test_1_1_pass FROM public.databases WHERE id = '22222222-2222-2222-2222-222222222222';

-- Test 1.2
\echo 'Test 1.2: Non-member cannot view database'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"}';
SELECT COUNT(*) = 0 AS test_1_2_pass FROM public.databases WHERE id = '22222222-2222-2222-2222-222222222222';

-- Add all other tests...

ROLLBACK;

\echo '========================================='
\echo 'All tests completed!'
\echo '========================================='
```

---

## 📊 TEST RESULTS TRACKING

| Test ID | Description | Expected | Actual | Status | Notes |
|---------|-------------|----------|--------|--------|-------|
| 1.1 | Owner view database | 1 row | | ⏳ | |
| 1.2 | Non-member view | 0 rows | | ⏳ | |
| 1.3 | Member view | 1 row | | ⏳ | |
| 1.4 | User create own DB | Success | | ⏳ | |
| 1.5 | User create for other | Error | | ⏳ | |
| 1.6 | Owner update | Success | | ⏳ | |
| 1.7 | Admin update | Success | | ⏳ | |
| 1.8 | Editor update | 0 rows | | ⏳ | |
| 1.9 | Owner delete | Success | | ⏳ | |
| 1.10 | Non-owner delete | 0 rows | | ⏳ | |
| 2.1 | Member view schemas | N rows | | ⏳ | |
| 2.2 | Owner create schema | Success | | ⏳ | |
| 2.3 | Admin create schema | Success | | ⏳ | |
| 2.4 | Editor create schema | Error | | ⏳ | |
| 2.5 | Admin delete schema | 0 rows | | ⏳ | |
| 3.1 | Uploader view file | N rows | | ⏳ | |
| 3.2 | User upload file | Success | | ⏳ | |
| 3.3 | Owner delete file | Success | | ⏳ | |
| 4.1 | Member view relations | N rows | | ⏳ | |
| 4.2 | Owner create relation | Success | | ⏳ | |
| 4.3 | Admin delete relation | 0 rows | | ⏳ | |
| 5.1 | User view own logs | N rows | | ⏳ | |
| 5.2 | User view other logs | 0 rows | | ⏳ | |
| 5.3 | System insert log | Success | | ⏳ | |

---

## ✅ ACCEPTANCE CRITERIA

Migration can be approved for production if:

- [ ] All 24 test cases PASS
- [ ] No RLS violations in error logs
- [ ] Performance indexes working (EXPLAIN ANALYZE)
- [ ] No breaking changes to existing functionality
- [ ] Documentation updated
- [ ] Security team approval
- [ ] Staging environment tested
- [ ] Rollback plan prepared

---

## 🔄 ROLLBACK PLAN

If issues found in production:

```sql
-- Rollback script
BEGIN;

-- Drop new policies
DROP POLICY IF EXISTS "Users can view their databases" ON public.databases;
-- ... (drop all new policies)

-- Restore old policies (TEMPORARY - INSECURE)
CREATE POLICY "Anyone can view databases" ON public.databases FOR SELECT USING (true);
-- ... (restore old policies)

COMMIT;
```

**⚠️ WARNING:** Rollback restores insecure policies! Fix forward ASAP.

---

## 📞 CONTACTS

- **Security Lead:** [Name]
- **Database Admin:** [Name]
- **DevOps:** [Name]
- **On-call:** [Phone]

---

**Testing Status:** ⏳ Not Started | 🔄 In Progress | ✅ Completed
**Last Updated:** 2025-10-22
**Next Review:** After local testing
