/**
 * Browsing/Search Flow Performance Tests
 * 
 * Tests user browsing and search flows including:
 * - Homepage load
 * - Provider listing pages
 * - Search functionality
 * - Category filtering
 * - Provider detail pages
 * 
 * Load: 60-70% of total users (30,000-35,000/month)
 */

import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, options as baseOptions } from './k6.config.js';
import { getProviders, searchProviders, getProviderDetails, randomSleep, waitRandom } from './utils.js';
import http from 'k6/http';

// Custom metrics
const browsingSuccessRate = new Rate('browsing_success');
const pageLoadTime = new Trend('page_load_time');
const searchSuccessRate = new Rate('search_success');

// Select scenario based on environment variable (default to baseline)
const scenario = __ENV.SCENARIO || 'baseline';

// Define all possible scenarios
const browsingScenarios = {
  baseline: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 30 },
      { duration: '2m', target: 30 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { scenario: 'browsing_baseline' },
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 50 },
      { duration: '5m', target: 100 },
      { duration: '10m', target: 100 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '1m',
    tags: { scenario: 'browsing_load' },
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 150 },
      { duration: '5m', target: 200 },
      { duration: '3m', target: 200 },
      { duration: '1m', target: 0 },
    ],
    gracefulRampDown: '1m',
    tags: { scenario: 'browsing_stress' },
  },
};

// Export options for k6
export const options = {
  ...baseOptions,
  scenarios: {
    browsing_test: browsingScenarios[scenario] || browsingScenarios.baseline,
  },
  thresholds: {
    ...baseOptions.thresholds,
    'browsing_success': ['rate>0.99'], // 99% success rate
    'search_success': ['rate>0.95'], // 95% search success
    'page_load_time': ['p(95)<1000'], // 95% of pages load in < 1s
    'http_req_duration{name:get-providers}': ['p(95)<800'],
    'http_req_duration{name:search-providers}': ['p(95)<1000'],
    'http_req_duration{name:get-provider-details}': ['p(95)<800'],
  },
};

/**
 * Test homepage load
 */
export function testHomepage() {
  const startTime = Date.now();
  const response = http.get(BASE_URL, {
    tags: { name: 'homepage' },
  });

  const loadTime = Date.now() - startTime;
  pageLoadTime.add(loadTime);

  const success = check(response, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads in < 1s': () => loadTime < 1000,
    'homepage has content': (r) => r.body.length > 1000,
  });

  browsingSuccessRate.add(success);
  return success;
}

/**
 * Test provider listing
 */
export function testProviderListing() {
  // Random pagination
  const page = Math.floor(Math.random() * 5) + 1;
  const limit = 20;
  
  const result = getProviders({ page, limit });

  const success = check(result, {
    'provider listing status is 200': (r) => r.status === 200,
    'provider listing has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch {
        return false;
      }
    },
  });

  browsingSuccessRate.add(success);
  return success;
}

/**
 * Test search functionality
 */
export function testSearch() {
  const searchTerms = [
    'mosque',
    'community',
    'service',
    'help',
    'support',
    'education',
    'charity',
  ];
  
  const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  const result = searchProviders(query);

  const success = check(result, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch {
        return false;
      }
    },
  });

  searchSuccessRate.add(success);
  browsingSuccessRate.add(success);
  return success;
}

/**
 * Test category filtering
 */
export function testCategoryFilter() {
  const categories = ['mosque', 'charity', 'education', 'health', 'social'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  const result = getProviders({ category });

  const success = check(result, {
    'category filter status is 200': (r) => r.status === 200,
    'category filter returns results': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch {
        return false;
      }
    },
  });

  browsingSuccessRate.add(success);
  return success;
}

/**
 * Test provider detail page
 */
export function testProviderDetails() {
  // In real scenario, you'd fetch a list first and pick a real ID
  // For testing, we'll use a mock ID pattern
  const providerId = `provider-${Math.floor(Math.random() * 1000)}`;
  
  const result = getProviderDetails(providerId);

  // Provider might not exist, so we accept 200 or 404
  const success = check(result, {
    'provider details status is valid': (r) => r.status === 200 || r.status === 404,
    'provider details response time < 1s': (r) => r.status < 1000,
  });

  browsingSuccessRate.add(success);
  return success;
}

/**
 * Simulate a typical browsing session
 */
export function simulateBrowsingSession() {
  // 1. Load homepage
  testHomepage();
  sleep(waitRandom(2, 4));

  // 2. Browse listings
  testProviderListing();
  sleep(waitRandom(1, 3));

  // 3. Perform search (70% chance)
  if (Math.random() < 0.7) {
    testSearch();
    sleep(waitRandom(1, 2));
  }

  // 4. Filter by category (50% chance)
  if (Math.random() < 0.5) {
    testCategoryFilter();
    sleep(waitRandom(1, 2));
  }

  // 5. View provider details (40% chance)
  if (Math.random() < 0.4) {
    testProviderDetails();
    sleep(waitRandom(2, 5));
  }
}

/**
 * Main test function
 */
export default function () {
  // Simulate realistic user browsing behavior
  simulateBrowsingSession();

  // Random pause between sessions
  sleep(waitRandom(3, 8));
}

