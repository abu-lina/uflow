# Deploy Now - Quick Steps

**You're ready to deploy!** Follow these steps on your Hetzner server.

## Prerequisites
- ✅ You're SSH'd into the server: `ssh root@91.98.207.106`
- ✅ Code fixes are already in place (deployment scripts updated)

## Step-by-Step Deployment

### 1. Find Your Project Directory

```bash
# Try common locations
cd /var/www/uflow || cd /root/uflow

# If neither works, find it:
find / -name "uflow" -type d 2>/dev/null | grep -E "(var/www|root)"
```

### 2. Verify Environment Files Exist

```bash
# Check if files exist
ls -la .env.production .env.uat

# If they exist, verify Supabase credentials are set
grep -c "NEXT_PUBLIC_SUPABASE_URL" .env.production
grep -c "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.production
```

**Expected**: Both commands should return `1` or higher.

**If files don't exist**: See [VERIFY_HETZNER_ENV.md](VERIFY_HETZNER_ENV.md) for how to create them.

### 3. Pull Latest Code (Includes Fixes)

```bash
git pull origin main
```

This pulls the updated deployment scripts that fix the Supabase issue.

### 4. Deploy to UAT First

```bash
./scripts/deploy-uat.sh
```

**Expected output**: You should see:
- ✅ Environment variables validated
- ✅ Build-time environment variables validated
- ✅ UAT health check passed
- ✅ UAT deployment complete!

### 5. Test UAT

```bash
# Check container is running
docker ps | grep uflow-uat

# Check logs
docker logs uflow-uat --tail 50

# Test health endpoint
curl http://localhost:3001/api/health
```

**Then test in browser**: https://uat.ummahflow.com
- ✅ Page should load (not blank)
- ✅ No console errors about missing Supabase variables
- ✅ Provider listings should work

### 6. If UAT Works, Deploy to Production

```bash
./scripts/deploy-hetzner.sh
```

**Expected output**: You should see:
- ✅ Environment variables validated
- ✅ Build-time environment variables validated
- ✅ Production health check passed
- ✅ Deployment successful!

### 7. Test Production

```bash
# Check container
docker ps | grep uflow

# Check logs
docker logs uflow --tail 50

# Test health
curl http://localhost:3000/api/health
```

**Then test in browser**: https://ummahflow.com
- ✅ Page should load correctly
- ✅ No console errors
- ✅ All features working

## Troubleshooting

### If Environment Files Are Missing

You need to create `.env.production` and `.env.uat` with your Supabase credentials:

```bash
# Create .env.production
nano .env.production
```

Add these variables (get values from Supabase Dashboard → Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[your-anon-key]...
SUPABASE_SERVICE_ROLE_KEY=eyJ[your-service-key]...
NEXT_PUBLIC_SITE_URL=https://ummahflow.com
```

```bash
# Create .env.uat
nano .env.uat
```

Add the same variables but with:
```
NEXT_PUBLIC_SITE_URL=https://uat.ummahflow.com
```

Then secure the files:
```bash
chmod 600 .env.production .env.uat
```

### If Build Fails

Check the error message. Common issues:
- Missing environment variables → Create `.env.production` or `.env.uat`
- Invalid Supabase URL format → Must be `https://*.supabase.co`
- Invalid anon key format → Must start with `eyJ`

### If Container Won't Start

```bash
# Check logs for errors
docker logs uflow-uat --tail 100
# or
docker logs uflow --tail 100
```

### If Health Check Fails

```bash
# Check if container is running
docker ps

# Check if port is in use
netstat -tlnp | grep -E "(3000|3001)"

# Restart container
docker restart uflow-uat  # or uflow for production
```

## Success Criteria

Deployment is successful when:

- ✅ Docker build completes without errors
- ✅ Container starts and stays running
- ✅ Health endpoint returns 200 OK
- ✅ Browser shows pages (not blank)
- ✅ No "Missing NEXT_PUBLIC_*" errors in console
- ✅ Supabase data loads correctly

## Quick Reference

- **Server IP**: `91.98.207.106`
- **SSH**: `ssh root@91.98.207.106`
- **Production**: https://ummahflow.com (port 3000)
- **UAT**: https://uat.ummahflow.com (port 3001)
- **Server Info**: See [HETZNER_SERVER_INFO.md](HETZNER_SERVER_INFO.md)

## Next Steps After Deployment

1. Monitor for 24 hours
2. Check container logs periodically
3. Verify all features working
4. Test authentication flows
5. Test provider listings and searches

---

**Ready?** Start with Step 1 above!



