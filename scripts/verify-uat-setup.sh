#!/bin/bash

# Verify UAT setup and diagnose issues
# Usage: ./scripts/verify-uat-setup.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verifying UAT Setup${NC}"
echo ""

# Check if .env.uat exists
if [ ! -f ".env.uat" ]; then
    echo -e "${RED}❌ .env.uat file not found${NC}"
    echo "Create it by: cp env.template .env.uat"
    exit 1
fi

echo -e "${GREEN}✅ .env.uat file exists${NC}"

# Check for placeholder values
PLACEHOLDER_COUNT=$(grep -c "your-project-ref\|your-anon-key\|your-service-role" .env.uat || true)

if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found placeholder values in .env.uat${NC}"
    echo ""
    echo "Please update these values with your actual UAT credentials:"
    echo ""
    grep -E "your-project-ref|your-anon-key|your-service-role" .env.uat || true
    echo ""
    echo "Get your credentials from:"
    echo "  1. UAT Supabase Dashboard → Settings → API"
    echo "  2. Copy Project URL, anon key, and service_role key"
    exit 1
fi

echo -e "${GREEN}✅ .env.uat has real credentials (no placeholders)${NC}"

# Extract UAT URL
UAT_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.uat | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')

if [ -z "$UAT_URL" ]; then
    echo -e "${RED}❌ Could not extract UAT URL from .env.uat${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 UAT Configuration:${NC}"
echo "  URL: ${UAT_URL}"
echo ""

# Check if .env.local matches .env.uat
if [ -f ".env.local" ]; then
    LOCAL_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' || echo "")
    
    if [ "$LOCAL_URL" = "$UAT_URL" ]; then
        echo -e "${GREEN}✅ .env.local matches .env.uat${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.local does NOT match .env.uat${NC}"
        echo "  Local URL: ${LOCAL_URL:-'not set'}"
        echo "  UAT URL:  ${UAT_URL}"
        echo ""
        echo "To switch to UAT, run:"
        echo "  ./scripts/switch-env.sh uat"
    fi
else
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo "Run: ./scripts/switch-env.sh uat"
fi

echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Verify database schema is applied in UAT Supabase"
echo "  2. Run: ./scripts/switch-env.sh uat"
echo "  3. Run: npm run dev"
echo "  4. Check browser console for detailed error messages"









