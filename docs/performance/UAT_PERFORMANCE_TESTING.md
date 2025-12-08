# UAT Performance Testing Guide

Complete guide for running performance tests on the UAT environment to identify system limitations before production launch.

## Overview

This performance testing suite uses [k6](https://k6.io/) to test the UAT environment (`uat.ummahflow.com`) under various load conditions. Tests cover:

- API endpoints
- Database operations
- Concurrent user capacity
- Page loads
- Critical user flows (auth, browsing, admin)

## Prerequisites

### 1. Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

**Verify installation:**
```bash
k6 version
```

### 2. Configure UAT Environment

Ensure `.env.uat` file exists with:
- `NEXT_PUBLIC_SUPABASE_URL` - UAT Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - UAT service role key
- Other required environment variables

### 3. Set Up Test Data

Before running tests, prepare the UAT environment:

```bash
npm run perf:uat:setup
```

This creates:
- Test users for authentication tests
- Sample provider data for browsing tests
- Admin accounts for admin operation tests

## Running Tests

### Quick Start

**Baseline test (light load):**
```bash
npm run perf:uat:baseline
```

**Load test (expected production load):**
```bash
npm run perf:uat:load
```

**Stress test (beyond expected load):**
```bash
npm run perf:uat:stress
```

**Spike test (sudden traffic surge):**
```bash
npm run perf:uat:spike
```

**Database performance test:**
```bash
npm run perf:uat:database
```

**All test suites:**
```bash
npm run perf:uat:all
```

### Individual Test Suites

**Authentication flow:**
```bash
BASE_URL=https://uat.ummahflow.com npm run perf:auth
```

**Browsing flow:**
```bash
BASE_URL=https://uat.ummahflow.com npm run perf:browsing
```

**API endpoints:**
```bash
BASE_URL=https://uat.ummahflow.com npm run perf:api
```

**Admin operations:**
```bash
BASE_URL=https://uat.ummahflow.com npm run perf:admin
```

### Custom Configuration

Override default settings:

```bash
BASE_URL=https://uat.ummahflow.com \
ENV=uat \
TEST_USER_EMAIL=your-test@email.com \
TEST_USER_PASSWORD=YourPassword123! \
bash tests/performance/run-tests.sh load
```

## Test Scenarios

### Baseline Test
- **Load:** 10-30 concurrent users
- **Duration:** ~4 minutes
- **Purpose:** Warm-up and establish baseline metrics
- **Use case:** Quick sanity check

### Load Test
- **Load:** 100-200 concurrent users (expected production)
- **Duration:** ~26 minutes
- **Purpose:** Validate system under expected production load
- **Use case:** Pre-production validation

### Stress Test
- **Load:** 300-500 concurrent users
- **Duration:** ~30 minutes
- **Purpose:** Find system breaking points
- **Use case:** Capacity planning

### Spike Test
- **Load:** Sudden surge from 0→300 users in 30s
- **Duration:** ~6 minutes
- **Purpose:** Test system resilience to traffic spikes
- **Use case:** Handling viral traffic or marketing campaigns

### Database Test
- **Load:** 50-500 concurrent users
- **Duration:** Varies by scenario
- **Purpose:** Test database performance under load
- **Focus:** Query performance, connection pooling, N+1 patterns

## Understanding Results

### Key Metrics

**Response Times:**
- `p(50)` - Median response time (50% of requests)
- `p(95)` - 95th percentile (95% of requests faster than this)
- `p(99)` - 99th percentile (99% of requests faster than this)

**Success Rates:**
- `http_req_failed` - Overall error rate
- `checks` - Percentage of checks that passed

**Throughput:**
- `http_reqs` - Requests per second
- `data_received` - Data received per second

### Performance Thresholds

Tests fail if thresholds are not met:

- **API response time:** p95 < 1s, p99 < 2s
- **Page load time:** p95 < 1.5s
- **Error rate:** < 0.1%
- **Database queries:** p95 < 500ms
- **Success rate:** > 99%

### Reading Reports

Reports are saved to `tests/performance/reports/`:

**JSON Report:**
- Detailed metrics in JSON format
- Useful for programmatic analysis
- File: `{test_name}_{scenario}_{timestamp}.json`

**CSV Report:**
- Time-series data
- Useful for graphing in Excel/Google Sheets
- File: `{test_name}_{scenario}_{timestamp}.csv`

**Summary Report:**
- Human-readable summary
- Key metrics and thresholds
- File: `{test_name}_{scenario}_{timestamp}_summary.txt`

**Example output:**
```
http_req_duration..............: avg=245.5ms  min=45ms   med=180ms  max=1.2s    p(90)=450ms  p(95)=680ms  p(99)=1.1s
http_req_failed................: 0.00%   ✓ 0.00% < 0.1%
http_reqs......................: 1250    42.5/s
checks.........................: 98.50%  ✓ 98.50% > 99%
```

## Common Issues and Solutions

### Issue: "k6 is not installed"

**Solution:**
```bash
# Install k6 (see Prerequisites section)
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux
```

### Issue: "Connection refused" or "Timeout"

**Possible causes:**
1. UAT environment is down
2. Network connectivity issues
3. Firewall blocking requests

**Solution:**
```bash
# Verify UAT is accessible
curl https://uat.ummahflow.com/api/health

# Check network connectivity
ping uat.ummahflow.com
```

### Issue: High error rates

**Possible causes:**
1. UAT environment overloaded
2. Database connection pool exhausted
3. Rate limiting triggered

**Solution:**
- Check UAT server logs
- Reduce test load
- Check Supabase quota usage
- Verify database connection pool settings

### Issue: Test users not found

**Solution:**
```bash
# Re-run test data setup
npm run perf:uat:setup
```

### Issue: Slow response times

**Possible causes:**
1. Database queries not optimized
2. N+1 query patterns
3. Missing database indexes
4. High server load

**Solution:**
- Review database query performance
- Check for N+1 query patterns in code
- Verify database indexes exist
- Monitor server resource usage

## Performance Optimization Recommendations

### Based on Test Results

**If response times are high:**
1. Review database queries for optimization
2. Check for N+1 query patterns
3. Add database indexes
4. Implement query caching
5. Consider database connection pooling

**If error rates are high:**
1. Check server logs for errors
2. Verify database connection limits
3. Check Supabase API quota
4. Review rate limiting settings
5. Verify all services are running

**If connection pool is exhausted:**
1. Increase connection pool size
2. Optimize query execution time
3. Implement connection pooling
4. Review long-running queries

**If N+1 queries detected:**
1. Batch related queries
2. Use JOINs instead of separate queries
3. Implement data prefetching
4. Use GraphQL-style data loaders

## Best Practices

### Before Running Tests

1. **Notify team** - Performance tests can impact UAT environment
2. **Check UAT status** - Ensure environment is stable
3. **Set up test data** - Run `npm run perf:uat:setup`
4. **Verify credentials** - Check `.env.uat` is configured

### During Tests

1. **Monitor UAT environment** - Watch server logs and metrics
2. **Start with baseline** - Run baseline before load/stress tests
3. **Run tests sequentially** - Don't run multiple tests simultaneously
4. **Document results** - Save reports for comparison

### After Tests

1. **Analyze results** - Review metrics and identify bottlenecks
2. **Compare with previous runs** - Track performance over time
3. **Document findings** - Use report template
4. **Clean up test data** (optional):
   ```bash
   npm run perf:uat:cleanup
   ```

## Continuous Performance Testing

### Regular Schedule

- **Weekly:** Baseline tests
- **Before releases:** Load tests
- **Monthly:** Stress tests
- **After major changes:** Full test suite

### Performance Regression Detection

Compare metrics across test runs:
- Response times should not increase
- Error rates should remain stable
- Throughput should not decrease

## Advanced Usage

### Custom Test Scenarios

Create custom scenarios in `tests/performance/scenarios.js`:

```javascript
custom_scenario: {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '1m', target: 50 },
    { duration: '5m', target: 100 },
  ],
}
```

### Integration with CI/CD

Add to GitHub Actions workflow:

```yaml
- name: Run UAT Performance Tests
  run: |
    npm run perf:uat:baseline
    npm run perf:uat:load
```

### Monitoring Integration

Export metrics to monitoring systems:
- Prometheus
- Grafana
- Datadog
- New Relic

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [Performance Testing Best Practices](https://k6.io/docs/test-types/)
- [Interpreting k6 Results](https://k6.io/docs/results-output/)

## Support

For issues or questions:
1. Check this guide
2. Review test logs in `tests/performance/reports/`
3. Check UAT server logs
4. Contact the development team









