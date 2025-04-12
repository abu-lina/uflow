#!/bin/bash

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}    EMERGENCY RLS SECURITY FIXER      ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo

echo -e "${YELLOW}This script will help you fix RLS security issues in your Supabase database.${NC}"
echo -e "${YELLOW}It will guide you through applying the SQL fixes and verifying they've been applied correctly.${NC}"
echo

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: PostgreSQL client (psql) is not installed or not in PATH.${NC}"
    echo "Please install PostgreSQL client tools or connect to Supabase SQL editor directly."
    echo
    echo -e "${YELLOW}Manual steps:${NC}"
    echo "1. Open the Supabase dashboard and go to the SQL editor"
    echo "2. Copy and paste the contents of VERIFY-AND-FIX-RLS.sql"
    echo "3. Run the script and verify RLS is enabled"
    echo
    exit 1
fi

# Ask for credentials
echo -e "${YELLOW}Please enter your Supabase database connection information:${NC}"
read -p "Database URL (e.g., db.abcdefghijkl.supabase.co): " DB_HOST
read -p "Database name (default: postgres): " DB_NAME
DB_NAME=${DB_NAME:-postgres}
read -p "Database port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}
read -p "Database user: " DB_USER
read -sp "Database password: " DB_PASSWORD
echo

echo
echo -e "${YELLOW}Checking RLS status...${NC}"
echo

# SQL to check RLS status
RLS_CHECK="SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'profiles'"

echo -e "${BLUE}Attempting to connect to database...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$RLS_CHECK" || {
    echo -e "${RED}Failed to connect to database.${NC}"
    echo "Please verify your connection information and try again."
    echo
    echo -e "${YELLOW}Alternative: Apply the SQL script manually:${NC}"
    echo "1. Open VERIFY-AND-FIX-RLS.sql in a text editor"
    echo "2. Run it in Supabase SQL editor"
    echo
    exit 1
}

echo
echo -e "${YELLOW}Do you want to apply the RLS fixes now? (y/n)${NC}"
read APPLY_FIX

if [[ $APPLY_FIX == "y" || $APPLY_FIX == "Y" ]]; then
    echo
    echo -e "${BLUE}Applying RLS fixes...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f VERIFY-AND-FIX-RLS.sql || {
        echo -e "${RED}Failed to apply RLS fixes.${NC}"
        echo "Please apply the fixes manually using the Supabase SQL editor."
        exit 1
    }
    
    echo
    echo -e "${GREEN}RLS fixes have been applied!${NC}"
    echo
    echo -e "${YELLOW}IMPORTANT: Verify the fix by:${NC}"
    echo "1. Going to your test page at http://localhost:3000/test-rls"
    echo "2. Running the tests - Anonymous Update should now FAIL (which is good!)"
    echo
    echo -e "${BLUE}If the Anonymous Update test still shows a security issue, contact your security team immediately.${NC}"
else
    echo
    echo -e "${YELLOW}No changes were made. Please apply the fixes manually:${NC}"
    echo "1. Open VERIFY-AND-FIX-RLS.sql in a text editor"
    echo "2. Run it in Supabase SQL editor"
    echo
fi

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}             COMPLETE                  ${NC}"
echo -e "${BLUE}=======================================${NC}" 