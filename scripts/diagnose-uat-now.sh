#!/bin/bash

# Quick diagnostic for UAT static files
# Run this on the Hetzner server to confirm the issue

echo "🔍 Quick UAT Diagnostic"
echo "======================="
echo ""

echo "1. Container Status:"
docker ps | grep uflow-uat && echo "✅ Running" || echo "❌ Not running"
echo ""

echo "2. Static Files Check:"
FILE_COUNT=$(docker exec uflow-uat find .next/static -type f 2>/dev/null | wc -l) || FILE_COUNT=0
echo "Found $FILE_COUNT static files"
if [ "$FILE_COUNT" -gt 50 ]; then
    echo "✅ Static files present"
elif [ "$FILE_COUNT" -gt 0 ]; then
    echo "⚠️  Few static files ($FILE_COUNT found, expected 50+)"
else
    echo "❌ No static files - THIS IS THE PROBLEM"
fi
echo ""

echo "3. Sample Static Files:"
docker exec uflow-uat find .next/static -name "*.css" -o -name "*.js" 2>/dev/null | head -5
echo ""

echo "4. Container Health:"
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null | grep -o "healthy" || echo "failed")
if [ "$HEALTH" = "healthy" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi
echo ""

echo "5. Public Access:"
PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://uat.ummahflow.com/api/health 2>/dev/null || echo "000")
echo "HTTPS endpoint returned: $PUBLIC_STATUS"
if [ "$PUBLIC_STATUS" = "200" ]; then
    echo "✅ Publicly accessible"
else
    echo "⚠️  Check nginx/SSL configuration"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FILE_COUNT" -lt 10 ]; then
    echo "❌ ISSUE CONFIRMED: Static files missing"
    echo ""
    echo "Fix: Run ./scripts/fix-uat-static-files.sh"
else
    echo "✅ Static files present"
    echo ""
    echo "If you still see 404 errors:"
    echo "  - Clear browser cache"
    echo "  - Check nginx logs: sudo tail /var/log/nginx/error.log"
fi

