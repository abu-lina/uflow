#!/bin/bash

# Test UAT MIME Types After Cache Purge
# Run this after purging Cloudflare cache to verify the fix

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}   UAT MIME Type Verification Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Test CSS file
echo -e "${BLUE}1. Testing CSS File${NC}"
echo "   URL: https://uat.ummahflow.com/_next/static/css/8333b52689569ac6.css"

CSS_RESPONSE=$(curl -sI https://uat.ummahflow.com/_next/static/css/8333b52689569ac6.css 2>&1)
CSS_CONTENT_TYPE=$(echo "$CSS_RESPONSE" | grep -i "content-type:" | head -1 | cut -d':' -f2 | xargs)

if [[ "$CSS_CONTENT_TYPE" == *"text/css"* ]]; then
    echo -e "   ${GREEN}✅ PASS${NC} - Content-Type: $CSS_CONTENT_TYPE"
else
    echo -e "   ${RED}❌ FAIL${NC} - Content-Type: $CSS_CONTENT_TYPE"
    echo -e "   ${YELLOW}Expected: text/css; charset=utf-8${NC}"
fi
echo ""

# Test JS file
echo -e "${BLUE}2. Testing JavaScript File${NC}"
echo "   URL: https://uat.ummahflow.com/_next/static/chunks/vendors-00833fa6-e59f4a49f0e4d56f.js"

JS_RESPONSE=$(curl -sI https://uat.ummahflow.com/_next/static/chunks/vendors-00833fa6-e59f4a49f0e4d56f.js 2>&1)
JS_CONTENT_TYPE=$(echo "$JS_RESPONSE" | grep -i "content-type:" | head -1 | cut -d':' -f2 | xargs)

if [[ "$JS_CONTENT_TYPE" == *"application/javascript"* ]] || [[ "$JS_CONTENT_TYPE" == *"text/javascript"* ]]; then
    echo -e "   ${GREEN}✅ PASS${NC} - Content-Type: $JS_CONTENT_TYPE"
else
    echo -e "   ${RED}❌ FAIL${NC} - Content-Type: $JS_CONTENT_TYPE"
    echo -e "   ${YELLOW}Expected: application/javascript; charset=utf-8${NC}"
fi
echo ""

# Test another JS chunk
echo -e "${BLUE}3. Testing Another JavaScript Chunk${NC}"
echo "   URL: https://uat.ummahflow.com/_next/static/chunks/vendors-27161c75-24ea75fc8048c9de.js"

JS2_RESPONSE=$(curl -sI https://uat.ummahflow.com/_next/static/chunks/vendors-27161c75-24ea75fc8048c9de.js 2>&1)
JS2_CONTENT_TYPE=$(echo "$JS2_RESPONSE" | grep -i "content-type:" | head -1 | cut -d':' -f2 | xargs)

if [[ "$JS2_CONTENT_TYPE" == *"application/javascript"* ]] || [[ "$JS2_CONTENT_TYPE" == *"text/javascript"* ]]; then
    echo -e "   ${GREEN}✅ PASS${NC} - Content-Type: $JS2_CONTENT_TYPE"
else
    echo -e "   ${RED}❌ FAIL${NC} - Content-Type: $JS2_CONTENT_TYPE"
    echo -e "   ${YELLOW}Expected: application/javascript; charset=utf-8${NC}"
fi
echo ""

# Test Cache-Control headers
echo -e "${BLUE}4. Testing Cache-Control Headers${NC}"
CACHE_CONTROL=$(echo "$CSS_RESPONSE" | grep -i "cache-control:" | head -1 | cut -d':' -f2 | xargs)

if [[ "$CACHE_CONTROL" == *"public"* ]] && [[ "$CACHE_CONTROL" == *"immutable"* ]]; then
    echo -e "   ${GREEN}✅ PASS${NC} - Cache-Control: $CACHE_CONTROL"
else
    echo -e "   ${YELLOW}⚠️  WARNING${NC} - Cache-Control: $CACHE_CONTROL"
    echo -e "   ${YELLOW}Expected: public, immutable${NC}"
fi
echo ""

# Test server header
echo -e "${BLUE}5. Checking Server (Cloudflare)${NC}"
SERVER=$(echo "$CSS_RESPONSE" | grep -i "server:" | head -1 | cut -d':' -f2 | xargs)

if [[ "$SERVER" == *"cloudflare"* ]]; then
    echo -e "   ${GREEN}✅ PASS${NC} - Server: $SERVER"
    echo -e "   ${GREEN}Response is coming through Cloudflare${NC}"
else
    echo -e "   ${YELLOW}⚠️  INFO${NC} - Server: $SERVER"
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}   Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

if [[ "$CSS_CONTENT_TYPE" == *"text/css"* ]] && \
   [[ "$JS_CONTENT_TYPE" == *"javascript"* ]] && \
   [[ "$JS2_CONTENT_TYPE" == *"javascript"* ]]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "The MIME type issue is resolved."
    echo ""
    echo "Next steps:"
    echo "  1. Clear your browser cache"
    echo "  2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+F5 (Windows)"
    echo "  3. Visit https://uat.ummahflow.com"
    echo "  4. Check DevTools Console - no MIME errors should appear"
    echo ""
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Possible reasons:"
    echo "  1. Cloudflare cache not fully purged yet (wait 30 seconds)"
    echo "  2. Cache purge didn't include these specific files"
    echo "  3. Need to purge with 'Purge Everything' option"
    echo ""
    echo "Actions:"
    echo "  1. Wait 30 seconds and run this test again"
    echo "  2. Purge Cloudflare cache again (use 'Purge Everything')"
    echo "  3. Check: PURGE_CLOUDFLARE_NOW.md for instructions"
    echo ""
fi

echo -e "${BLUE}═══════════════════════════════════════════${NC}"



