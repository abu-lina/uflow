#!/bin/bash

# Switch between different environment configurations
# Usage: ./scripts/switch-env.sh [dev|uat|prod]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENV_TYPE="${1:-dev}"

if [ "$ENV_TYPE" != "dev" ] && [ "$ENV_TYPE" != "uat" ] && [ "$ENV_TYPE" != "prod" ]; then
    echo -e "${RED}❌ Invalid environment: ${ENV_TYPE}${NC}"
    echo ""
    echo "Usage: $0 [dev|uat|prod]"
    echo ""
    echo "Examples:"
    echo "  $0 dev   # Switch to development (.env.local)"
    echo "  $0 uat   # Switch to UAT (.env.uat)"
    echo "  $0 prod  # Switch to production (.env.production)"
    exit 1
fi

echo -e "${BLUE}🔄 Switching to ${ENV_TYPE} environment...${NC}"
echo ""

# Determine source and target files
case "$ENV_TYPE" in
    dev)
        SOURCE_FILE=".env.local"
        TARGET_FILE=".env.local"
        BACKUP_FILE=".env.local.backup"
        ;;
    uat)
        SOURCE_FILE=".env.uat"
        TARGET_FILE=".env.local"
        BACKUP_FILE=".env.local.backup"
        ;;
    prod)
        SOURCE_FILE=".env.production"
        TARGET_FILE=".env.local"
        BACKUP_FILE=".env.local.backup"
        ;;
esac

# Check if source file exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo -e "${RED}❌ Source file not found: ${SOURCE_FILE}${NC}"
    echo ""
    echo "Create it by copying env.template:"
    echo "  cp env.template ${SOURCE_FILE}"
    echo "  # Then edit ${SOURCE_FILE} with your credentials"
    exit 1
fi

# Backup current .env.local if it exists
if [ -f "$TARGET_FILE" ]; then
    echo -e "${YELLOW}📦 Backing up current .env.local...${NC}"
    cp "$TARGET_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup saved to ${BACKUP_FILE}${NC}"
fi

# Copy source to target
echo -e "${BLUE}📋 Copying ${SOURCE_FILE} to ${TARGET_FILE}...${NC}"
cp "$SOURCE_FILE" "$TARGET_FILE"

echo ""
echo -e "${GREEN}✅ Switched to ${ENV_TYPE} environment!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify environment variables are correct"
echo "  2. Run: npm run dev"
echo ""
echo "To switch back:"
echo "  mv ${BACKUP_FILE} ${TARGET_FILE}"















