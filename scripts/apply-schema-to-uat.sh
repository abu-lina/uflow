#!/bin/bash

# Apply extracted schema to UAT Supabase project
# This script applies a schema file to your UAT database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Apply Schema to UAT${NC}"
echo ""

# Check if schema file is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <schema-file.sql>${NC}"
    echo ""
    echo "Example:"
    echo "  $0 supabase-schema-complete-20250126_120000.sql"
    exit 1
fi

SCHEMA_FILE="$1"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found: ${SCHEMA_FILE}${NC}"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql is not installed${NC}"
    echo ""
    echo "Install PostgreSQL client tools:"
    echo "  macOS:   brew install postgresql"
    echo "  Ubuntu:  sudo apt-get install postgresql-client"
    exit 1
fi

# Get UAT connection details
echo -e "${YELLOW}Enter your UAT Supabase project details:${NC}"
echo ""

read -p "UAT Project Reference: " UAT_PROJECT_REF

if [ -z "$UAT_PROJECT_REF" ]; then
    echo -e "${RED}❌ Project reference is required${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Database Password:${NC}"
echo "Find it in: https://supabase.com/dashboard/project/${UAT_PROJECT_REF}/settings/database"
read -sp "Password: " UAT_DB_PASSWORD
echo ""

if [ -z "$UAT_DB_PASSWORD" ]; then
    echo -e "${RED}❌ Database password is required${NC}"
    exit 1
fi

# Build connection string
UAT_DB_HOST="${UAT_PROJECT_REF}.supabase.co"
UAT_DB_USER="postgres.${UAT_PROJECT_REF}"
UAT_DB_NAME="postgres"
UAT_DB_PORT="5432"

UAT_CONNECTION_STRING="postgresql://${UAT_DB_USER}:${UAT_DB_PASSWORD}@${UAT_DB_HOST}:${UAT_DB_PORT}/${UAT_DB_NAME}"

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will apply the schema to your UAT database${NC}"
echo -e "${YELLOW}   Make sure you're using the UAT project, not production!${NC}"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}📤 Applying schema to UAT...${NC}"
echo ""

# Apply schema
psql "$UAT_CONNECTION_STRING" -f "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Schema applied successfully to UAT!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Verify tables exist in UAT SQL Editor"
    echo "  2. Create test user accounts"
    echo "  3. Seed test data"
    echo "  4. Run performance tests"
else
    echo ""
    echo -e "${RED}❌ Schema application failed${NC}"
    echo "Check the error messages above."
    exit 1
fi








