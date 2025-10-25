# Performance Architecture Overview - DataParseDesk 2.0

**Визуализация архитектуры и потоков данных для оптимизации производительности**

---

## 🏗️ Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React App  │  │  React Query │  │  IndexedDB   │          │
│  │   (83k LOC)  │  │   (Caching)  │  │   (Offline)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Service Worker│
                    │   PWA Caching   │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    NETWORK LAYER                                 │
├────────────────────────────┼─────────────────────────────────────┤
│                            │                                     │
│                    ┌───────▼────────┐                            │
│                    │  Supabase API  │                            │
│                    │  (REST/WS)     │                            │
│                    └───────┬────────┘                            │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    EDGE FUNCTIONS LAYER                          │
├────────────────────────────┼─────────────────────────────────────┤
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────┐         │
│  │                                                     │         │
│  │  43 Edge Functions (Deno Runtime)                  │         │
│  │  - AI Operations (orchestrator, analyze, create)   │         │
│  │  - Data Processing (resolve relations, formulas)   │         │
│  │  - Integrations (webhooks, telegram, storage)      │         │
│  │  - Payment (stripe, checkout, portal)              │         │
│  │                                                     │         │
│  └─────────────────────────┬──────────────────────────┘         │
│                            │                                     │
│                   ⚠️ NO CACHING LAYER                            │
│                   ⚠️ NO CONNECTION POOLING                        │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    DATABASE LAYER                                │
├────────────────────────────┼─────────────────────────────────────┤
│                            │                                     │
│                    ┌───────▼────────┐                            │
│                    │  PostgreSQL 14+│                            │
│                    │  (Supabase)    │                            │
│                    └───────┬────────┘                            │
│                            │                                     │
│  ┌─────────────────────────┴──────────────────────────┐         │
│  │                                                     │         │
│  │  Main Tables:                                       │         │
│  │  • table_data (JSONB) - Main storage               │         │
│  │  • databases - Metadata                            │         │
│  │  • table_schemas - Column definitions              │         │
│  │  • project_members - Access control                │         │
│  │  • audit_log - Activity tracking                   │         │
│  │  • 35+ more tables                                 │         │
│  │                                                     │         │
│  │  Features:                                          │         │
│  │  ✅ 150+ indexes (GIN, B-tree, composite)          │         │
│  │  ✅ RLS policies on all tables                     │         │
│  │  ✅ 173 stored procedures/functions                │         │
│  │  ✅ Row-level security                             │         │
│  │  ⚠️ No partitioning                                 │         │
│  │  ⚠️ No materialized views (yet)                    │         │
│  │                                                     │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Optimized Architecture (Target)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React App  │  │  React Query │  │  IndexedDB   │          │
│  │   (83k LOC)  │  │  ✅ 5-30 min │  │  ✅ Offline  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Service Worker│
                    │  ✅ Workbox     │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    CDN LAYER (NEW)                               │
├────────────────────────────┼─────────────────────────────────────┤
│                            │                                     │
│          ┌─────────────────▼────────────────┐                   │
│          │  Cloudflare / Vercel Edge        │                   │
│          │  ✅ Static assets                │                   │
│          │  ✅ Cache-Control headers        │                   │
│          │  ✅ 80% faster asset loading     │                   │
│          └─────────────────┬────────────────┘                   │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    NETWORK LAYER                                 │
├────────────────────────────┼─────────────────────────────────────┤
│                            │                                     │
│                    ┌───────▼────────┐                            │
│                    │  Supabase API  │                            │
│                    │  ✅ Pooler     │                            │
│                    └───────┬────────┘                            │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    CACHING LAYER (NEW)                           │
├────────────────────────────┼─────────────────────────────────────┤
│                            │                                     │
│          ┌─────────────────▼────────────────┐                   │
│          │     Redis (Upstash)               │                   │
│          │  ✅ Query results (5 min)        │                   │
│          │  ✅ Session data (1 hour)        │                   │
│          │  ✅ API rate limiting             │                   │
│          │  🚀 50-70% faster responses       │                   │
│          └─────────────────┬────────────────┘                   │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    EDGE FUNCTIONS LAYER                          │
├────────────────────────────┼─────────────────────────────────────┤
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────┐         │
│  │  43 Edge Functions (Optimized)                     │         │
│  │  ✅ Connection pooling (pgBouncer)                 │         │
│  │  ✅ Redis caching integration                      │         │
│  │  ✅ Rate limiting (in-memory + Redis)              │         │
│  │  ✅ Batch operations where possible                │         │
│  └─────────────────────────┬──────────────────────────┘         │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                   ┌─────────┴──────────┐
                   │                    │
         ┌─────────▼────────┐  ┌───────▼────────┐
         │  Primary DB      │  │  Read Replica  │
         │  (Write)         │  │  (Analytics)   │
         └─────────┬────────┘  └────────────────┘
                   │
┌──────────────────┼───────────────────────────────────────────────┐
│                  DATABASE LAYER (OPTIMIZED)                      │
├──────────────────┼───────────────────────────────────────────────┤
│                  │                                               │
│         ┌────────▼────────┐                                      │
│         │  PostgreSQL 14+ │                                      │
│         │  ✅ pg_stat_statements                                │
│         │  ✅ Aggressive autovacuum                             │
│         │  ✅ Connection pooling (pgBouncer)                    │
│         └────────┬────────┘                                      │
│                  │                                               │
│  ┌───────────────┴────────────────────────────────┐             │
│  │                                                 │             │
│  │  Optimized Tables:                              │             │
│  │  ✅ table_data (partitioned by database_id)    │             │
│  │  ✅ audit_log (partitioned by time)            │             │
│  │  ✅ Materialized views for analytics           │             │
│  │  ✅ Covering indexes for hot queries           │             │
│  │  ✅ Optimized RLS policies                     │             │
│  │  ✅ Scheduled VACUUM/ANALYZE                   │             │
│  │                                                 │             │
│  └─────────────────────────────────────────────────┘             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Analysis

### Current Flow (Slow Path)

```
User Request
    │
    ▼
React Component ─────┐
    │                │ (No cache hit)
    ▼                │
React Query ─────────┘
    │
    ▼
Supabase Client
    │
    ▼
Edge Function ───────┐
    │                │ (No cache)
    │                │ (No connection pool)
    ▼                │
PostgreSQL ──────────┘
    │
    ▼
RLS Policy Check ────┐ ⚠️ SLOW: Subquery per row
    │                │
    ▼                │
Table Scan ──────────┘ ⚠️ SLOW: No covering index
    │
    ▼
Return Data (200-2000ms)
```

**Problems:**
- ❌ No server-side cache
- ❌ RLS executes subquery for each row
- ❌ No connection pooling
- ❌ Multiple round trips for relations
- ❌ No materialized views for analytics

### Optimized Flow (Fast Path)

```
User Request
    │
    ▼
React Component ─────┐
    │                │
    ▼                │
React Query ─────────┘ ✅ Cache hit (70% of requests)
    │                  Return cached (5ms)
    ▼
    (Cache miss)
    │
    ▼
Supabase Client
    │
    ▼
CDN (if static) ─────┐ ✅ 80% faster
    │                │
    ▼                │
Edge Function ───────┘
    │
    ▼
Redis Cache ─────────┐ ✅ Cache hit (50% of DB queries)
    │                │ Return cached (10-20ms)
    ▼                │
    (Cache miss)     │
    │                │
    ▼                │
Connection Pool ─────┘ ✅ Reuse connection
    │
    ▼
PostgreSQL
    │
    ▼
Optimized RLS ───────┐ ✅ Indexed subquery
    │                │ ✅ Function inlining
    ▼                │
Index Scan ──────────┘ ✅ Covering index
    │                  ✅ No table scan
    ▼
Return Data (10-50ms)
    │
    ▼
Cache in Redis ──────┐ ✅ 5 min TTL
    │                │
    ▼                │
Return to client ────┘
```

**Improvements:**
- ✅ 70% requests served from React Query cache
- ✅ 50% DB queries served from Redis
- ✅ 30% faster with connection pooling
- ✅ 90% faster index scans
- ✅ 50-70% overall improvement

---

## 📊 Performance Comparison

### Query Performance

```
┌─────────────────────────────────────────────────────────────┐
│ Query Type: Paginated Table Data List (50 rows)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ CURRENT (No optimization):                                 │
│ ████████████████████████████░░░░░░ 150ms                  │
│                                                             │
│ WITH Redis Cache:                                           │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 20ms (cache hit)       │
│ ██████████████░░░░░░░░░░░░░░░░░░░ 75ms (cache miss)      │
│                                                             │
│ WITH Connection Pool + Indexes:                             │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░ 50ms                   │
│                                                             │
│ WITH All Optimizations:                                     │
│ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 10-20ms                │
│                                                             │
│ Improvement: 87% faster (150ms → 20ms avg)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Query Type: Analytics Dashboard (aggregations)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ CURRENT (Live aggregation):                                │
│ ████████████████████████████████████████ 2000ms           │
│                                                             │
│ WITH Materialized View:                                     │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 400ms            │
│                                                             │
│ WITH Materialized View + Redis:                            │
│ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 50ms             │
│                                                             │
│ Improvement: 97.5% faster (2000ms → 50ms)                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Query Type: JSONB Search (field = value)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ CURRENT (GIN index exists):                                │
│ ████████████████████░░░░░░░░░░░░ 400ms                    │
│                                                             │
│ WITH Optimized query + Redis:                              │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 80ms                    │
│                                                             │
│ Improvement: 80% faster (400ms → 80ms)                     │
└─────────────────────────────────────────────────────────────┘
```

### Connection Usage

```
┌─────────────────────────────────────────────────────────────┐
│ Database Connections                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ CURRENT (Direct connections):                              │
│                                                             │
│ Peak Load (100 users):                                      │
│ Connections: 40 ████████████████████████████████████████   │
│                                                             │
│ Risk: Connection exhaustion at 200+ users                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ WITH Connection Pooling (pgBouncer):                        │
│                                                             │
│ Peak Load (100 users):                                      │
│ Connections: 15 ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                             │
│ Can handle: 500+ users without issues                      │
│                                                             │
│ Improvement: 62% fewer connections                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Optimization Decision Tree

```
Is query slow (>200ms)?
│
├─YES─► Check cache hit ratio
│       │
│       ├─Low (<70%)─► Increase TTL or add Redis cache
│       │              │
│       │              └─► GAIN: 50-70% faster
│       │
│       └─High (>70%)─► Query is inherently slow
│                       │
│                       ▼
│                   Run EXPLAIN ANALYZE
│                       │
│                       ├─Seq Scan found?
│                       │  │
│                       │  └─► Add index
│                       │      └─► GAIN: 90% faster
│                       │
│                       ├─Index Scan but slow?
│                       │  │
│                       │  └─► Add covering index
│                       │      └─► GAIN: 40-60% faster
│                       │
│                       ├─Many JOINs?
│                       │  │
│                       │  └─► Consider materialized view
│                       │      └─► GAIN: 70-90% faster
│                       │
│                       └─Aggregations?
│                          │
│                          └─► Use materialized view
│                              └─► GAIN: 95% faster
│
└─NO──► Is it cached properly?
        │
        ├─NO──► Add to React Query cache
        │       └─► GAIN: 98% hit rate
        │
        └─YES─► Consider preloading
                └─► GAIN: 0ms (instant)
```

---

## 🔧 Index Strategy Diagram

```
table_data Table Structure:
┌──────────────────────────────────────────────────────────────┐
│ id (UUID)              PK ████████████████████████████████   │
│ database_id (UUID)     FK ████████████████████████████████   │
│ data (JSONB)              ████████████████████████████████   │
│ created_at (TIMESTAMP)    ████████████████████████████████   │
│ updated_at (TIMESTAMP)    ████████████████████████████████   │
└──────────────────────────────────────────────────────────────┘

Indexes:
┌──────────────────────────────────────────────────────────────┐
│ 1. PRIMARY KEY (id)                                          │
│    Type: B-tree                                              │
│    Size: ~50MB                                               │
│    Usage: ████████████████████████████████ 98% (Very High)  │
│    Purpose: Unique row lookup                                │
├──────────────────────────────────────────────────────────────┤
│ 2. idx_table_data_db_time (database_id, created_at DESC)    │
│    Type: B-tree Composite                                    │
│    Size: ~80MB                                               │
│    Usage: ██████████████████████████████ 95% (Very High)    │
│    Purpose: Pagination, sorting, filtering                   │
│    Benefit: 90% faster list queries                          │
├──────────────────────────────────────────────────────────────┤
│ 3. idx_table_data_json (data)                               │
│    Type: GIN                                                 │
│    Size: ~150MB                                              │
│    Usage: ████████████████████ 70% (High)                   │
│    Purpose: JSONB field search (@>, ?, ?&, ?|)              │
│    Benefit: 95% faster JSONB queries                         │
├──────────────────────────────────────────────────────────────┤
│ 4. idx_table_data_covering (PROPOSED)                       │
│    Type: B-tree with INCLUDE                                 │
│    SQL: (database_id, created_at) INCLUDE (id, updated_at)  │
│    Size: ~100MB (estimated)                                  │
│    Usage: N/A (not created yet)                              │
│    Purpose: Index-only scans (no table access)               │
│    Benefit: 40-60% faster for common list queries            │
└──────────────────────────────────────────────────────────────┘

Query Pattern Coverage:
┌──────────────────────────────────────────────────────────────┐
│ SELECT * FROM table_data                                     │
│ WHERE database_id = 'xxx'                                    │
│ ORDER BY created_at DESC                                     │
│ LIMIT 50;                                                    │
│                                                              │
│ Uses: idx_table_data_db_time ✅                             │
│ Type: Index Scan                                             │
│ Cost: 10-20ms                                                │
├──────────────────────────────────────────────────────────────┤
│ SELECT * FROM table_data                                     │
│ WHERE data @> '{"status": "active"}';                       │
│                                                              │
│ Uses: idx_table_data_json ✅                                │
│ Type: Bitmap Index Scan                                      │
│ Cost: 50-100ms                                               │
├──────────────────────────────────────────────────────────────┤
│ SELECT * FROM table_data                                     │
│ WHERE data->>'field_name' = 'value';                        │
│                                                              │
│ Uses: idx_table_data_json ❌ (doesn't support ->>)         │
│ Type: Sequential Scan ⚠️                                     │
│ Cost: 500-1000ms ❌ SLOW                                     │
│ Fix: Rewrite as: data @> '{"field_name": "value"}'         │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Architecture

### Development
```
┌────────────────────────────────────────┐
│ Local Environment                       │
├────────────────────────────────────────┤
│ • Vite Dev Server (localhost:8080)    │
│ • Supabase Local (optional)            │
│ • No caching (for development)         │
│ • Hot reload enabled                   │
└────────────────────────────────────────┘
```

### Staging
```
┌────────────────────────────────────────┐
│ Staging Environment                     │
├────────────────────────────────────────┤
│ ✅ Vercel/Cloudflare (CDN)            │
│ ✅ Supabase Staging Project            │
│ ✅ Redis (Upstash free tier)           │
│ ✅ Connection pooling enabled          │
│ ⚠️ Read replica: NO                    │
│ ⚠️ Partitioning: NO                    │
└────────────────────────────────────────┘
```

### Production
```
┌────────────────────────────────────────┐
│ Production Environment                  │
├────────────────────────────────────────┤
│ ✅ Vercel/Cloudflare (Global CDN)     │
│ ✅ Supabase Pro Tier                   │
│ ✅ Redis (Upstash Pro)                 │
│ ✅ Connection pooling (pgBouncer)      │
│ ✅ Read replica (analytics)            │
│ ✅ Partitioned tables                  │
│ ✅ Materialized views                  │
│ ✅ Monitoring (Sentry + DataDog)       │
│ ✅ Auto-scaling enabled                │
└────────────────────────────────────────┘
```

---

## 📈 Scaling Strategy

### Vertical Scaling (Database)
```
Free Tier        Pro Tier         Enterprise
├─────────────┼─────────────┼──────────────┤
│ 500MB       │ 8GB         │ 500GB+       │
│ 2 CPU       │ 2-4 CPU     │ 8-64 CPU     │
│ 1GB RAM     │ 4-8GB RAM   │ 32-256GB RAM │
│             │             │              │
│ 0-100 users │ 100-1k users│ 1k-100k users│
└─────────────┴─────────────┴──────────────┘
        ▲             ▲             ▲
        │             │             │
     Current      Recommend    Future Scale
```

### Horizontal Scaling (Application)
```
Edge Functions (Auto-scaled by Supabase)
├──────────────────────────────────────────┤
│                                          │
│  Regions: 17 worldwide                   │
│  Instances: Auto-scale 0 → ∞            │
│  Cold start: <100ms                      │
│  Concurrency: 50 per function            │
│                                          │
└──────────────────────────────────────────┘

CDN (Auto-scaled by provider)
├──────────────────────────────────────────┤
│                                          │
│  PoPs: 300+ worldwide (Cloudflare)      │
│  Bandwidth: Unlimited                    │
│  Cache: Automatic invalidation           │
│                                          │
└──────────────────────────────────────────┘

Redis (Upstash)
├──────────────────────────────────────────┤
│                                          │
│  Free: 10k commands/day                 │
│  Pro: 100k-10M commands/day             │
│  Multi-region replication: Optional      │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🎓 Performance Patterns

### Pattern 1: List + Detail (Master-Detail)
```
❌ BAD: Fetch list, then fetch each detail separately
┌────────────┐
│ GET /list  │ → [id1, id2, id3, ...]
└────────────┘
     │
     ├─► GET /detail/id1  (N+1 problem!)
     ├─► GET /detail/id2
     └─► GET /detail/id3

Total: N+1 queries

✅ GOOD: Batch fetch with selected fields
┌────────────┐
│ GET /list  │ → {id, name, summary}[] (with details)
└────────────┘

Total: 1 query
Speedup: 10-50x faster
```

### Pattern 2: Analytics Dashboard
```
❌ BAD: Live aggregation on every page load
┌────────────┐
│ Dashboard  │
└────────────┘
     │
     └─► SELECT COUNT(*), AVG(), SUM() ... (2000ms)

✅ GOOD: Materialized view + scheduled refresh
┌────────────┐
│ Dashboard  │
└────────────┘
     │
     └─► SELECT * FROM dashboard_stats_mv (50ms)
         │
         └─► Refreshed hourly by cron

Speedup: 40x faster
```

### Pattern 3: Search
```
❌ BAD: Client-side filtering
┌────────────┐
│ GET /all   │ → 10,000 rows (5MB)
└────────────┘
     │
     └─► Filter in browser (slow, wasteful)

✅ GOOD: Server-side search with index
┌────────────┐
│ GET /search│?q=keyword → 10 rows (5KB)
└────────────┘
     │
     └─► Uses GIN index (100ms)

Speedup: 20x faster, 1000x less data
```

---

## 🔍 Monitoring Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MONITORING STACK                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   Frontend   │  │  Edge Funcs  │  │  Database   │  │
│  │   (Sentry)   │  │   (Logs)     │  │ (pg_stat_*) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                  │                  │         │
│         └──────────────────┴──────────────────┘         │
│                            │                            │
│                   ┌────────▼────────┐                   │
│                   │  Log Aggregator │                   │
│                   │  (Supabase)     │                   │
│                   └────────┬────────┘                   │
│                            │                            │
│         ┌──────────────────┼──────────────────┐         │
│         │                  │                  │         │
│  ┌──────▼──────┐  ┌────────▼───────┐  ┌──────▼──────┐  │
│  │ Performance │  │  Error Tracking│  │  Alerting   │  │
│  │  Dashboard  │  │  (Sentry)      │  │  (Webhook)  │  │
│  └─────────────┘  └────────────────┘  └─────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘

Metrics Collected:
┌─────────────────────────────────────────────────────────┐
│ • Query duration (p50, p95, p99)                       │
│ • Cache hit ratio (React Query, Redis, PostgreSQL)     │
│ • Connection count (active, idle, idle-in-transaction) │
│ • Error rate (4xx, 5xx)                                │
│ • Database size (tables, indexes)                      │
│ • Table bloat percentage                               │
│ • Slow queries (>1s)                                   │
│ • RLS policy execution time                            │
└─────────────────────────────────────────────────────────┘
```

---

**Next:** [PERFORMANCE_CODE_EXAMPLES.md](PERFORMANCE_CODE_EXAMPLES.md) - Detailed before/after code samples
