# Database Migrations Guide

## Overview

This directory contains all database migrations for the DataParseDesk project. Migrations are applied in chronological order based on their timestamp prefix.

## Migration Naming Convention

```
YYYYMMDDHHMMSS_description.sql       # UP migration
YYYYMMDDHHMMSS_description_DOWN.sql  # DOWN migration (rollback)
```

Examples:
- `20251026000001_fix_critical_issues.sql` - Forward migration
- `20251026000001_fix_critical_issues_DOWN.sql` - Rollback migration

## Current Statistics

- **Total Migrations:** 52
- **Tables:** 59
- **Indexes:** 295+
- **RLS Policies:** 196
- **Functions:** 133+
- **Triggers:** 42+

## Critical Migrations

### Security

| File | Date | Description | Has Rollback |
|------|------|-------------|--------------|
| `20251022000007_fix_insecure_rls_policies.sql` | 2025-10-22 | Fixes 19 insecure RLS policies with USING(true) | ✅ Yes |

### Core System

| File | Date | Description | Has Rollback |
|------|------|-------------|--------------|
| `20251014100000_multiple_databases_system.sql` | 2025-10-14 | Core multi-database system | ❌ No |
| `20251014110000_rpc_functions.sql` | 2025-10-14 | RPC functions for CRUD | ❌ No |

### Features

| File | Date | Description | Has Rollback |
|------|------|-------------|--------------|
| `20251021000008_schema_versions.sql` | 2025-10-21 | Schema versioning & rollback | ❌ No |
| `20251022000004_collaboration_system.sql` | 2025-10-22 | Real-time collaboration | ❌ No |
| `20251026000001_fix_critical_issues.sql` | 2025-10-26 | Circular dependency checks, JSONB validation | ✅ Yes |

### Performance

| File | Date | Description | Has Rollback |
|------|------|-------------|--------------|
| `20251023130001_sync_database_structure_fixed.sql` | 2025-10-23 | Add missing indexes | ❌ No |
| `20251025000001_performance_indexes_critical.sql` | 2025-10-25 | 4 critical indexes | ❌ No |

## Running Migrations

### Using Supabase CLI

```bash
# Apply all pending migrations
supabase db push

# Reset database (⚠️ DESTRUCTIVE)
supabase db reset

# Create new migration
supabase migration new migration_name
```

### Manual Application

```bash
# Apply single migration
psql -h localhost -U postgres -d postgres -f supabase/migrations/MIGRATION_FILE.sql

# Check applied migrations
psql -h localhost -U postgres -d postgres -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"
```

## Rolling Back Migrations

### Automatic Rollback (if DOWN migration exists)

```bash
# Apply DOWN migration
psql -h localhost -U postgres -d postgres -f supabase/migrations/MIGRATION_FILE_DOWN.sql
```

### Manual Rollback (if no DOWN migration)

Use the schema versioning system:

```sql
-- List available versions
SELECT * FROM get_schema_version_history(project_id);

-- Restore to previous version
SELECT set_current_schema_version(version_id);
```

## Migration Order (Chronological)

### Phase 1: Foundation (Oct 14-18)
1. `20251014085036` - transactions table
2. `20251014091502` - Initial setup
3. `20251014100000` - **Multiple databases system** ⭐
4. `20251014110000` - RPC functions
5. `20251018084200` - Projects/workspaces
6. ... (18 more migrations)

### Phase 2: Features (Oct 19-21)
19. `20251019140913` - Additional features
20. ... (5 more migrations)
21. `20251021000001` - Comments threading
22. `20251021000002` - Webhooks
23. `20251021000003` - API keys
24. `20251021000004` - Status usage
25. `20251021000005` - Formula calculations
26. `20251021000007` - Attachments
27. `20251021000008` - **Schema versions** ⭐
28. `20251021000010` - Data insights
29. `20251021000011` - Scheduled reports
30. `20251021000012` - Conditional formatting
31. `20251021000013` - Telegram notifications (renamed)

### Phase 3: Advanced Features (Oct 22)
32. `20251022000002` - Relation optimization
33. `20251022000003` - Lookup & rollup
34. `20251022000004` - **Collaboration system** ⭐
35. `20251022000005` - Filter presets
36. `20251022000006` - Data validation
37. `20251022000007` - **Fix insecure RLS** ⭐⭐⭐
38. `20251022000008` - Telegram integration
39. `20251022000009` - Push notifications
40. `20251022000010` - Registration credits
41. `20251022000011` - Matching templates

### Phase 4: Performance & Fixes (Oct 23-26)
42. `20251023000001` - Performance indexes
43. `20251023120000` - Final performance indexes
44. `20251023130000` - Sync structure
45. `20251023130001` - **Sync structure fixed** ⭐
46. `20251025000001` - **Critical indexes** ⭐
47. `20251026000001` - **Fix critical issues** ⭐⭐ (NEW)

## Key Features by Migration

### Schema Versioning
```sql
-- File: 20251021000008_schema_versions.sql
-- Features:
- Version tracking with checksums
- Diff calculation between versions
- Tagging system (production, stable, etc.)
- Rollback to any previous version
```

### Collaboration System
```sql
-- File: 20251022000004_collaboration_system.sql
-- Features:
- Real-time user presence tracking
- Cell-level comments with threading
- Activity feed with change tracking
- Realtime subscriptions
```

### Circular Dependency Prevention
```sql
-- File: 20251026000001_fix_critical_issues.sql
-- Features:
- Detects circular relations (A->B->C->A)
- Detects circular formulas
- JSONB validation functions
- Performance monitoring
```

## Database Schema Overview

### Core Tables
```
projects
  └── project_members (roles: owner, admin, editor, viewer)
  └── databases
       └── table_schemas (column definitions)
       └── table_data (JSONB data storage)
       └── database_relations (foreign keys)
       └── files (uploads & attachments)
       └── formula_calculations
       └── comments
```

### Supporting Tables
```
- audit_log (change tracking)
- activity_log (user actions)
- schema_versions (version control)
- webhooks (integrations)
- api_keys (authentication)
- telegram_* (Telegram integration)
- notifications (push/email)
- user_presence (collaboration)
```

## Common Issues & Solutions

### Issue: Migration fails with "relation already exists"
**Solution:** Migration uses `CREATE TABLE IF NOT EXISTS`, but may fail if schema differs.
```sql
-- Check existing table structure
\d+ table_name

-- Drop table if needed (⚠️ DESTRUCTIVE)
DROP TABLE IF EXISTS table_name CASCADE;
```

### Issue: Circular dependency detected
**Solution:** New migration prevents this. To fix existing data:
```sql
-- Find circular relations
SELECT * FROM database_relations WHERE ...;

-- Break the cycle by removing one relation
DELETE FROM database_relations WHERE id = 'problematic_id';
```

### Issue: RLS policy blocks access
**Solution:** Check policy conditions and user context
```sql
-- View current user
SELECT auth.uid();

-- View policies for table
\d+ table_name

-- Test policy manually
SELECT * FROM table_name WHERE (policy_condition);
```

### Issue: Slow queries after migration
**Solution:** Use performance monitoring tools
```sql
-- View slow queries
SELECT * FROM get_slow_queries_report(1000, 24);

-- View table sizes
SELECT * FROM get_table_sizes();

-- View unused indexes
SELECT * FROM get_unused_indexes();
```

## Best Practices

### 1. Always Create DOWN Migrations
For any destructive or complex change, create a rollback migration:
```sql
-- UP: 20251026000001_feature.sql
CREATE TABLE new_table (...);

-- DOWN: 20251026000001_feature_DOWN.sql
DROP TABLE new_table;
```

### 2. Use Transactions
Wrap migrations in transactions when possible:
```sql
BEGIN;
  -- Migration code here
  ALTER TABLE ...;
  CREATE INDEX ...;
COMMIT;
```

### 3. Test Locally First
```bash
# Start local Supabase
supabase start

# Apply migration
supabase db push

# Test functionality
# ...

# Reset if needed
supabase db reset
```

### 4. Backup Before Production
```bash
# Backup database
pg_dump -h host -U user -d database > backup.sql

# Apply migration
psql -h host -U user -d database -f migration.sql

# If issues occur, restore from backup
psql -h host -U user -d database < backup.sql
```

### 5. Use CONCURRENTLY for Indexes
Prevents table locking in production:
```sql
-- Good
CREATE INDEX CONCURRENTLY idx_name ON table(column);

-- Bad (locks table)
CREATE INDEX idx_name ON table(column);
```

### 6. Add Comments
Document your migrations:
```sql
COMMENT ON TABLE table_name IS 'Purpose and usage';
COMMENT ON COLUMN table_name.column_name IS 'What this stores';
COMMENT ON FUNCTION func_name IS 'What this does';
```

## Monitoring & Maintenance

### Check Migration Status
```sql
-- View applied migrations
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

-- View schema version history
SELECT * FROM get_schema_version_history(project_id);
```

### Performance Monitoring
```sql
-- Slow queries report
SELECT * FROM get_slow_queries_report(1000, 24);

-- Table sizes
SELECT * FROM get_table_sizes()
WHERE total_size > '100 MB';

-- Unused indexes
SELECT * FROM get_unused_indexes();
```

### Regular Maintenance
```sql
-- Update statistics (run weekly)
ANALYZE;

-- Vacuum (run monthly)
VACUUM ANALYZE;

-- Reindex (if needed)
REINDEX TABLE table_name;
```

## Emergency Procedures

### Rollback Last Migration
```bash
# If DOWN migration exists
psql -h host -U user -d database -f migration_DOWN.sql

# If no DOWN migration, restore from backup
psql -h host -U user -d database < backup_before_migration.sql
```

### Fix Broken Schema
```sql
-- 1. Check schema_versions table
SELECT * FROM schema_versions
WHERE project_id = 'your-project-id'
ORDER BY version_number DESC;

-- 2. Restore to last known good version
SELECT set_current_schema_version('version-id');

-- 3. Or restore from backup
-- psql < backup.sql
```

### Rebuild Indexes
```sql
-- Find invalid indexes
SELECT * FROM pg_index WHERE NOT indisvalid;

-- Rebuild all indexes
REINDEX DATABASE postgres;

-- Or rebuild specific table
REINDEX TABLE table_name;
```

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs/guides/database/migrations
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Project Issues:** Check repository issues for known problems

## Changelog

### 2025-10-26
- ✅ Created DOWN migration for critical issues fix
- ✅ Created DOWN migration for RLS security fix
- ✅ Added circular dependency prevention
- ✅ Added JSONB validation
- ✅ Added performance monitoring functions
- ✅ Renamed telegram migration to follow naming convention

### 2025-10-25
- ✅ Added 4 critical performance indexes

### 2025-10-23
- ✅ Synced database structure
- ✅ Added ~40 performance indexes

### 2025-10-22
- ✅ Fixed 19 insecure RLS policies
- ✅ Added collaboration system
- ✅ Added multiple integrations

### 2025-10-21
- ✅ Added schema versioning
- ✅ Added formula calculations
- ✅ Added scheduled reports

### 2025-10-14
- ✅ Initial multiple databases system
- ✅ RPC functions

---

**Last Updated:** 2025-10-26
**Maintainer:** DataParseDesk Team
