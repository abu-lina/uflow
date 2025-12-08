#!/bin/bash

# Purge Cloudflare cache for ummahflow.com and uat.ummahflow.com
# This script uses the Cloudflare API to clear cached content

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}☁️  Cloudflare Cache Purge Script${NC}"
echo ""

# Check if Cloudflare credentials are set
if [ -z "$CLOUDFLARE_API_TOKEN" ] && [ -z "$CLOUDFLARE_EMAIL" ]; then
    echo -e "${YELLOW}⚠️  Cloudflare credentials not found in environment${NC}"
    echo ""
    echo "This script needs Cloudflare API credentials."
    echo ""
    echo "Option 1: Use API Token (Recommended)"
    echo "  1. Go to: https://dash.cloudflare.com/profile/api-tokens"
    echo "  2. Create token with 'Zone.Cache Purge' permission"
    echo "  3. Export: export CLOUDFLARE_API_TOKEN='your-token'"
    echo ""
    echo "Option 2: Use Global API Key"
    echo "  1. Go to: https://dash.cloudflare.com/profile/api-tokens"
    echo "  2. Get your Global API Key"
    echo "  3. Export:"
    echo "     export CLOUDFLARE_EMAIL='your-email@example.com'"
    echo "     export CLOUDFLARE_API_KEY='your-global-api-key'"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Zone IDs for ummahflow.com
# These need to be looked up from Cloudflare API
ZONE_ID_PRODUCTION=""
ZONE_ID_UAT=""

# Function to get zone ID from domain
get_zone_id() {
    local domain=$1
    
    if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
        # Using API Token
        curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${domain}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" | \
            grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4
    else
        # Using Email + Global API Key
        curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${domain}" \
            -H "X-Auth-Email: ${CLOUDFLARE_EMAIL}" \
            -H "X-Auth-Key: ${CLOUDFLARE_API_KEY}" \
            -H "Content-Type: application/json" | \
            grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4
    fi
}

# Function to purge cache
purge_cache() {
    local zone_id=$1
    local domain=$2
    local purge_type=${3:-"everything"} # "everything" or "urls"
    local urls=${4:-""}
    
    echo -e "${BLUE}Purging cache for ${domain}...${NC}"
    
    if [ "$purge_type" = "everything" ]; then
        # Purge everything
        if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
            response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/purge_cache" \
                -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
                -H "Content-Type: application/json" \
                --data '{"purge_everything":true}')
        else
            response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/purge_cache" \
                -H "X-Auth-Email: ${CLOUDFLARE_EMAIL}" \
                -H "X-Auth-Key: ${CLOUDFLARE_API_KEY}" \
                -H "Content-Type: application/json" \
                --data '{"purge_everything":true}')
        fi
    else
        # Purge specific URLs
        if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
            response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/purge_cache" \
                -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
                -H "Content-Type: application/json" \
                --data "{\"files\":${urls}}")
        else
            response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/purge_cache" \
                -H "X-Auth-Email: ${CLOUDFLARE_EMAIL}" \
                -H "X-Auth-Key: ${CLOUDFLARE_API_KEY}" \
                -H "Content-Type: application/json" \
                --data "{\"files\":${urls}}")
        fi
    fi
    
    # Check if successful
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Cache purged successfully for ${domain}${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to purge cache for ${domain}${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Get zone IDs
echo -e "${BLUE}Looking up zone IDs...${NC}"

ZONE_ID_PRODUCTION=$(get_zone_id "ummahflow.com")
if [ -z "$ZONE_ID_PRODUCTION" ]; then
    echo -e "${RED}❌ Could not find zone ID for ummahflow.com${NC}"
    echo "Please check your Cloudflare credentials and domain setup."
    exit 1
fi
echo -e "${GREEN}✅ Found zone ID for ummahflow.com: ${ZONE_ID_PRODUCTION}${NC}"

# UAT uses the same zone (subdomain)
ZONE_ID_UAT="$ZONE_ID_PRODUCTION"
echo -e "${GREEN}✅ Using same zone for uat.ummahflow.com${NC}"

echo ""

# Ask what to purge
echo "What would you like to purge?"
echo "  1) Everything (all cached content)"
echo "  2) Only static files (_next/static/*)"
echo "  3) Both production and UAT static files"
read -p "Enter choice [1-3] (default: 3): " choice
choice=${choice:-3}

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Purging ALL cached content...${NC}"
        purge_cache "$ZONE_ID_PRODUCTION" "ummahflow.com" "everything"
        ;;
    2)
        echo ""
        echo -e "${YELLOW}Purging static files for production...${NC}"
        STATIC_URLS='["https://ummahflow.com/_next/static/*"]'
        purge_cache "$ZONE_ID_PRODUCTION" "ummahflow.com" "urls" "$STATIC_URLS"
        ;;
    3)
        echo ""
        echo -e "${YELLOW}Purging static files for both production and UAT...${NC}"
        STATIC_URLS='[
            "https://ummahflow.com/_next/static/*",
            "https://uat.ummahflow.com/_next/static/*"
        ]'
        purge_cache "$ZONE_ID_PRODUCTION" "ummahflow.com and uat.ummahflow.com" "urls" "$STATIC_URLS"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Cache purge complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Wait 10-30 seconds for changes to propagate"
echo "  2. Clear your browser cache (Ctrl+Shift+Delete)"
echo "  3. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)"
echo "  4. Test the site - MIME type errors should be gone"
echo ""



