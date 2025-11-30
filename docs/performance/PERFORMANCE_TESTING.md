# Performance Testing Guide

This guide explains how to run performance tests to validate the application can handle 50,000 unique monthly users.

## Overview

The performance testing framework uses [k6](https://k6.io/) to simulate user load and measure application performance. Tests cover all critical user flows:

- **Authentication flows** (10-20% of users): Signup, login, session management
- **Browsing/search flows** (60-70% of users): Homepage, listings, search, detail pages
- **Admin operations** (1-2% of users): Provider review, dashboard operations
- **API endpoints** (5-10% of users): Notion integration, data export, health checks

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

Or download from: https://k6.io/docs/getting-started/installation/

### Environment Setup

1. Set environment variables for test environment:
```bash
export BASE_URL="https://your-staging-url.com"
export ENV="staging"
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="TestPassword123!"
export TEST_ADMIN_EMAIL="admin@example.com"
export TEST_ADMIN_PASSWORD="AdminPassword123!"
```

2. Ensure test data is available in the test environment:
   - Test user accounts
   - Test admin accounts
   - Sample providers for browsing tests
   - Notion integration configured (if testing Notion endpoints)

## Running Tests

### Quick Start

Run all tests with default baseline scenario:
```bash
npm run perf:baseline
```

### Test Types

#### Individual Test Suites

```bash
# Authentication flow tests
npm run perf:auth

# Browsing/search flow tests
npm run perf:browsing

# Admin operation tests
npm run perf:admin

# API endpoint tests
npm run perf:api
```

#### Test Scenarios

```bash
# Baseline test (light load - 10-30 concurrent users)
npm run perf:baseline

# Load test (expected production load - 50-100 concurrent users)
npm run perf:load

# Stress test (beyond expected load - 100-200 concurrent users)
npm run perf:stress

# Spike test (sudden traffic spike - up to 300 concurrent users)
npm run perf:spike
```

### Advanced Usage

Run tests directly with the script:

```bash
# Run specific test with custom scenario
bash tests/performance/run-tests.sh browsing load

# Run all tests
bash tests/performance/run-tests.sh all

# Run with custom base URL
BASE_URL=https://staging.example.com bash tests/performance/run-tests.sh load
```

### Running Individual Test Files

Run a specific test file directly with k6:

```bash
# Authentication tests
k6 run --config tests/performance/k6.config.js \
  --env BASE_URL=https://staging.example.com \
  tests/performance/auth-flow.js

# Browsing tests
k6 run --config tests/performance/k6.config.js \
  --env BASE_URL=https://staging.example.com \
  tests/performance/browsing-flow.js
```

## Performance Targets

### Response Time Targets

- **P95 response time**: < 1s for API endpoints
- **P95 response time**: < 500ms for static pages
- **P99 response time**: < 2s for all endpoints
- **Time to First Byte (TTFB)**: < 200ms

### Throughput Targets

- **Sustained RPS**: 50 requests/second
- **Peak RPS**: 100 requests/second for 5 minutes
- **Concurrent users**: 200 simultaneous users

### Error Rate Targets

- **Overall error rate**: < 0.1% (99.9% success rate)
- **5xx errors**: < 0.01%
- **4xx errors**: < 0.1% (excluding expected 401/403)

### Resource Utilization

- **CPU usage**: < 80% average, < 95% peak
- **Memory usage**: < 1.5GB (75% of 2GB available)
- **Database connections**: Monitor Supabase connection pool

## Test Reports

Test reports are generated in `tests/performance/reports/` directory:

- **JSON reports**: Detailed metrics in JSON format
- **Summary files**: Human-readable text summaries

### Viewing Results

After running tests, check the reports directory:

```bash
ls -la tests/performance/reports/
```

Each test run generates timestamped files:
- `{test-name}_{scenario}_{timestamp}.json` - Full metrics
- `{test-name}_{scenario}_{timestamp}_summary.txt` - Summary

### Key Metrics to Review

1. **Response Times**: Check p95 and p99 percentiles
2. **Error Rates**: Verify error rates are below thresholds
3. **Throughput**: Confirm RPS meets targets
4. **Success Rates**: Verify scenario-specific success rates

## Test Scenarios Explained

### Baseline Test
- **Purpose**: Establish baseline performance metrics
- **Load**: 10-30 concurrent users
- **Duration**: ~4 minutes
- **Use Case**: Initial performance validation

### Load Test
- **Purpose**: Validate application handles expected production load
- **Load**: 50-100 concurrent users
- **Duration**: ~20 minutes
- **Use Case**: Pre-production validation

### Stress Test
- **Purpose**: Identify breaking points and error handling
- **Load**: 100-200 concurrent users
- **Duration**: ~10 minutes
- **Use Case**: Capacity planning

### Spike Test
- **Purpose**: Test recovery from sudden traffic spikes
- **Load**: Sudden spike to 300 concurrent users
- **Duration**: ~5 minutes
- **Use Case**: Handling viral traffic or marketing campaigns

### Endurance Test
- **Purpose**: Identify memory leaks and long-term stability
- **Load**: 50 concurrent users
- **Duration**: 1-2 hours
- **Use Case**: Long-term stability validation

## Interpreting Results

### Success Criteria

The application is considered capable of handling 50,000 monthly users if:

- ✅ All response time targets are met (P95 < 1s)
- ✅ Error rate < 0.1%
- ✅ Sustained 50 RPS without degradation
- ✅ Peak 100 RPS handled gracefully
- ✅ No memory leaks during endurance tests
- ✅ Server resources stay within limits
- ✅ Database performance remains stable

### Common Issues

#### High Response Times
- **Check**: Database query performance
- **Check**: API endpoint optimization
- **Check**: Network latency
- **Solution**: Optimize queries, add caching, use CDN

#### High Error Rates
- **Check**: Application logs for errors
- **Check**: Database connection pool
- **Check**: Rate limiting configuration
- **Solution**: Fix errors, increase connection pool, adjust rate limits

#### Resource Exhaustion
- **Check**: CPU and memory usage
- **Check**: Database connection limits
- **Check**: Supabase tier limits
- **Solution**: Scale infrastructure, optimize code, upgrade database tier

## Continuous Performance Testing

### Recommended Schedule

- **Weekly**: Run baseline tests
- **Before releases**: Run load tests
- **Monthly**: Run stress and endurance tests
- **After major changes**: Run full test suite

### CI/CD Integration

Performance tests can be integrated into CI/CD pipelines. See `.github/workflows/performance-test.yml` (if created) for GitHub Actions integration.

## Troubleshooting

### k6 Not Found
```bash
# Verify installation
k6 version

# Reinstall if needed (see Prerequisites)
```

### Test Failures
1. Check environment variables are set correctly
2. Verify test environment is accessible
3. Ensure test user accounts exist
4. Check application logs for errors

### High Resource Usage
1. Reduce concurrent users in test scenarios
2. Increase ramp-up time
3. Run tests during off-peak hours
4. Use dedicated test environment

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/using-k6/best-practices/)
- [Performance Testing Guide](https://k6.io/docs/test-types/)

## Support

For issues or questions about performance testing:
1. Check test logs in `tests/performance/reports/`
2. Review application logs
3. Consult k6 documentation
4. Review performance optimization recommendations in test results


