/**
 * K6 Load Testing Script for DataParseDesk API
 *
 * Tests:
 * - REST API endpoints
 * - Authentication flow
 * - Database queries
 * - Rate limiting
 * - Response times
 *
 * Usage:
 * ```bash
 * # Install k6: https://k6.io/docs/getting-started/installation/
 * brew install k6  # macOS
 * # or
 * wget https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz
 *
 * # Run load test
 * k6 run tests/load/k6-api-load-test.js
 *
 * # With custom config
 * k6 run --vus 50 --duration 60s tests/load/k6-api-load-test.js
 *
 * # With cloud reporting
 * k6 cloud tests/load/k6-api-load-test.js
 * ```
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Configuration
export const options = {
  // Stages: ramp-up, steady, ramp-down
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 users
    { duration: '1m', target: 50 },   // Ramp-up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users for 2 minutes
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp-down to 0 users
  ],

  // Thresholds: define success criteria
  thresholds: {
    // 95% of requests should be below 200ms
    http_req_duration: ['p(95)<200'],

    // 99% of requests should be below 500ms
    'http_req_duration{expected_response:true}': ['p(99)<500'],

    // Less than 1% errors
    errors: ['rate<0.01'],

    // 95% of API responses should be under 200ms
    api_response_time: ['p(95)<200'],
  },

  // Scenarios
  scenarios: {
    // Read-heavy workload (most common in production)
    reads: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '2m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      exec: 'readScenario',
    },

    // Write workload
    writes: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '2m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      exec: 'writeScenario',
    },

    // Spike test
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '10s', target: 100 }, // Sudden spike
        { duration: '20s', target: 100 },
        { duration: '10s', target: 10 },
      ],
      exec: 'spikeScenario',
    },
  },
};

// Environment variables
const BASE_URL = __ENV.API_URL || 'https://puavudiivxuknvtbnotv.supabase.co/functions/v1';
const API_KEY = __ENV.API_KEY || 'your-test-api-key-here';

// Test data
const TEST_DATABASE_ID = __ENV.TEST_DATABASE_ID || 'test-db-123';

/**
 * Setup: runs once per VU before the test
 */
export function setup() {
  console.log('Starting load test...');
  console.log('Base URL:', BASE_URL);
  console.log('Target: 100 concurrent users');
  return { startTime: Date.now() };
}

/**
 * Teardown: runs once after the test
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test completed in ${duration}s`);
}

/**
 * Read scenario: List databases, get rows, search
 */
export function readScenario() {
  group('REST API - Reads', () => {
    // List databases
    let res = http.get(`${BASE_URL}/rest-api/databases?page=1&limit=20`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    check(res, {
      'list databases: status 200': (r) => r.status === 200,
      'list databases: has data': (r) => r.json('data') !== undefined,
      'list databases: response time < 200ms': (r) => r.timings.duration < 200,
    });

    errorRate.add(res.status !== 200);
    apiResponseTime.add(res.timings.duration);

    sleep(0.5);

    // Get single database
    res = http.get(`${BASE_URL}/rest-api/databases/${TEST_DATABASE_ID}`, {
      headers: {
        'x-api-key': API_KEY,
      },
    });

    check(res, {
      'get database: status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'get database: response time < 100ms': (r) => r.timings.duration < 100,
    });

    errorRate.add(res.status !== 200 && res.status !== 404);
    apiResponseTime.add(res.timings.duration);

    sleep(1);

    // List rows
    res = http.get(`${BASE_URL}/rest-api/rows?database_id=${TEST_DATABASE_ID}&page=1&limit=20`, {
      headers: {
        'x-api-key': API_KEY,
      },
    });

    check(res, {
      'list rows: status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'list rows: response time < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(res.status !== 200 && res.status !== 404);
    apiResponseTime.add(res.timings.duration);
  });
}

/**
 * Write scenario: Create/update/delete operations
 */
export function writeScenario() {
  group('REST API - Writes', () => {
    // Create database
    const payload = JSON.stringify({
      name: `Load Test DB ${Date.now()}`,
      description: 'Created by k6 load test',
    });

    let res = http.post(`${BASE_URL}/rest-api/databases`, payload, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const success = check(res, {
      'create database: status 201 or 403': (r) => r.status === 201 || r.status === 403,
      'create database: response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(!success && res.status !== 403);
    apiResponseTime.add(res.timings.duration);

    if (res.status === 201) {
      const dbId = res.json('data.id');

      sleep(1);

      // Update database
      const updatePayload = JSON.stringify({
        name: `Updated Load Test DB ${Date.now()}`,
      });

      res = http.put(`${BASE_URL}/rest-api/databases/${dbId}`, updatePayload, {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'update database: status 200': (r) => r.status === 200,
        'update database: response time < 300ms': (r) => r.timings.duration < 300,
      });

      errorRate.add(res.status !== 200);
      apiResponseTime.add(res.timings.duration);

      sleep(1);

      // Delete database
      res = http.del(`${BASE_URL}/rest-api/databases/${dbId}`, null, {
        headers: {
          'x-api-key': API_KEY,
        },
      });

      check(res, {
        'delete database: status 200': (r) => r.status === 200,
        'delete database: response time < 200ms': (r) => r.timings.duration < 200,
      });

      errorRate.add(res.status !== 200);
      apiResponseTime.add(res.timings.duration);
    }

    sleep(2);
  });
}

/**
 * Spike scenario: Sudden load increase
 */
export function spikeScenario() {
  group('Spike Test', () => {
    const res = http.get(`${BASE_URL}/rest-api/databases?page=1&limit=10`, {
      headers: {
        'x-api-key': API_KEY,
      },
      timeout: '10s',
    });

    check(res, {
      'spike: status 200 or 429': (r) => r.status === 200 || r.status === 429,
      'spike: response time < 1s': (r) => r.timings.duration < 1000,
    });

    errorRate.add(res.status !== 200 && res.status !== 429);
    apiResponseTime.add(res.timings.duration);
  });
}

/**
 * Default function: runs for each VU iteration
 */
export default function () {
  // This runs when no specific scenario is executing
  readScenario();
  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

/**
 * Example output:
 *
 * ```
 * scenarios: (100.00%) 3 scenarios, 100 max VUs, 3m50s max duration
 *
 * ✓ list databases: status 200
 * ✓ list databases: has data
 * ✓ list databases: response time < 200ms
 *
 * checks.........................: 100.00% ✓ 15234      ✗ 0
 * data_received..................: 45 MB   150 kB/s
 * data_sent......................: 1.2 MB  4.0 kB/s
 * errors.........................: 0.00%   ✓ 0          ✗ 15234
 * http_req_blocked...............: avg=1.23ms   min=1µs      med=3µs      max=150ms   p(95)=5ms
 * http_req_connecting............: avg=850µs    min=0s       med=0s       max=100ms   p(95)=2ms
 * http_req_duration..............: avg=120ms    min=45ms     med=95ms     max=450ms   p(95)=180ms
 *   { expected_response:true }...: avg=115ms    min=45ms     med=90ms     max=350ms   p(95)=175ms
 * http_req_failed................: 0.00%   ✓ 0          ✗ 15234
 * http_req_receiving.............: avg=2.5ms    min=50µs     med=1.8ms    max=50ms    p(95)=5ms
 * http_req_sending...............: avg=120µs    min=10µs     med=80µs     max=5ms     p(95)=250µs
 * http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s      p(95)=0s
 * http_req_waiting...............: avg=118ms    min=42ms     med=92ms     max=445ms   p(95)=178ms
 * http_reqs......................: 15234   50.78/s
 * iteration_duration.............: avg=2.5s     min=1.2s     med=2.3s     max=6.8s    p(95)=4.2s
 * iterations.....................: 5078    16.93/s
 * vus............................: 1       min=1        max=100
 * vus_max........................: 100     min=100      max=100
 * ```
 */
