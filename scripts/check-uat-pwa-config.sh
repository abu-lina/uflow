#!/bin/bash

# UAT PWA Configuration Check Script
# Run this on the Hetzner server to verify PWA settings

set -e

echo "======================================"
echo "UAT PWA Configuration Check"
echo "======================================"
echo ""

# Check if container is running
echo "1. Checking if UAT container is running..."
if docker ps | grep -q "uflow-uat"; then
    echo "✅ UAT container is running"
else
    echo "❌ UAT container is NOT running"
    exit 1
fi

echo ""
echo "2. Checking DISABLE_PWA environment variable..."
DISABLE_PWA=$(docker exec uflow-uat env | grep DISABLE_PWA || echo "NOT_SET")
echo "   $DISABLE_PWA"

if echo "$DISABLE_PWA" | grep -q "DISABLE_PWA=false"; then
    echo "✅ PWA is enabled (DISABLE_PWA=false)"
elif echo "$DISABLE_PWA" | grep -q "NOT_SET"; then
    echo "⚠️  DISABLE_PWA not set (defaults may apply)"
else
    echo "❌ PWA is disabled or misconfigured"
fi

echo ""
echo "3. Checking if service worker exists in container..."
if docker exec uflow-uat ls /app/public/sw.js > /dev/null 2>&1; then
    SIZE=$(docker exec uflow-uat stat -c%s /app/public/sw.js 2>/dev/null || docker exec uflow-uat stat -f%z /app/public/sw.js 2>/dev/null)
    echo "✅ Service worker exists: $(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo ${SIZE} bytes)"
else
    echo "❌ Service worker NOT found in container"
fi

echo ""
echo "4. Checking NEXT_PUBLIC_SITE_URL..."
SITE_URL=$(docker exec uflow-uat env | grep NEXT_PUBLIC_SITE_URL || echo "NOT_SET")
echo "   $SITE_URL"

if echo "$SITE_URL" | grep -q "uat.ummahflow.com"; then
    echo "✅ Correct UAT site URL"
else
    echo "⚠️  Site URL might be incorrect for UAT"
fi

echo ""
echo "5. Checking NODE_ENV..."
NODE_ENV=$(docker exec uflow-uat env | grep NODE_ENV || echo "NOT_SET")
echo "   $NODE_ENV"

echo ""
echo "======================================"
echo "External Checks (from outside container)"
echo "======================================"
echo ""

echo "6. Checking service worker accessibility..."
SW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://uat.ummahflow.com/sw.js)
if [ "$SW_STATUS" = "200" ]; then
    echo "✅ Service worker accessible (HTTP $SW_STATUS)"
else
    echo "❌ Service worker not accessible (HTTP $SW_STATUS)"
fi

echo ""
echo "7. Checking manifest accessibility..."
MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://uat.ummahflow.com/api/manifest)
if [ "$MANIFEST_STATUS" = "200" ]; then
    echo "✅ Manifest accessible (HTTP $MANIFEST_STATUS)"
else
    echo "❌ Manifest not accessible (HTTP $MANIFEST_STATUS)"
fi

echo ""
echo "8. Checking Cloudflare caching status..."
CF_CACHE=$(curl -s -I https://uat.ummahflow.com/sw.js | grep -i "cf-cache-status" || echo "UNKNOWN")
echo "   $CF_CACHE"

if echo "$CF_CACHE" | grep -q "DYNAMIC"; then
    echo "✅ Service worker is NOT being cached (DYNAMIC)"
elif echo "$CF_CACHE" | grep -q "HIT"; then
    echo "❌ Service worker IS being cached - needs Page Rule fix"
else
    echo "⚠️  Could not determine cache status"
fi

echo ""
echo "======================================"
echo "Summary"
echo "======================================"
echo ""
echo "If all checks pass, the issue might be:"
echo "1. iOS Safari cached the 'not a PWA' state - clear Safari data completely"
echo "2. Service worker registered AFTER 'Add to Home Screen' - wait 10s before adding"
echo "3. Old PWA installation on device - remove and reinstall"
echo ""
echo "To test properly on iOS:"
echo "1. Remove existing PWA from home screen"
echo "2. Settings → Safari → Clear History and Website Data"
echo "3. Close Safari completely"
echo "4. Wait 2 minutes"
echo "5. Open Safari and go to https://uat.ummahflow.com"
echo "6. Wait 10 seconds for service worker to register"
echo "7. Add to Home Screen"
echo "8. Launch from home screen"
echo ""

