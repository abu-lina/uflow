#!/bin/bash

# Update environment files with API keys from MCP Supabase
# Usage: ./scripts/update-env-with-mcp-keys.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔑 Updating Environment Files with MCP Keys${NC}"
echo ""

# Project references
DEV_REF="qrekonfhaenjdnjhwdum"
UAT_REF="rdtdtcfntopcxcigkqoq"

# DEV project credentials (from MCP)
DEV_URL="https://${DEV_REF}.supabase.co"
DEV_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZWtvbmZoYWVuamRuamh3ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxOTM0NDQsImV4cCI6MjA3OTc2OTQ0NH0.Z5c6UhofzCEPQJwsycwMhsYyxuqAgyqBF9R-oFMi8bc"

echo -e "${CYAN}DEV Project Credentials (from MCP):${NC}"
echo "  URL: ${DEV_URL}"
echo "  Anon Key: ${DEV_ANON_KEY:0:50}..."
echo ""

# Update .env.local
if [ -f ".env.local" ]; then
    echo -e "${BLUE}Updating .env.local...${NC}"
    
    # Backup
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update URL and anon key
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${DEV_URL}|g" .env.local
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${DEV_ANON_KEY}|g" .env.local
    
    echo -e "${GREEN}✅ .env.local updated${NC}"
    echo -e "${YELLOW}⚠️  Note: SUPABASE_SERVICE_ROLE_KEY needs to be added manually${NC}"
    echo "   Get it from: https://supabase.com/dashboard/project/${DEV_REF}/settings/api"
else
    echo -e "${YELLOW}⚠️  .env.local not found, creating from template...${NC}"
    cp env.local.template .env.local
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${DEV_URL}|g" .env.local
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${DEV_ANON_KEY}|g" .env.local
    echo -e "${GREEN}✅ .env.local created${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# UAT project
UAT_URL="https://${UAT_REF}.supabase.co"

echo -e "${CYAN}UAT Project:${NC}"
echo "  URL: ${UAT_URL}"
echo -e "${YELLOW}⚠️  UAT MCP server may not be properly connected${NC}"
echo "  Need to get UAT credentials manually from dashboard"
echo ""

# Update .env.uat
if [ -f ".env.uat" ]; then
    echo -e "${BLUE}Updating .env.uat...${NC}"
    
    # Backup
    cp .env.uat .env.uat.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update URL (anon key needs to be added manually)
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${UAT_URL}|g" .env.uat
    
    echo -e "${GREEN}✅ .env.uat URL updated${NC}"
    echo -e "${YELLOW}⚠️  Need to add:${NC}"
    echo "   • NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   • SUPABASE_SERVICE_ROLE_KEY"
    echo "   Get from: https://supabase.com/dashboard/project/${UAT_REF}/settings/api"
else
    echo -e "${YELLOW}⚠️  .env.uat not found${NC}"
fi

# Update .env.production
if [ -f ".env.production" ]; then
    echo -e "${BLUE}Updating .env.production...${NC}"
    
    # Backup
    cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update URL (same as UAT)
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${UAT_URL}|g" .env.production
    
    echo -e "${GREEN}✅ .env.production URL updated${NC}"
    echo -e "${YELLOW}⚠️  Need to add:${NC}"
    echo "   • NEXT_PUBLIC_SUPABASE_ANON_KEY (same as UAT)"
    echo "   • SUPABASE_SERVICE_ROLE_KEY (same as UAT)"
else
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Summary:${NC}"
echo ""
echo -e "${GREEN}✅ .env.local:${NC} Updated with DEV credentials"
echo -e "${YELLOW}⏳ .env.uat:${NC} URL updated, need to add API keys"
echo -e "${YELLOW}⏳ .env.production:${NC} URL updated, need to add API keys"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo ""
echo "1. Get UAT API keys from dashboard:"
echo "   ${BLUE}https://supabase.com/dashboard/project/${UAT_REF}/settings/api${NC}"
echo ""
echo "2. Add to .env.uat and .env.production:"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=[uat-anon-key]"
echo "   SUPABASE_SERVICE_ROLE_KEY=[uat-service-role-key]"
echo ""
echo "3. Add DEV service_role key to .env.local:"
echo "   SUPABASE_SERVICE_ROLE_KEY=[dev-service-role-key]"
echo "   Get from: ${BLUE}https://supabase.com/dashboard/project/${DEV_REF}/settings/api${NC}"
echo ""
echo "4. Verify setup:"
echo "   ${CYAN}./scripts/verify-environments.sh${NC}"







