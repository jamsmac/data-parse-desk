# Performance Quick Reference - DataParseDesk 2.0

> **Краткая справка** по аудиту производительности. Полный отчёт: [PERFORMANCE_AUDIT_REPORT.md](PERFORMANCE_AUDIT_REPORT.md)

---

## 🎯 TL;DR (Too Long; Didn't Read)

**Оценка:** B+ (85/100) → Потенциал: A- (92/100)

**Top 3 приоритета:**
1. ⚡ **Redis caching** → 50-70% improvement → 4-8 hours
2. 🔌 **Connection pooling** → 30-40% improvement → 2 hours
3. 🚀 **CDN for assets** → 80% faster loading → 4 hours

**ROI:** 60+ часов ускорения за 10-14 часов работы

---

## 📊 Current Performance

| Query Type | Current | Target | Status |
|------------|---------|--------|--------|
| Simple SELECT | 30-50ms | <50ms | ✅ GOOD |
| Paginated List | 100-150ms | <100ms | ⚠️ OK |
| JSONB Search | 200-400ms | <200ms | ⚠️ SLOW |
| Analytics | 800-2000ms | <500ms | ❌ VERY SLOW |

---

## 🔧 Quick Diagnostics (Copy-Paste)

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### Find Unused Indexes
```sql
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Top 5 Slowest Queries
```sql
SELECT round(total_exec_time::numeric, 2) AS ms, calls, query
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 5;
```

### Cache Hit Ratio (should be >99%)
```sql
SELECT round(100.0 * sum(heap_blks_hit) /
  NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) AS hit_ratio
FROM pg_statio_user_tables;
```

### Active Connections
```sql
SELECT state, count(*) FROM pg_stat_activity
WHERE datname = current_database() GROUP BY state;
```

### Table Bloat
```sql
SELECT tablename, n_dead_tup, n_live_tup,
  round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 100
ORDER BY n_dead_tup DESC LIMIT 10;
```

---

## ⚡ Quick Fixes (< 1 hour each)

### 1. Enable pg_stat_statements
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT pg_stat_statements_reset();
```

### 2. Aggressive VACUUM for bloated tables
```sql
VACUUM (ANALYZE, VERBOSE) public.table_data;
VACUUM (ANALYZE, VERBOSE) public.audit_log;
```

### 3. REINDEX bloated indexes
```sql
REINDEX INDEX CONCURRENTLY idx_table_data_db_time;
REINDEX INDEX CONCURRENTLY idx_table_data_json;
```

### 4. Kill long-running queries
```sql
-- Find long queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle' AND now() - query_start > interval '1 minute';

-- Kill specific query
SELECT pg_terminate_backend(pid);
```

---

## 🚀 Implementation Checklist

### Week 1: Critical (8-16 hours)

- [ ] **Redis Setup**
  - [ ] Sign up for Upstash Redis (free tier)
  - [ ] Add credentials to .env.production
  - [ ] Implement cache helper function
  - [ ] Add caching to top 5 endpoints

- [ ] **Connection Pooling**
  - [ ] Add VITE_SUPABASE_POOLER_URL to .env
  - [ ] Update edge functions to use pooler
  - [ ] Monitor connection count (should drop 30-50%)

- [ ] **pg_stat_statements**
  - [ ] Enable extension
  - [ ] Reset statistics
  - [ ] Schedule weekly review

### Week 2-3: High Priority (16-24 hours)

- [ ] **Materialized Views**
  - [ ] Create dashboard_stats view
  - [ ] Schedule hourly refresh
  - [ ] Update frontend to use view

- [ ] **CDN Integration**
  - [ ] Configure Cloudflare/Vercel
  - [ ] Update asset paths
  - [ ] Test cache headers

- [ ] **Query Optimization**
  - [ ] Identify top 5 slow queries
  - [ ] Add covering indexes where needed
  - [ ] Rewrite subqueries as JOINs
  - [ ] EXPLAIN ANALYZE each query

### Month 2: Medium Priority (24-40 hours)

- [ ] **Partitioning**
  - [ ] Install pg_partman
  - [ ] Partition audit_log by time
  - [ ] Test in staging first!

- [ ] **Read Replica**
  - [ ] Upgrade Supabase plan
  - [ ] Configure read replica
  - [ ] Update code for read/write split

- [ ] **Monitoring**
  - [ ] Configure Sentry
  - [ ] Create performance dashboard
  - [ ] Set up alerts

---

## 📈 Performance Baselines

### Database Metrics
```sql
-- Save as baseline before optimization
CREATE TABLE performance_baselines AS
SELECT
  NOW() AS measured_at,
  pg_database_size(current_database()) AS db_size_bytes,
  (SELECT count(*) FROM table_data) AS table_data_rows,
  (SELECT round(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
   FROM pg_statio_user_tables) AS cache_hit_ratio,
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections;
```

### After Each Change
```sql
INSERT INTO performance_baselines
SELECT NOW(), pg_database_size(current_database()),
  (SELECT count(*) FROM table_data),
  (SELECT round(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
   FROM pg_statio_user_tables),
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active');

-- Compare
SELECT * FROM performance_baselines ORDER BY measured_at DESC LIMIT 5;
```

---

## 🔍 Monitoring Queries

### Performance Dashboard (Run Weekly)
```sql
SELECT * FROM public.performance_dashboard;
-- See full implementation in main report
```

### Alert Check (Run Daily)
```sql
SELECT * FROM public.check_performance_alerts();
-- See full implementation in main report
```

---

## 🆘 Emergency Procedures

### Database is Slow
1. Check active connections: `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'`
2. Kill long queries: `SELECT pg_terminate_backend(pid)`
3. Run VACUUM: `VACUUM ANALYZE`
4. Check bloat: Run bloat query above
5. REINDEX if bloat >50%

### Out of Connections
1. Check pg_stat_activity
2. Kill idle in transaction: `SELECT pg_terminate_backend(pid) WHERE state = 'idle in transaction'`
3. Enable connection pooling
4. Fix connection leaks in code

### Low Cache Hit Ratio (<95%)
1. Check if new queries added
2. Run ANALYZE on affected tables
3. Add missing indexes
4. Consider increasing shared_buffers

### Table Bloat >20%
1. Run VACUUM ANALYZE
2. If still bloated, schedule VACUUM FULL during maintenance window
3. Configure aggressive autovacuum
4. Monitor dead tuple growth

---

## 📚 Links & Resources

- **Full Audit:** [PERFORMANCE_AUDIT_REPORT.md](PERFORMANCE_AUDIT_REPORT.md)
- **Practical SQL Scripts:** See Section "🛠️ Практические SQL Скрипты"
- **Implementation Guide:** See Section "🚀 Implementation Roadmap"
- **Troubleshooting:** See Section "🔧 Troubleshooting Guide"

---

## 📞 Need Help?

1. **Check main report** for detailed explanations
2. **Run diagnostic queries** above to identify issue
3. **Consult troubleshooting guide** in main report
4. **Review implementation roadmap** for step-by-step guide

---

**Last Updated:** 2025-10-27
**Next Review:** 2025-11-27
