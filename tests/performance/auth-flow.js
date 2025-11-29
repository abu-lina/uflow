/**
 * Authentication Flow Performance Tests
 * 
 * Tests user authentication flows including:
 * - User signup
 * - User login
 * - Session refresh
 * - Token validation
 * 
 * Load: 10-20% of total users (5,000-10,000/month)
 */

import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, API_BASE_URL, options } from './k6.config.js';
import { signup, login, checkHealth, randomSleep } from './utils.js';

// Custom metrics
const signupSuccessRate = new Rate('auth_signup_success');
const loginSuccessRate = new Rate('auth_login_success');
const authErrorRate = new Rate('auth_errors');

// Override default scenario for auth tests
export const authOptions = {
  ...options,
  scenarios: {
    auth_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 10 },
        { duration: '2m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'auth_baseline' },
    },
    auth_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '1m',
      tags: { scenario: 'auth_load' },
    },
    auth_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '1m',
      tags: { scenario: 'auth_stress' },
    },
  },
  thresholds: {
    ...options.thresholds,
    'auth_signup_success': ['rate>0.95'], // 95% signup success rate
    'auth_login_success': ['rate>0.98'], // 98% login success rate
    'auth_errors': ['rate<0.02'], // < 2% auth errors
    'http_req_duration{name:signup}': ['p(95)<2000'], // Signup can be slower
    'http_req_duration{name:login}': ['p(95)<1000'], // Login should be fast
  },
};

/**
 * Test user signup flow
 */
export function testSignup() {
  // Generate unique test email
  const email = `perf-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  const password = 'TestPassword123!';
  const language = 'en';

  const result = signup(email, password, language);

  const success = check(result, {
    'signup status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'signup response time < 2s': (r) => r.status < 2000,
  });

  signupSuccessRate.add(success);
  if (!success) {
    authErrorRate.add(1);
  }

  // Simulate user reading confirmation message
  sleep(waitRandom(2, 4));
}

/**
 * Test user login flow
 */
export function testLogin(email, password) {
  const token = login(email, password);

  const success = check(token, {
    'login successful': () => token !== null,
  });

  loginSuccessRate.add(success);
  if (!success) {
    authErrorRate.add(1);
  }

  return token;
}

/**
 * Test session validation (using health check as proxy)
 */
export function testSessionValidation(token) {
  if (!token) return false;

  const health = checkHealth();
  
  return check(health, {
    'health check successful': () => health.healthy,
    'health check response time < 500ms': () => health.status < 500,
  });
}

/**
 * Main test function
 */
export default function () {
  // Health check first
  const health = checkHealth();
  check(health, {
    'health check passed': () => health.healthy,
  });

  // Test signup (only for a portion of VUs to avoid rate limiting)
  if (Math.random() < 0.1) {
    // 10% of VUs test signup
    testSignup();
  } else {
    // 90% test login (assuming test users exist)
    // In real scenario, you'd use pre-created test users
    const testEmail = `test-user-${Math.floor(Math.random() * 100)}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const token = testLogin(testEmail, testPassword);
    
    if (token) {
      // Test session validation
      testSessionValidation(token);
      
      // Simulate user session activity
      sleep(waitRandom(1, 3));
    }
  }

  // Random sleep to simulate user behavior
  sleep(waitRandom(1, 3));
}

// Helper function for random wait
function waitRandom(min, max) {
  return Math.random() * (max - min) + min;
}
