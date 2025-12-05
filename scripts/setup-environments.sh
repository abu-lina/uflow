#!/bin/bash

# Setup script for 3 environments (local, UAT, production) with 2 Supabase projects
# Usage: ./scripts/setup-environments.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up 3 Environments (Local, UAT, Production)${NC}"
echo ""
echo -e "${CYAN}This will help you set up:${NC}"
echo "  • .env.local     → DEV Supabase project (personal development)"
echo "  • .env.uat       → UAT/PROD Supabase project (testing)"
echo "  • .env.production → UAT/PROD Supabase project (live production)"
echo ""

# Check if templates exist
if [ ! -f "env.local.template" ] || [ ! -f "env.uat.template" ] || [ ! -f "env.production.template" ]; then
    echo -e "${RED}❌ Template files not found${NC}"
    echo "Make sure env.local.template, env.uat.template, and env.production.template exist"
    exit 1
fi

# Setup .env.local
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
    read -p "Backup and recreate? (y/n): " RECREATE_LOCAL
    if [ "$RECREATE_LOCAL" = "y" ]; then
        cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
        cp env.local.template .env.local
        echo -e "${GREEN}✅ Created .env.local from template${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping .env.local${NC}"
    fi
else
    cp env.local.template .env.local
    echo -e "${GREEN}✅ Created .env.local from template${NC}"
fi

# Setup .env.uat
if [ -f ".env.uat" ]; then
    echo -e "${YELLOW}⚠️  .env.uat already exists${NC}"
    read -p "Backup and recreate? (y/n): " RECREATE_UAT
    if [ "$RECREATE_UAT" = "y" ]; then
        cp .env.uat .env.uat.backup.$(date +%Y%m%d_%H%M%S)
        cp env.uat.template .env.uat
        echo -e "${GREEN}✅ Created .env.uat from template${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping .env.uat${NC}"
    fi
else
    cp env.uat.template .env.uat
    echo -e "${GREEN}✅ Created .env.uat from template${NC}"
fi

# Setup .env.production
if [ -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production already exists${NC}"
    read -p "Backup and recreate? (y/n): " RECREATE_PROD
    if [ "$RECREATE_PROD" = "y" ]; then
        cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
        cp env.production.template .env.production
        echo -e "${GREEN}✅ Created .env.production from template${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping .env.production${NC}"
    fi
else
    cp env.production.template .env.production
    echo -e "${GREEN}✅ Created .env.production from template${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "1. Edit .env.local with your DEV Supabase project credentials:"
echo "   ${CYAN}nano .env.local${NC} (or use your preferred editor)"
echo ""
echo "2. Edit .env.uat with your UAT/PROD Supabase project credentials:"
echo "   ${CYAN}nano .env.uat${NC}"
echo ""
echo "3. Edit .env.production with your UAT/PROD Supabase project credentials:"
echo "   ${CYAN}nano .env.production${NC}"
echo "   ${YELLOW}Note: UAT and Production use the SAME Supabase project${NC}"
echo ""
echo "4. Verify setup:"
echo "   ${CYAN}./scripts/verify-environments.sh${NC}"
echo ""
echo -e "${GREEN}✅ Environment files created!${NC}"
echo ""
echo -e "${CYAN}Usage:${NC}"
echo "  • Local dev:    ${CYAN}npm run dev${NC} (uses .env.local)"
echo "  • UAT testing:  ${CYAN}npm run dev:uat${NC} (uses .env.uat)"
echo "  • Production:   ${CYAN}npm run build${NC} (uses .env.production)"







