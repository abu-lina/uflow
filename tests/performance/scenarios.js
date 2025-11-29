/**
 * Combined Performance Test Scenarios
 * 
 * This file combines all test scenarios with realistic user distribution:
 * - 60-70% browsing users
 * - 10-20% authentication users
 * - 5-10% API endpoint users
 * - 1-2% admin users
 * 
 * Usage:
 *   k6 run --config tests/performance/k6.config.js tests/performance/scenarios.js
 */

import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, API_BASE_URL, options } from './k6.config.js';
import { checkHealth, waitRandom } from './utils.js';

// Import test functions from other modules
import authTest from './auth-flow.js';
import browsingTest from './browsing-flow.js';
import adminTest from './admin-flow.js';
import apiTest from './api-endpoints.js';

// Combined metrics
const overallSuccessRate = new Rate('overall_success');
const scenarioDistribution = new Rate('scenario_distribution');

// Combined scenario configuration
export const combinedOptions = {
  ...options,
  scenarios: {
    // Baseline test - light load
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
      tags: { test_type: 'baseline' },
    },

    // Load test - expected production load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '2m',
      tags: { test_type: 'load' },
    },

    // Stress test - beyond expected load
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '2m',
      tags: { test_type: 'stress' },
    },

    // Spike test - sudden traffic spike
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '1m', target: 300 },
        { duration: '2m', target: 300 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '1m',
      tags: { test_type: 'spike' },
    },

    // Endurance test - long duration
    endurance: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1h',
      tags: { test_type: 'endurance' },
    },
  },
  thresholds: {
    ...options.thresholds,
    'overall_success': ['rate>0.99'], // 99% overall success rate
  },
};

/**
 * Determine which test scenario to run based on user distribution
 */
function selectTestScenario() {
  const random = Math.random();
  
  // 65% browsing users
  if (random < 0.65) {
    scenarioDistribution.add(1, { scenario: 'browsing' });
    return 'browsing';
  }
  
  // 15% authentication users
  if (random < 0.80) {
    scenarioDistribution.add(1, { scenario: 'auth' });
    return 'auth';
  }
  
  // 7.5% API endpoint users
  if (random < 0.875) {
    scenarioDistribution.add(1, { scenario: 'api' });
    return 'api';
  }
  
  // 1.5% admin users
  if (random < 0.89) {
    scenarioDistribution.add(1, { scenario: 'admin' });
    return 'admin';
  }
  
  // 11% other/mixed
  scenarioDistribution.add(1, { scenario: 'mixed' });
  return 'mixed';
}

/**
 * Run mixed scenario (combination of different flows)
 */
function runMixedScenario() {
  // Health check
  const health = checkHealth();
  check(health, {
    'health check passed': () => health.healthy,
  });
  
  sleep(waitRandom(0.5, 1));

  // Random mix of operations
  const operations = [
    () => browsingTest(),
    () => apiTest(),
  ];

  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();
}

/**
 * Main test function
 */
export default function () {
  // Initial health check
  const health = checkHealth();
  const healthSuccess = check(health, {
    'initial health check': () => health.healthy,
  });
  
  overallSuccessRate.add(healthSuccess);

  // Select and run appropriate test scenario
  const scenario = selectTestScenario();
  
  try {
    switch (scenario) {
      case 'browsing':
        browsingTest();
        break;
      case 'auth':
        authTest();
        break;
      case 'admin':
        adminTest();
        break;
      case 'api':
        apiTest();
        break;
      case 'mixed':
        runMixedScenario();
        break;
      default:
        browsingTest(); // Default to browsing
    }
    
    overallSuccessRate.add(1);
  } catch (error) {
    console.error(`Error in scenario ${scenario}:`, error);
    overallSuccessRate.add(0);
  }

  // Random pause between iterations
  sleep(waitRandom(1, 5));
}
