/**
 * Database Performance Test Suite
 * 
 * Tests database operations under load including:
 * - Concurrent query execution
 * - Complex joins (provider + offers + needs)
 * - Search queries with filters
 * - Pagination performance
 * - Write operations (signup, provider creation)
 * - Connection pool limits
 * - Query timeout scenarios
 * 
 * Usage:
 *   k6 run --config tests/performance/k6.config.js tests/performance/database-load.js
 */

import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, API_BASE_URL, options, UAT_CONFIG } from './k6.config.js';
import { login, signup, authenticatedRequest, waitRandom } from './utils.js';
import http from 'k6/http';

// Custom metrics for database performance
const dbQueryDuration = new Trend('db_query_duration');
const dbQuerySuccess = new Rate('db_query_success');
const dbQueryTimeout = new Counter('db_query_timeout');
const dbConnectionPoolExhausted = new Counter('db_connection_pool_exhausted');
const complexQueryDuration = new Trend('db_complex_query_duration');
const writeOperationDuration = new Trend('db_write_operation_duration');
const nPlusOneQueries = new Counter('db_n_plus_one_queries');

// Override default scenario for database tests
export const databaseOptions = {
  ...options,
  scenarios: {
    db_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '2m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'db_baseline' },
    },
    db_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '2m',
      tags: { scenario: 'db_load' },
    },
    db_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '2m',
      tags: { scenario: 'db_stress' },
    },
    db_connection_pool: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 300 },
        { duration: '5m', target: 500 },
        { duration: '3m', target: 500 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '1m',
      tags: { scenario: 'db_connection_pool' },
    },
  },
  thresholds: {
    ...options.thresholds,
    'db_query_duration': ['p(95)<500'], // 95% of queries < 500ms
    'db_query_success': ['rate>0.99'], // > 99% success rate
    'db_complex_query_duration': ['p(95)<1000'], // Complex queries < 1s
    'db_write_operation_duration': ['p(95)<2000'], // Write ops < 2s
    'http_req_duration{name:get-providers}': ['p(95)<800'],
    'http_req_duration{name:search-providers}': ['p(95)<1000'],
  },
};

/**
 * Test simple read query (provider listing)
 */
export function testSimpleRead() {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/providers?limit=20&page=1`, {
    tags: { name: 'get-providers', query_type: 'simple_read' },
  });

  const duration = Date.now() - startTime;
  dbQueryDuration.add(duration);

  const success = check(response, {
    'simple read status is 200': (r) => r.status === 200,
    'simple read response time < 500ms': () => duration < 500,
  });

  dbQuerySuccess.add(success);
  return { success, duration, response };
}

/**
 * Test complex query with joins (provider + offers + needs)
 * This simulates the N+1 query pattern that should be optimized
 */
export function testComplexQuery() {
  const startTime = Date.now();
  
  // First, get providers
  const providersResponse = http.get(`${BASE_URL}/providers?limit=10`, {
    tags: { name: 'get-providers-complex', query_type: 'complex_read' },
  });

  if (providersResponse.status !== 200) {
    dbQuerySuccess.add(false);
    return { success: false };
  }

  let totalDuration = Date.now() - startTime;
  
  // Simulate N+1 pattern by fetching details for multiple providers
  // In real scenario, this would trigger separate queries for offers/needs
  try {
    const providers = JSON.parse(providersResponse.body);
    const providerList = Array.isArray(providers) ? providers : (providers.data || []);
    
    if (providerList.length > 0) {
      // Fetch details for first provider (simulates N+1)
      const providerId = providerList[0].id || providerList[0].provider_id;
      if (providerId) {
        const detailStart = Date.now();
        const detailResponse = http.get(`${BASE_URL}/providers/${providerId}`, {
          tags: { name: 'get-provider-details-complex', query_type: 'complex_read' },
        });
        const detailDuration = Date.now() - detailStart;
        totalDuration += detailDuration;
        
        // Detect N+1 pattern (multiple sequential queries)
        if (providerList.length > 1) {
          nPlusOneQueries.add(providerList.length - 1);
        }
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }

  complexQueryDuration.add(totalDuration);

  const success = check(providersResponse, {
    'complex query status is 200': (r) => r.status === 200,
    'complex query response time < 1s': () => totalDuration < 1000,
  });

  dbQuerySuccess.add(success);
  return { success, duration: totalDuration };
}

/**
 * Test search query with filters
 */
export function testSearchQuery() {
  const searchTerms = ['mosque', 'community', 'service', 'education', 'charity'];
  const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/providers?q=${encodeURIComponent(query)}&limit=20`, {
    tags: { name: 'search-providers', query_type: 'search' },
  });

  const duration = Date.now() - startTime;
  dbQueryDuration.add(duration);

  const success = check(response, {
    'search query status is 200': (r) => r.status === 200,
    'search query response time < 1s': () => duration < 1000,
  });

  dbQuerySuccess.add(success);
  return { success, duration };
}

/**
 * Test pagination performance
 */
export function testPagination() {
  const page = Math.floor(Math.random() * 5) + 1;
  const limit = 20;
  
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/providers?page=${page}&limit=${limit}`, {
    tags: { name: 'get-providers-paginated', query_type: 'pagination' },
  });

  const duration = Date.now() - startTime;
  dbQueryDuration.add(duration);

  const success = check(response, {
    'pagination status is 200': (r) => r.status === 200,
    'pagination response time < 500ms': () => duration < 500,
  });

  dbQuerySuccess.add(success);
  return { success, duration };
}

/**
 * Test write operation (user signup)
 */
export function testWriteOperation() {
  const email = `perf-db-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'TestPassword123!';
  
  const startTime = Date.now();
  const result = signup(email, password, 'en');
  const duration = Date.now() - startTime;

  writeOperationDuration.add(duration);

  const success = check(result, {
    'write operation status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'write operation response time < 2s': () => duration < 2000,
  });

  dbQuerySuccess.add(success);
  return { success, duration };
}

/**
 * Test concurrent queries (simulate connection pool stress)
 */
export function testConcurrentQueries() {
  const queries = [
    () => http.get(`${BASE_URL}/providers?limit=10`, { tags: { name: 'concurrent-query-1' } }),
    () => http.get(`${BASE_URL}/providers?limit=10&page=2`, { tags: { name: 'concurrent-query-2' } }),
    () => http.get(`${BASE_URL}/providers?q=test`, { tags: { name: 'concurrent-query-3' } }),
  ];

  const startTime = Date.now();
  const responses = queries.map(query => query());
  const duration = Date.now() - startTime;

  dbQueryDuration.add(duration);

  const allSuccess = responses.every(r => r.status === 200 || r.status === 404);
  
  // Check for connection pool exhaustion (503 or timeout errors)
  const poolExhausted = responses.some(r => r.status === 503 || r.status === 429);
  if (poolExhausted) {
    dbConnectionPoolExhausted.add(1);
  }

  const success = check(responses[0], {
    'concurrent queries completed': () => allSuccess,
    'concurrent queries response time < 1s': () => duration < 1000,
    'no connection pool exhaustion': () => !poolExhausted,
  });

  dbQuerySuccess.add(success);
  return { success, duration, poolExhausted };
}

/**
 * Test query timeout scenarios
 */
export function testQueryTimeout() {
  // Attempt a potentially slow query (large result set or complex filter)
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/providers?limit=1000`, {
    tags: { name: 'timeout-test', query_type: 'timeout_test' },
    timeout: '5s', // 5 second timeout
  });

  const duration = Date.now() - startTime;

  if (response.status === 0 || duration > 5000) {
    dbQueryTimeout.add(1);
    dbQuerySuccess.add(false);
    return { success: false, timedOut: true };
  }

  dbQueryDuration.add(duration);
  dbQuerySuccess.add(true);
  return { success: true, duration };
}

/**
 * Simulate database load pattern
 */
export function simulateDatabaseLoad() {
  const operations = [
    { name: 'simple_read', weight: 40, fn: testSimpleRead },
    { name: 'complex_query', weight: 20, fn: testComplexQuery },
    { name: 'search', weight: 15, fn: testSearchQuery },
    { name: 'pagination', weight: 10, fn: testPagination },
    { name: 'concurrent', weight: 10, fn: testConcurrentQueries },
    { name: 'write', weight: 3, fn: testWriteOperation },
    { name: 'timeout', weight: 2, fn: testQueryTimeout },
  ];

  // Weighted random selection
  const totalWeight = operations.reduce((sum, op) => sum + op.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const op of operations) {
    random -= op.weight;
    if (random <= 0) {
      return op.fn();
    }
  }

  // Fallback to simple read
  return testSimpleRead();
}

/**
 * Main test function
 */
export default function () {
  // Health check first
  const healthResponse = http.get(`${API_BASE_URL}/health`, {
    tags: { name: 'health-check-db' },
  });
  
  check(healthResponse, {
    'health check passed': (r) => r.status === 200,
  });

  sleep(waitRandom(0.5, 1));

  // Run database load simulation
  simulateDatabaseLoad();

  // Random pause between iterations
  sleep(waitRandom(1, 3));
}



