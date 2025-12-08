#!/bin/bash

# Verify all 3 environments are properly configured
# Usage: ./scripts/verify-environments.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verifying Environment Setup${NC}"
echo ""

ERRORS=0

# Function to check env file
check_env_file() {
    local FILE=$1
    local NAME=$2
    
    if [ ! -f "$FILE" ]; then
        echo -e "${RED}❌ $NAME not found: $FILE${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    echo -e "${GREEN}✅ $NAME exists: $FILE${NC}"
    
    # Check for placeholder values
    PLACEHOLDER_COUNT=$(grep -c "your-.*-.*-here\|your-.*-project-ref" "$FILE" 2>/dev/null || echo "0")
    
    if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $NAME has placeholder values that need to be filled${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    # Extract Supabase URL
    SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" "$FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1)
    
    if [ -z "$SUPABASE_URL" ] || [[ "$SUPABASE_URL" == *"your-"* ]]; then
        echo -e "${YELLOW}⚠️  $NAME has invalid Supabase URL${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    echo -e "${GREEN}   Supabase URL: ${SUPABASE_URL}${NC}"
    return 0
}

# Check .env.local (DEV)
echo -e "${CYAN}Checking Local Development (.env.local)...${NC}"
check_env_file ".env.local" "Local Development"
LOCAL_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1 || echo "")
echo ""

# Check .env.uat (UAT)
echo -e "${CYAN}Checking UAT (.env.uat)...${NC}"
check_env_file ".env.uat" "UAT"
UAT_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.uat 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1 || echo "")
echo ""

# Check .env.production (Production)
echo -e "${CYAN}Checking Production (.env.production)...${NC}"
check_env_file ".env.production" "Production"
PROD_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.production 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1 || echo "")
echo ""

# Verify UAT and Production use same project
if [ -n "$UAT_URL" ] && [ -n "$PROD_URL" ] && [ "$UAT_URL" != "$PROD_URL" ]; then
    echo -e "${YELLOW}⚠️  UAT and Production use different Supabase projects${NC}"
    echo "   UAT URL:      $UAT_URL"
    echo "   Production URL: $PROD_URL"
    echo "   ${CYAN}Note: They should use the SAME project (as per your setup)${NC}"
    echo ""
fi

# Verify Local uses different project
if [ -n "$LOCAL_URL" ] && [ -n "$UAT_URL" ] && [ "$LOCAL_URL" = "$UAT_URL" ]; then
    echo -e "${YELLOW}⚠️  Local and UAT use the same Supabase project${NC}"
    echo "   ${CYAN}Note: Local should use DEV project, UAT should use UAT/PROD project${NC}"
    echo ""
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All environments are properly configured!${NC}"
    echo ""
    echo -e "${CYAN}Environment Summary:${NC}"
    echo "  • Local:       ${GREEN}$LOCAL_URL${NC}"
    echo "  • UAT:         ${GREEN}$UAT_URL${NC}"
    echo "  • Production:  ${GREEN}$PROD_URL${NC}"
    echo ""
    echo -e "${CYAN}Usage:${NC}"
    echo "  • Local dev:    ${CYAN}npm run dev${NC}"
    echo "  • UAT testing:  ${CYAN}npm run dev:uat${NC}"
    echo "  • Production:   ${CYAN}npm run build${NC}"
else
    echo -e "${RED}❌ Found $ERRORS issue(s) that need to be fixed${NC}"
    echo ""
    echo "Edit the .env files and replace placeholder values with your actual credentials:"
    echo "  ${CYAN}nano .env.local${NC}"
    echo "  ${CYAN}nano .env.uat${NC}"
    echo "  ${CYAN}nano .env.production${NC}"
    exit 1
fi









