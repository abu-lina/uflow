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

# The project ref the dev-supabase MCP server is configured for.
# This script never verifies a live connection; it only compares your
# env files against this configured ref.
MCP_PROJECT_REF="qrekonfhaenjdnjhwdum"
MCP_PROJECT_URL="https://${MCP_PROJECT_REF}.supabase.co"

echo -e "${CYAN}Configured MCP project ref (not verified live):${NC}"
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

if [ ! -f .env.local ]; then
    echo -e "  ${YELLOW}.env.local:${NC} File not found"
elif [[ "$LOCAL_URL" == *"your-"* ]] || [ -z "$LOCAL_URL" ]; then
    echo -e "  ${YELLOW}.env.local:${NC} Has placeholder values (needs to be filled)"
else
    if [ "$MATCHES_LOCAL" = true ]; then
        echo -e "  ${GREEN}.env.local:${NC} ${LOCAL_URL} ${GREEN}✅ MATCHES MCP${NC}"
    else
        echo -e "  ${CYAN}.env.local:${NC} ${LOCAL_URL}"
    fi
fi

if [ ! -f .env.uat ]; then
    echo -e "  ${YELLOW}.env.uat:${NC} File not found"
elif [[ "$UAT_URL" == *"your-"* ]] || [ -z "$UAT_URL" ]; then
    echo -e "  ${YELLOW}.env.uat:${NC} Has placeholder values (needs to be filled)"
else
    if [ "$MATCHES_UAT" = true ]; then
        echo -e "  ${GREEN}.env.uat:${NC} ${UAT_URL} ${GREEN}✅ MATCHES MCP${NC}"
    else
        echo -e "  ${CYAN}.env.uat:${NC} ${UAT_URL}"
    fi
fi

if [ ! -f .env.production ]; then
    echo -e "  ${YELLOW}.env.production:${NC} File not found"
elif [[ "$PROD_URL" == *"your-"* ]] || [ -z "$PROD_URL" ]; then
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
    echo -e "${GREEN}✅ Your .env.local matches the configured MCP project ref${NC}"
    echo ""
    echo "This means:"
    echo "  • .env.local and the MCP configuration point at the same project"
elif [ "$MATCHES_UAT" = true ] || [ "$MATCHES_PROD" = true ]; then
    echo -e "${GREEN}✅ Your UAT/PROD env file matches the configured MCP project ref${NC}"
    echo ""
    echo "This means:"
    echo "  • your UAT/PROD env and the MCP configuration point at the same project"
else
    echo -e "${YELLOW}⚠️  No .env file matches the configured MCP project ref${NC}"
    echo ""
    echo "No .env file points at the MCP project ref (${MCP_PROJECT_REF})."
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
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Verify both Supabase projects: ./scripts/verify-both-projects.sh"
echo "  2. Verify environment files:      ./scripts/verify-environments.sh"















