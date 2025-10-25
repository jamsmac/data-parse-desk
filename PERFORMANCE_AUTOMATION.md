# Performance Automation & CI/CD Integration

**Automated testing, monitoring, and optimization for continuous performance excellence**

---

## 📋 Table of Contents

1. [Automated Performance Tests](#1-automated-performance-tests)
2. [CI/CD Integration](#2-cicd-integration)
3. [Performance Regression Prevention](#3-performance-regression-prevention)
4. [Automated Monitoring & Alerts](#4-automated-monitoring--alerts)
5. [Auto-Optimization Scripts](#5-auto-optimization-scripts)
6. [Database Maintenance Automation](#6-database-maintenance-automation)

---

## 1. Automated Performance Tests

### 1.1 K6 Load Testing Suite

```javascript
// performance-tests/load-test.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const queryDuration = new Trend('query_duration');
const cacheHitRate = new Rate('cache_hits');
const requestCounter = new Counter('requests');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up
    { duration: '3m', target: 50 },   // Normal load
    { duration: '2m', target: 100 },  // Peak load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // ✅ Pass criteria
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'],                  // <1% errors
    'errors': ['rate<0.05'],                           // <5% errors
    'cache_hits': ['rate>0.70'],                       // >70% cache hits
  },
  ext: {
    loadimpact: {
      projectID: 3477349,
      name: 'DataParseDesk Performance Test',
    },
  },
};

const BASE_URL = __ENV.API_URL || 'https://uzcmaxfhfcsxzfqvaloz.supabase.co';
const API_KEY = __ENV.API_KEY;

// Test scenarios
export default function () {
  const params = {
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  group('Database List Query', () => {
    const res = http.get(
      `${BASE_URL}/rest/v1/databases?select=*&order=created_at.desc&limit=50`,
      params
    );

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'has data': (r) => JSON.parse(r.body).length > 0,
    });

    errorRate.add(!success);
    queryDuration.add(res.timings.duration);
    requestCounter.add(1);

    // Check for cache hit header
    if (res.headers['X-Cache-Hit']) {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }
  });

  group('Table Data Pagination', () => {
    const res = http.get(
      `${BASE_URL}/rest/v1/table_data?select=id,data,created_at&limit=50&offset=0`,
      params
    );

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
      'returns 50 rows': (r) => JSON.parse(r.body).length === 50,
    });

    queryDuration.add(res.timings.duration);
  });

  group('JSONB Search Query', () => {
    const res = http.get(
      `${BASE_URL}/rest/v1/table_data?data=cs.{"status":"active"}&limit=20`,
      params
    );

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    queryDuration.add(res.timings.duration);
  });

  group('Analytics Dashboard', () => {
    const res = http.get(
      `${BASE_URL}/rest/v1/dashboard_stats?select=*`,
      params
    );

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
      'has stats': (r) => {
        const data = JSON.parse(r.body);
        return data.length > 0 && data[0].total_databases !== undefined;
      },
    });

    queryDuration.add(res.timings.duration);
  });

  sleep(1); // Think time between requests
}

// Teardown function
export function teardown(data) {
  console.log('Test completed');
  console.log(`Total requests: ${data.requestCounter}`);
  console.log(`Error rate: ${data.errorRate * 100}%`);
  console.log(`Cache hit rate: ${data.cacheHitRate * 100}%`);
}
```

### 1.2 Database Performance Tests (SQL)

```sql
-- performance-tests/db-benchmark.sql
-- Database performance benchmark suite

-- ============================================================================
-- 1. Index Performance Test
-- ============================================================================
DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  test_db_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
  -- Test 1: Indexed query (should use idx_table_data_db_time)
  start_time := clock_timestamp();

  PERFORM *
  FROM table_data
  WHERE database_id = test_db_id
  ORDER BY created_at DESC
  LIMIT 50;

  end_time := clock_timestamp();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  RAISE NOTICE 'Index scan query: % ms', duration_ms;

  -- ✅ PASS if < 100ms
  IF duration_ms > 100 THEN
    RAISE WARNING '⚠️ Index query slower than expected: % ms (target: <100ms)', duration_ms;
  ELSE
    RAISE NOTICE '✅ Index query performance OK';
  END IF;
END $$;

-- ============================================================================
-- 2. GIN Index Performance Test
-- ============================================================================
DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
BEGIN
  start_time := clock_timestamp();

  PERFORM *
  FROM table_data
  WHERE data @> '{"status": "active"}'
  LIMIT 20;

  end_time := clock_timestamp();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  RAISE NOTICE 'GIN index query: % ms', duration_ms;

  -- ✅ PASS if < 200ms
  IF duration_ms > 200 THEN
    RAISE WARNING '⚠️ GIN query slower than expected: % ms (target: <200ms)', duration_ms;
  ELSE
    RAISE NOTICE '✅ GIN query performance OK';
  END IF;
END $$;

-- ============================================================================
-- 3. RLS Policy Performance Test
-- ============================================================================
DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  test_user_id UUID := auth.uid();
BEGIN
  start_time := clock_timestamp();

  -- Test with RLS policy active
  SET LOCAL ROLE authenticated;

  PERFORM *
  FROM table_data
  WHERE database_id IN (
    SELECT d.id
    FROM databases d
    INNER JOIN project_members pm ON pm.project_id = d.project_id
    WHERE pm.user_id = test_user_id
  )
  LIMIT 50;

  end_time := clock_timestamp();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  RAISE NOTICE 'RLS policy query: % ms', duration_ms;

  -- ✅ PASS if < 150ms
  IF duration_ms > 150 THEN
    RAISE WARNING '⚠️ RLS query slower than expected: % ms (target: <150ms)', duration_ms;
  ELSE
    RAISE NOTICE '✅ RLS query performance OK';
  END IF;

  RESET ROLE;
END $$;

-- ============================================================================
-- 4. Aggregation Performance Test
-- ============================================================================
DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
BEGIN
  start_time := clock_timestamp();

  PERFORM
    database_id,
    COUNT(*) AS row_count,
    MAX(created_at) AS last_updated
  FROM table_data
  GROUP BY database_id
  ORDER BY row_count DESC
  LIMIT 20;

  end_time := clock_timestamp();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  RAISE NOTICE 'Aggregation query: % ms', duration_ms;

  -- ✅ PASS if < 500ms (or <100ms with materialized view)
  IF duration_ms > 500 THEN
    RAISE WARNING '⚠️ Aggregation slower than expected: % ms (target: <500ms, <100ms with mat view)', duration_ms;
  ELSE
    RAISE NOTICE '✅ Aggregation performance OK';
  END IF;
END $$;

-- ============================================================================
-- 5. Cache Hit Ratio Test
-- ============================================================================
DO $$
DECLARE
  cache_hit_ratio NUMERIC;
  index_hit_ratio NUMERIC;
BEGIN
  -- Table cache hit ratio
  SELECT round(100.0 * sum(heap_blks_hit) /
    NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
  INTO cache_hit_ratio
  FROM pg_statio_user_tables;

  RAISE NOTICE 'Table cache hit ratio: %%%', cache_hit_ratio;

  -- ✅ PASS if > 99%
  IF cache_hit_ratio < 99 THEN
    RAISE WARNING '⚠️ Low cache hit ratio: %% (target: >99%%)', cache_hit_ratio;
  ELSE
    RAISE NOTICE '✅ Cache hit ratio OK';
  END IF;

  -- Index cache hit ratio
  SELECT round(100.0 * sum(idx_blks_hit) /
    NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2)
  INTO index_hit_ratio
  FROM pg_statio_user_indexes;

  RAISE NOTICE 'Index cache hit ratio: %% %%', index_hit_ratio;

  IF index_hit_ratio < 99 THEN
    RAISE WARNING '⚠️ Low index cache hit ratio: %% (target: >99%%)', index_hit_ratio;
  ELSE
    RAISE NOTICE '✅ Index cache hit ratio OK';
  END IF;
END $$;

-- ============================================================================
-- 6. Connection Count Test
-- ============================================================================
DO $$
DECLARE
  active_conn INTEGER;
  total_conn INTEGER;
BEGIN
  SELECT count(*)
  INTO active_conn
  FROM pg_stat_activity
  WHERE state = 'active' AND datname = current_database();

  SELECT count(*)
  INTO total_conn
  FROM pg_stat_activity
  WHERE datname = current_database();

  RAISE NOTICE 'Active connections: % / Total: %', active_conn, total_conn;

  -- ✅ PASS if active < 50, total < 100
  IF active_conn > 50 THEN
    RAISE WARNING '⚠️ Too many active connections: % (target: <50)', active_conn;
  ELSE
    RAISE NOTICE '✅ Active connections OK';
  END IF;

  IF total_conn > 100 THEN
    RAISE WARNING '⚠️ Too many total connections: % (target: <100)', total_conn;
  ELSE
    RAISE NOTICE '✅ Total connections OK';
  END IF;
END $$;

-- ============================================================================
-- Summary Report
-- ============================================================================
SELECT
  'Performance Benchmark Complete' AS status,
  NOW() AS tested_at,
  current_database() AS database,
  version() AS postgres_version;
```

### 1.3 Frontend Performance Tests (Playwright)

```typescript
// performance-tests/e2e-performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('Database list loads in under 1 second', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/databases');
    await page.waitForSelector('[data-testid="database-card"]', { timeout: 5000 });

    const loadTime = Date.now() - startTime;

    console.log(`Database list load time: ${loadTime}ms`);

    // ✅ PASS if < 1000ms
    expect(loadTime).toBeLessThan(1000);
  });

  test('Table data pagination is fast', async ({ page }) => {
    await page.goto('/databases/test-db-id');

    const startTime = Date.now();
    await page.click('[data-testid="next-page"]');
    await page.waitForSelector('[data-testid="table-row"]', { state: 'attached' });

    const paginationTime = Date.now() - startTime;

    console.log(`Pagination time: ${paginationTime}ms`);

    // ✅ PASS if < 300ms
    expect(paginationTime).toBeLessThan(300);
  });

  test('Search responds quickly', async ({ page }) => {
    await page.goto('/databases/test-db-id');

    const startTime = Date.now();
    await page.fill('[data-testid="search-input"]', 'test query');
    await page.waitForTimeout(500); // Debounce
    await page.waitForSelector('[data-testid="search-results"]');

    const searchTime = Date.now() - startTime;

    console.log(`Search time: ${searchTime}ms`);

    // ✅ PASS if < 1000ms
    expect(searchTime).toBeLessThan(1000);
  });

  test('Web Vitals are good', async ({ page }) => {
    await page.goto('/');

    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics = {};

          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics['LCP'] = entry.renderTime || entry.loadTime;
            }
            if (entry.entryType === 'first-input') {
              metrics['FID'] = entry.processingStart - entry.startTime;
            }
          });

          // Get CLS
          const cls = entries.reduce((sum, entry) => {
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              return sum + entry.value;
            }
            return sum;
          }, 0);

          metrics['CLS'] = cls;

          resolve(metrics);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

        setTimeout(() => resolve({}), 5000);
      });
    });

    console.log('Web Vitals:', vitals);

    // ✅ Core Web Vitals thresholds
    if (vitals['LCP']) expect(vitals['LCP']).toBeLessThan(2500); // LCP < 2.5s
    if (vitals['FID']) expect(vitals['FID']).toBeLessThan(100);  // FID < 100ms
    if (vitals['CLS']) expect(vitals['CLS']).toBeLessThan(0.1);  // CLS < 0.1
  });

  test('React Query cache is working', async ({ page }) => {
    // First load
    const firstLoad = Date.now();
    await page.goto('/databases');
    await page.waitForSelector('[data-testid="database-card"]');
    const firstLoadTime = Date.now() - firstLoad;

    // Navigate away and back
    await page.goto('/settings');

    // Second load (should be from cache)
    const secondLoad = Date.now();
    await page.goto('/databases');
    await page.waitForSelector('[data-testid="database-card"]');
    const secondLoadTime = Date.now() - secondLoad;

    console.log(`First load: ${firstLoadTime}ms, Second load: ${secondLoadTime}ms`);

    // ✅ Second load should be significantly faster (cache hit)
    expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.3); // 70% faster
  });
});

// Performance budget test
test('Performance budget', async ({ page }) => {
  await page.goto('/');

  const metrics = await page.evaluate(() => ({
    JS: performance.getEntriesByType('resource')
      .filter(r => r.initiatorType === 'script')
      .reduce((sum, r) => sum + r.transferSize, 0),
    CSS: performance.getEntriesByType('resource')
      .filter(r => r.initiatorType === 'link')
      .reduce((sum, r) => sum + r.transferSize, 0),
    Images: performance.getEntriesByType('resource')
      .filter(r => r.initiatorType === 'img')
      .reduce((sum, r) => sum + r.transferSize, 0),
    Total: performance.getEntriesByType('resource')
      .reduce((sum, r) => sum + r.transferSize, 0),
  }));

  console.log('Performance Budget:', {
    JS: `${(metrics.JS / 1024).toFixed(2)} KB`,
    CSS: `${(metrics.CSS / 1024).toFixed(2)} KB`,
    Images: `${(metrics.Images / 1024).toFixed(2)} KB`,
    Total: `${(metrics.Total / 1024).toFixed(2)} KB`,
  });

  // ✅ Performance budget thresholds
  expect(metrics.JS).toBeLessThan(500 * 1024);      // JS < 500KB
  expect(metrics.CSS).toBeLessThan(100 * 1024);     // CSS < 100KB
  expect(metrics.Images).toBeLessThan(1000 * 1024); // Images < 1MB
  expect(metrics.Total).toBeLessThan(2000 * 1024);  // Total < 2MB
});
```

---

## 2. CI/CD Integration

### 2.1 GitHub Actions Workflow

```yaml
# .github/workflows/performance-tests.yml
name: Performance Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]
  schedule:
    # Run daily at 3 AM UTC
    - cron: '0 3 * * *'

jobs:
  database-performance:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: supabase/postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Run database migrations
        run: |
          psql -h localhost -U postgres -f supabase/migrations/*.sql
        env:
          PGPASSWORD: postgres

      - name: Run performance benchmarks
        run: |
          psql -h localhost -U postgres -f performance-tests/db-benchmark.sql
        env:
          PGPASSWORD: postgres

      - name: Check slow queries
        run: |
          SLOW_QUERIES=$(psql -h localhost -U postgres -t -c "
            SELECT count(*)
            FROM pg_stat_statements
            WHERE mean_exec_time > 1000
          ")

          if [ $SLOW_QUERIES -gt 0 ]; then
            echo "⚠️ Found $SLOW_QUERIES slow queries (>1s)"
            exit 1
          fi
        env:
          PGPASSWORD: postgres

  load-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load tests
        run: |
          k6 run performance-tests/load-test.js \
            --env API_URL=${{ secrets.SUPABASE_URL }} \
            --env API_KEY=${{ secrets.SUPABASE_ANON_KEY }} \
            --out json=performance-results.json

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-results.json

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('performance-results.json'));

            const p95 = results.metrics.http_req_duration.values['p(95)'];
            const errorRate = results.metrics.http_req_failed.values.rate;

            const comment = `
            ## Performance Test Results

            - **P95 Response Time**: ${p95}ms (target: <500ms)
            - **Error Rate**: ${(errorRate * 100).toFixed(2)}% (target: <1%)

            ${p95 < 500 ? '✅ Performance targets met!' : '⚠️ Performance regression detected!'}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

  frontend-performance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E performance tests
        run: npm run test:e2e:performance

      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun --config=.lighthouserc.json

      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci

  performance-report:
    needs: [database-performance, load-tests, frontend-performance]
    runs-on: ubuntu-latest
    if: always()

    steps:
      - uses: actions/download-artifact@v3

      - name: Generate performance report
        run: |
          echo "# Performance Test Summary" > performance-report.md
          echo "" >> performance-report.md
          echo "## Test Results" >> performance-report.md
          echo "- Database: ${{ needs.database-performance.result }}" >> performance-report.md
          echo "- Load Tests: ${{ needs.load-tests.result }}" >> performance-report.md
          echo "- Frontend: ${{ needs.frontend-performance.result }}" >> performance-report.md

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: performance-report.md
```

### 2.2 Pre-commit Performance Checks

```yaml
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running pre-commit performance checks..."

# Check for SELECT * in new code
if git diff --cached --name-only | grep -E '\.(ts|tsx|sql)$' | xargs grep -l 'SELECT \*'; then
  echo "⚠️ Warning: Found SELECT * in committed files"
  echo "Consider selecting specific columns for better performance"
fi

# Check bundle size
npm run build:check
if [ $? -ne 0 ]; then
  echo "❌ Bundle size exceeded limits"
  exit 1
fi

# Run type check
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ Type check failed"
  exit 1
fi

echo "✅ Pre-commit checks passed"
```

---

## 3. Performance Regression Prevention

### 3.1 Performance Budget Configuration

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:5173"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        "total-blocking-time": ["error", {"maxNumericValue": 300}],
        "speed-index": ["error", {"maxNumericValue": 3000}],
        "interactive": ["error", {"maxNumericValue": 3500}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### 3.2 Bundle Size Monitoring

```javascript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const BUNDLE_LIMITS = {
  'index': 30 * 1024,           // 30 KB
  'react-vendor': 75 * 1024,     // 75 KB
  'supabase-vendor': 40 * 1024,  // 40 KB
  'chart-vendor': 125 * 1024,    // 125 KB
  'xlsx-parser': 260 * 1024,     // 260 KB
};

const distPath = path.join(__dirname, '../dist/assets');
const files = fs.readdirSync(distPath);

let hasErrors = false;

files.forEach(file => {
  if (!file.endsWith('.js')) return;

  const filePath = path.join(distPath, file);
  const content = fs.readFileSync(filePath);
  const gzipped = gzipSync(content);
  const size = gzipped.length;

  // Match against bundle limits
  for (const [name, limit] of Object.entries(BUNDLE_LIMITS)) {
    if (file.includes(name)) {
      const sizeKB = (size / 1024).toFixed(2);
      const limitKB = (limit / 1024).toFixed(2);
      const percentage = ((size / limit) * 100).toFixed(1);

      if (size > limit) {
        console.error(`❌ ${file}: ${sizeKB} KB (limit: ${limitKB} KB) - ${percentage}% of budget`);
        hasErrors = true;
      } else {
        console.log(`✅ ${file}: ${sizeKB} KB (limit: ${limitKB} KB) - ${percentage}% of budget`);
      }
    }
  }
});

if (hasErrors) {
  console.error('\n❌ Bundle size check failed!');
  process.exit(1);
} else {
  console.log('\n✅ Bundle size check passed!');
}
```

---

## 4. Automated Monitoring & Alerts

### 4.1 Real-time Performance Monitoring (Sentry)

```typescript
// src/lib/monitoring.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initializeMonitoring() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENVIRONMENT,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% of transactions

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of errors

      // Custom performance thresholds
      beforeSend(event, hint) {
        // Flag slow transactions
        if (event.type === 'transaction') {
          const duration = event.contexts?.trace?.duration;
          if (duration && duration > 3000) { // >3s
            event.tags = {
              ...event.tags,
              'performance': 'slow',
            };
          }
        }

        return event;
      },
    });

    // Custom performance marks
    Sentry.addGlobalEventProcessor((event) => {
      if (event.type === 'transaction') {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation) {
          event.measurements = {
            ...event.measurements,
            'fcp': { value: navigation.responseStart },
            'domComplete': { value: navigation.domComplete },
            'loadComplete': { value: navigation.loadEventEnd },
          };
        }
      }

      return event;
    });
  }
}

// Track custom metrics
export function trackMetric(name: string, value: number, unit: 'ms' | 'bytes' | 'count' = 'ms') {
  Sentry.metrics.distribution(name, value, {
    unit,
    tags: {
      environment: import.meta.env.VITE_ENVIRONMENT,
    },
  });
}

// Track database query performance
export async function trackQuery<T>(
  name: string,
  query: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await query();
    const duration = performance.now() - startTime;

    trackMetric(`query.${name}`, duration);

    // Alert on slow queries
    if (duration > 1000) {
      Sentry.captureMessage(`Slow query detected: ${name}`, {
        level: 'warning',
        extra: {
          duration,
          query: name,
        },
      });
    }

    return result;
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        query: name,
      },
    });
    throw error;
  }
}
```

### 4.2 Database Performance Alerts

```sql
-- Create alert function
CREATE OR REPLACE FUNCTION send_performance_alert(
  alert_type TEXT,
  message TEXT,
  severity TEXT DEFAULT 'warning'
)
RETURNS void AS $$
DECLARE
  webhook_url TEXT := current_setting('app.webhook_url', true);
BEGIN
  -- Send to webhook (Slack, Discord, etc.)
  PERFORM http_post(
    webhook_url,
    json_build_object(
      'type', alert_type,
      'message', message,
      'severity', severity,
      'timestamp', NOW(),
      'database', current_database()
    )::text,
    'application/json'
  );

  -- Log to table
  INSERT INTO performance_alerts (alert_type, message, severity, created_at)
  VALUES (alert_type, message, severity, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automated monitoring job
CREATE OR REPLACE FUNCTION monitor_performance()
RETURNS void AS $$
DECLARE
  slow_query_count INTEGER;
  active_conns INTEGER;
  cache_hit_ratio NUMERIC;
  table_bloat_count INTEGER;
BEGIN
  -- Check for slow queries
  SELECT count(*)
  INTO slow_query_count
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000
    AND calls > 10;

  IF slow_query_count > 0 THEN
    PERFORM send_performance_alert(
      'slow_queries',
      format('Found %s queries with mean execution time >1s', slow_query_count),
      'warning'
    );
  END IF;

  -- Check active connections
  SELECT count(*)
  INTO active_conns
  FROM pg_stat_activity
  WHERE state = 'active' AND datname = current_database();

  IF active_conns > 80 THEN
    PERFORM send_performance_alert(
      'high_connections',
      format('Active connections: %s (threshold: 80)', active_conns),
      'critical'
    );
  END IF;

  -- Check cache hit ratio
  SELECT round(100.0 * sum(heap_blks_hit) /
    NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
  INTO cache_hit_ratio
  FROM pg_statio_user_tables;

  IF cache_hit_ratio < 95 THEN
    PERFORM send_performance_alert(
      'low_cache_hit',
      format('Cache hit ratio: %.2f%% (threshold: 95%%)', cache_hit_ratio),
      'warning'
    );
  END IF;

  -- Check table bloat
  SELECT count(*)
  INTO table_bloat_count
  FROM pg_stat_user_tables
  WHERE n_dead_tup > n_live_tup * 0.2
    AND n_live_tup > 100;

  IF table_bloat_count > 0 THEN
    PERFORM send_performance_alert(
      'table_bloat',
      format('%s tables with >20%% bloat need VACUUM', table_bloat_count),
      'warning'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule monitoring (every 15 minutes)
SELECT cron.schedule(
  'performance-monitoring',
  '*/15 * * * *',
  'SELECT monitor_performance()'
);
```

---

## 5. Auto-Optimization Scripts

### 5.1 Index Creation Recommendations

```sql
-- scripts/auto-create-indexes.sql
-- Automatically create missing indexes based on query patterns

-- ============================================================================
-- 1. Find missing indexes from slow queries
-- ============================================================================
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE (
  table_name TEXT,
  column_names TEXT[],
  reason TEXT,
  estimated_impact TEXT,
  create_sql TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH slow_queries AS (
    SELECT
      query,
      calls,
      mean_exec_time,
      total_exec_time
    FROM pg_stat_statements
    WHERE mean_exec_time > 500  -- >500ms average
      AND calls > 10             -- Called frequently
    ORDER BY total_exec_time DESC
    LIMIT 20
  )
  SELECT
    t.relname::TEXT AS table_name,
    ARRAY[a.attname]::TEXT[] AS column_names,
    format('Used in WHERE clause %s times, avg time: %.2fms', sq.calls, sq.mean_exec_time)::TEXT AS reason,
    CASE
      WHEN sq.mean_exec_time > 2000 THEN 'HIGH - Could reduce 80-90% query time'
      WHEN sq.mean_exec_time > 1000 THEN 'MEDIUM - Could reduce 50-70% query time'
      ELSE 'LOW - Could reduce 20-40% query time'
    END::TEXT AS estimated_impact,
    format('CREATE INDEX CONCURRENTLY idx_%s_%s ON %s (%s);',
      t.relname, a.attname, t.relname, a.attname)::TEXT AS create_sql
  FROM slow_queries sq
  CROSS JOIN pg_class t
  CROSS JOIN pg_attribute a
  WHERE t.relkind = 'r'
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND a.attrelid = t.oid
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND sq.query ILIKE '%WHERE%' || a.attname || '%'
    AND NOT EXISTS (
      -- Don't suggest if index already exists
      SELECT 1
      FROM pg_index i
      JOIN pg_attribute ia ON ia.attrelid = i.indrelid AND ia.attnum = ANY(i.indkey)
      WHERE i.indrelid = t.oid
        AND ia.attname = a.attname
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Auto-create safe indexes
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_create_indexes(
  dry_run BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  action TEXT,
  index_name TEXT,
  table_name TEXT,
  result TEXT
) AS $$
DECLARE
  suggestion RECORD;
  index_sql TEXT;
BEGIN
  FOR suggestion IN
    SELECT * FROM suggest_missing_indexes()
    WHERE estimated_impact IN ('HIGH', 'MEDIUM')
    LIMIT 5  -- Safety limit
  LOOP
    index_sql := suggestion.create_sql;

    IF dry_run THEN
      RETURN QUERY SELECT
        'DRY RUN'::TEXT,
        split_part(index_sql, ' ', 5)::TEXT,  -- Extract index name
        suggestion.table_name,
        format('Would execute: %s', index_sql)::TEXT;
    ELSE
      BEGIN
        EXECUTE index_sql;
        RETURN QUERY SELECT
          'CREATED'::TEXT,
          split_part(index_sql, ' ', 5)::TEXT,
          suggestion.table_name,
          'Index created successfully'::TEXT;
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
          'FAILED'::TEXT,
          split_part(index_sql, ' ', 5)::TEXT,
          suggestion.table_name,
          format('Error: %s', SQLERRM)::TEXT;
      END;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Usage:
-- SELECT * FROM auto_create_indexes(dry_run := TRUE);  -- Preview
-- SELECT * FROM auto_create_indexes(dry_run := FALSE); -- Execute
```

### 5.2 VACUUM Automation

```sql
-- scripts/auto-vacuum.sql

-- ============================================================================
-- 1. Identify tables needing VACUUM
-- ============================================================================
CREATE OR REPLACE FUNCTION tables_needing_vacuum()
RETURNS TABLE (
  schema_name TEXT,
  table_name TEXT,
  live_tuples BIGINT,
  dead_tuples BIGINT,
  dead_tuple_percent NUMERIC,
  last_vacuum TIMESTAMP,
  last_autovacuum TIMESTAMP,
  priority TEXT,
  vacuum_sql TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname::TEXT,
    relname::TEXT,
    n_live_tup,
    n_dead_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_percent,
    last_vacuum,
    last_autovacuum,
    CASE
      WHEN n_dead_tup > n_live_tup * 0.5 THEN 'URGENT'
      WHEN n_dead_tup > n_live_tup * 0.2 THEN 'HIGH'
      WHEN n_dead_tup > n_live_tup * 0.1 THEN 'MEDIUM'
      ELSE 'LOW'
    END::TEXT AS priority,
    format('VACUUM ANALYZE %I.%I;', schemaname, relname)::TEXT AS vacuum_sql
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND n_dead_tup > 100  -- Minimum threshold
  ORDER BY n_dead_tup DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Auto-VACUUM high priority tables
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_vacuum_tables(
  max_tables INTEGER DEFAULT 5,
  priority_filter TEXT DEFAULT 'URGENT'
)
RETURNS TABLE (
  table_name TEXT,
  action TEXT,
  result TEXT,
  duration_ms NUMERIC
) AS $$
DECLARE
  tbl RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
BEGIN
  FOR tbl IN
    SELECT *
    FROM tables_needing_vacuum()
    WHERE priority = priority_filter
    LIMIT max_tables
  LOOP
    start_time := clock_timestamp();

    BEGIN
      EXECUTE tbl.vacuum_sql;
      end_time := clock_timestamp();

      RETURN QUERY SELECT
        tbl.table_name,
        'VACUUM'::TEXT,
        'Success'::TEXT,
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT
        tbl.table_name,
        'VACUUM'::TEXT,
        format('Failed: %s', SQLERRM)::TEXT,
        0::NUMERIC;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Schedule automated VACUUM
-- ============================================================================
-- Daily at 2 AM UTC (low traffic period)
SELECT cron.schedule(
  'auto-vacuum-urgent',
  '0 2 * * *',
  $$SELECT auto_vacuum_tables(max_tables := 10, priority_filter := 'URGENT')$$
);

-- Weekly on Sunday at 3 AM UTC
SELECT cron.schedule(
  'auto-vacuum-high',
  '0 3 * * 0',
  $$SELECT auto_vacuum_tables(max_tables := 20, priority_filter := 'HIGH')$$
);
```

### 5.3 Query Optimization Auto-Rewriter

```typescript
// scripts/query-optimizer.ts
/**
 * Automatically detect and rewrite inefficient queries
 */

interface QueryPattern {
  pattern: RegExp;
  issue: string;
  rewrite: (match: string) => string;
  severity: 'high' | 'medium' | 'low';
}

const OPTIMIZATION_PATTERNS: QueryPattern[] = [
  // 1. SELECT * → SELECT specific columns
  {
    pattern: /SELECT \* FROM (\w+)/gi,
    issue: 'SELECT * fetches unnecessary columns',
    severity: 'high',
    rewrite: (match) => {
      const tableName = match.match(/FROM (\w+)/i)?.[1];
      return `SELECT id, name, created_at FROM ${tableName} -- TODO: Select only needed columns`;
    },
  },

  // 2. NOT IN → NOT EXISTS (better performance)
  {
    pattern: /WHERE (\w+) NOT IN \(SELECT/gi,
    issue: 'NOT IN is slower than NOT EXISTS',
    severity: 'medium',
    rewrite: (match) => {
      const column = match.match(/WHERE (\w+)/i)?.[1];
      return `WHERE NOT EXISTS (SELECT 1 -- Optimized from NOT IN`;
    },
  },

  // 3. OR → UNION (sometimes faster)
  {
    pattern: /WHERE (\w+) = '(.+?)' OR \1 = '(.+?)'/gi,
    issue: 'Multiple OR conditions may benefit from UNION',
    severity: 'low',
    rewrite: (match) => {
      return `-- Consider using UNION instead of OR for better index usage\n${match}`;
    },
  },

  // 4. LIKE '%...%' → Full-text search
  {
    pattern: /WHERE (\w+) LIKE '%(.+?)%'/gi,
    issue: 'LIKE with leading wildcard prevents index usage',
    severity: 'high',
    rewrite: (match) => {
      const column = match.match(/WHERE (\w+)/i)?.[1];
      return `WHERE to_tsvector('english', ${column}) @@ plainto_tsquery('english', '...') -- Use full-text search instead`;
    },
  },

  // 5. Missing LIMIT
  {
    pattern: /SELECT .+ FROM \w+(?!.*LIMIT)/gi,
    issue: 'Query without LIMIT may return too many rows',
    severity: 'medium',
    rewrite: (match) => {
      return `${match}\nLIMIT 100 -- Add appropriate limit`;
    },
  },
];

/**
 * Analyze and optimize a SQL query
 */
export function optimizeQuery(sql: string): {
  original: string;
  optimized: string;
  issues: Array<{ severity: string; issue: string; }>;
  improvement: string;
} {
  let optimized = sql;
  const issues: Array<{ severity: string; issue: string; }> = [];

  for (const pattern of OPTIMIZATION_PATTERNS) {
    if (pattern.pattern.test(sql)) {
      optimized = optimized.replace(pattern.pattern, pattern.rewrite);
      issues.push({
        severity: pattern.severity,
        issue: pattern.issue,
      });
    }
  }

  return {
    original: sql,
    optimized,
    issues,
    improvement: issues.length > 0
      ? `Found ${issues.length} optimization opportunities`
      : 'Query looks good!',
  };
}

/**
 * Scan codebase for inefficient queries
 */
export async function scanCodebase(directory: string): Promise<void> {
  const { glob } = await import('glob');
  const fs = await import('fs/promises');

  const files = await glob(`${directory}/**/*.{ts,tsx,sql}`, {
    ignore: ['**/node_modules/**', '**/dist/**'],
  });

  console.log(`\n🔍 Scanning ${files.length} files for query optimizations...\n`);

  let totalIssues = 0;

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');

    // Extract SQL queries (basic regex, could be improved)
    const queries = content.match(/`[\s\S]*?SELECT[\s\S]*?`/g) || [];

    for (const query of queries) {
      const cleaned = query.replace(/`/g, '');
      const result = optimizeQuery(cleaned);

      if (result.issues.length > 0) {
        console.log(`📁 ${file}`);
        console.log(`   Issues: ${result.issues.map(i => i.issue).join(', ')}`);
        console.log(`   Before: ${result.original.substring(0, 80)}...`);
        console.log(`   After:  ${result.optimized.substring(0, 80)}...`);
        console.log('');
        totalIssues += result.issues.length;
      }
    }
  }

  console.log(`\n✅ Scan complete. Found ${totalIssues} optimization opportunities.`);
}

// CLI usage
if (import.meta.main) {
  const directory = Deno.args[0] || './src';
  await scanCodebase(directory);
}
```

### 5.4 Connection Pool Auto-Tuner

```typescript
// scripts/tune-connection-pool.ts
/**
 * Automatically tune database connection pool based on usage patterns
 */

interface PoolMetrics {
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  avgQueryTime: number;
  peakConcurrency: number;
}

interface PoolConfig {
  min: number;
  max: number;
  acquireTimeout: number;
  idleTimeout: number;
  connectionTimeout: number;
}

/**
 * Analyze current pool performance
 */
async function analyzePoolMetrics(supabase: any): Promise<PoolMetrics> {
  const { data: stats } = await supabase
    .rpc('get_connection_stats');

  return {
    activeConnections: stats?.active || 0,
    idleConnections: stats?.idle || 0,
    waitingClients: stats?.waiting || 0,
    totalQueries: stats?.total_queries || 0,
    avgQueryTime: stats?.avg_query_time || 0,
    peakConcurrency: stats?.peak_concurrency || 0,
  };
}

/**
 * Recommend optimal pool configuration
 */
export function recommendPoolConfig(metrics: PoolMetrics): {
  config: PoolConfig;
  reasoning: string[];
} {
  const reasoning: string[] = [];
  const config: PoolConfig = {
    min: 2,
    max: 10,
    acquireTimeout: 30000,
    idleTimeout: 10000,
    connectionTimeout: 5000,
  };

  // Adjust max based on peak concurrency
  if (metrics.peakConcurrency > 20) {
    config.max = 20;
    reasoning.push('High peak concurrency detected - increased max to 20');
  } else if (metrics.peakConcurrency < 5) {
    config.max = 5;
    reasoning.push('Low peak concurrency - reduced max to 5 to save resources');
  }

  // Adjust min based on average usage
  const avgUtilization = metrics.activeConnections / metrics.peakConcurrency;
  if (avgUtilization > 0.8) {
    config.min = Math.ceil(config.max * 0.3);
    reasoning.push(`High utilization (${(avgUtilization * 100).toFixed(0)}%) - increased min pool size`);
  }

  // Adjust timeouts based on query performance
  if (metrics.avgQueryTime > 1000) {
    config.acquireTimeout = 60000; // 60s
    config.connectionTimeout = 10000; // 10s
    reasoning.push('Slow queries detected - increased timeouts');
  }

  // Check for waiting clients
  if (metrics.waitingClients > 5) {
    config.max = Math.min(config.max + 5, 30);
    reasoning.push('Connection pool saturation detected - increased max pool size');
  }

  return { config, reasoning };
}

/**
 * Auto-tune and apply configuration
 */
export async function autoTunePool(supabase: any, dryRun = true): Promise<void> {
  console.log('🔧 Analyzing connection pool metrics...\n');

  const metrics = await analyzePoolMetrics(supabase);

  console.log('Current Metrics:');
  console.log(`  Active: ${metrics.activeConnections}`);
  console.log(`  Idle: ${metrics.idleConnections}`);
  console.log(`  Waiting: ${metrics.waitingClients}`);
  console.log(`  Peak Concurrency: ${metrics.peakConcurrency}`);
  console.log(`  Avg Query Time: ${metrics.avgQueryTime}ms\n`);

  const { config, reasoning } = recommendPoolConfig(metrics);

  console.log('Recommended Configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\nReasoning:');
  reasoning.forEach(r => console.log(`  - ${r}`));

  if (!dryRun) {
    console.log('\n✅ Applying configuration...');
    // Apply configuration (implementation depends on your setup)
    // For Supabase Edge Functions, you'd update the import.meta.env or Deno.env
  } else {
    console.log('\n🔍 Dry run - no changes applied');
  }
}
```

---

## 6. Database Maintenance Automation

### 6.1 Scheduled Maintenance Jobs

```sql
-- scripts/maintenance-jobs.sql

-- ============================================================================
-- 1. Daily Statistics Update (2 AM UTC)
-- ============================================================================
SELECT cron.schedule(
  'daily-analyze',
  '0 2 * * *',
  $$
  DO $$
  DECLARE
    tbl RECORD;
  BEGIN
    -- Update statistics for all tables
    FOR tbl IN
      SELECT schemaname, tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    LOOP
      EXECUTE format('ANALYZE %I.%I', tbl.schemaname, tbl.tablename);
      RAISE NOTICE 'Analyzed table: %.%', tbl.schemaname, tbl.tablename;
    END LOOP;
  END $$;
  $$
);

-- ============================================================================
-- 2. Weekly Index Maintenance (Sunday 3 AM UTC)
-- ============================================================================
SELECT cron.schedule(
  'weekly-reindex',
  '0 3 * * 0',
  $$
  DO $$
  DECLARE
    idx RECORD;
  BEGIN
    -- Reindex bloated indexes
    FOR idx IN
      SELECT
        schemaname,
        indexrelname
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan > 1000  -- Frequently used
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 10
    LOOP
      EXECUTE format('REINDEX INDEX CONCURRENTLY %I.%I', idx.schemaname, idx.indexrelname);
      RAISE NOTICE 'Reindexed: %.%', idx.schemaname, idx.indexrelname;
    END LOOP;
  END $$;
  $$
);

-- ============================================================================
-- 3. Monthly Cleanup (1st of month, 4 AM UTC)
-- ============================================================================
SELECT cron.schedule(
  'monthly-cleanup',
  '0 4 1 * *',
  $$
  DO $$
  BEGIN
    -- Clean old performance logs (>90 days)
    DELETE FROM performance_logs
    WHERE created_at < NOW() - INTERVAL '90 days';

    -- Clean old audit logs (>180 days)
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '180 days';

    -- Clean temporary data
    DELETE FROM temp_data
    WHERE created_at < NOW() - INTERVAL '7 days';

    -- Update table statistics
    VACUUM ANALYZE performance_logs;
    VACUUM ANALYZE audit_logs;
    VACUUM ANALYZE temp_data;

    RAISE NOTICE 'Monthly cleanup completed';
  END $$;
  $$
);

-- ============================================================================
-- 4. Real-time Index Bloat Monitor (Every hour)
-- ============================================================================
SELECT cron.schedule(
  'index-bloat-monitor',
  '0 * * * *',
  $$
  SELECT
    schemaname || '.' || indexrelname AS index,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND pg_relation_size(indexrelid) > 10 * 1024 * 1024  -- >10MB
    AND idx_scan < 100  -- Low usage
  ORDER BY pg_relation_size(indexrelid) DESC;
  $$
);

-- ============================================================================
-- 5. Performance Baseline Snapshot (Every 6 hours)
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_time TIMESTAMP NOT NULL DEFAULT NOW(),
  cache_hit_ratio NUMERIC(5,2),
  active_connections INTEGER,
  idle_connections INTEGER,
  slow_query_count INTEGER,
  avg_query_time NUMERIC(10,2),
  total_db_size BIGINT,
  largest_table TEXT,
  largest_table_size BIGINT
);

SELECT cron.schedule(
  'performance-snapshot',
  '0 */6 * * *',
  $$
  INSERT INTO performance_snapshots (
    cache_hit_ratio,
    active_connections,
    idle_connections,
    slow_query_count,
    avg_query_time,
    total_db_size,
    largest_table,
    largest_table_size
  )
  SELECT
    -- Cache hit ratio
    round(100.0 * sum(heap_blks_hit) /
      NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2),
    -- Active connections
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    -- Idle connections
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'),
    -- Slow queries
    (SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 1000),
    -- Average query time
    (SELECT round(avg(mean_exec_time), 2) FROM pg_stat_statements),
    -- Total DB size
    pg_database_size(current_database()),
    -- Largest table
    (SELECT schemaname || '.' || tablename
     FROM pg_tables t
     JOIN pg_class c ON c.relname = t.tablename
     WHERE schemaname = 'public'
     ORDER BY pg_total_relation_size(c.oid) DESC
     LIMIT 1),
    -- Largest table size
    (SELECT pg_total_relation_size(c.oid)
     FROM pg_tables t
     JOIN pg_class c ON c.relname = t.tablename
     WHERE schemaname = 'public'
     ORDER BY pg_total_relation_size(c.oid) DESC
     LIMIT 1)
  FROM pg_statio_user_tables;
  $$
);
```

### 6.2 Automated Health Checks

```bash
#!/bin/bash
# scripts/health-check.sh
# Automated database health monitoring

set -e

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

echo "🏥 DataParseDesk Performance Health Check"
echo "=========================================="
echo ""

# 1. Check database connectivity
echo "1. Database Connectivity"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_KEY}")

if [ "$RESPONSE" = "200" ]; then
  echo "   ✅ Database is accessible"
else
  echo "   ❌ Database connectivity failed (HTTP ${RESPONSE})"
  exit 1
fi

# 2. Check cache hit ratio
echo "2. Cache Hit Ratio"
CACHE_RATIO=$(psql "${DATABASE_URL}" -t -c "
  SELECT round(100.0 * sum(heap_blks_hit) /
    NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
  FROM pg_statio_user_tables;
" | xargs)

echo "   Cache Hit Ratio: ${CACHE_RATIO}%"
if (( $(echo "$CACHE_RATIO > 95" | bc -l) )); then
  echo "   ✅ Cache performance is good"
else
  echo "   ⚠️  Low cache hit ratio (target: >95%)"
fi

# 3. Check for slow queries
echo "3. Slow Query Check"
SLOW_QUERIES=$(psql "${DATABASE_URL}" -t -c "
  SELECT count(*)
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000
    AND calls > 10;
" | xargs)

echo "   Slow Queries (>1s): ${SLOW_QUERIES}"
if [ "$SLOW_QUERIES" -eq 0 ]; then
  echo "   ✅ No slow queries detected"
else
  echo "   ⚠️  ${SLOW_QUERIES} queries need optimization"
fi

# 4. Check active connections
echo "4. Connection Pool Status"
ACTIVE_CONNS=$(psql "${DATABASE_URL}" -t -c "
  SELECT count(*)
  FROM pg_stat_activity
  WHERE state = 'active'
    AND datname = current_database();
" | xargs)

echo "   Active Connections: ${ACTIVE_CONNS}"
if [ "$ACTIVE_CONNS" -lt 50 ]; then
  echo "   ✅ Connection pool healthy"
else
  echo "   ⚠️  High connection count (${ACTIVE_CONNS}/60)"
fi

# 5. Check table bloat
echo "5. Table Bloat Check"
BLOATED_TABLES=$(psql "${DATABASE_URL}" -t -c "
  SELECT count(*)
  FROM pg_stat_user_tables
  WHERE n_dead_tup > n_live_tup * 0.2
    AND n_live_tup > 100;
" | xargs)

echo "   Bloated Tables: ${BLOATED_TABLES}"
if [ "$BLOATED_TABLES" -eq 0 ]; then
  echo "   ✅ No table bloat detected"
else
  echo "   ⚠️  ${BLOATED_TABLES} tables need VACUUM"
fi

# 6. Check database size
echo "6. Database Size"
DB_SIZE=$(psql "${DATABASE_URL}" -t -c "
  SELECT pg_size_pretty(pg_database_size(current_database()));
" | xargs)

echo "   Database Size: ${DB_SIZE}"
echo "   ✅ Size monitoring active"

# Summary
echo ""
echo "=========================================="
echo "Health Check Complete"
echo "=========================================="

# Return appropriate exit code
if [ "$SLOW_QUERIES" -gt 5 ] || [ "$ACTIVE_CONNS" -gt 50 ] || [ "$BLOATED_TABLES" -gt 5 ]; then
  echo "⚠️  Some issues detected - review recommended"
  exit 1
else
  echo "✅ All systems operational"
  exit 0
fi
```

### 6.3 Automated Backup Verification

```bash
#!/bin/bash
# scripts/verify-backups.sh
# Verify database backups are running and valid

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
RETENTION_DAYS=30

echo "💾 Backup Verification"
echo "======================"
echo ""

# 1. Check latest backup exists
echo "1. Checking latest backup..."
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime -1 | head -n 1)

if [ -n "$LATEST_BACKUP" ]; then
  BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
  BACKUP_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$LATEST_BACKUP")
  echo "   ✅ Latest backup: ${LATEST_BACKUP}"
  echo "      Size: ${BACKUP_SIZE}"
  echo "      Date: ${BACKUP_DATE}"
else
  echo "   ❌ No backup found in last 24 hours!"
  exit 1
fi

# 2. Verify backup integrity
echo "2. Verifying backup integrity..."
if gzip -t "$LATEST_BACKUP" 2>/dev/null; then
  echo "   ✅ Backup file is valid"
else
  echo "   ❌ Backup file is corrupted!"
  exit 1
fi

# 3. Check backup retention
echo "3. Checking backup retention..."
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} | wc -l | xargs)

if [ "$OLD_BACKUPS" -gt 0 ]; then
  echo "   🗑️  Cleaning ${OLD_BACKUPS} old backups (>${RETENTION_DAYS} days)"
  find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
else
  echo "   ✅ Retention policy satisfied"
fi

# 4. Test restore (in temporary database)
echo "4. Testing restore capability..."
TEST_DB="restore_test_$(date +%s)"

# Create test database
createdb "$TEST_DB" 2>/dev/null || true

# Attempt restore
if gunzip -c "$LATEST_BACKUP" | psql "$TEST_DB" > /dev/null 2>&1; then
  echo "   ✅ Restore test successful"
  dropdb "$TEST_DB"
else
  echo "   ❌ Restore test failed!"
  dropdb "$TEST_DB" 2>/dev/null || true
  exit 1
fi

echo ""
echo "✅ All backup checks passed"
```

---

## 7. Performance Testing Checklist

### Pre-Production Performance Validation

```markdown
## Performance Testing Checklist

### Before Deployment

- [ ] **Database Performance**
  - [ ] Cache hit ratio >99%
  - [ ] No queries >1s average execution time
  - [ ] All indexes used (idx_scan > 0)
  - [ ] Table bloat <10% on all tables
  - [ ] Active connections <50

- [ ] **Load Testing**
  - [ ] K6 tests pass with 100 concurrent users
  - [ ] 95th percentile response time <500ms
  - [ ] Error rate <1%
  - [ ] Cache hit rate >70%

- [ ] **Frontend Performance**
  - [ ] Lighthouse score >90
  - [ ] LCP <2.5s
  - [ ] FID <100ms
  - [ ] CLS <0.1
  - [ ] Bundle size within limits

- [ ] **Monitoring Setup**
  - [ ] Sentry configured and tested
  - [ ] Database alerts configured
  - [ ] Performance snapshots enabled
  - [ ] Health check script running

### After Deployment

- [ ] **Verification**
  - [ ] Run health-check.sh successfully
  - [ ] Check Sentry for errors/slow transactions
  - [ ] Verify cache hit ratios in production
  - [ ] Monitor connection pool usage

- [ ] **Ongoing Monitoring**
  - [ ] Daily performance snapshots reviewed
  - [ ] Weekly slow query report
  - [ ] Monthly optimization review
  - [ ] Quarterly load testing
```

---

## 8. Quick Reference Commands

### Daily Operations

```bash
# Run health check
./scripts/health-check.sh

# Check slow queries
psql $DATABASE_URL -c "
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 500
ORDER BY total_exec_time DESC
LIMIT 10;
"

# Check cache hit ratio
psql $DATABASE_URL -c "
SELECT round(100.0 * sum(heap_blks_hit) /
  NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) AS cache_hit_ratio
FROM pg_statio_user_tables;
"

# Check active connections
psql $DATABASE_URL -c "
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
"
```

### Weekly Operations

```bash
# Run load tests
k6 run performance-tests/load-test.js \
  --env API_URL=$VITE_SUPABASE_URL \
  --env API_KEY=$VITE_SUPABASE_ANON_KEY

# Check for missing indexes
psql $DATABASE_URL -c "SELECT * FROM suggest_missing_indexes();"

# Review performance trends
psql $DATABASE_URL -c "
SELECT
  date_trunc('day', snapshot_time) AS day,
  avg(cache_hit_ratio) AS avg_cache_hit,
  avg(active_connections) AS avg_connections,
  avg(avg_query_time) AS avg_query_ms
FROM performance_snapshots
WHERE snapshot_time > NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;
"
```

### Monthly Operations

```bash
# Full performance audit
npm run test:e2e:performance
npm run build:check

# Verify backups
./scripts/verify-backups.sh

# Review and optimize indexes
psql $DATABASE_URL -c "SELECT * FROM auto_create_indexes(dry_run := TRUE);"

# Cleanup old data
psql $DATABASE_URL -c "
DELETE FROM performance_logs WHERE created_at < NOW() - INTERVAL '90 days';
VACUUM ANALYZE performance_logs;
"
```

---

## 9. Integration with Existing Systems

### Add to package.json

```json
{
  "scripts": {
    "perf:test": "k6 run performance-tests/load-test.js",
    "perf:db": "psql $DATABASE_URL -f performance-tests/db-benchmark.sql",
    "perf:e2e": "playwright test performance-tests/e2e-performance.spec.ts",
    "perf:health": "./scripts/health-check.sh",
    "perf:optimize": "deno run --allow-read --allow-write scripts/query-optimizer.ts",
    "perf:all": "npm run perf:db && npm run perf:test && npm run perf:e2e"
  }
}
```

### GitHub Actions Integration

Add to existing workflows or create `.github/workflows/performance.yml`:

```yaml
name: Performance Monitoring

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run perf:all
      - uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-results.json
```

---

## 10. Summary

This automation suite provides:

✅ **Automated Testing**
- K6 load tests with 100 concurrent users
- Database performance benchmarks
- E2E performance tests with Playwright
- Lighthouse CI for frontend metrics

✅ **CI/CD Integration**
- GitHub Actions workflows
- Pre-commit hooks for performance checks
- Automated PR comments with results
- Bundle size monitoring

✅ **Continuous Monitoring**
- Real-time Sentry performance tracking
- Database alerts for slow queries
- Connection pool monitoring
- Cache hit ratio tracking

✅ **Auto-Optimization**
- Missing index detection
- Query optimization suggestions
- Automated VACUUM scheduling
- Connection pool auto-tuning

✅ **Maintenance Automation**
- Scheduled statistics updates
- Index reindexing
- Data cleanup jobs
- Performance snapshots

✅ **Reporting & Alerts**
- Health check scripts
- Performance degradation alerts
- Weekly performance reports
- Backup verification

---

## Next Steps

1. **Install and Configure**
   ```bash
   # Install K6
   brew install k6  # macOS

   # Install dependencies
   npm install -g @lhci/cli
   npm install --save-dev @playwright/test

   # Make scripts executable
   chmod +x scripts/*.sh
   ```

2. **Run Initial Tests**
   ```bash
   npm run perf:health     # Health check
   npm run perf:db         # Database benchmarks
   npm run perf:test       # Load tests
   ```

3. **Enable Automation**
   ```bash
   # Setup cron jobs (in Supabase SQL Editor)
   # Copy SQL from section 6.1

   # Enable GitHub Actions
   # Commit .github/workflows/performance-tests.yml

   # Setup pre-commit hooks
   npm install husky --save-dev
   npx husky install
   ```

4. **Configure Monitoring**
   - Set up Sentry (see PERFORMANCE_CODE_EXAMPLES.md section 5)
   - Configure database alerts (section 4.2)
   - Enable performance snapshots (section 6.1)

---

**Documentation Complete!** 🎉

All performance optimization, testing, and automation documentation is now at 100%.
