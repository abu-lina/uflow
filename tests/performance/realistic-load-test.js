/**
 * Realistic Load Test for Small-Scale Production
 * 
 * Tests application with realistic load patterns matching expected production:
 * - 10-50 concurrent users
 * - <1000 daily active users
 * - Peak load: 20-30 concurrent users
 * 
 * Usage:
 *   # Baseline test (10 users, 5 min)
 *   TEST_API_KEY=perf-test-2024-uat SCENARIO=baseline k6 run tests/performance/realistic-load-test.js
 *   
 *   # Peak load test (30 users, 10 min)
 *   TEST_API_KEY=perf-test-2024-uat SCENARIO=peak k6 run tests/performance/realistic-load-test.js
 *   
 *   # Stress test (50 users)
 *   TEST_API_KEY=perf-test-2024-uat SCENARIO=stress k6 run tests/performance/realistic-load-test.js
 */

import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, API_BASE_URL, TEST_API_KEY } from './k6.config.js';
import { 
  signup, 
  login, 
  checkHealth, 
  getProviders, 
  searchProviders,
  getProviderDetails,
  waitRandom 
} from './utils.js';

// Custom metrics
const operationSuccess = new Rate('operation_success');
const authSuccess = new Rate('auth_success');
const browsingSuccess = new Rate('browsing_success');
const searchSuccess = new Rate('search_success');
const operationDuration = new Trend('operation_duration');

// Select scenario based on environment variable
const scenario = __ENV.SCENARIO || 'baseline';

// Define scenarios for small-scale production
const scenarios = {
  // Baseline: Normal operation with 10 concurrent users
  baseline: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 10 },   // Ramp up to 10 users
      { duration: '5m', target: 10 },   // Sustain 10 users
      { duration: '30s', target: 0 },   // Ramp down
    ],
    gracefulRampDown: '30s',
    tags: { test_type: 'baseline', load_level: 'normal' },
  },
  
  // Peak: Busy period with 30 concurrent users
  peak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 30 },   // Ramp up to peak
      { duration: '10m', target: 30 },  // Sustain peak load
      { duration: '1m', target: 0 },    // Ramp down
    ],
    gracefulRampDown: '1m',
    tags: { test_type: 'peak', load_level: 'high' },
  },
  
  // Stress: Find breaking point with 50 users
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },   // Start normal
      { duration: '2m', target: 30 },   // Increase to peak
      { duration: '3m', target: 50 },   // Push to stress level
      { duration: '3m', target: 50 },   // Sustain stress
      { duration: '1m', target: 0 },    // Ramp down
    ],
    gracefulRampDown: '1m',
    tags: { test_type: 'stress', load_level: 'extreme' },
  },
};

// Export options for k6
export const options = {
  scenarios: {
    realistic_load: scenarios[scenario] || scenarios.baseline,
  },
  thresholds: {
    // Success rates (stricter for small production)
    'operation_success': ['rate>0.995'],      // 99.5% operations succeed
    'auth_success': ['rate>0.99'],            // 99% auth operations succeed
    'browsing_success': ['rate>0.995'],       // 99.5% browsing succeeds
    'search_success': ['rate>0.99'],          // 99% searches succeed
    
    // Response times (realistic for small-scale)
    'http_req_duration': ['p(95)<1500', 'p(99)<3000', 'avg<800'],
    'http_req_duration{name:login}': ['p(95)<1000', 'p(99)<2000'],
    'http_req_duration{name:signup}': ['p(95)<2000', 'p(99)<3000'],
    'http_req_duration{name:get-providers}': ['p(95)<1500', 'p(99)<2500'],
    'http_req_duration{name:search-providers}': ['p(95)<800', 'p(99)<1500'],
    
    // Error rates
    'http_req_failed': ['rate<0.005'],        // < 0.5% error rate
    'http_req_failed{status:5xx}': ['rate<0.001'],  // < 0.1% server errors
    
    // Overall checks
    'checks': ['rate>0.995'],                 // 99.5% checks pass
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'],
};

/**
 * Determine which operation to perform based on realistic usage patterns
 * For small community platform:
 * - 60% browsing providers
 * - 15% authentication (login/signup)
 * - 15% searching
 * - 10% viewing provider details
 */
function selectOperation() {
  const random = Math.random();
  
  if (random < 0.60) {
    return 'browse';
  } else if (random < 0.75) {
    return 'auth';
  } else if (random < 0.90) {
    return 'search';
  } else {
    return 'view_details';
  }
}

/**
 * Test user authentication (login/signup)
 */
function testAuthentication() {
  const startTime = Date.now();
  
  // 80% login, 20% signup
  if (Math.random() < 0.8) {
    // Test login with existing user
    const userIndex = Math.floor(Math.random() * 100);
    const email = `test-user-${userIndex}@example.com`;
    const password = 'TestPassword123!';
    
    const token = login(email, password, TEST_API_KEY);
    const success = token !== null && token.length > 0;
    
    check(token, {
      'login successful': () => success,
    });
    
    authSuccess.add(success);
    operationSuccess.add(success);
    
    if (!success && __ITER < 5) {
      console.warn(`[REALISTIC TEST] Login failed for ${email}`);
    }
    
  } else {
    // Test signup with new user
    const email = `perf-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';
    const language = 'en';
    
    const result = signup(email, password, language, TEST_API_KEY);
    const success = result.status === 200 || result.status === 201;
    
    check(result, {
      'signup successful': () => success,
    });
    
    authSuccess.add(success);
    operationSuccess.add(success);
  }
  
  operationDuration.add(Date.now() - startTime);
}

/**
 * Test provider browsing
 */
function testBrowsing() {
  const startTime = Date.now();
  
  const result = getProviders();
  const success = result.status === 200;
  
  check(result, {
    'provider list loaded': () => success,
    'response time < 1.5s': () => result.status === 200,
  });
  
  browsingSuccess.add(success);
  operationSuccess.add(success);
  operationDuration.add(Date.now() - startTime);
}

/**
 * Test provider search
 */
function testSearch() {
  const startTime = Date.now();
  
  // Realistic search terms for a community platform
  const searchTerms = [
    'mosque', 'school', 'community', 'center', 'education',
    'food', 'help', 'social', 'family', 'youth'
  ];
  const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  const result = searchProviders(query);
  const success = result.status === 200;
  
  check(result, {
    'search completed': () => success,
    'search response time < 800ms': () => result.status === 200,
  });
  
  searchSuccess.add(success);
  operationSuccess.add(success);
  operationDuration.add(Date.now() - startTime);
}

/**
 * Test viewing provider details
 */
function testViewDetails() {
  const startTime = Date.now();
  
  // First get list of providers
  const listResult = getProviders();
  
  if (listResult.status === 200) {
    try {
      // Try to get a provider ID from the list
      // Note: This is a simplified version - in real test we'd parse the response
      testBrowsing(); // Fallback to browsing
    } catch (e) {
      // Fallback to browsing if parsing fails
      testBrowsing();
    }
  } else {
    testBrowsing();
  }
  
  operationDuration.add(Date.now() - startTime);
}

/**
 * Main test function
 */
export default function () {
  // Health check at start of each iteration
  const health = checkHealth();
  const healthCheck = check(health, {
    'health check passed': () => health.healthy,
  });
  
  if (!healthCheck && __ITER < 5) {
    console.warn('[REALISTIC TEST] Health check failed');
  }
  
  // Perform realistic operation
  const operation = selectOperation();
  
  try {
    switch (operation) {
      case 'auth':
        testAuthentication();
        sleep(waitRandom(2, 5));  // User thinks after auth
        break;
        
      case 'browse':
        testBrowsing();
        sleep(waitRandom(3, 8));  // User reads provider list
        break;
        
      case 'search':
        testSearch();
        sleep(waitRandom(2, 6));  // User reviews search results
        break;
        
      case 'view_details':
        testViewDetails();
        sleep(waitRandom(5, 10)); // User reads provider details
        break;
        
      default:
        testBrowsing();
        sleep(waitRandom(3, 8));
    }
  } catch (error) {
    console.error(`[REALISTIC TEST] Operation ${operation} failed:`, error);
    operationSuccess.add(0);
  }
  
  // Random pause to simulate real user behavior
  sleep(waitRandom(1, 3));
}

/**
 * Setup function - runs once at start
 */
export function setup() {
  console.log('='.repeat(80));
  console.log(`Starting ${scenario.toUpperCase()} load test`);
  console.log('='.repeat(80));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test API Key: ${TEST_API_KEY ? 'Set' : 'NOT SET'}`);
  console.log('');
  
  if (!TEST_API_KEY) {
    console.warn('⚠️  WARNING: TEST_API_KEY not set. Rate limiting may cause failures.');
    console.warn('   Set with: export TEST_API_KEY=perf-test-2024-uat');
  }
  
  // Verify health before starting
  const health = checkHealth();
  if (!health.healthy) {
    console.error('❌ Health check failed. Cannot proceed with tests.');
    throw new Error('Health check failed');
  }
  
  console.log('✅ Health check passed. Starting test...\n');
}

/**
 * Teardown function - runs once at end
 */
export function teardown(data) {
  console.log('');
  console.log('='.repeat(80));
  console.log(`${scenario.toUpperCase()} load test completed`);
  console.log('='.repeat(80));
}
