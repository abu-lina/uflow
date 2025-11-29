#!/bin/bash

# Performance Testing Script
# Runs k6 performance tests and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/tests/performance/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Test environment
ENV=${ENV:-staging}
BASE_URL=${BASE_URL:-http://localhost:3000}

echo -e "${BLUE}🚀 Starting Performance Tests${NC}"
echo -e "${YELLOW}Environment: ${ENV}${NC}"
echo -e "${YELLOW}Base URL: ${BASE_URL}${NC}"
echo ""

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo "Install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    local scenario=${3:-default}
    
    echo -e "${BLUE}Running: ${test_name}${NC}"
    
    local report_file="${REPORTS_DIR}/${test_name}_${scenario}_${TIMESTAMP}.json"
    local summary_file="${REPORTS_DIR}/${test_name}_${scenario}_${TIMESTAMP}_summary.txt"
    
    # Run k6 test
    k6 run \
        --config "$SCRIPT_DIR/k6.config.js" \
        --env ENV="$ENV" \
        --env BASE_URL="$BASE_URL" \
        --out json="$report_file" \
        --summary-export="$summary_file" \
        "$test_file" || {
        echo -e "${RED}❌ Test failed: ${test_name}${NC}"
        return 1
    }
    
    echo -e "${GREEN}✅ Test completed: ${test_name}${NC}"
    echo -e "${YELLOW}Report: ${report_file}${NC}"
    echo ""
}

# Parse command line arguments
TEST_TYPE=${1:-all}
SCENARIO=${2:-baseline}

case $TEST_TYPE in
    auth)
        run_test "auth-flow" "$SCRIPT_DIR/auth-flow.js" "$SCENARIO"
        ;;
    browsing)
        run_test "browsing-flow" "$SCRIPT_DIR/browsing-flow.js" "$SCENARIO"
        ;;
    admin)
        run_test "admin-flow" "$SCRIPT_DIR/admin-flow.js" "$SCENARIO"
        ;;
    api)
        run_test "api-endpoints" "$SCRIPT_DIR/api-endpoints.js" "$SCENARIO"
        ;;
    scenarios)
        run_test "combined-scenarios" "$SCRIPT_DIR/scenarios.js" "$SCENARIO"
        ;;
    baseline)
        echo -e "${BLUE}Running baseline tests...${NC}"
        run_test "auth-flow" "$SCRIPT_DIR/auth-flow.js" "baseline"
        run_test "browsing-flow" "$SCRIPT_DIR/browsing-flow.js" "baseline"
        run_test "api-endpoints" "$SCRIPT_DIR/api-endpoints.js" "baseline"
        ;;
    load)
        echo -e "${BLUE}Running load tests...${NC}"
        run_test "combined-scenarios" "$SCRIPT_DIR/scenarios.js" "load"
        ;;
    stress)
        echo -e "${BLUE}Running stress tests...${NC}"
        run_test "combined-scenarios" "$SCRIPT_DIR/scenarios.js" "stress"
        ;;
    spike)
        echo -e "${BLUE}Running spike tests...${NC}"
        run_test "combined-scenarios" "$SCRIPT_DIR/scenarios.js" "spike"
        ;;
    all)
        echo -e "${BLUE}Running all tests...${NC}"
        run_test "auth-flow" "$SCRIPT_DIR/auth-flow.js" "$SCENARIO"
        run_test "browsing-flow" "$SCRIPT_DIR/browsing-flow.js" "$SCENARIO"
        run_test "admin-flow" "$SCRIPT_DIR/admin-flow.js" "$SCENARIO"
        run_test "api-endpoints" "$SCRIPT_DIR/api-endpoints.js" "$SCENARIO"
        run_test "combined-scenarios" "$SCRIPT_DIR/scenarios.js" "$SCENARIO"
        ;;
    *)
        echo -e "${RED}Unknown test type: ${TEST_TYPE}${NC}"
        echo "Usage: $0 [auth|browsing|admin|api|scenarios|baseline|load|stress|spike|all] [scenario]"
        exit 1
        ;;
esac

echo -e "${GREEN}✅ All tests completed!${NC}"
echo -e "${YELLOW}Reports directory: ${REPORTS_DIR}${NC}"
