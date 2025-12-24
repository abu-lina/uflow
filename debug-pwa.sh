#!/bin/bash

# PWA Debug Script
# Run this on your Hetzner server to diagnose PWA issues

echo "=========================================="
echo "PWA Service Worker Debugging"
echo "=========================================="
echo ""

echo "1. Checking UAT container environment..."
echo "----------------------------------------"
docker exec uflow-uat env | grep -E "(NODE_ENV|DISABLE_PWA|NEXT_PUBLIC_SITE_URL)" || echo "UAT container not found or not running"
echo ""

echo "2. Checking Production container environment..."
echo "----------------------------------------"
docker exec uflow-app env | grep -E "(NODE_ENV|DISABLE_PWA|NEXT_PUBLIC_SITE_URL)" || echo "Production container not found or not running"
echo ""

echo "3. Checking if service worker exists in UAT container..."
echo "----------------------------------------"
docker exec uflow-uat ls -lh /app/public/sw.js 2>&1 || echo "Service worker not found in UAT"
echo ""

echo "4. Checking if service worker exists in Production container..."
echo "----------------------------------------"
docker exec uflow-app ls -lh /app/public/sw.js 2>&1 || echo "Service worker not found in Production"
echo ""

echo "5. Testing UAT service worker endpoint..."
echo "----------------------------------------"
curl -I https://uat.ummahflow.com/sw.js 2>&1 | head -10
echo ""

echo "6. Testing Production service worker endpoint..."
echo "----------------------------------------"
curl -I https://ummahflow.com/sw.js 2>&1 | head -10
echo ""

echo "7. Checking UAT manifest..."
echo "----------------------------------------"
curl -s https://uat.ummahflow.com/api/manifest | jq '{display, start_url, scope, icons: .icons | length}'
echo ""

echo "8. Checking Production manifest..."
echo "----------------------------------------"
curl -s https://ummahflow.com/api/manifest | jq '{display, start_url, scope, icons: .icons | length}'
echo ""

echo "9. Checking UAT container logs (last 20 lines)..."
echo "----------------------------------------"
docker logs uflow-uat --tail 20 2>&1 | grep -iE "(error|warn|pwa|service|worker)" || echo "No relevant logs found"
echo ""

echo "10. Checking Production container logs (last 20 lines)..."
echo "----------------------------------------"
docker logs uflow-app --tail 20 2>&1 | grep -iE "(error|warn|pwa|service|worker)" || echo "No relevant logs found"
echo ""

echo "=========================================="
echo "Debug Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. If DISABLE_PWA is not 'false', the build needs to be redeployed"
echo "2. If service worker doesn't exist in container, rebuild is needed"
echo "3. If service worker exists but endpoint returns 404, check nginx config"
echo "4. Share this output for further debugging"

