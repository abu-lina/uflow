#!/bin/bash

# Quick Cloudflare cache purge - one-liner style
# Usage: CLOUDFLARE_API_TOKEN='your-token' ./scripts/purge-cloudflare-quick.sh

set -e

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN not set"
    echo "Usage: CLOUDFLARE_API_TOKEN='your-token' $0"
    exit 1
fi

echo "☁️  Purging Cloudflare cache..."

# Get zone ID
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=ummahflow.com" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" | \
    grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ZONE_ID" ]; then
    echo "❌ Could not find zone ID"
    exit 1
fi

# Purge static files for both production and UAT
response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{
        "files": [
            "https://ummahflow.com/_next/static/*",
            "https://uat.ummahflow.com/_next/static/*"
        ]
    }')

if echo "$response" | grep -q '"success":true'; then
    echo "✅ Cache purged successfully!"
    echo "   Wait 10-30 seconds, then hard refresh your browser (Ctrl+F5)"
else
    echo "❌ Failed to purge cache"
    echo "$response"
    exit 1
fi









