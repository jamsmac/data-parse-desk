# Performance Monitoring System

## Overview

Data Parse Desk 2.0 includes a comprehensive performance monitoring system that tracks:

- **Web Vitals** - Google's Core Web Vitals (LCP, FID, CLS, FCP)
- **Load Times** - DNS, TCP, Request, Response, DOM parsing
- **API Performance** - Request duration, failure rates
- **Database Queries** - Query execution time, slow queries
- **Memory Usage** - JavaScript heap size monitoring
- **Custom Metrics** - Application-specific performance tracking

The system uses **Sentry** for error tracking and performance monitoring in production, with a built-in dashboard for real-time metrics visualization.

---

## Architecture

### Components

1. **Monitoring Library** (`src/lib/monitoring.ts`)
   - Initializes Sentry integration
   - Tracks Web Vitals automatically
   - Provides performance tracking utilities
   - Stores metrics locally for dashboard

2. **Performance Dashboard** (`src/components/monitoring/PerformanceDashboard.tsx`)
   - Real-time metrics visualization
   - Web Vitals charts
   - Slow query detection
   - Failed request tracking

3. **Trackers**
   - `DatabaseQueryTracker` - Database operation monitoring
   - `APIRequestTracker` - HTTP request tracking
   - `MemoryTracker` - Memory usage monitoring

---

## Web Vitals

### Core Web Vitals Tracked

#### 1. Largest Contentful Paint (LCP)
**What it measures**: Loading performance
**Target**: < 2.5 seconds
**Threshold**:
- Good: ≤ 2.5s
- Needs Improvement: 2.5s - 4.0s
- Poor: > 4.0s

```typescript
// Automatically tracked
// View in dashboard: Web Vitals tab
```

#### 2. First Input Delay (FID)
**What it measures**: Interactivity
**Target**: < 100 milliseconds
**Threshold**:
- Good: ≤ 100ms
- Needs Improvement: 100ms - 300ms
- Poor: > 300ms

#### 3. Cumulative Layout Shift (CLS)
**What it measures**: Visual stability
**Target**: < 0.1
**Threshold**:
- Good: ≤ 0.1
- Needs Improvement: 0.1 - 0.25
- Poor: > 0.25

#### 4. First Contentful Paint (FCP)
**What it measures**: Perceived load speed
**Target**: < 1.8 seconds
**Threshold**:
- Good: ≤ 1.8s
- Needs Improvement: 1.8s - 3.0s
- Poor: > 3.0s

---

## Setup

### 1. Environment Variables

Create `.env.local`:

```env
# Sentry Configuration (Production only)
VITE_SENTRY_DSN=your_sentry_dsn_here

# Application Version
VITE_APP_VERSION=2.0.0
```

### 2. Initialization

The monitoring system is automatically initialized in `src/main.tsx`:

```typescript
import { initializeMonitoring } from "./lib/monitoring";

initializeMonitoring();
```

This sets up:
- Sentry error tracking (production only)
- Web Vitals monitoring
- Custom metrics tracking
- Session replay (10% of sessions, 100% of errors)

---

## Usage

### Track Custom Operations

```typescript
import { trackOperation } from '@/lib/monitoring';

// Track async operation
const result = await trackOperation(
  'ImportCSV',
  async () => {
    return await importCSVData(file);
  },
  { fileSize: file.size, rows: 1000 }
);

// Track sync operation
const data = trackOperation(
  'ProcessData',
  () => {
    return processLargeDataset(dataset);
  }
);
```

### Track Component Performance

```typescript
import { usePerformanceTracking } from '@/lib/monitoring';

function ExpensiveComponent() {
  // Tracks time from mount to unmount
  usePerformanceTracking('ExpensiveComponent');

  return <div>...</div>;
}
```

### Track Render Performance

```typescript
import { useRenderTracking } from '@/lib/monitoring';

function FrequentlyRerenderedComponent() {
  // Counts re-renders
  useRenderTracking('FrequentlyRerenderedComponent');

  return <div>...</div>;
}
```

### Track Database Queries

```typescript
import { DatabaseQueryTracker } from '@/lib/monitoring';

async function fetchData() {
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('table_data')
    .select('*')
    .eq('database_id', databaseId);

  const duration = performance.now() - startTime;

  DatabaseQueryTracker.trackQuery(
    databaseId,
    'SELECT * FROM table_data WHERE database_id = ?',
    duration
  );

  return data;
}
```

### Track API Requests

```typescript
import { APIRequestTracker } from '@/lib/monitoring';

async function callAPI() {
  const startTime = performance.now();

  const response = await fetch('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  const duration = performance.now() - startTime;

  APIRequestTracker.trackRequest(
    '/api/endpoint',
    'POST',
    duration,
    response.status
  );

  return response.json();
}
```

### Track Memory Usage

```typescript
import { MemoryTracker } from '@/lib/monitoring';

function analyzeMemory() {
  const { usage, limit, percentage } = MemoryTracker.trackMemoryUsage();

  console.log(`Memory: ${usage.toFixed(2)}MB / ${limit.toFixed(2)}MB (${percentage.toFixed(1)}%)`);

  if (percentage > 80) {
    console.warn('High memory usage detected!');
  }
}
```

---

## Performance Dashboard

### Accessing the Dashboard

Navigate to `/performance` (or add route):

```tsx
// src/App.tsx
import { PerformanceDashboard } from '@/components/monitoring/PerformanceDashboard';

<Route path="/performance" element={<PerformanceDashboard />} />
```

### Dashboard Features

#### 1. Overall Performance Score
- **Score Range**: 0-100
- **Calculation**:
  - LCP penalty: Up to -20 points
  - FID penalty: Up to -20 points
  - CLS penalty: Up to -20 points
  - API response time: Up to -15 points
  - Failed request rate: Up to -15 points

**Score Ratings**:
- 90-100: Excellent (Green)
- 70-89: Good (Yellow)
- 50-69: Fair (Orange)
- 0-49: Poor (Red)

#### 2. Quick Stats Cards
- Average load time
- Average API response time
- Average database query time
- Memory usage with progress bar

#### 3. Web Vitals Tab
- Bar chart comparing current metrics vs. thresholds
- Detailed statistics for each metric (min, avg, max, p50, p75, p95, p99)
- Visual indicators (green checkmark = good, yellow warning = needs improvement)

#### 4. Load Times Tab
- Area chart showing page load breakdown
- DNS lookup time
- TCP connection time
- Request/Response time
- DOM parsing time

#### 5. API Requests Tab
- List of slow requests (> 1 second)
- List of failed requests (status >= 400)
- Request method, endpoint, duration, and status code

#### 6. Database Queries Tab
- List of slow queries (> 100ms)
- Database name, query, and duration

### Dashboard Actions

**Refresh**: Reload metrics manually
**Export**: Download metrics as JSON file
**Clear Data**: Clear all stored metrics (requires confirmation)
**Time Range**: Filter metrics by 1 hour, 6 hours, or 24 hours

---

## Metrics Storage

### Local Storage

Metrics are stored in `localStorage` under key `performance_metrics`:

```typescript
{
  name: string;        // Metric name (e.g., "LCP", "API Request")
  value: number;       // Metric value in milliseconds
  timestamp: number;   // Unix timestamp
  metadata?: object;   // Additional context
}
```

**Retention**: Last 1000 metrics are kept.

### Sentry (Production)

In production, metrics are sent to Sentry for:
- Long-term storage
- Alerting
- Trend analysis
- Cross-session aggregation

---

## Performance Optimization Tips

### 1. Improve LCP

**Target**: < 2.5 seconds

**Strategies**:
- Optimize images (WebP format, lazy loading)
- Minimize render-blocking resources
- Use CDN for static assets
- Implement code splitting
- Preload critical resources

```html
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/hero-image.webp" as="image">
```

### 2. Improve FID

**Target**: < 100 milliseconds

**Strategies**:
- Break up long JavaScript tasks
- Use web workers for heavy computation
- Defer non-critical JavaScript
- Reduce main thread work

```typescript
// Bad: Blocks main thread
const result = expensiveOperation(data);

// Good: Non-blocking
setTimeout(() => {
  const result = expensiveOperation(data);
}, 0);

// Better: Web Worker
const worker = new Worker('expensive-worker.js');
worker.postMessage(data);
```

### 3. Improve CLS

**Target**: < 0.1

**Strategies**:
- Set explicit width/height on images and videos
- Reserve space for dynamic content
- Avoid inserting content above existing content
- Use CSS aspect-ratio for responsive images

```css
/* Reserve space */
.image-container {
  aspect-ratio: 16 / 9;
}

/* Prevent layout shift */
.dynamic-content {
  min-height: 200px;
}
```

### 4. Reduce API Response Time

**Target**: < 1 second

**Strategies**:
- Implement request caching
- Use pagination for large datasets
- Optimize database queries
- Enable HTTP/2
- Use connection pooling

```typescript
// Implement caching
const cache = new Map();

async function fetchWithCache(key, fetcher) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const data = await fetcher();
  cache.set(key, data);
  return data;
}
```

### 5. Optimize Database Queries

**Target**: < 100 milliseconds

**Strategies**:
- Add indexes on frequently queried columns
- Use batch operations instead of N+1 queries
- Implement query result caching
- Optimize JOINs and subqueries
- Use EXPLAIN to analyze query plans

```sql
-- Add index
CREATE INDEX idx_database_id ON table_data(database_id);

-- Batch query instead of loop
SELECT * FROM table_data WHERE id IN (?, ?, ?, ...);
```

---

## Alerting

### Sentry Alerts (Production)

Configure alerts in Sentry dashboard:

1. **High Error Rate**
   - Condition: > 1% error rate
   - Action: Email + Slack notification

2. **Slow Transaction**
   - Condition: P95 > 3 seconds
   - Action: Email notification

3. **High Memory Usage**
   - Condition: > 80% of limit
   - Action: Email notification

### Custom Alerts

```typescript
import { getPerformanceScore, MemoryTracker } from '@/lib/monitoring';

// Monitor performance score
setInterval(() => {
  const score = getPerformanceScore();

  if (score < 50) {
    console.error('Performance score is critically low!');
    // Send alert
  }
}, 60000); // Every minute

// Monitor memory
setInterval(() => {
  const { percentage } = MemoryTracker.trackMemoryUsage();

  if (percentage > 80) {
    console.warn('Memory usage is high!');
    // Send alert
  }
}, 30000); // Every 30 seconds
```

---

## Best Practices

### 1. Development vs. Production

```typescript
// Only track in production
if (import.meta.env.PROD) {
  trackOperation('ExpensiveOp', () => { ... });
}

// Or use environment variable
if (import.meta.env.VITE_ENABLE_MONITORING === 'true') {
  initializeMonitoring();
}
```

### 2. Avoid Over-Tracking

```typescript
// ❌ Bad: Tracks every keystroke
<input onChange={() => trackOperation('Input', ...)} />

// ✅ Good: Tracks on submit
<form onSubmit={() => trackOperation('FormSubmit', ...)} />
```

### 3. Add Meaningful Metadata

```typescript
// ❌ Bad: No context
trackOperation('Query', queryFn);

// ✅ Good: Rich context
trackOperation('DatabaseQuery', queryFn, {
  database: databaseId,
  table: 'users',
  operation: 'SELECT',
  rowCount: 100
});
```

### 4. Use Performance Budget

```typescript
// Define performance budgets
const BUDGETS = {
  LCP: 2500,
  FID: 100,
  CLS: 0.1,
  API_RESPONSE: 1000,
  DB_QUERY: 100,
};

// Check against budget
const metrics = getAggregatedMetrics();

Object.entries(BUDGETS).forEach(([key, budget]) => {
  const metric = metrics[key];
  if (metric && metric.p75 > budget) {
    console.warn(`${key} exceeds budget: ${metric.p75}ms > ${budget}ms`);
  }
});
```

---

## Debugging Performance Issues

### 1. Identify Slow Components

```typescript
// Add tracking to suspected components
function SlowComponent() {
  usePerformanceTracking('SlowComponent');
  useRenderTracking('SlowComponent');

  // Component logic...
}
```

### 2. Profile Render Performance

Use React DevTools Profiler:

```bash
# Build with profiling enabled
npm run build -- --mode=development
```

### 3. Analyze Bundle Size

```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer
```

### 4. Check Slow Queries

View in Performance Dashboard > Database tab:

```typescript
const slowQueries = DatabaseQueryTracker.getSlowQueries(100);
console.table(slowQueries);
```

### 5. Export Metrics for Analysis

```typescript
import { exportMetrics } from '@/lib/monitoring';

// Export as JSON
const metrics = exportMetrics();
console.log(metrics);

// Or download from dashboard
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci
```

### Performance Budget CI

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      },
    },
  },
};
```

---

## Troubleshooting

### High LCP

**Symptoms**: Dashboard shows LCP > 2.5s

**Solutions**:
1. Check Network tab for large resources
2. Optimize images (compress, WebP format)
3. Enable caching
4. Use CDN
5. Implement lazy loading

### High Memory Usage

**Symptoms**: Memory > 80% of limit

**Solutions**:
1. Check for memory leaks (use Chrome Memory Profiler)
2. Implement virtual scrolling for large lists
3. Clear unused data from state
4. Unsubscribe from event listeners
5. Use memoization (useMemo, useCallback)

### Slow API Requests

**Symptoms**: API requests > 1 second

**Solutions**:
1. Check database query performance
2. Add indexes to database
3. Implement caching
4. Use pagination
5. Optimize data payload size

### Missing Metrics

**Symptoms**: Dashboard shows no data

**Solutions**:
1. Check browser console for errors
2. Verify `initializeMonitoring()` is called
3. Check localStorage for `performance_metrics` key
4. Ensure browser supports Performance API
5. Check Sentry DSN configuration (production)

---

## API Reference

### Functions

#### `initializeMonitoring()`
Initialize Sentry and performance tracking.

#### `trackOperation<T>(name, operation, metadata?): Promise<T>`
Track duration of operation.

#### `getPerformanceMetrics(hours?): CustomPerformanceEntry[]`
Get raw performance metrics.

#### `getAggregatedMetrics(hours?): Record<string, Stats>`
Get aggregated statistics by metric name.

#### `getPerformanceScore(): number`
Calculate overall performance score (0-100).

#### `clearPerformanceMetrics(): void`
Clear all stored metrics.

#### `exportMetrics(): string`
Export metrics as JSON string.

### Hooks

#### `usePerformanceTracking(componentName: string)`
Track component mount/unmount time.

#### `useRenderTracking(componentName: string)`
Count component re-renders.

### Classes

#### `DatabaseQueryTracker`
- `trackQuery(database, query, duration)`
- `getSlowQueries(threshold?)`
- `getAverageQueryTime(database?)`
- `clear()`

#### `APIRequestTracker`
- `trackRequest(endpoint, method, duration, status)`
- `getSlowRequests(threshold?)`
- `getFailedRequests()`
- `getAverageResponseTime(endpoint?)`
- `clear()`

#### `MemoryTracker`
- `getCurrentUsage(): number`
- `getMemoryLimit(): number`
- `trackMemoryUsage(): { usage, limit, percentage }`

---

**Last Updated**: 2025-01-22
**Version**: 2.0
