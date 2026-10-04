/**
 * API Endpoint Performance Tests
 *
 * Tests various API endpoints including:
 * - User data export
 * - Health check endpoint
 * - Other API routes
 *
 * Load: 5-10% of total users (2,500-5,000/month)
 */

import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, API_BASE_URL, TEST_USER, options as baseOptions } from './k6.config.js';
import { login, exportUserData, checkHealth, authenticatedRequest, waitRandom } from './utils.js';
import http from 'k6/http';

// Custom metrics
const apiSuccessRate = new Rate('api_success');
const apiResponseTime = new Trend('api_response_time');

// Select scenario based on environment variable (default to baseline)
const scenario = __ENV.SCENARIO || 'baseline';

// Define all possible scenarios
const apiScenarios = {
  baseline: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '1m', target: 10 },
      { duration: '2m', target: 10 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { scenario: 'api_baseline' },
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 20 },
      { duration: '3m', target: 30 },
      { duration: '5m', target: 30 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '1m',
    tags: { scenario: 'api_load' },
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '1m',
    tags: { scenario: 'api_stress' },
  },
};

// Export options for k6
export const options = {
  ...baseOptions,
  scenarios: {
    api_test: apiScenarios[scenario] || apiScenarios.baseline,
  },
  thresholds: {
    ...baseOptions.thresholds,
    api_success: ['rate>0.95'], // 95% success rate
    api_response_time: ['p(95)<2000'], // 95% of API calls < 2s
    'http_req_duration{name:health-check}': ['p(95)<200'],
    'http_req_duration{name:export-user-data}': ['p(95)<5000'], // Export can take time
  },
};

/**
 * Test health check endpoint
 */
export function testHealthCheck() {
  const startTime = Date.now();
  const result = checkHealth();
  const responseTime = Date.now() - startTime;

  apiResponseTime.add(responseTime);

  const success = check(result, {
    'health check status is 200': () => result.status === 200,
    'health check is healthy': () => result.healthy,
    'health check response time < 200ms': () => responseTime < 200,
  });

  apiSuccessRate.add(success);
  return success;
}

/**
 * Test user data export
 */
export function testUserDataExport(token) {
  if (!token) return false;

  const startTime = Date.now();
  const response = exportUserData(token);
  const responseTime = Date.now() - startTime;

  apiResponseTime.add(responseTime);

  const success = check(response, {
    'export status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'export response time < 5s': () => responseTime < 5000,
  });

  apiSuccessRate.add(success);
  return success;
}

/**
 * Test other API endpoints
 */
export function testOtherEndpoints(token) {
  const endpoints = [
    { name: 'manifest', url: `${API_BASE_URL}/manifest`, method: 'GET', auth: false },
  ];

  let allSuccess = true;

  for (const endpoint of endpoints) {
    const startTime = Date.now();
    let response;

    if (endpoint.auth && token) {
      response = authenticatedRequest(endpoint.method, endpoint.url, token);
    } else {
      response = http.request(endpoint.method, endpoint.url, null, {
        tags: { name: endpoint.name },
      });
    }

    const responseTime = Date.now() - startTime;
    apiResponseTime.add(responseTime);

    const success = check(response, {
      [`${endpoint.name} status is 200`]: (r) => r.status === 200,
      [`${endpoint.name} response time < 1s`]: () => responseTime < 1000,
    });

    if (!success) {
      allSuccess = false;
    }
  }

  apiSuccessRate.add(allSuccess);
  return allSuccess;
}

/**
 * Simulate API usage pattern
 */
export function simulateApiUsage(token) {
  // Always test health check (most common)
  testHealthCheck();
  sleep(waitRandom(0.5, 1.5));

  // Test user data export (10% of requests)
  if (Math.random() < 0.1 && token) {
    testUserDataExport(token);
    sleep(waitRandom(2, 4));
  }

  // Test other endpoints (20% of requests)
  if (Math.random() < 0.2) {
    testOtherEndpoints(token);
    sleep(waitRandom(0.5, 1));
  }
}

/**
 * Main test function
 */
export default function () {
  // Login to get token (optional for some endpoints)
  let token = null;
  if (Math.random() < 0.5) {
    token = login(TEST_USER.email, TEST_USER.password);
  }

  // Simulate API usage
  simulateApiUsage(token);

  // Random pause between requests
  sleep(waitRandom(1, 3));
}
