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
import { BASE_URL, API_BASE_URL, options as baseOptions } from './k6.config.js';
import { checkHealth, waitRandom } from './utils.js';

// Import test functions from other modules
import authTest from './auth-flow.js';
import browsingTest from './browsing-flow.js';
import adminTest from './admin-flow.js';
import apiTest from './api-endpoints.js';

// Combined metrics
const overallSuccessRate = new Rate('overall_success');
const scenarioDistribution = new Rate('scenario_distribution');

// Select scenario based on environment variable (default to baseline)
const scenario = __ENV.SCENARIO || 'baseline';

// Combined scenario configuration with realistic user distribution
const combinedOptions = {
  ...baseOptions,
  scenarios: {
    // Baseline test - light load (warm-up)
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
      tags: { test_type: 'baseline', load_level: 'low' },
    },

    // Load test - expected production load (100-200 concurrent users)
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Warm-up
        { duration: '3m', target: 100 },   // Ramp to expected load
        { duration: '10m', target: 100 },  // Sustain expected load
        { duration: '2m', target: 150 },   // Peak period
        { duration: '5m', target: 150 },   // Sustain peak
        { duration: '2m', target: 100 },   // Return to normal
        { duration: '2m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '2m',
      tags: { test_type: 'load', load_level: 'medium' },
    },

    // Stress test - beyond expected load (300-500 concurrent users)
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Start from baseline
        { duration: '3m', target: 200 },   // Ramp up
        { duration: '5m', target: 300 },   // Stress level 1
        { duration: '5m', target: 300 },   // Sustain stress
        { duration: '3m', target: 400 },   // Stress level 2
        { duration: '5m', target: 400 },   // Sustain higher stress
        { duration: '2m', target: 500 },   // Maximum stress
        { duration: '3m', target: 500 },   // Test breaking point
        { duration: '2m', target: 200 },   // Recovery
        { duration: '2m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '3m',
      tags: { test_type: 'stress', load_level: 'high' },
    },

    // Spike test - sudden traffic surge (0→300 users in 30s)
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },   // Quick ramp
        { duration: '20s', target: 300 },  // Sudden spike
        { duration: '2m', target: 300 },   // Sustain spike
        { duration: '1m', target: 100 },   // Quick drop
        { duration: '1m', target: 50 },     // Normalize
        { duration: '1m', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '1m',
      tags: { test_type: 'spike', load_level: 'high' },
    },

    // Endurance test - long duration stability (50 users for 1 hour)
    endurance: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1h',
      tags: { test_type: 'endurance', load_level: 'medium' },
    },

    // Medium load test - 200 concurrent users (middle of expected range)
    medium_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '15m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '2m',
      tags: { test_type: 'medium_load', load_level: 'medium' },
    },
  },
  thresholds: {
    ...baseOptions.thresholds,
    'overall_success': ['rate>0.99'], // 99% overall success rate
  },
};

// Export options for k6 - select the appropriate scenario
export const options = {
  ...combinedOptions,
  scenarios: {
    [scenario]: combinedOptions.scenarios[scenario] || combinedOptions.scenarios.baseline,
  },
};

/**
 * Determine which test scenario to run based on realistic user distribution
 * Based on typical web application usage patterns:
 * - 60-70% browsing users (most common)
 * - 10-20% authentication users (login/signup)
 * - 5-10% API endpoint users
 * - 1-2% admin users
 * - 5-10% mixed/other operations
 */
function selectTestScenario() {
  const random = Math.random();
  
  // 65% browsing users (most common activity)
  if (random < 0.65) {
    scenarioDistribution.add(1, { scenario: 'browsing' });
    return 'browsing';
  }
  
  // 15% authentication users (login/signup)
  if (random < 0.80) {
    scenarioDistribution.add(1, { scenario: 'auth' });
    return 'auth';
  }
  
  // 10% API endpoint users
  if (random < 0.90) {
    scenarioDistribution.add(1, { scenario: 'api' });
    return 'api';
  }
  
  // 2% admin users
  if (random < 0.92) {
    scenarioDistribution.add(1, { scenario: 'admin' });
    return 'admin';
  }
  
  // 8% other/mixed operations
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

