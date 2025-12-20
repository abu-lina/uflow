# Performance Test Setup - Next Steps

## ✅ What's Been Completed

1. ✅ Updated login route with test mode support
2. ✅ Updated signup route with test mode support  
3. ✅ Added unblockIP function to clear IP blocks
4. ✅ Updated GitHub Actions workflow to pass TEST_API_KEY
5. ✅ Committed and pushed changes to main
6. ✅ Created 100 test users in UAT database
7. ✅ Fixed k6 test scripts (timings, error handling)

## 🔴 Current Issue

Tests are still failing with rate limiting and IP blocking because:
- TEST_API_KEY is set locally (`perf-test-2024-uat`)
- But TEST_API_KEY is NOT set in the UAT server yet
- The UAT deployment is in progress but doesn't have the secret

## 🎯 What You Need to Do NOW

### Step 1: Add GitHub Secret (Required)

1. Go to: https://github.com/abu-lina/uflow/settings/secrets/actions
2. Click **New repository secret**
3. Add:
   - **Name**: `UAT_TEST_API_KEY`
   - **Value**: `perf-test-2024-uat`
4. Click **Add secret**

### Step 2: Trigger New UAT Deployment

Since the current deployment started BEFORE you added the secret, you need to deploy again:

**Option A: Push a small change** (easiest)
```bash
# Make a trivial change to trigger redeploy
echo "# Performance testing configured" >> README.md
git add README.md
git commit -m "Trigger UAT redeploy with TEST_API_KEY"
git push origin main
```

**Option B: Manual workflow dispatch**
1. Go to: https://github.com/abu-lina/uflow/actions/workflows/deploy-uat.yml
2. Click **Run workflow** → **Run workflow**

### Step 3: Wait for Deployment

Monitor the deployment at: https://github.com/abu-lina/uflow/actions

Wait for the "Deploy to UAT" workflow to complete (green checkmark).

### Step 4: Run Tests Again

Once deployed:
```bash
TEST_API_KEY=perf-test-2024-uat k6 run tests/performance/auth-flow.js
```

## ✅ Expected Results

When TEST_API_KEY is properly configured, you should see:
- ✅ No 403 "Access temporarily restricted" errors
- ✅ No 429 "Too many login attempts" errors
- ✅ ~98% login success rate
- ✅ k6 tests pass all thresholds

## 🔍 Verify Test Mode

After redeployment, check UAT logs to confirm test mode is working:

**If you have SSH access:**
```bash
ssh root@your-hetzner-server
docker logs -f uflow-uat | grep "LOGIN API\|SIGNUP API"
```

Look for:
```
[LOGIN API] Test API key header received: perf-test...
[LOGIN API] Expected key set: YES
[LOGIN API] Test mode active: true
[LOGIN API] ✅ Test mode enabled, bypassing security checks
```

## 📊 Current Test Results

From the test run just now:
- Login success: 52.63% (should be >98%)
- Auth errors: 100% (should be <2%)
- Some logins worked, others blocked

This confirms:
- The login route IS deployed and working
- Test users exist and can login
- But test mode isn't active (TEST_API_KEY not set on server)

## Summary

You're very close! Just need to:
1. Add `UAT_TEST_API_KEY` secret to GitHub
2. Redeploy to UAT
3. Run tests again

The infrastructure is all in place; you just need the secret configured.
