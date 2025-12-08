# Test Local Docker Build with Production Configuration

Before deploying to Hetzner, test the Docker build locally to ensure environment variables are properly embedded.

## Prerequisites

1. Ensure you have `.env.production` file in your project root
2. Docker must be running on your local machine
3. All Supabase credentials must be correct in `.env.production`

## Step 1: Verify Local Environment File

```bash
# Check if .env.production exists
ls -la .env.production

# Verify it has the required variables (without exposing values)
grep -c "NEXT_PUBLIC_SUPABASE_URL" .env.production
grep -c "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.production
```

Both commands should return `1` or higher.

## Step 2: Build Docker Image Locally

```bash
# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Build the Docker image with build arguments
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
  -t uflow-test \
  .
```

### Expected Output

You should see:
```
✅ Build-time environment variables validated
```

If you see an error like:
```
ERROR: NEXT_PUBLIC_SUPABASE_URL not set during build
```

This means the build argument wasn't passed correctly. Check that your `.env.production` file has the variable set.

## Step 3: Run the Container Locally

```bash
# Stop any existing test containers
docker stop uflow-test 2>/dev/null || true
docker rm uflow-test 2>/dev/null || true

# Run the test container
docker run -d \
  --name uflow-test \
  -p 3333:3000 \
  --env-file .env.production \
  uflow-test

# Wait for container to start
sleep 5

# Check container is running
docker ps | grep uflow-test
```

## Step 4: Test the Application

### Test Health Endpoint

```bash
curl http://localhost:3333/api/health
```

**Expected**: Should return a successful response (not an error)

### Test in Browser

1. Open your browser to: http://localhost:3333
2. Open browser DevTools (F12) → Console tab
3. Check for any errors related to Supabase

### Verify Supabase Client Initialization

In the browser console, you should NOT see errors like:
- ❌ "Missing NEXT_PUBLIC_SUPABASE_URL"
- ❌ "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY"
- ❌ "Invalid API key"

### Test Data Loading

1. Navigate to http://localhost:3333/providers
2. Check if provider listings load (even if empty)
3. No console errors about Supabase connection

## Step 5: Inspect Built Files (Advanced)

If you want to verify environment variables are embedded in the build:

```bash
# Extract the built JavaScript and check for your Supabase URL
docker run --rm uflow-test sh -c "grep -r 'supabase.co' .next/static | head -5"
```

**Expected**: Should show your Supabase URL embedded in the static files.

## Step 6: Check Container Logs

```bash
# View container logs
docker logs uflow-test

# Follow logs in real-time
docker logs -f uflow-test
```

Look for:
- ✅ No errors about missing environment variables
- ✅ Server started successfully
- ✅ No Supabase connection errors

## Step 7: Cleanup

After testing, stop and remove the test container:

```bash
docker stop uflow-test
docker rm uflow-test
docker rmi uflow-test
```

## Troubleshooting

### Issue: Build fails with "NEXT_PUBLIC_SUPABASE_URL not set"

**Solution**: 
1. Check `.env.production` has the variable set
2. Make sure you're exporting the variables before building
3. Try running the export command manually:
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   echo $NEXT_PUBLIC_SUPABASE_URL
   ```

### Issue: Container starts but shows blank page

**Solution**:
1. Check browser console for JavaScript errors
2. Check container logs: `docker logs uflow-test`
3. Verify the Supabase URL and anon key are correct in `.env.production`
4. Test the Supabase credentials directly:
   ```bash
   curl -H "apikey: YOUR_ANON_KEY" https://your-project.supabase.co/rest/v1/
   ```

### Issue: "Invalid API key" errors in browser console

**Solution**:
1. Verify the anon key matches the Supabase URL (same project)
2. Get fresh credentials from Supabase Dashboard → Settings → API
3. Ensure there are no extra spaces or quotes in `.env.production`

## Success Criteria

Before deploying to Hetzner, confirm:

- [x] Docker build completes without errors
- [x] Container starts and stays running
- [x] Health endpoint responds successfully
- [x] Home page loads without console errors
- [x] No "Missing NEXT_PUBLIC_*" errors in console
- [x] Provider pages can be accessed (even if showing "No providers")
- [x] No Supabase connection errors in container logs

## Next Steps

Once local testing passes, you're ready to deploy:

1. **Deploy to UAT**: `./scripts/deploy-uat.sh` (on Hetzner server)
2. **Test UAT**: Visit https://uat.ummahflow.com
3. **Deploy to Production**: `./scripts/deploy-hetzner.sh` (on Hetzner server)
4. **Test Production**: Visit https://ummahflow.com

**Note**: The deployment scripts must be run ON the Hetzner server, not locally, as they need access to the `.env.production` and `.env.uat` files on the server.



