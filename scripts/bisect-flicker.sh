#!/bin/bash

# Interactive Git Bisect Script for Button Flicker Issue
# This script helps identify which commit introduced the Save button flicker

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Commits to test (from Nov 6-20, 2025)
COMMITS=(
  "76a7cf5"  # Nov 6 - Oldest
  "8632dc9"  # Nov 7
  "3d89b1b"  # Nov 7
  "7d34901"  # Nov 10
  "26f0052"  # Nov 12
  "c89903e"  # Nov 12 - Middle
  "f28e93b"  # Nov 12
  "5567863"  # Nov 12
  "5eb7e2f"  # Nov 13
  "dbaccec"  # Nov 13
  "b2aef55"  # Nov 13
  "5cc5b92"  # Nov 13
  "e2df0cc"  # Nov 13
  "32bffef"  # Nov 13
  "1dd4eca"  # Nov 13
  "2abaf4e"  # Nov 15
  "1ae6a0e"  # Nov 15
  "773eafe"  # Nov 18
  "0e11522"  # Nov 18
  "410ee4a"  # Nov 18
  "7a63926"  # Nov 18
  "6efb809"  # Nov 18
  "fec5234"  # Nov 18
  "4b9dcb7"  # Nov 18 - Newest
)

# Get commit details
get_commit_info() {
  local commit=$1
  git log -1 --format="%h | %ad | %s" --date=short "$commit"
}

# Log file
LOG_FILE="bisect-log.txt"
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
ORIGINAL_COMMIT=$(git rev-parse HEAD)

# Cleanup function
cleanup() {
  echo ""
  echo -e "${YELLOW}Cleaning up...${NC}"
  # Kill any dev server processes
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  # Restore git state
  git checkout "$ORIGINAL_BRANCH" 2>/dev/null || git checkout "$ORIGINAL_COMMIT"
  echo -e "${GREEN}Restored to original state${NC}"
}

# Set trap for cleanup on exit
trap cleanup EXIT INT TERM

# Initialize log
echo "=== Button Flicker Bisect Log ===" > "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"
echo "Testing commits from Nov 6-20, 2025" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Save any uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${YELLOW}Stashing uncommitted changes...${NC}"
  git stash push -m "bisect-flicker-backup-$(date +%s)"
fi

# Binary search implementation
left=0
right=$((${#COMMITS[@]} - 1))
last_good=-1
first_bad=-1

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Button Flicker Bisection - Interactive Testing       ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${GREEN}Testing ${#COMMITS[@]} commits from Nov 6-20, 2025${NC}"
echo -e "${GREEN}This will use binary search to find the culprit efficiently${NC}"
echo ""

while [ $left -le $right ]; do
  mid=$(( (left + right) / 2 ))
  commit="${COMMITS[$mid]}"
  
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}Testing commit ${mid} of ${#COMMITS[@]}: ${commit}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  get_commit_info "$commit"
  echo ""
  
  # Checkout commit
  echo -e "${YELLOW}Checking out commit...${NC}"
  git checkout "$commit" -q
  
  # Install dependencies
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install --silent 2>&1 | grep -E "added|removed|changed|audited" || true
  
  # Build the app
  echo -e "${YELLOW}Building application...${NC}"
  if npm run build > build.log 2>&1; then
    echo -e "${GREEN}✓ Build successful${NC}"
  else
    echo -e "${RED}✗ Build failed - check build.log${NC}"
    echo "Build failed for commit $commit" >> "$LOG_FILE"
    echo -e "${YELLOW}Skipping this commit...${NC}"
    # Treat build failure as inconclusive, narrow to newer commits
    left=$((mid + 1))
    continue
  fi
  
  # Kill any existing process on port 3000
  echo -e "${YELLOW}Checking port 3000...${NC}"
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 1
  
  # Start dev server
  echo ""
  echo -e "${GREEN}Starting dev server...${NC}"
  npm run dev -- --hostname 0.0.0.0 -p 3000 > dev.log 2>&1 &
  DEV_PID=$!
  
  # Wait for server to be ready
  echo -e "${YELLOW}Waiting for server to start (this may take 15-20 seconds)...${NC}"
  
  # Wait up to 30 seconds for server to respond
  SERVER_READY=false
  for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
      SERVER_READY=true
      break
    fi
    sleep 1
    echo -n "."
  done
  echo ""
  
  # Check if server is running
  if ! $SERVER_READY || ! kill -0 $DEV_PID 2>/dev/null; then
    echo -e "${RED}✗ Dev server failed to start${NC}"
    echo "Dev server logs:"
    tail -20 dev.log
    echo "Dev server failed for commit $commit" >> "$LOG_FILE"
    left=$((mid + 1))
    continue
  fi
  
  echo -e "${GREEN}✓ Server is running at http://localhost:3000${NC}"
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    TEST INSTRUCTIONS                      ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}1.${NC} Open: ${BLUE}http://localhost:3000/providers${NC}"
  echo -e "${GREEN}2.${NC} Check if Save button flickers on initial page load"
  echo -e "${GREEN}3.${NC} Click to open a provider card modal"
  echo -e "${GREEN}4.${NC} Check if Save button flickers when modal opens"
  echo ""
  echo -e "${YELLOW}Press enter when you're ready to provide feedback...${NC}"
  read -r
  
  # Get user feedback
  while true; do
    echo ""
    echo -e "${YELLOW}Does the Save button flicker?${NC}"
    echo -e "  ${GREEN}g${NC} = No flicker (good)"
    echo -e "  ${RED}b${NC} = Flickers (bad)"
    echo -e "  ${BLUE}s${NC} = Skip this commit"
    echo -e "  ${BLUE}q${NC} = Quit bisect"
    echo ""
    read -p "Enter your choice [g/b/s/q]: " choice
    
    case $choice in
      g|G)
        echo -e "${GREEN}✓ Marked as GOOD (no flicker)${NC}"
        echo "GOOD: $commit - $(get_commit_info $commit)" >> "$LOG_FILE"
        last_good=$mid
        left=$((mid + 1))
        break
        ;;
      b|B)
        echo -e "${RED}✗ Marked as BAD (has flicker)${NC}"
        echo "BAD: $commit - $(get_commit_info $commit)" >> "$LOG_FILE"
        if [ $first_bad -eq -1 ] || [ $mid -lt $first_bad ]; then
          first_bad=$mid
        fi
        right=$((mid - 1))
        break
        ;;
      s|S)
        echo -e "${BLUE}○ Skipped${NC}"
        echo "SKIP: $commit - $(get_commit_info $commit)" >> "$LOG_FILE"
        left=$((mid + 1))
        break
        ;;
      q|Q)
        echo -e "${YELLOW}Quitting bisect...${NC}"
        kill $DEV_PID 2>/dev/null || true
        exit 0
        ;;
      *)
        echo -e "${RED}Invalid choice. Please enter g, b, s, or q.${NC}"
        ;;
    esac
  done
  
  # Stop dev server
  echo -e "${YELLOW}Stopping dev server...${NC}"
  kill $DEV_PID 2>/dev/null || true
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 2
done

# Results
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    BISECT RESULTS                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $first_bad -ne -1 ]; then
  culprit="${COMMITS[$first_bad]}"
  echo -e "${RED}First bad commit identified:${NC}"
  echo ""
  get_commit_info "$culprit"
  echo ""
  echo "Full commit details:"
  git show "$culprit" --stat
  
  echo "" >> "$LOG_FILE"
  echo "=== RESULT ===" >> "$LOG_FILE"
  echo "First bad commit: $culprit" >> "$LOG_FILE"
  get_commit_info "$culprit" >> "$LOG_FILE"
  
  echo ""
  echo -e "${GREEN}Results saved to: ${LOG_FILE}${NC}"
  echo -e "${YELLOW}Run 'git show $culprit' to see the full diff${NC}"
else
  echo -e "${YELLOW}Could not identify the exact commit.${NC}"
  echo "Bisection incomplete" >> "$LOG_FILE"
fi

echo ""
echo "Completed: $(date)" >> "$LOG_FILE"

