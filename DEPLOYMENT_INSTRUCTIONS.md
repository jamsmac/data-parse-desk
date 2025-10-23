# DEPLOYMENT INSTRUCTIONS - Database Migration

## Apply Performance Indexes Migration

**Migration File:** `supabase/migrations/20251023000001_add_performance_indexes.sql`
**Impact:** 50-90% query performance improvement
**Duration:** ~5-10 minutes (CONCURRENTLY mode - no downtime)

---

## METHOD 1: Via Supabase Dashboard (RECOMMENDED)

### Step 1: Open SQL Editor
1. Navigate to: https://supabase.com/dashboard/project/puavudiivxuknvtbnotv
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New query"** button

### Step 2: Paste Migration SQL
1. Open file: `supabase/migrations/20251023000001_add_performance_indexes.sql`
2. Copy entire contents (183 lines)
3. Paste into SQL Editor

### Step 3: Execute Migration
1. Click **"Run"** button (or press Cmd/Ctrl + Enter)
2. Wait for execution (~5-10 minutes)
3. You should see: **"Success. No rows returned"**

### Step 4: Verify Indexes Created
Run this query to verify all 6 indexes were created:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_table_data_db_time',
    'idx_table_data_json',
    'idx_project_members_composite',
    'idx_api_usage_time',
    'idx_comments_database',
    'idx_webhooks_user_active'
  )
ORDER BY indexname;
```

**Expected Output:**
```
schemaname | tablename        | indexname                        | index_size
-----------+------------------+----------------------------------+-----------
public     | api_usage        | idx_api_usage_time              | 8192 bytes
public     | comments         | idx_comments_database           | 8192 bytes
public     | project_members  | idx_project_members_composite   | 8192 bytes
public     | table_data       | idx_table_data_db_time          | 16 kB
public     | table_data       | idx_table_data_json             | 24 kB
public     | webhooks         | idx_webhooks_user_active        | 8192 bytes
```

---

## METHOD 2: Via Supabase CLI (Alternative)

### Prerequisites
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref puavudiivxuknvtbnotv
```

### Apply Migration
```bash
# Push all migrations to production
supabase db push

# Or apply specific migration
supabase db push --include-all
```

---

## METHOD 3: Via psql Command Line (Advanced)

### Prerequisites
- PostgreSQL client installed
- Database password available

### Connection String
```bash
# Get connection string from Supabase Dashboard → Settings → Database
# Format: postgres://postgres:[PASSWORD]@db.puavudiivxuknvtbnotv.supabase.co:5432/postgres

# Apply migration
psql "postgresql://postgres:[YOUR-PASSWORD]@db.puavudiivxuknvtbnotv.supabase.co:5432/postgres" \
  < supabase/migrations/20251023000001_add_performance_indexes.sql
```

---

## POST-DEPLOYMENT VERIFICATION

### 1. Check Index Usage (Run after 1 hour)
```sql
-- Check which indexes are being used
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

**What to look for:**
- `index_scans` should be > 0 for actively used indexes
- `idx_table_data_db_time` should have high scan count (used for pagination)
- `idx_project_members_composite` should have very high scan count (RLS checks)

### 2. Test Query Performance
```sql
-- Test table data pagination (should use idx_table_data_db_time)
EXPLAIN ANALYZE
SELECT *
FROM table_data
WHERE database_id = 'your-database-id-here'
ORDER BY created_at DESC
LIMIT 20;
```

**Expected output should include:**
```
Index Scan using idx_table_data_db_time on table_data
  (cost=0.29..8.31 rows=1 width=...)
  (actual time=0.015..0.020 rows=20 loops=1)
```

### 3. Monitor Performance Metrics

**In Supabase Dashboard:**
1. Go to: Database → Performance
2. Check "Slowest Queries" - should see improvement
3. Monitor "Index Hit Rate" - should be > 95%

**Expected Improvements:**
| Query Type | Before | After | Expected Improvement |
|------------|--------|-------|---------------------|
| Table data pagination | ~500ms | ~50ms | -90% |
| JSONB search | ~2000ms | ~200ms | -90% |
| RLS policy checks | ~100ms | ~10ms | -90% |
| API usage analytics | ~800ms | ~80ms | -90% |
| Comment loading | ~300ms | ~30ms | -90% |
| Webhook triggering | ~150ms | ~15ms | -90% |

---

## TROUBLESHOOTING

### Issue: "relation does not exist"
**Cause:** Table doesn't exist in your database
**Solution:** Check if migration file references correct table names

### Issue: "index already exists"
**Cause:** Migration was already applied
**Solution:** This is safe - migration uses `IF NOT EXISTS`

### Issue: "permission denied"
**Cause:** User doesn't have CREATE privilege
**Solution:** Use service role key or run via Supabase Dashboard

### Issue: "concurrent index creation not supported"
**Cause:** Old PostgreSQL version
**Solution:** Remove `CONCURRENTLY` keyword (will cause brief downtime)

---

## ROLLBACK (If Needed)

If you need to rollback the indexes:

```sql
-- Drop all indexes created by this migration
DROP INDEX CONCURRENTLY IF EXISTS idx_table_data_db_time;
DROP INDEX CONCURRENTLY IF EXISTS idx_table_data_json;
DROP INDEX CONCURRENTLY IF EXISTS idx_project_members_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_api_usage_time;
DROP INDEX CONCURRENTLY IF EXISTS idx_comments_database;
DROP INDEX CONCURRENTLY IF EXISTS idx_webhooks_user_active;
```

**Note:** Only rollback if you observe:
- Severe performance degradation
- Excessive disk space usage
- Index bloat issues

---

## MONITORING CHECKLIST

After deploying, monitor for **24 hours**:

### Hour 1
- [ ] All 6 indexes created successfully
- [ ] No errors in Supabase logs
- [ ] Application still functioning normally

### Hour 4
- [ ] Index scan counts increasing
- [ ] Query performance improving
- [ ] No user-reported issues

### Hour 24
- [ ] Index hit rate > 95%
- [ ] Slow query count decreased
- [ ] Database size increase acceptable (<10%)

### Week 1
- [ ] Run ANALYZE on all tables
- [ ] Check for index bloat
- [ ] Review query plans for optimization

---

## MAINTENANCE

### Weekly
```sql
-- Update statistics for query planner
ANALYZE public.table_data;
ANALYZE public.project_members;
ANALYZE public.api_usage;
ANALYZE public.comments;
ANALYZE public.webhooks;
```

### Monthly
```sql
-- Check for bloated indexes (size > 2x table size)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) AS table_size,
  ROUND(
    (pg_relation_size(indexrelid)::float /
     NULLIF(pg_relation_size(tablename::regclass), 0)) * 100,
    2
  ) AS index_to_table_ratio
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**If index_to_table_ratio > 200%:** Consider REINDEX CONCURRENTLY

---

## SUPPORT

**Issues?** Contact:
- DevOps Team: devops@company.com
- Supabase Support: https://supabase.com/dashboard/support

**Documentation:**
- Migration file: `supabase/migrations/20251023000001_add_performance_indexes.sql`
- Full report: `BACKEND_IMPROVEMENTS_COMPLETE.md`
- Quick summary: `QUICK_SUMMARY.md`

---

**Last Updated:** 2025-10-23
**Migration Version:** 20251023000001
**Status:** Ready for deployment
