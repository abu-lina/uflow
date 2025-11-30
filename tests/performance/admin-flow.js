/**
 * Admin Operations Performance Tests
 * 
 * Tests admin operation flows including:
 * - Admin login
 * - Provider review operations
 * - Dashboard data loading
 * - Audit log queries
 * 
 * Load: 1-2% of total users (500-1,000/month, but higher request rate)
 */

import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, API_BASE_URL, TEST_ADMIN, options as baseOptions } from './k6.config.js';
import { login, getPendingProviders, reviewProvider, authenticatedRequest, waitRandom } from './utils.js';
import http from 'k6/http';

// Custom metrics
const adminSuccessRate = new Rate('admin_success');
const adminOperationTime = new Trend('admin_operation_time');
const reviewSuccessRate = new Rate('admin_review_success');

// Select scenario based on environment variable (default to baseline)
const scenario = __ENV.SCENARIO || 'baseline';

// Define all possible scenarios
const adminScenarios = {
  baseline: {
    executor: 'constant-vus',
    vus: 2,
    duration: '2m',
    tags: { scenario: 'admin_baseline' },
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 5 },
      { duration: '3m', target: 10 },
      { duration: '5m', target: 10 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '1m',
    tags: { scenario: 'admin_load' },
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 20 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '1m',
    tags: { scenario: 'admin_stress' },
  },
};

// Export options for k6
export const options = {
  ...baseOptions,
  scenarios: {
    admin_test: adminScenarios[scenario] || adminScenarios.baseline,
  },
  thresholds: {
    ...baseOptions.thresholds,
    'admin_success': ['rate>0.98'], // 98% success rate
    'admin_review_success': ['rate>0.95'], // 95% review success
    'admin_operation_time': ['p(95)<1500'], // 95% of operations < 1.5s
    'http_req_duration{name:get-pending-providers}': ['p(95)<1000'],
    'http_req_duration{name:review-provider}': ['p(95)<1500'],
  },
};

/**
 * Test admin login
 */
export function testAdminLogin() {
  const token = login(TEST_ADMIN.email, TEST_ADMIN.password);

  const success = check(token, {
    'admin login successful': () => token !== null,
  });

  adminSuccessRate.add(success);
  return token;
}

/**
 * Test getting pending providers
 */
export function testGetPendingProviders(token) {
  if (!token) return false;

  const startTime = Date.now();
  const response = getPendingProviders(token, {
    status: 'pending',
    limit: 50,
    offset: 0,
  });

  const operationTime = Date.now() - startTime;
  adminOperationTime.add(operationTime);

  const success = check(response, {
    'pending providers status is 200': (r) => r.status === 200,
    'pending providers response time < 1s': () => operationTime < 1000,
    'pending providers has data structure': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data !== undefined || Array.isArray(data);
      } catch {
        return false;
      }
    },
  });

  adminSuccessRate.add(success);
  return { success, response };
}

/**
 * Test provider review (approve/reject)
 */
export function testReviewProvider(token, providerId, action = 'approve') {
  if (!token || !providerId) return false;

  const startTime = Date.now();
  const response = reviewProvider(token, providerId, action, `Performance test review - ${action}`);

  const operationTime = Date.now() - startTime;
  adminOperationTime.add(operationTime);

  const success = check(response, {
    [`review ${action} status is 200`]: (r) => r.status === 200,
    [`review ${action} response time < 1.5s`]: () => operationTime < 1500,
  });

  reviewSuccessRate.add(success);
  adminSuccessRate.add(success);
  return success;
}

/**
 * Test admin dashboard data loading
 */
export function testAdminDashboard(token) {
  if (!token) return false;

  // Test multiple dashboard endpoints
  const endpoints = [
    { name: 'pending-providers', url: `${API_BASE_URL}/admin/pending-providers` },
    { name: 'diagnose', url: `${API_BASE_URL}/admin/diagnose` },
  ];

  let allSuccess = true;

  for (const endpoint of endpoints) {
    const response = authenticatedRequest('GET', endpoint.url, token);

    const success = check(response, {
      [`${endpoint.name} status is 200 or 403`]: (r) => r.status === 200 || r.status === 403,
      [`${endpoint.name} response time < 1s`]: (r) => r.timings.duration < 1000,
    });

    if (!success) {
      allSuccess = false;
    }
  }

  adminSuccessRate.add(allSuccess);
  return allSuccess;
}

/**
 * Simulate admin workflow
 */
export function simulateAdminWorkflow(token) {
  if (!token) return;

  // 1. Get pending providers
  const { response: pendingResponse } = testGetPendingProviders(token);
  sleep(waitRandom(1, 2));

  // 2. If providers exist, review one (30% chance to simulate real usage)
  if (pendingResponse && pendingResponse.status === 200) {
    try {
      const data = JSON.parse(pendingResponse.body);
      const providers = data.data || data;
      
      if (Array.isArray(providers) && providers.length > 0) {
        const provider = providers[0];
        const providerId = provider.id || provider.provider_id;
        
        if (providerId && Math.random() < 0.3) {
          const action = Math.random() < 0.7 ? 'approve' : 'reject';
          testReviewProvider(token, providerId, action);
          sleep(waitRandom(1, 2));
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // 3. Check dashboard
  testAdminDashboard(token);
  sleep(waitRandom(2, 4));
}

/**
 * Main test function
 */
export default function () {
  // Login as admin
  const token = testAdminLogin();

  if (token) {
    // Simulate admin workflow
    simulateAdminWorkflow(token);

    // Random pause between operations
    sleep(waitRandom(3, 6));
  } else {
    // If login fails, just wait and retry next iteration
    sleep(waitRandom(5, 10));
  }
}

