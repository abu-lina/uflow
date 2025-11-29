/**
 * Utility functions for k6 performance tests
 */

import { check } from 'k6';
import http from 'k6/http';
import { BASE_URL, API_BASE_URL } from './k6.config.js';

/**
 * Generate a random email for testing
 */
export function generateTestEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Generate a random password that meets requirements
 */
export function generateTestPassword() {
  return `TestPass${Math.floor(Math.random() * 100000)}!`;
}

/**
 * Sleep for a random amount of time (simulates user thinking time)
 */
export function randomSleep(min = 1, max = 3) {
  const duration = Math.floor(Math.random() * (max - min + 1) + min);
  return { duration: `${duration}s` };
}

/**
 * Make an authenticated request
 */
export function authenticatedRequest(method, url, token, body = null, params = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const options = {
    headers,
    tags: { name: url },
    ...params,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return http.request(method, url, null, options);
}

/**
 * Login and get access token
 */
export function login(email, password) {
  const url = `${API_BASE_URL}/auth/set`;
  const payload = JSON.stringify({ email, password });

  const response = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' },
  });

  if (response.status === 200) {
    try {
      const data = JSON.parse(response.body);
      return data.accessToken || null;
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Sign up a new user
 */
export function signup(email, password, language = 'en') {
  const url = `${API_BASE_URL}/auth/signup`;
  const payload = JSON.stringify({
    email,
    password,
    language,
    termsAccepted: true,
    privacyAccepted: true,
    honeypot: '', // Honeypot field should be empty
  });

  const response = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'signup' },
  });

  return {
    status: response.status,
    body: response.body,
    success: response.status === 200 || response.status === 201,
  };
}

/**
 * Check health endpoint
 */
export function checkHealth() {
  const url = `${API_BASE_URL}/health`;
  const response = http.get(url, {
    tags: { name: 'health-check' },
  });

  return {
    status: response.status,
    healthy: response.status === 200,
    body: response.body,
  };
}

/**
 * Get providers list (browsing)
 */
export function getProviders(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${BASE_URL}/providers${queryString ? `?${queryString}` : ''}`;
  
  const response = http.get(url, {
    tags: { name: 'get-providers' },
  });

  return {
    status: response.status,
    body: response.body,
  };
}

/**
 * Search providers
 */
export function searchProviders(query, params = {}) {
  const searchParams = { ...params, q: query };
  const queryString = new URLSearchParams(searchParams).toString();
  const url = `${BASE_URL}/providers${queryString ? `?${queryString}` : ''}`;
  
  const response = http.get(url, {
    tags: { name: 'search-providers' },
  });

  return {
    status: response.status,
    body: response.body,
  };
}

/**
 * Get provider details
 */
export function getProviderDetails(providerId) {
  const url = `${BASE_URL}/providers/${providerId}`;
  
  const response = http.get(url, {
    tags: { name: 'get-provider-details' },
  });

  return {
    status: response.status,
    body: response.body,
  };
}

/**
 * Get pending providers (admin)
 */
export function getPendingProviders(token, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/admin/pending-providers${queryString ? `?${queryString}` : ''}`;
  
  return authenticatedRequest('GET', url, token, null, {
    tags: { name: 'get-pending-providers' },
  });
}

/**
 * Review provider (admin)
 */
export function reviewProvider(token, providerId, action, comment = '') {
  const url = `${API_BASE_URL}/admin/review-provider`;
  const body = {
    providerId,
    action, // 'approve' or 'reject'
    comment,
  };
  
  return authenticatedRequest('PATCH', url, token, body, {
    tags: { name: 'review-provider' },
  });
}

/**
 * Get Notion epics
 */
export function getNotionEpics(token, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/notion/get-epics${queryString ? `?${queryString}` : ''}`;
  
  return authenticatedRequest('GET', url, token, null, {
    tags: { name: 'get-notion-epics' },
  });
}

/**
 * Export user data
 */
export function exportUserData(token) {
  const url = `${API_BASE_URL}/user/export-data`;
  
  return authenticatedRequest('GET', url, token, null, {
    tags: { name: 'export-user-data' },
  });
}

/**
 * Common performance checks
 */
export function checkResponseTime(response, maxTime = 1000) {
  return check(response, {
    'response time < 1s': (r) => r.timings.duration < maxTime,
  });
}

export function checkStatus(response, expectedStatus = 200) {
  return check(response, {
    [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
}

export function checkResponseStructure(response, expectedFields = []) {
  try {
    const data = JSON.parse(response.body);
    return check(data, {
      'has expected fields': () => expectedFields.every(field => field in data),
    });
  } catch (e) {
    return false;
  }
}

/**
 * Wait for a random time between min and max seconds
 */
export function waitRandom(minSeconds, maxSeconds) {
  const waitTime = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  return waitTime;
}
