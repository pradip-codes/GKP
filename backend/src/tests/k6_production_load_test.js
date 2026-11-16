import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const errorCount = new Counter('custom_error_count');
const errorRate = new Rate('custom_error_rate');
const healthLatency = new Trend('health_latency');
const publicApiLatency = new Trend('public_api_latency');
const authenticatedApiLatency = new Trend('authenticated_api_latency');

export const options = {
  scenarios: {
    sustained_hardening_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },  // Phase 1: Warmup & baseline
        { duration: '3m', target: 30 },  // Phase 2: Moderate production load
        { duration: '3m', target: 50 },  // Phase 3: Peak business hours
        { duration: '5m', target: 100 }, // Phase 4: Sustained 100-VU capacity target
        { duration: '2m', target: 0 },   // Phase 5: Graceful cooldown
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // 99% of requests must succeed
    'http_req_failed': ['rate<0.01'],
    // 95% of requests must complete within 500ms
    'http_req_duration': ['p(95)<500', 'p(99)<1200'],
    // Custom error rate below 1%
    'custom_error_rate': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.gharkapaisa.in';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ''; // Provided via environment during execution

const params = {
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'k6-GharKaPaisa-Hardening-Audit/1.0',
    ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {}),
  },
  timeout: '10s',
};

export default function () {
  // 1. Health & Connection Pool Probe (Safety Barrier)
  group('01_System_Health_Check', () => {
    const res = http.get(`${BASE_URL}/health`, params);
    healthLatency.add(res.timings.duration);

    const isOk = check(res, {
      'health status is 200': (r) => r.status === 200,
      'db status is connected': (r) => {
        try {
          const body = JSON.parse(r.body);
          // Safety abort check: pool waiting must remain under control
          if (body.pool && body.pool.waiting > 10) {
            console.error(`CRITICAL: Connection pool waiting queue spiked to ${body.pool.waiting}`);
            return false;
          }
          return body.database === 'connected';
        } catch (_) {
          return false;
        }
      },
    });

    if (!isOk) {
      errorCount.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  });

  sleep(0.5);

  // 2. Public Endpoints (Products & Sequences)
  group('02_Public_Traffic', () => {
    const res = http.get(`${BASE_URL}/api/v1/public/products`, params);
    publicApiLatency.add(res.timings.duration);

    const isOk = check(res, {
      'public products status 200': (r) => r.status === 200,
    });

    if (!isOk) {
      errorCount.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  });

  sleep(0.5);

  // 3. Authenticated CRM / Core Operations (if AUTH_TOKEN provided)
  if (AUTH_TOKEN) {
    group('03_Core_CRM_Operations', () => {
      // Employees Listing
      const empRes = http.get(`${BASE_URL}/api/v1/employees?limit=25&page=1`, params);
      authenticatedApiLatency.add(empRes.timings.duration);
      check(empRes, { 'employees 200': (r) => r.status === 200 });

      // Employee Applications Listing
      const appRes = http.get(`${BASE_URL}/api/v1/applications?limit=25&page=1`, params);
      authenticatedApiLatency.add(appRes.timings.duration);
      check(appRes, { 'applications 200': (r) => r.status === 200 });

      // Super Admin Tracking
      const saRes = http.get(`${BASE_URL}/api/v1/super-admin/applications?limit=25&page=1`, params);
      authenticatedApiLatency.add(saRes.timings.duration);
      check(saRes, { 'super-admin tracking 200': (r) => r.status === 200 });
    });
  }

  sleep(1);
}
