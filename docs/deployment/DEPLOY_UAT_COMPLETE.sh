#!/bin/bash

# Complete UAT Deployment Script for Hetzner
# This script deploys UAT with linting disabled for faster builds

set -e  # Exit on error

echo "🚀 Starting UAT deployment..."

# 1. Navigate to project directory
cd /var/www/uflow

# 2. Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# 3. Temporarily disable linting for faster build
echo "⚙️  Temporarily disabling linting for faster build..."
sed -i.bak 's/ignoreDuringBuilds: false/ignoreDuringBuilds: true/' next.config.js

# 4. Verify linting is disabled
echo "✅ Verifying linting is disabled..."
grep "ignoreDuringBuilds" next.config.js

# 5. Stop and remove existing UAT container
echo "🛑 Stopping and removing old UAT container..."
docker stop uflow-uat 2>/dev/null || echo "No existing container to stop"
docker rm uflow-uat 2>/dev/null || echo "No existing container to remove"

# 6. Build Docker image
echo "🔨 Building UAT Docker image (this may take 5-10 minutes)..."
docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="https://rdtdtcfntopcxcigkqoq.supabase.co" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_uBW3lxrnOmqPI047jBmxtg_YFVDsr1q" \
    --build-arg NEXT_PUBLIC_SITE_URL="https://uat.ummahflow.com" \
    --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAAACBE1exDIzaWMau8" \
    --build-arg DISABLE_PWA=false \
    -t uflow-uat:latest \
    .

# 7. Restore linting configuration
echo "🔄 Restoring linting configuration..."
mv next.config.js.bak next.config.js || sed -i 's/ignoreDuringBuilds: true/ignoreDuringBuilds: false/' next.config.js

# 8. Start new UAT container
echo "🚀 Starting new UAT container..."
docker run -d -p 3001:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://rdtdtcfntopcxcigkqoq.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_uBW3lxrnOmqPI047jBmxtg_YFVDsr1q" \
  -e SUPABASE_SERVICE_ROLE_KEY="sb_secret_zz-UfIBWCufSI2rJ90edlw_ZFgj6it7" \
  -e NEXT_PUBLIC_SITE_URL="https://uat.ummahflow.com" \
  -e NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAAACBE1exDIzaWMau8" \
  -e TURNSTILE_SECRET_KEY="0x4AAAAAACBE1YbHK9pYB-pMMUdTBaPWiFM" \
  -e DISABLE_PWA=false \
  --name uflow-uat uflow-uat:latest

# 9. Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 5

# 10. Verify container is running
echo "✅ Verifying container status..."
docker ps | grep uflow-uat

# 11. Check environment variables
echo "🔍 Checking environment variables..."
docker exec uflow-uat env | grep -E "(DISABLE_PWA|NEXT_PUBLIC_SITE_URL|NODE_ENV)"

# 12. Check service worker exists
echo "🔍 Checking service worker file..."
docker exec uflow-uat ls -lh /app/public/sw.js

# 13. Check container logs
echo "📋 Container logs (last 20 lines):"
docker logs uflow-uat --tail 20

# 14. Test service worker endpoint
echo "🌐 Testing service worker endpoint..."
curl -I http://localhost:3001/sw.js | head -5

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test on browser: https://uat.ummahflow.com"
echo "2. Check DevTools → Application → Service Workers"
echo "3. Verify service worker is registered"
echo "4. Test PWA on iPhone (add to home screen, verify standalone mode)"

