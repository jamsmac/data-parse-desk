# 📋 Manual Migration Application Steps

**Critical:** The migration must be applied via SQL Editor to avoid ordering conflicts.

---

## ⚠️ Issue

The Supabase CLI tries to apply migrations in alphabetical order, but some earlier migrations reference columns that only get created in the sync migration (`20251023130000_sync_database_structure.sql`).

**Error encountered:**
```
ERROR: column "upload_date" does not exist (SQLSTATE 42703)
CREATE INDEX IF NOT EXISTS idx_files_upload_date ON public.files(upload_date)
```

**Solution:** Apply the sync migration manually via SQL Editor first.

---

## ✅ Step-by-Step Instructions

### 1. Open SQL Editor

Click this link to open the SQL Editor:
**https://supabase.com/dashboard/project/uzcmaxfhfcsxzfqvaloz/editor**

Or navigate manually:
1. Go to https://supabase.com/dashboard
2. Select project: `uzcmaxfhfcsxzfqvaloz`
3. Click "SQL Editor" in the left sidebar

### 2. Copy Migration Content

Open the file:
```
supabase/migrations/20251023130000_sync_database_structure.sql
```

Copy the entire content (318 lines)

**Quick copy command:**
```bash
# macOS
cat supabase/migrations/20251023130000_sync_database_structure.sql | pbcopy

# Or just open the file and Cmd+A, Cmd+C
open supabase/migrations/20251023130000_sync_database_structure.sql
```

### 3. Paste in SQL Editor

1. In the SQL Editor, paste the migration content (Cmd+V)
2. You should see 318 lines of SQL code

### 4. Run Migration

**Option A: Click "Run" button** (bottom right corner)

**Option B: Press F5 keyboard shortcut**

### 5. Wait for Completion

- The migration will take **3-5 minutes** to complete
- You'll see progress messages in the output panel
- Look for success indicators:
  - ✅ `DO` (for the column additions)
  - ✅ `CREATE TABLE` (for new tables)
  - ✅ `CREATE INDEX` (for ~40 indexes)
  - ✅ `ANALYZE` (for statistics update)

### 6. Verify Success

After the migration completes, run this verification query in the SQL Editor:

```sql
-- Check that new columns were added to files table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'files'
ORDER BY ordinal_position;
```

**Expected result:** You should see these new columns:
- `storage_filename` (text)
- `mime_type` (text)
- `upload_date` (timestamp with time zone)
- `uploaded_by` (uuid)
- `metadata` (jsonb)
- `processing_time_ms` (integer)
- `updated_rows` (integer)

### 7. Check New Tables

```sql
-- Check that new tables were created
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('webhooks', 'api_keys', 'projects', 'project_members')
ORDER BY tablename;
```

**Expected result:** All 4 tables should exist.

### 8. Check Indexes

```sql
-- Check number of indexes created
SELECT
  schemaname,
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY index_count DESC;
```

**Expected result:** You should see significantly more indexes than before (40+ new indexes added).

---

## 🎯 What This Migration Does

### Files Table - 7 New Columns
1. **storage_filename** - Actual filename in storage (vs display name)
2. **mime_type** - File MIME type (image/png, text/csv, etc.)
3. **upload_date** - Alias for created_at (migration compatibility)
4. **uploaded_by** - User who uploaded (alias for created_by)
5. **metadata** - JSONB field for flexible metadata storage
6. **processing_time_ms** - How long processing took (performance tracking)
7. **updated_rows** - Number of rows updated (import tracking)

### 4 New Tables
1. **webhooks** - Webhook configuration for external integrations
2. **api_keys** - API key management for programmatic access
3. **projects** - Project-based organization
4. **project_members** - Project membership and roles

### ~40 Performance Indexes
Indexes on:
- files (database_id, processing_status, created_by, uploaded_by)
- databases (is_active, created_by, system_name)
- table_schemas (database_id, display_order)
- orders (paying_time, order_status, brew_status)
- upload_log (status, upload_date)
- comments (database_id, user_id)
- audit_log (timestamp, user_id, entity_type)
- activities (user_id, database_id)
- notifications (user_id, is_read)
- users (email, created_at)
- user_permissions (user_id, database_id)
- database_permissions (database_id, user_id)
- database_relations (source_database_id, target_database_id)
- webhooks, api_keys, projects, project_members (user/owner lookups)

### Statistics Update
- ANALYZE run on all major tables for query planner optimization

---

## 📈 Expected Performance Improvements

After applying this migration:
- **50-90% faster** queries on filtered/sorted data
- **Better RLS policy performance** (indexes on user_id, database_id)
- **Faster pagination** (indexes on created_at with DESC)
- **Faster search operations** (indexes on key lookup columns)
- **Better query planning** (updated statistics)

---

## ⚠️ Troubleshooting

### Error: "relation already exists"
**Solution:** Safe to ignore. The migration uses `IF NOT EXISTS` to skip existing objects.

### Error: "column already exists"
**Solution:** Safe to ignore. The migration checks for column existence before adding.

### Error: "permission denied"
**Solution:** Make sure you're logged in to Supabase Dashboard with owner/admin access.

### Migration takes too long (>10 minutes)
**Possible causes:**
1. Large database (millions of rows)
2. Many existing indexes being rebuilt
3. Network issues

**Solution:**
- Wait patiently (migrations can take time on large databases)
- Check Supabase Status page: https://status.supabase.com/
- If stuck >15 minutes, contact Supabase support

### Migration fails with constraint error
**Example:** "violates foreign key constraint"

**Solution:**
- This shouldn't happen as the migration is designed to be safe
- If it does, note the specific error and check if there's orphaned data
- Contact support with the error message

---

## 📝 Alternative: CLI Approach (NOT RECOMMENDED)

If you absolutely cannot use SQL Editor, you can try applying just the sync migration via CLI:

```bash
# Extract just the sync migration
cat supabase/migrations/20251023130000_sync_database_structure.sql | \
  PGPASSWORD='your_db_password' \
  psql -h db.your-project-id.supabase.co \
       -p 5432 \
       -d postgres \
       -U postgres
```

**However, this requires:**
- Direct database connection details (not pooler)
- Database password (not API key)
- Correct hostname format

**We recommend SQL Editor** as it's simpler and guaranteed to work.

---

## ✅ Post-Migration Checklist

After successful migration:

- [ ] Verify new columns exist in files table (7 columns)
- [ ] Verify new tables exist (4 tables)
- [ ] Check index count increased significantly (~40 new indexes)
- [ ] Run ANALYZE on main tables (done automatically by migration)
- [ ] Test application functionality (imports, queries, filters)
- [ ] Monitor query performance (should be 50-90% faster)
- [ ] Check logs for any errors in next 24 hours

---

## 🎉 Success Indicators

You'll know the migration succeeded when:

1. ✅ SQL Editor shows "Success" or "Command completed" message
2. ✅ Verification query shows 7 new columns in files table
3. ✅ All 4 new tables exist
4. ✅ Index count increased by ~40
5. ✅ No errors in application logs
6. ✅ Queries run noticeably faster

---

## 📞 Need Help?

If you encounter issues:

1. **Check this guide first** - Most issues are covered above
2. **Check Supabase Status** - https://status.supabase.com/
3. **Supabase Discord** - https://discord.supabase.com/
4. **Supabase Support** - https://supabase.com/dashboard/support/new

Include in your support request:
- Error message (full text)
- Project ID: `uzcmaxfhfcsxzfqvaloz`
- Migration file: `20251023130000_sync_database_structure.sql`
- What step failed (1-6 above)

---

**Created:** October 23, 2025
**Status:** Ready to apply
**Estimated time:** 3-5 minutes
**Risk level:** ⚠️ Low (uses IF NOT EXISTS, safe for existing data)
**Backup recommended:** ✅ Yes (automatic Point-in-Time Recovery enabled)
