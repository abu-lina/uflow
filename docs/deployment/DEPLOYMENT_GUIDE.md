# Deployment Guide for UAT and Production

This guide walks you through deploying the fixed application to UAT and production environments on Hetzner.

## Prerequisites Checklist

Before deploying, ensure:

- [ ] Completed [VERIFY_HETZNER_ENV.md](VERIFY_HETZNER_ENV.md) steps
- [ ] `.env.production` exists on Hetzner server with correct credentials
- [ ] `.env.uat` exists on Hetzner server with correct credentials
- [ ] Completed [TEST_LOCAL_BUILD.md](TEST_LOCAL_BUILD.md) and verified local build works
- [ ] SSH access to Hetzner server configured
- [ ] Git repository has all latest changes pushed

## Deployment Architecture

```
Hetzner Server
├── Port 3000 → Production (ummahflow.com)
├── Port 3001 → UAT (uat.ummahflow.com)
├── .env.production → Production environment variables
└── .env.uat → UAT environment variables
```

## Part 1: Deploy to UAT

Deploy to UAT first to validate the fix in a non-production environment.

### Step 1: SSH into Hetzner Server

```bash
ssh root@91.98.207.106
# Or use hostname: ssh root@uflow-production
```

### Step 2: Navigate to Project Directory

```bash
# Try common locations:
cd /var/www/uflow || cd /root/uflow

# If neither exists, find it:
find / -name "uflow" -type d 2>/dev/null | grep -E "(var/www|root)"
```

### Step 3: Pull Latest Changes

```bash
git pull origin main
```

### Step 4: Run UAT Deployment Script

```bash
./scripts/deploy-uat.sh
```

### Expected Output

You should see:
```
🚀 Deploying UAT environment...
📋 Loading UAT environment variables...
🔍 Validating required environment variables...
✅ Environment variables validated
🔨 Building UAT Docker image...
✅ Build-time environment variables validated
🛑 Stopping existing UAT container...
🐳 Starting UAT container on port 3001...
⏳ Waiting for UAT container to start...
🏥 Performing health check...
✅ UAT health check passed
🌐 Updating Nginx configuration for UAT...
✅ Nginx configuration is valid
✅ Nginx reloaded successfully
🎉 UAT deployment complete!
UAT is live at: https://uat.ummahflow.com
```

### Step 5: Verify UAT Deployment

#### Check Container Status
```bash
docker ps | grep uflow-uat
```

Should show container running on port 3001.

#### Check Container Logs
```bash
docker logs uflow-uat --tail 50
```

Look for:
- ✅ No errors about missing environment variables
- ✅ Server started successfully
- ✅ No Supabase client initialization errors

#### Test Health Endpoint
```bash
curl http://localhost:3001/api/health
```

Should return successful response.

#### Test Through Nginx
```bash
curl https://uat.ummahflow.com/api/health
```

Should return successful response (requires SSL certificate configured).

### Step 6: Browser Testing on UAT

1. Open browser to: https://uat.ummahflow.com
2. Open DevTools (F12) → Console tab
3. Verify:
   - [ ] Page loads without blank screen
   - [ ] No "Missing NEXT_PUBLIC_*" errors
   - [ ] No Supabase client errors
   - [ ] Can navigate to /providers page
   - [ ] Provider listings load (even if empty)
   - [ ] Authentication pages work (/login, /signup)

### UAT Troubleshooting

#### Issue: Build fails with environment variable error

Check `.env.uat` file:
```bash
cat .env.uat | grep NEXT_PUBLIC_SUPABASE
```

Verify format matches:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx...   # or eyJxxx... (legacy)
```

#### Issue: Container starts but crashes

View full logs:
```bash
docker logs uflow-uat
```

Common issues:
- Port 3001 already in use
- Invalid environment variables in `.env.uat`
- Supabase credentials mismatch

#### Issue: Nginx configuration error

Test Nginx config:
```bash
sudo nginx -t
```

View Nginx error logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

## Part 2: Deploy to Production

Only proceed after UAT deployment is verified and working correctly.

### Step 1: Verify UAT is Working

Confirm UAT checklist:
- [ ] UAT site loads at https://uat.ummahflow.com
- [ ] No console errors
- [ ] Supabase data loads correctly
- [ ] Authentication works

### Step 2: Run Production Deployment Script

```bash
# Still on Hetzner server in project directory
./scripts/deploy-hetzner.sh
```

### Expected Output

```
🚀 Starting deployment to Hetzner...
📥 Pulling latest code from git...
📋 Loading production environment variables...
🔍 Validating required environment variables...
✅ Environment variables validated
🔨 Building Docker image with environment variables...
✅ Build-time environment variables validated
🛑 Stopping old container...
▶️ Starting new container...
⏳ Waiting for container to start...
🏥 Performing health check...
✅ Production health check passed
✅ Checking container status...
🎉 Deployment successful! Container is running.
✨ Deployment complete!
Production is live at: https://ummahflow.com
```

### Step 3: Verify Production Deployment

#### Check Container Status
```bash
docker ps | grep uflow
```

Should show container running on port 3000 (not 3001).

#### Check Container Logs
```bash
docker logs uflow --tail 50
```

#### Test Health Endpoint
```bash
curl http://localhost:3000/api/health
curl https://ummahflow.com/api/health
```

### Step 4: Browser Testing on Production

1. Open browser to: https://ummahflow.com
2. Open DevTools (F12) → Console tab
3. Verify same checklist as UAT:
   - [ ] Page loads without blank screen
   - [ ] No "Missing NEXT_PUBLIC_*" errors
   - [ ] No Supabase client errors
   - [ ] Can navigate to /providers page
   - [ ] Provider listings load correctly
   - [ ] Authentication works
   - [ ] Existing user data loads properly

### Step 5: Smoke Tests

Run these quick tests on production:

1. **Home page**: https://ummahflow.com
   - Loads without errors
   - Hero section displays
   
2. **Providers listing**: https://ummahflow.com/providers
   - Provider cards display
   - Search works
   - Categories filter works
   
3. **Authentication**: https://ummahflow.com/login
   - Login page loads
   - Can attempt login (don't need to complete)
   
4. **Provider detail**: Click any provider card
   - Detail modal/page opens
   - Provider information displays
   - No console errors

## Rollback Procedure

If production deployment fails or has issues:

### Quick Rollback

```bash
# Stop the broken container
docker stop uflow
docker rm uflow

# Find the previous working image
docker images | grep uflow

# Run the previous image
docker run -d \
  --name uflow \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  uflow:[previous-tag-or-id]
```

### Full Rollback

```bash
# Revert to previous git commit
git log --oneline  # Find the last working commit
git checkout [commit-hash]

# Redeploy
./scripts/deploy-hetzner.sh
```

## Post-Deployment Monitoring

### Monitor Container Health

```bash
# Watch container status
watch -n 5 'docker ps | grep uflow'

# Follow logs in real-time
docker logs -f uflow
```

### Monitor Application Logs

Check for errors in the application:
```bash
# Last 100 lines
docker logs uflow --tail 100

# Follow new logs
docker logs -f uflow
```

### Monitor Nginx Access

```bash
# Production traffic
sudo tail -f /var/log/nginx/access.log | grep ummahflow.com

# UAT traffic
sudo tail -f /var/log/nginx/access.log | grep uat.ummahflow.com
```

## Common Issues and Solutions

### Issue: "Missing NEXT_PUBLIC_*" in browser console

**Root cause**: Environment variables not embedded during build

**Solution**:
1. Verify `.env.production` has correct values
2. Rebuild with deployment script (it passes build args)
3. Don't use `docker build` directly without `--build-arg`

### Issue: Container exits immediately after starting

**Solution**:
```bash
# Check exit reason
docker logs uflow

# Common causes:
# - Port 3000 already in use
# - Invalid Node.js code (syntax error)
# - Missing dependencies
```

### Issue: Nginx shows 502 Bad Gateway

**Solution**:
```bash
# Verify container is running
docker ps | grep uflow

# Verify container is listening on correct port
docker exec uflow netstat -tlnp | grep 3000

# Check Nginx upstream config
sudo nginx -t
```

### Issue: Supabase "Invalid API key" errors

**Solution**:
1. Verify anon key matches the Supabase URL (same project)
2. Check for extra spaces in `.env.production`
3. Get fresh keys from Supabase Dashboard
4. Rebuild and redeploy

## Environment Variable Quick Reference

### Production (.env.production)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[prod-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]       # sb_publishable_... (new) or eyJ... (legacy)
NEXT_PUBLIC_SITE_URL=https://ummahflow.com
SUPABASE_SERVICE_ROLE_KEY=[prod-service-key]         # sb_secret_... (new) or eyJ... (legacy)
```

### UAT (.env.uat)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[uat-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[uat-anon-key]         # sb_publishable_... (new) or eyJ... (legacy)
NEXT_PUBLIC_SITE_URL=https://uat.ummahflow.com
SUPABASE_SERVICE_ROLE_KEY=[uat-service-key]          # sb_secret_... (new) or eyJ... (legacy)
```

## Success Criteria

Deployment is successful when:

- [x] Both UAT and production containers running
- [x] Health endpoints return 200 OK
- [x] Home pages load without errors
- [x] Provider listings display correctly
- [x] No Supabase client errors in browser console
- [x] Authentication pages accessible
- [x] No "Missing NEXT_PUBLIC_*" errors
- [x] Container logs show no errors

## Support

If issues persist after following this guide:

1. Check container logs: `docker logs uflow --tail 100`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify Supabase credentials in dashboard
4. Compare working UAT config with broken production config
5. Try the rollback procedure

## Next Steps After Successful Deployment

1. Monitor application for 24 hours
2. Check analytics/error tracking (if configured)
3. Verify all features working as expected
4. Update team that deployment is complete
5. Schedule regular health checks

