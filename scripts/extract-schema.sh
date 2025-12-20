#!/bin/bash

# Extract complete database schema from Supabase
# This script uses pg_dump to get the actual schema from your Supabase database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Supabase Schema Extraction Tool${NC}"
echo ""

# Check if pg_dump is installed
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump is not installed${NC}"
    echo ""
    echo "Install PostgreSQL client tools:"
    echo "  macOS:   brew install postgresql"
    echo "  Ubuntu:  sudo apt-get install postgresql-client"
    echo "  Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Get connection details
echo -e "${YELLOW}Enter your Supabase project details:${NC}"
echo ""

# Get project reference
read -p "Supabase Project Reference (from URL: https://supabase.com/dashboard/project/[THIS]): " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Project reference is required${NC}"
    exit 1
fi

# Get database password
echo ""
echo -e "${YELLOW}Database Password:${NC}"
echo "Find it in: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
read -sp "Password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Database password is required${NC}"
    exit 1
fi

# Build connection string
# Use connection pooler port (6543) which is more reliable for external connections
DB_HOST="${PROJECT_REF}.supabase.co"
DB_USER="postgres.${PROJECT_REF}"
DB_NAME="postgres"
DB_PORT="6543"  # Connection pooler port (more reliable than direct 5432)

CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?pgbouncer=true"

# Output file
OUTPUT_FILE="supabase-schema-complete-$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo -e "${BLUE}🔍 Extracting schema...${NC}"
echo ""
echo -e "${YELLOW}Note: Using connection pooler (port 6543) for better reliability${NC}"
echo ""

# Extract schema only (no data)
# Try connection pooler first (port 6543)
pg_dump "$CONNECTION_STRING" \
  --schema-only \
  --schema=public \
  --schema=auth \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --clean \
  --if-exists \
  -f "$OUTPUT_FILE" 2>&1 | tee /tmp/pg_dump_output.log

# If that fails, try direct connection
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Connection pooler failed, trying direct connection...${NC}"
    echo ""
    
    DB_PORT="5432"
    CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    
    pg_dump "$CONNECTION_STRING" \
      --schema-only \
      --schema=public \
      --schema=auth \
      --no-owner \
      --no-privileges \
      --no-tablespaces \
      --clean \
      --if-exists \
      -f "$OUTPUT_FILE"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Schema extracted successfully!${NC}"
    echo -e "${YELLOW}📄 Output file: ${OUTPUT_FILE}${NC}"
    echo ""
    echo "This file contains:"
    echo "  - All tables in public and auth schemas"
    echo "  - All indexes"
    echo "  - All functions"
    echo "  - All triggers"
    echo "  - All RLS policies"
    echo "  - All enums"
    echo ""
    echo "You can now apply this to your UAT database."
else
    echo ""
    echo -e "${RED}❌ Schema extraction failed${NC}"
    echo "Check your credentials and network connection."
    exit 1
fi














