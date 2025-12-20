# UAT Static Files Fix

## Issue Summary

The UAT environment at `https://uat.ummahflow.com` is experiencing:
1. **404 errors** on Next.js CSS files (`/_next/static/css/app/layout.css`)
2. **MIME type mismatch errors** on JavaScript files (empty MIME type despite nginx configuration)

## Root Cause

The issue stems from **missing static files in the Docker container**. While the Next.js standalone build completes, the static assets aren't being properly copied or generated within the Docker build process.

### Why This Happens

1. **Next.js Standalone Build Structure**: When Next.js builds with `output: 'standalone'`, it creates:
   - `.next/standalone/` - Server code and dependencies
   - `.next/static/` - Client-side assets (CSS, JS chunks, etc.)

2. **Docker Copy Issue**: The Dockerfile copies these directories, but if the build doesn't complete successfully or if there's a file tracing issue (as shown in the build warning), the static files may not exist.

3. **Nginx Can't Serve What Doesn't Exist**: Even though nginx is configured correctly to proxy requests and set MIME types, if the Next.js server (on port 3001) doesn't have the files, it returns 404 or empty responses.

## The Fix

### Updated Dockerfile

The updated Dockerfile now includes verification steps to ensure static files are present:

```dockerfile
# Verify build outputs exist
RUN echo "Verifying build outputs..." && \
    ls -la .next/ && \
    ls -la .next/static/ && \
    ls -la .next/standalone/

# Copy static files to the standalone directory structure
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Verify files are in place
RUN ls -la .next/static/ && \
    echo "Static files copied successfully"
```

### Fix Script

Run the automated fix script on the Hetzner server:

```bash
# SSH into Hetzner server
ssh root@your-hetzner-ip

# Navigate to project directory
cd /path/to/uflow

# Make script executable
chmod +x scripts/fix-uat-static-files.sh

# Run the fix
./scripts/fix-uat-static-files.sh
```

### What the Fix Script Does

1. **Diagnoses** the current state:
   - Checks if UAT container is running
   - Verifies static directory existence in container
   - Shows container logs

2. **Rebuilds** with verification:
   - Builds Docker image with `--no-cache` flag
   - Includes verification steps during build
   - Ensures static files are copied

3. **Redeploys** UAT:
   - Stops old container
   - Starts new container with fixed image
   - Runs health checks

4. **Verifies** the fix:
   - Counts static files in container
   - Tests health endpoint
   - Tests nginx proxy

## Manual Verification

### Check Files in Container

```bash
# List static directory
docker exec uflow-uat ls -la .next/static

# Count static files
docker exec uflow-uat find .next/static -type f | wc -l

# Show some file paths
docker exec uflow-uat find .next/static -type f | head -20
```

### Check Nginx Proxy

```bash
# Test direct container access
curl -I http://localhost:3001/api/health

# Test through nginx
curl -I https://uat.ummahflow.com/api/health

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Browser Testing

1. **Clear browser cache**:
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Firefox: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)

2. **Hard refresh**:
   - Chrome/Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
   - Edge: `Ctrl+F5`

3. **Check Developer Console**:
   - Open DevTools (F12)
   - Look for 404 errors or MIME type errors
   - Verify CSS and JS files load successfully

## Expected Results

After applying the fix:

✅ No 404 errors on CSS files
✅ No MIME type mismatch errors on JS files
✅ Static files visible in container: `docker exec uflow-uat ls -la .next/static`
✅ File count > 50: `docker exec uflow-uat find .next/static -type f | wc -l`
✅ Health check passes: `curl https://uat.ummahflow.com/api/health`
✅ Website loads correctly without console errors

## Alternative: Manual Rebuild

If the script doesn't work, manually rebuild:

```bash
# Load environment variables
export $(cat .env.uat | grep -v '^#' | xargs)

# Build without cache
docker build \
    --no-cache \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-arg NEXT_PUBLIC_SITE_URL="https://uat.ummahflow.com" \
    --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
    -t uflow-uat:latest \
    .

# Watch build output for verification messages
# Look for: "Verifying build outputs..." and "Static files copied successfully"

# Stop old container
docker stop uflow-uat && docker rm uflow-uat

# Start new container
docker run -d \
    --name uflow-uat \
    --restart unless-stopped \
    -p 3001:3000 \
    --env-file .env.uat \
    uflow-uat:latest

# Verify
docker exec uflow-uat ls -la .next/static
curl http://localhost:3001/api/health
```

## Troubleshooting

### If Static Files Still Missing

1. **Check build logs**:
   ```bash
   docker build ... 2>&1 | tee build.log
   grep -i "error\|warning" build.log
   ```

2. **Inspect builder stage**:
   ```bash
   # Build only the builder stage
   docker build --target builder -t uflow-builder .
   
   # Run and inspect
   docker run -it uflow-builder /bin/sh
   ls -la .next/static
   ```

3. **Check Next.js config**:
   - Verify `STANDALONE_BUILD=true` is set during build
   - Verify `output: 'standalone'` is configured in `next.config.js`

### If MIME Types Still Wrong

1. **Verify nginx config**:
   ```bash
   sudo nginx -t
   cat /etc/nginx/sites-available/uat-ummahflow | grep -A 5 "location.*\.js"
   ```

2. **Test nginx directly**:
   ```bash
   curl -I https://uat.ummahflow.com/_next/static/chunks/some-file.js
   # Should show: Content-Type: application/javascript; charset=utf-8
   ```

3. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

## Prevention

To prevent this issue in future deployments:

1. **Always build with verification**: The updated Dockerfile now includes checks
2. **Monitor build output**: Look for warnings about missing files
3. **Test static files**: Add to deployment checklist:
   ```bash
   docker exec uflow-uat find .next/static -type f | wc -l
   ```

## Related Files

- `Dockerfile` - Updated with verification steps
- `scripts/fix-uat-static-files.sh` - Automated fix script
- `scripts/deploy-uat.sh` - Standard UAT deployment (already includes health checks)
- `nginx-uat-template.conf` - Nginx configuration (already correct)

## Support

If issues persist:
1. Review container logs: `docker logs -f uflow-uat`
2. Check nginx error log: `sudo tail -f /var/log/nginx/error.log`
3. Verify environment variables: `docker exec uflow-uat env | grep NEXT_PUBLIC`
4. Test local build: `npm run build:standalone && ls -la .next/static`

