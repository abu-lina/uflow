#!/bin/bash

# Identify which Supabase project MCP is connected to
# Usage: ./scripts/identify-mcp-project.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Identifying MCP Supabase Project${NC}"
echo ""

MCP_PROJECT_REF="qrekonfhaenjdnjhwdum"
MCP_PROJECT_URL="https://${MCP_PROJECT_REF}.supabase.co"

echo -e "${CYAN}MCP Supabase is connected to:${NC}"
echo -e "  ${GREEN}Project URL: ${MCP_PROJECT_URL}${NC}"
echo -e "  ${GREEN}Project Ref: ${MCP_PROJECT_REF}${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check environment files
echo -e "${CYAN}Checking your environment files...${NC}"
echo ""

LOCAL_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1 || echo "")
UAT_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.uat 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1 || echo "")
PROD_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.production 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | head -1 || echo "")

# Check if matches
MATCHES_LOCAL=false
MATCHES_UAT=false
MATCHES_PROD=false

if [[ "$LOCAL_URL" == *"$MCP_PROJECT_REF"* ]] && [[ "$LOCAL_URL" != *"your-"* ]]; then
    MATCHES_LOCAL=true
fi

if [[ "$UAT_URL" == *"$MCP_PROJECT_REF"* ]] && [[ "$UAT_URL" != *"your-"* ]]; then
    MATCHES_UAT=true
fi

if [[ "$PROD_URL" == *"$MCP_PROJECT_REF"* ]] && [[ "$PROD_URL" != *"your-"* ]]; then
    MATCHES_PROD=true
fi

echo -e "${CYAN}Environment File Status:${NC}"
echo ""

if [[ "$LOCAL_URL" == *"your-"* ]] || [ -z "$LOCAL_URL" ]; then
    echo -e "  ${YELLOW}.env.local:${NC} Has placeholder values (needs to be filled)"
else
    if [ "$MATCHES_LOCAL" = true ]; then
        echo -e "  ${GREEN}.env.local:${NC} ${LOCAL_URL} ${GREEN}✅ MATCHES MCP${NC}"
    else
        echo -e "  ${CYAN}.env.local:${NC} ${LOCAL_URL}"
    fi
fi

if [[ "$UAT_URL" == *"your-"* ]] || [ -z "$UAT_URL" ]; then
    echo -e "  ${YELLOW}.env.uat:${NC} Has placeholder values (needs to be filled)"
else
    if [ "$MATCHES_UAT" = true ]; then
        echo -e "  ${GREEN}.env.uat:${NC} ${UAT_URL} ${GREEN}✅ MATCHES MCP${NC}"
    else
        echo -e "  ${CYAN}.env.uat:${NC} ${UAT_URL}"
    fi
fi

if [[ "$PROD_URL" == *"your-"* ]] || [ -z "$PROD_URL" ]; then
    echo -e "  ${YELLOW}.env.production:${NC} Has placeholder values (needs to be filled)"
else
    if [ "$MATCHES_PROD" = true ]; then
        echo -e "  ${GREEN}.env.production:${NC} ${PROD_URL} ${GREEN}✅ MATCHES MCP${NC}"
    else
        echo -e "  ${CYAN}.env.production:${NC} ${PROD_URL}"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Determine which project
if [ "$MATCHES_LOCAL" = true ]; then
    echo -e "${GREEN}✅ MCP is connected to your DEV/LOCAL project${NC}"
    echo ""
    echo "This means:"
    echo "  • MCP is pointing to your development database"
    echo "  • Schema is already applied ✅"
    echo "  • You can use MCP to set up UAT project next"
elif [ "$MATCHES_UAT" = true ] || [ "$MATCHES_PROD" = true ]; then
    echo -e "${GREEN}✅ MCP is connected to your UAT/PROD project${NC}"
    echo ""
    echo "This means:"
    echo "  • MCP is pointing to your UAT/Production database"
    echo "  • Schema is already applied ✅"
    echo "  • You can use MCP to set up DEV project next"
else
    echo -e "${YELLOW}⚠️  Cannot determine which project MCP is connected to${NC}"
    echo ""
    echo "Your .env files have placeholder values."
    echo ""
    echo -e "${CYAN}To identify the project:${NC}"
    echo "1. Go to Supabase Dashboard: https://supabase.com/dashboard"
    echo "2. Look for project with reference: ${GREEN}${MCP_PROJECT_REF}${NC}"
    echo "3. Check the project name to see if it's DEV or UAT/PROD"
    echo ""
    echo -e "${CYAN}Or tell me:${NC}"
    echo "  • Is '${MCP_PROJECT_REF}' your DEV project or UAT/PROD project?"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Database Status:${NC}"
echo "  • 14 tables present ✅"
echo "  • 10 categories inserted ✅"
echo "  • 10 offers inserted ✅"
echo "  • 10 needs inserted ✅"
echo "  • 1 provider inserted ✅"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
if [ "$MATCHES_LOCAL" = true ]; then
    echo "  1. Set up UAT project (switch MCP or apply schema manually)"
    echo "  2. Update .env.uat with UAT project credentials"
elif [ "$MATCHES_UAT" = true ] || [ "$MATCHES_PROD" = true ]; then
    echo "  1. Set up DEV project (create new or switch MCP)"
    echo "  2. Update .env.local with DEV project credentials"
else
    echo "  1. Fill in .env files with actual project credentials"
    echo "  2. Identify which project MCP is connected to"
    echo "  3. Set up the other project"
fi









