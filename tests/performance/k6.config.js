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
    'http_req_duration{status:200}': ['p(95)<1000', 'p(99)<2000'], // 95% < 1s, 99% < 2s
    'http_req_duration{status:200}': ['avg<500'], // Average < 500ms
    'http_req_waiting': ['p(95)<800'], // Time to First Byte < 800ms
    
    // Error rate thresholds
    'http_req_failed': ['rate<0.001'], // < 0.1% error rate
    'http_req_failed{status:5xx}': ['rate<0.0001'], // < 0.01% 5xx errors
    
    // Throughput thresholds
    'http_reqs': ['rate>20'], // At least 20 requests/second
    'http_reqs{status:200}': ['rate>19'], // At least 19 successful requests/second
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

// Base URL configuration
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_BASE_URL = `${BASE_URL}/api`;

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
};
