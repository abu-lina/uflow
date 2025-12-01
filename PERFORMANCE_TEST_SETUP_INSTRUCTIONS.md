# Performance Testing Setup Instructions

## ✅ Completed Steps

1. ✅ Updated login route with test mode support and debug logging
2. ✅ Updated signup route with test mode support and debug logging
3. ✅ Added TEST_API_KEY environment variable to GitHub Actions workflow
4. ✅ Committed and pushed changes to main branch
5. ✅ GitHub Actions deployment to UAT is now in progress

## 🔑 Next Step: Configure TEST_API_KEY

The TEST_API_KEY must be set in GitHub Secrets to enable test mode in UAT.

### Step 1: Add GitHub Secret

1. Go to your GitHub repository: https://github.com/abu-lina/uflow
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - **Name**: `UAT_TEST_API_KEY`
   - **Value**: `perf-test-2024-uat`
   
   (You can use any value you want, but remember it for Step 3)

### Step 2: Wait for Deployment

The GitHub Actions workflow is currently deploying to UAT. You can monitor it at:
https://github.com/abu-lina/uflow/actions

Wait for the "Deploy to UAT" workflow to complete successfully (green checkmark).

### Step 3: Run Performance Tests

Once deployment is complete, run the tests locally:

```bash
# Set the TEST_API_KEY to match what you set in GitHub Secrets
export TEST_API_KEY=perf-test-2024-uat

# Run the k6 authentication flow tests
k6 run tests/performance/auth-flow.js
```

### Step 4: Verify Test Mode is Working

Check the UAT logs to confirm test mode is enabled:

**Option A: Via GitHub Actions logs**
1. Go to the "Deploy to UAT" workflow run
2. Click on the "Deploy to UAT on Hetzner" step
3. Look for log lines like:
   - `[LOGIN API] Test API key header received: ...`
   - `[LOGIN API] Expected key set: YES`
   - `[LOGIN API] Test mode active: true`
   - `[LOGIN API] ✅ Test mode enabled`

**Option B: Via server logs (if you have SSH access)**
```bash
# SSH to your Hetzner server
ssh root@your-hetzner-server

# View UAT container logs
docker logs -f uflow-uat | grep "LOGIN API\|SIGNUP API"
```

### Expected Results

When test mode is working correctly:
- ✅ No 403 "Access temporarily restricted" errors
- ✅ No 429 "Too many login attempts" errors
- ✅ Login tests pass using test-user-0 through test-user-99
- ✅ Signup tests work with auto-confirmed emails
- ✅ k6 reports show successful authentication flows

## Troubleshooting

### If you see "Expected key set: NO" in logs

The TEST_API_KEY environment variable isn't being passed to the container. Solutions:

1. **Wait for the next deployment** after setting the GitHub Secret
2. **Or manually set it on the server**:
   ```bash
   ssh root@your-hetzner-server
   docker stop uflow-uat
   docker rm uflow-uat
   
   # Run container with TEST_API_KEY
   docker run -d -p 3001:3000 \
     -e TEST_API_KEY=perf-test-2024-uat \
     $(docker inspect uflow-uat:latest --format='{{range .Config.Env}}{{printf "-e %s " .}}{{end}}') \
     --name uflow-uat \
     --restart unless-stopped \
     uflow-uat:latest
   ```

### If you see "Test mode active: false"

The TEST_API_KEY values don't match. Ensure:
- The value in GitHub Secret matches the value you're using locally
- Both are exactly the same (case-sensitive)

### If tests still fail with 403/429 errors

1. Check that TEST_API_KEY is set in your local environment:
   ```bash
   echo $TEST_API_KEY
   ```
2. Verify the UAT deployment completed successfully
3. Check UAT logs for test mode detection messages

## Quick Reference

### Test API Key
- **GitHub Secret Name**: `UAT_TEST_API_KEY`
- **Recommended Value**: `perf-test-2024-uat`
- **Local Export**: `export TEST_API_KEY=perf-test-2024-uat`

### Test Users
- **Count**: 100 users (test-user-0 through test-user-99)
- **Email Pattern**: `test-user-{0-99}@example.com`
- **Password**: `TestPassword123!`

### UAT URLs
- **Main**: https://uat.ummahflow.com
- **Health Check**: https://uat.ummahflow.com/api/health
- **Login API**: https://uat.ummahflow.com/api/auth/login
- **Signup API**: https://uat.ummahflow.com/api/auth/signup

### GitHub Actions
- **Workflow**: Deploy to UAT
- **URL**: https://github.com/abu-lina/uflow/actions

## Next Steps After Testing Works

Once performance tests are passing:
1. Review test results and metrics
2. Adjust load scenarios if needed
3. Run stress tests and spike tests
4. Document performance baselines
