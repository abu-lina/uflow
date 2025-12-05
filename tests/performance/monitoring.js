/**
 * System Resource Monitoring
 * 
 * Tracks system metrics during performance tests:
 * - Server response times
 * - Error rates by endpoint
 * - Database query performance
 * - Memory/CPU usage (via health endpoint)
 * - Supabase API quota usage
 * - Rate limiting detection
 * 
 * Usage:
 *   Import this module in test files to track system metrics
 */

import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import { BASE_URL, API_BASE_URL } from './k6.config.js';
import http from 'k6/http';

// System metrics
export const serverResponseTime = new Trend('server_response_time');
export const endpointErrorRate = new Rate('endpoint_error_rate');
export const endpointSuccessRate = new Rate('endpoint_success_rate');
export const dbQueryPerformance = new Trend('db_query_performance');
export const systemHealth = new Gauge('system_health');
export const rateLimitHits = new Counter('rate_limit_hits');
export const apiQuotaUsage = new Gauge('api_quota_usage');

// Endpoint-specific metrics
const endpointMetrics = {};

/**
 * Get or create endpoint-specific metrics
 */
function getEndpointMetrics(endpointName) {
  if (!endpointMetrics[endpointName]) {
    endpointMetrics[endpointName] = {
      responseTime: new Trend(`endpoint_${endpointName}_response_time`),
      errorRate: new Rate(`endpoint_${endpointName}_error_rate`),
      successRate: new Rate(`endpoint_${endpointName}_success_rate`),
      requestCount: new Counter(`endpoint_${endpointName}_requests`),
    };
  }
  return endpointMetrics[endpointName];
}

/**
 * Track endpoint performance
 */
export function trackEndpoint(endpointName, response) {
  const metrics = getEndpointMetrics(endpointName);
  const duration = response.timings.duration;
  const isSuccess = response.status >= 200 && response.status < 300;
  const isError = response.status >= 400;
  const isRateLimited = response.status === 429 || response.status === 503;

  // Track metrics
  metrics.responseTime.add(duration);
  metrics.requestCount.add(1);
  serverResponseTime.add(duration);
  
  endpointSuccessRate.add(isSuccess);
  endpointErrorRate.add(isError);
  metrics.successRate.add(isSuccess);
  metrics.errorRate.add(isError);

  // Track rate limiting
  if (isRateLimited) {
    rateLimitHits.add(1);
  }

  return {
    duration,
    isSuccess,
    isError,
    isRateLimited,
  };
}

/**
 * Check system health
 */
export function checkSystemHealth() {
  try {
    const startTime = Date.now();
    const response = http.get(`${API_BASE_URL}/health`, {
      tags: { name: 'health-check-monitoring' },
      timeout: '5s',
    });
    const duration = Date.now() - startTime;

    if (response.status === 200) {
      try {
        const healthData = JSON.parse(response.body);
        systemHealth.add(1); // 1 = healthy
        
        // Extract additional health metrics if available
        if (healthData.uptime) {
          // Could track uptime if needed
        }
        
        return {
          healthy: true,
          status: response.status,
          duration,
          data: healthData,
        };
      } catch (e) {
        // Health endpoint returned 200 but invalid JSON
        systemHealth.add(0.5); // 0.5 = partially healthy
        return {
          healthy: true,
          status: response.status,
          duration,
          data: null,
        };
      }
    } else {
      systemHealth.add(0); // 0 = unhealthy
      return {
        healthy: false,
        status: response.status,
        duration,
        data: null,
      };
    }
  } catch (error) {
    systemHealth.add(0); // 0 = unhealthy
    return {
      healthy: false,
      status: 0,
      duration: 0,
      error: error.message,
    };
  }
}

/**
 * Track database query performance
 */
export function trackDatabaseQuery(queryName, duration, success) {
  dbQueryPerformance.add(duration, { query: queryName });
  endpointSuccessRate.add(success);
  endpointErrorRate.add(!success);
}

/**
 * Monitor API quota usage (Supabase)
 * This is a placeholder - actual quota tracking would require Supabase API
 */
export function trackApiQuotaUsage(estimatedUsage) {
  // This is a simplified version
  // In production, you'd query Supabase API for actual quota usage
  apiQuotaUsage.add(estimatedUsage);
}

/**
 * Detect rate limiting from response
 */
export function detectRateLimiting(response) {
  const isRateLimited = 
    response.status === 429 || // Too Many Requests
    response.status === 503 || // Service Unavailable
    response.headers['X-RateLimit-Remaining'] === '0' ||
    response.headers['Retry-After'] !== undefined;

  if (isRateLimited) {
    rateLimitHits.add(1);
  }

  return isRateLimited;
}

/**
 * Get endpoint statistics summary
 */
export function getEndpointStats() {
  const stats = {};
  for (const [endpoint, metrics] of Object.entries(endpointMetrics)) {
    stats[endpoint] = {
      responseTime: metrics.responseTime,
      errorRate: metrics.errorRate,
      successRate: metrics.successRate,
      requestCount: metrics.requestCount,
    };
  }
  return stats;
}

/**
 * Monitor error patterns
 */
export const errorPatterns = {
  '4xx': new Counter('errors_4xx'),
  '5xx': new Counter('errors_5xx'),
  'timeout': new Counter('errors_timeout'),
  'network': new Counter('errors_network'),
};

export function trackError(response) {
  if (response.status === 0) {
    // Network error or timeout
    errorPatterns.timeout.add(1);
    errorPatterns.network.add(1);
  } else if (response.status >= 400 && response.status < 500) {
    errorPatterns['4xx'].add(1);
  } else if (response.status >= 500) {
    errorPatterns['5xx'].add(1);
  }
}

/**
 * Comprehensive monitoring wrapper
 */
export function monitorRequest(endpointName, requestFn) {
  const startTime = Date.now();
  let response;
  let error;

  try {
    response = requestFn();
    const duration = Date.now() - startTime;
    
    // Track endpoint metrics
    const metrics = trackEndpoint(endpointName, response);
    
    // Track errors
    if (metrics.isError) {
      trackError(response);
    }
    
    // Detect rate limiting
    detectRateLimiting(response);
    
    return {
      response,
      metrics,
      duration,
    };
  } catch (e) {
    error = e;
    const duration = Date.now() - startTime;
    
    // Track error
    errorPatterns.network.add(1);
    endpointErrorRate.add(1);
    endpointSuccessRate.add(0);
    
    return {
      response: null,
      error: e.message,
      duration,
      metrics: {
        isSuccess: false,
        isError: true,
        isRateLimited: false,
      },
    };
  }
}

/**
 * Periodic health check (can be called in setup/teardown)
 */
export function periodicHealthCheck(interval = 30) {
  // This would be called periodically during test execution
  // Implementation depends on k6's execution model
  return checkSystemHealth();
}







