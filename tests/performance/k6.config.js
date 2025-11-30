/**
 * k6 Performance Testing Configuration
 * 
 * This configuration file sets up k6 for load testing the application.
 * 
 * Usage:
 *   k6 run --config k6.config.js tests/performance/scenarios.js
 */

export const options = {
  // Summary output configuration
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)', 'count'],
  
  // Thresholds for performance metrics
  thresholds: {
    // Response time thresholds
    'http_req_duration{status:200}': ['p(95)<1000', 'p(99)<2000', 'avg<500'], // 95% < 1s, 99% < 2s, avg < 500ms
    'http_req_waiting': ['p(95)<800'], // Time to First Byte < 800ms
    
    // Error rate thresholds
    'http_req_failed': ['rate<0.001'], // < 0.1% error rate
    'http_req_failed{status:5xx}': ['rate<0.0001'], // < 0.01% 5xx errors
    
    // Throughput thresholds
    'http_reqs': ['rate>20'], // At least 20 requests/second
    'http_reqs{status:200}': ['rate>19'], // At least 19 successful requests/second
    
    // Overall success rate
    'checks': ['rate>0.99'], // > 99% of checks pass
  },
  
  // Default tags for all requests
  tags: {
    environment: __ENV.ENV || 'staging',
    test_type: 'performance',
  },
  
  // Output configuration
  summaryTimeUnit: 'ms',
  noConnectionReuse: false,
  
  // Extend default options per scenario
  scenarios: {
    // Scenarios will be defined in individual test files
    // This is a placeholder that will be overridden
    default: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
};

// Base URL configuration - defaults to UAT environment
export const BASE_URL = __ENV.BASE_URL || 'https://uat.ummahflow.com';
export const API_BASE_URL = `${BASE_URL}/api`;

// Environment detection
export const ENVIRONMENT = __ENV.ENV || (BASE_URL.includes('uat') ? 'uat' : BASE_URL.includes('localhost') ? 'local' : 'production');

// Test user credentials (should be set via environment variables)
export const TEST_USER = {
  email: __ENV.TEST_USER_EMAIL || 'test@example.com',
  password: __ENV.TEST_USER_PASSWORD || 'TestPassword123!',
};

export const TEST_ADMIN = {
  email: __ENV.TEST_ADMIN_EMAIL || 'admin@example.com',
  password: __ENV.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
};

// Performance targets
export const TARGETS = {
  p95ResponseTime: 1000, // 1 second
  p99ResponseTime: 2000, // 2 seconds
  errorRate: 0.001, // 0.1%
  rps: 50, // Requests per second
  peakRps: 100, // Peak requests per second
  dbQueryP95: 500, // Database queries p95 < 500ms
  pageLoadP95: 1500, // Page load p95 < 1.5s
  successRate: 0.99, // > 99% success rate
};

// Test API Key for bypassing rate limits and security checks in test mode
// Should be set via environment variable: TEST_API_KEY
export const TEST_API_KEY = __ENV.TEST_API_KEY || null;

// UAT-specific configuration
export const UAT_CONFIG = {
  baseUrl: 'https://uat.ummahflow.com',
  testUserEmail: __ENV.TEST_USER_EMAIL || 'perf-test@ummahflow.com',
  testUserPassword: __ENV.TEST_USER_PASSWORD || 'PerfTest123!',
  testAdminEmail: __ENV.TEST_ADMIN_EMAIL || 'perf-admin@ummahflow.com',
  testAdminPassword: __ENV.TEST_ADMIN_PASSWORD || 'PerfAdmin123!',
  maxConcurrentUsers: parseInt(__ENV.MAX_CONCURRENT_USERS || '500', 10),
  testDuration: __ENV.TEST_DURATION || '10m',
};

