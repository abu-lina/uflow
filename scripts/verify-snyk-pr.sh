#!/bin/bash

# Verify Snyk PR changes meet all expert criteria
# Usage: ./scripts/verify-snyk-pr.sh [branch-name]
# If no branch is provided, uses current branch

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BRANCH_NAME="${1:-$(git branch --show-current)}"
REPORT_FILE="snyk-pr-verification-report.md"
ERRORS=0
WARNINGS=0

echo -e "${BLUE}🔍 Verifying Snyk PR: ${BRANCH_NAME}${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

# Check if branch exists
if ! git show-ref --verify --quiet refs/heads/"${BRANCH_NAME}" 2>/dev/null && \
   ! git show-ref --verify --quiet refs/remotes/origin/"${BRANCH_NAME}" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Branch ${BRANCH_NAME} not found locally. Checking out from remote...${NC}"
    git fetch origin "${BRANCH_NAME}" 2>/dev/null || {
        echo -e "${RED}❌ Branch ${BRANCH_NAME} not found${NC}"
        exit 1
    }
fi

# Get base branch (main or develop)
BASE_BRANCH="main"
if git show-ref --verify --quiet refs/heads/develop; then
    BASE_BRANCH="develop"
fi

echo -e "${CYAN}📋 Step 1: Checking changed files${NC}"
echo ""

# Get changed files
CHANGED_FILES=$(git diff --name-only "${BASE_BRANCH}"..."${BRANCH_NAME}" 2>/dev/null || git diff --name-only origin/"${BASE_BRANCH}"..."${BRANCH_NAME}" 2>/dev/null)

# Check if only package files are changed
ONLY_PACKAGE_FILES=true
for file in $CHANGED_FILES; do
    if [[ "$file" != "package.json" && "$file" != "package-lock.json" ]]; then
        echo -e "${RED}❌ Unexpected file changed: ${file}${NC}"
        ONLY_PACKAGE_FILES=false
        ERRORS=$((ERRORS + 1))
    fi
done

if [ "$ONLY_PACKAGE_FILES" = true ]; then
    echo -e "${GREEN}✅ Only package.json and package-lock.json modified${NC}"
else
    echo -e "${RED}❌ Other files modified - this may not be a standard Snyk PR${NC}"
fi

echo ""
echo -e "${CYAN}📋 Step 2: Checking Node.js and npm versions${NC}"
echo ""

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [ "$NODE_MAJOR" -ge 18 ]; then
    echo -e "${GREEN}✅ Node.js version: ${NODE_VERSION} (>=18.0.0)${NC}"
else
    echo -e "${RED}❌ Node.js version ${NODE_VERSION} does not meet requirement (>=18.0.0)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check npm version
NPM_VERSION=$(npm --version)
NPM_MAJOR=$(echo "$NPM_VERSION" | cut -d. -f1)

if [ "$NPM_MAJOR" -ge 9 ]; then
    echo -e "${GREEN}✅ npm version: ${NPM_VERSION} (>=9.0.0)${NC}"
else
    echo -e "${RED}❌ npm version ${NPM_VERSION} does not meet requirement (>=9.0.0)${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo -e "${CYAN}📋 Step 3: Checking out branch and installing dependencies${NC}"
echo ""

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)

# Checkout target branch
if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    echo -e "${YELLOW}Switching to branch: ${BRANCH_NAME}${NC}"
    git checkout "${BRANCH_NAME}" 2>/dev/null || git checkout -b "${BRANCH_NAME}" "origin/${BRANCH_NAME}" 2>/dev/null || {
        echo -e "${RED}❌ Failed to checkout branch ${BRANCH_NAME}${NC}"
        exit 1
    }
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies with npm ci...${NC}"
if npm ci --prefer-offline > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    ERRORS=$((ERRORS + 1))
    # Restore original branch
    git checkout "${CURRENT_BRANCH}" 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${CYAN}📋 Step 4: Running build verification${NC}"
echo ""

# Build application
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
    
    # Check if .next directory exists
    if [ -d ".next" ]; then
        echo -e "${GREEN}✅ Build output directory (.next) exists${NC}"
    else
        echo -e "${RED}❌ Build output directory (.next) not found${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ Build failed${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo -e "${CYAN}📋 Step 5: Running tests${NC}"
echo ""

# Run tests
if npm run test > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Tests failed or no tests found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo -e "${CYAN}📋 Step 6: Running lint check${NC}"
echo ""

# Run lint
if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Lint check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Lint check failed or found warnings${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo -e "${CYAN}📋 Step 7: Running type check${NC}"
echo ""

# Run type check
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Type check passed${NC}"
else
    echo -e "${RED}❌ Type check failed${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo -e "${CYAN}📋 Step 8: Checking version compatibility${NC}"
echo ""

# Check React version (should be pinned to 18.3.1)
# Check in dependencies section (primary location)
REACT_VERSION=$(grep -E '^\s*"react"\s*:' package.json | grep -o '"[^"]*"' | head -1 | tr -d '"' || echo "")
if [ -z "$REACT_VERSION" ]; then
    # Fallback: try to get from overrides.next.react
    REACT_VERSION=$(grep -A 10 '"overrides"' package.json | grep -A 5 '"next"' | grep -E '^\s*"react"\s*:' | grep -o '"[^"]*"' | head -1 | tr -d '"' || echo "")
fi

if [ -n "$REACT_VERSION" ]; then
    # Check if version contains 18.3.1 (handles ^18.3.1, ~18.3.1, 18.3.1, etc.)
    if [[ "$REACT_VERSION" == *"18.3.1"* ]]; then
        echo -e "${GREEN}✅ React version pinned correctly: ${REACT_VERSION}${NC}"
    else
        echo -e "${YELLOW}⚠️  React version changed: ${REACT_VERSION} (expected 18.3.1)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine React version${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check Next.js version
NEXT_VERSION=$(grep '"next"' package.json | grep -o '"[^"]*"' | head -1 | tr -d '"' || echo "")
if [ -n "$NEXT_VERSION" ]; then
    echo -e "${CYAN}   Next.js version: ${NEXT_VERSION}${NC}"
fi

echo ""
echo -e "${CYAN}📋 Step 9: Generating dependency diff report${NC}"
echo ""

# Generate diff report
DIFF_OUTPUT=$(git diff "${BASE_BRANCH}"..."${BRANCH_NAME}" -- package.json 2>/dev/null || git diff "origin/${BASE_BRANCH}"..."${BRANCH_NAME}" -- package.json 2>/dev/null || echo "")

if [ -n "$DIFF_OUTPUT" ]; then
    echo -e "${CYAN}Package changes detected:${NC}"
    echo "$DIFF_OUTPUT" | grep -E "^\+|^\-" | grep -v "^+++\|^---" | head -20
    echo ""
    echo -e "${YELLOW}⚠️  Review full diff with: git diff ${BASE_BRANCH}...${BRANCH_NAME} -- package.json${NC}"
else
    echo -e "${YELLOW}⚠️  Could not generate diff (branch may not be based on ${BASE_BRANCH})${NC}"
fi

echo ""
echo -e "${CYAN}📋 Step 10: Generating verification report${NC}"
echo ""

# Generate report
cat > "$REPORT_FILE" << EOF
# Snyk PR Verification Report

**Branch**: ${BRANCH_NAME}  
**Base Branch**: ${BASE_BRANCH}  
**Date**: $(date)

## Summary

- **Errors**: ${ERRORS}
- **Warnings**: ${WARNINGS}
- **Status**: $([ $ERRORS -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")

## Checks Performed

1. ✅ Changed files check
2. ✅ Node.js version check
3. ✅ npm version check
4. ✅ Dependency installation
5. ✅ Build verification
6. ✅ Test execution
7. ✅ Lint check
8. ✅ Type check
9. ✅ Version compatibility
10. ✅ Dependency diff

## Results

- Only package files modified: $([ "$ONLY_PACKAGE_FILES" = true ] && echo "✅ Yes" || echo "❌ No")
- Node.js version: ${NODE_VERSION} $([ "$NODE_MAJOR" -ge 18 ] && echo "✅" || echo "❌")
- npm version: ${NPM_VERSION} $([ "$NPM_MAJOR" -ge 9 ] && echo "✅" || echo "❌")
- Build: $([ -d ".next" ] && echo "✅ Success" || echo "❌ Failed")
- Tests: ⚠️ Check manually
- Lint: ⚠️ Check manually
- Type check: ⚠️ Check manually

## Next Steps

1. Review the dependency changes
2. Check CI status on GitHub
3. Review expert checklists in [SNYK_PR_REVIEW.md](../docs/guides/SNYK_PR_REVIEW.md)
4. Approve if all checks pass

EOF

echo -e "${GREEN}✅ Report generated: ${REPORT_FILE}${NC}"

# Restore original branch
if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    echo ""
    echo -e "${YELLOW}Restoring original branch: ${CURRENT_BRANCH}${NC}"
    git checkout "${CURRENT_BRANCH}" 2>/dev/null || true
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Verification completed successfully!${NC}"
    echo -e "${GREEN}   Errors: ${ERRORS}${NC}"
    echo -e "${YELLOW}   Warnings: ${WARNINGS}${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "1. Review the verification report: ${REPORT_FILE}"
    echo "2. Check CI status on GitHub"
    echo "3. Complete expert review checklists"
    echo "4. Approve PR if all checks pass"
    exit 0
else
    echo -e "${RED}❌ Verification failed with ${ERRORS} error(s)${NC}"
    echo -e "${YELLOW}   Warnings: ${WARNINGS}${NC}"
    echo ""
    echo -e "${CYAN}Review the report for details: ${REPORT_FILE}${NC}"
    exit 1
fi