# Quick Fix for UAT Static Files Issue

## TL;DR

UAT is returning 404 errors on CSS/JS files because the Docker container is missing static assets.

## Fix in 3 Steps

### 1. Commit Updated Files (Local Machine)

```bash
# These files fix the issue:
git add Dockerfile scripts/fix-uat-static-files.sh
git commit -m "Fix: Add verification steps for static files in Docker build"
git push origin main
```

### 2. Pull and Run Fix (Hetzner Server)

```bash
# SSH into server
ssh root@your-hetzner-ip

# Pull latest changes
cd /path/to/uflow
git pull origin main

# Run automated fix
./scripts/fix-uat-static-files.sh
```

### 3. Verify in Browser

1. Clear browser cache: `Ctrl+Shift+Delete` or `Cmd+Shift+Delete`
2. Hard refresh: `Ctrl+F5` or `Cmd+Shift+R`
3. Check DevTools console - should have no 404 errors

## What's Fixed

✅ **Dockerfile**: Added verification steps to ensure static files are copied
✅ **Fix Script**: Automated script to rebuild and verify
✅ **Documentation**: Complete guide in `UAT_STATIC_FILES_FIX.md`

## Quick Checks

```bash
# Are static files in container?
docker exec uflow-uat find .next/static -type f | wc -l
# Should return > 50 files

# Is health check working?
curl https://uat.ummahflow.com/api/health
# Should return {"status":"healthy"}

# Any errors in container logs?
docker logs --tail 50 uflow-uat
```

## If Fix Script Fails

See detailed troubleshooting in `UAT_STATIC_FILES_FIX.md`

Or manually rebuild:

```bash
export $(cat .env.uat | grep -v '^#' | xargs)
docker build --no-cache \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-arg NEXT_PUBLIC_SITE_URL="https://uat.ummahflow.com" \
    -t uflow-uat:latest .
docker stop uflow-uat && docker rm uflow-uat
docker run -d --name uflow-uat --restart unless-stopped -p 3001:3000 --env-file .env.uat uflow-uat:latest
```

