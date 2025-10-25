/**
 * K6 Load Testing Suite
 *
 * Tests DataParseDesk 2.0 under load with realistic scenarios
 * Documentation: PERFORMANCE_AUTOMATION.md Section 1.1
 *
 * Usage:
 *   k6 run performance-tests/load-test.js --env API_URL=$VITE_SUPABASE_URL --env API_KEY=$VITE_SUPABASE_ANON_KEY
 */

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
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '3m', target: 50 },   // Stay at 50 users for 3 min
    { duration: '2m', target: 100 },  // Peak load: 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Performance thresholds
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'],                  // <1% errors
    'errors': ['rate<0.05'],                           // <5% errors
    'cache_hits': ['rate>0.70'],                       // >70% cache hits (after optimization)
    'query_duration': ['p(95)<300'],                   // 95% queries < 300ms
  },
  ext: {
    loadimpact: {
      name: 'DataParseDesk 2.0 Performance Test',
      projectID: 3477349,
    },
  },
};

const BASE_URL = __ENV.API_URL || 'https://uzcmaxfhfcsxzfqvaloz.supabase.co';
const API_KEY = __ENV.API_KEY;

if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}

const params = {
  headers: {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
};

/**
 * Main test scenario
 */
export default function () {
  // Scenario 1: List databases (common operation)
  group('Database List Query', () => {
    const res = http.get(
      `${BASE_URL}/rest/v1/databases?select=*&order=created_at.desc&limit=50`,
      params
    );

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'has data': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) && data.length >= 0;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    queryDuration.add(res.timings.duration);
    requestCounter.add(1);

    // Check for cache hit header (if Redis caching is enabled)
    if (res.headers['X-Cache-Hit'] === 'true') {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }
  });

  sleep(1); // Think time

  // Scenario 2: Paginated table data (heavy query)
  group('Table Data Pagination', () => {
    const page = Math.floor(Math.random() * 10); // Random page 0-9
    const res = http.get(
      `${BASE_URL}/rest/v1/table_data?select=id,data,created_at&limit=50&offset=${page * 50}`,
      params
    );

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
      'returns max 50 rows': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.length <= 50;
        } catch {
          return false;
        }
      },
    });

    queryDuration.add(res.timings.duration);
    requestCounter.add(1);
  });

  sleep(1);

  // Scenario 3: JSONB Search (GIN index test)
  group('JSONB Search Query', () => {
    const statuses = ['active', 'completed', 'pending'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const res = http.get(
      `${BASE_URL}/rest/v1/table_data?data=cs.{"status":"${randomStatus}"}&limit=20`,
      params
    );

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'valid JSON response': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    });

    queryDuration.add(res.timings.duration);
    requestCounter.add(1);
  });

  sleep(2);

  // Scenario 4: Analytics Dashboard (aggregation query)
  group('Analytics Dashboard', () => {
    const res = http.get(
      `${BASE_URL}/rest/v1/rpc/get_dashboard_stats`,
      params
    );

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has stats data': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data !== null && typeof data === 'object';
        } catch {
          return false;
        }
      },
    });

    queryDuration.add(res.timings.duration);
    requestCounter.add(1);
  });

  sleep(1);
}

/**
 * Setup function - runs once at the start
 */
export function setup() {
  console.log('🚀 Starting DataParseDesk 2.0 Load Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Target: 100 concurrent users`);
  console.log('');
  return {};
}

/**
 * Teardown function - runs once at the end
 */
export function teardown(data) {
  console.log('');
  console.log('✅ Load test completed');
}

/**
 * Handle summary - customize test results
 */
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values['p(95)'] || 0;
  const p99 = data.metrics.http_req_duration?.values['p(99)'] || 0;
  const errorRate = data.metrics.http_req_failed?.values.rate || 0;
  const cacheHitRate = data.metrics.cache_hits?.values.rate || 0;

  console.log('');
  console.log('📊 Performance Summary:');
  console.log('');
  console.log(`P95 Response Time: ${p95.toFixed(2)}ms ${p95 < 500 ? '✅' : '❌'}`);
  console.log(`P99 Response Time: ${p99.toFixed(2)}ms ${p99 < 1000 ? '✅' : '❌'}`);
  console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}% ${errorRate < 0.01 ? '✅' : '❌'}`);
  console.log(`Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}% ${cacheHitRate > 0.70 ? '✅' : '⚠️'}`);
  console.log('');

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'performance-results.json': JSON.stringify(data),
  };
}

// Text summary helper
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  let summary = '';

  summary += indent + '='.repeat(60) + '\n';
  summary += indent + 'Test Results Summary\n';
  summary += indent + '='.repeat(60) + '\n\n';

  // HTTP metrics
  if (data.metrics.http_req_duration) {
    summary += indent + 'HTTP Request Duration:\n';
    summary += indent + `  • Average: ${data.metrics.http_req_duration.values.avg?.toFixed(2)}ms\n`;
    summary += indent + `  • P95: ${data.metrics.http_req_duration.values['p(95)']?.toFixed(2)}ms\n`;
    summary += indent + `  • P99: ${data.metrics.http_req_duration.values['p(99)']?.toFixed(2)}ms\n\n`;
  }

  // Error rate
  if (data.metrics.http_req_failed) {
    const rate = data.metrics.http_req_failed.values.rate * 100;
    summary += indent + `Error Rate: ${rate.toFixed(2)}%\n\n`;
  }

  // Custom metrics
  if (data.metrics.cache_hits) {
    const rate = data.metrics.cache_hits.values.rate * 100;
    summary += indent + `Cache Hit Rate: ${rate.toFixed(2)}%\n\n`;
  }

  // Iterations
  if (data.metrics.iterations) {
    summary += indent + `Total Iterations: ${data.metrics.iterations.values.count}\n`;
  }

  summary += indent + '='.repeat(60) + '\n';

  return summary;
}
