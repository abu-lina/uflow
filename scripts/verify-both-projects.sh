#!/bin/bash

# Verify both DEV and UAT projects are set up correctly
# Usage: ./scripts/verify-both-projects.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verifying Both Projects${NC}"
echo ""

echo -e "${CYAN}MCP Configuration:${NC}"
echo "  • dev-supabase: qrekonfhaenjdnjhwdum (DEV)"
echo "  • uat-supabase: rdtdtcfntopcxcigkqoq (UAT)"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check environment files
echo -e "${CYAN}Environment Files Status:${NC}"
echo ""

LOCAL_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1 || echo "")
UAT_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.uat 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1 || echo "")
PROD_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.production 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1 || echo "")

DEV_REF="qrekonfhaenjdnjhwdum"
UAT_REF="rdtdtcfntopcxcigkqoq"

echo -e "${CYAN}Expected Configuration:${NC}"
echo "  • .env.local should use: ${GREEN}${DEV_REF}${NC}"
echo "  • .env.uat should use: ${GREEN}${UAT_REF}${NC}"
echo "  • .env.production should use: ${GREEN}${UAT_REF}${NC} (same as UAT)"
echo ""

if [[ "$LOCAL_URL" == *"$DEV_REF"* ]] && [[ "$LOCAL_URL" != *"your-"* ]]; then
    echo -e "  ${GREEN}✅ .env.local:${NC} Correctly configured for DEV"
else
    echo -e "  ${YELLOW}⚠️  .env.local:${NC} Needs to be updated with DEV credentials"
    echo "     Should contain: ${DEV_REF}"
fi

if [[ "$UAT_URL" == *"$UAT_REF"* ]] && [[ "$UAT_URL" != *"your-"* ]]; then
    echo -e "  ${GREEN}✅ .env.uat:${NC} Correctly configured for UAT"
else
    echo -e "  ${YELLOW}⚠️  .env.uat:${NC} Needs to be updated with UAT credentials"
    echo "     Should contain: ${UAT_REF}"
fi

if [[ "$PROD_URL" == *"$UAT_REF"* ]] && [[ "$PROD_URL" != *"your-"* ]]; then
    echo -e "  ${GREEN}✅ .env.production:${NC} Correctly configured (uses UAT project)"
else
    echo -e "  ${YELLOW}⚠️  .env.production:${NC} Needs to be updated with UAT credentials"
    echo "     Should contain: ${UAT_REF} (same as UAT)"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}Next Steps:${NC}"
echo ""
echo "1. Update .env.local with DEV project credentials:"
echo "   ${YELLOW}NEXT_PUBLIC_SUPABASE_URL=https://${DEV_REF}.supabase.co${NC}"
echo ""
echo "2. Update .env.uat with UAT project credentials:"
echo "   ${YELLOW}NEXT_PUBLIC_SUPABASE_URL=https://${UAT_REF}.supabase.co${NC}"
echo ""
echo "3. Update .env.production with UAT project credentials (same as UAT):"
echo "   ${YELLOW}NEXT_PUBLIC_SUPABASE_URL=https://${UAT_REF}.supabase.co${NC}"
echo ""
echo "4. Get API keys from Supabase Dashboard:"
echo "   • DEV: https://supabase.com/dashboard/project/${DEV_REF}/settings/api"
echo "   • UAT: https://supabase.com/dashboard/project/${UAT_REF}/settings/api"
echo ""
echo "5. Apply schema to UAT (if not already done):"
echo "   • Use MCP: Ask me to 'apply schema to UAT using MCP'"
echo "   • Or use SQL Editor in UAT dashboard"
echo ""




