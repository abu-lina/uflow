#!/bin/bash

# Script to help review Dependabot alerts
# This script provides information about potentially vulnerable packages

set -e

echo "🔍 Dependabot Alerts Review Helper"
echo "===================================="
echo ""

# Check npm audit
echo "📊 Running npm audit..."
npm audit --json > /tmp/npm-audit.json 2>&1 || true

AUDIT_COUNT=$(cat /tmp/npm-audit.json | jq -r '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")
echo "   Found $AUDIT_COUNT vulnerabilities in npm audit"
echo ""

# Check outdated packages
echo "📦 Checking for outdated packages..."
npm outdated --json > /tmp/npm-outdated.json 2>&1 || echo "{}" > /tmp/npm-outdated.json

OUTDATED_COUNT=$(cat /tmp/npm-outdated.json | jq 'length' 2>/dev/null || echo "0")
echo "   Found $OUTDATED_COUNT outdated packages"
echo ""

# Check specific packages that are commonly flagged
echo "🎯 Checking commonly vulnerable packages:"
echo ""

# Check js-yaml
JS_YAML_VERSION=$(npm list js-yaml --depth=0 2>/dev/null | grep js-yaml | awk '{print $2}' | sed 's/@//' || echo "not found")
if [ "$JS_YAML_VERSION" != "not found" ]; then
  echo "   js-yaml: $JS_YAML_VERSION"
  LATEST_JS_YAML=$(npm view js-yaml version 2>/dev/null || echo "unknown")
  echo "      Latest: $LATEST_JS_YAML"
  if [ "$JS_YAML_VERSION" != "$LATEST_JS_YAML" ]; then
    echo "      ⚠️  Update available"
  else
    echo "      ✅ Up to date"
  fi
fi
echo ""

# Check Supabase packages
echo "   @supabase/supabase-js:"
CURRENT_SUPABASE=$(npm list @supabase/supabase-js --depth=0 2>/dev/null | grep @supabase/supabase-js | awk '{print $2}' | sed 's/@//' || echo "not found")
if [ "$CURRENT_SUPABASE" != "not found" ]; then
  echo "      Current: $CURRENT_SUPABASE"
  LATEST_SUPABASE=$(npm view @supabase/supabase-js version 2>/dev/null || echo "unknown")
  echo "      Latest: $LATEST_SUPABASE"
fi
echo ""

echo "   @supabase/ssr:"
CURRENT_SSR=$(npm list @supabase/ssr --depth=0 2>/dev/null | grep @supabase/ssr | awk '{print $2}' | sed 's/@//' || echo "not found")
if [ "$CURRENT_SSR" != "not found" ]; then
  echo "      Current: $CURRENT_SSR"
  LATEST_SSR=$(npm view @supabase/ssr version 2>/dev/null || echo "unknown")
  echo "      Latest: $LATEST_SSR"
fi
echo ""

# Check for transitive dependencies that might be vulnerable
echo "🔗 Checking transitive dependencies:"
echo "   (These might be the source of Dependabot alerts)"
echo ""

# Check minimist
MINIMIST=$(npm ls minimist 2>/dev/null | grep minimist | head -1 || echo "")
if [ -n "$MINIMIST" ]; then
  echo "   minimist found: $MINIMIST"
  echo "      ⚠️  Check for vulnerabilities"
fi

# Check glob-parent
GLOB_PARENT=$(npm ls glob-parent 2>/dev/null | grep glob-parent | head -1 || echo "")
if [ -n "$GLOB_PARENT" ]; then
  echo "   glob-parent found: $GLOB_PARENT"
  echo "      ⚠️  Check for vulnerabilities"
fi

echo ""
echo "📝 Next Steps:"
echo "   1. Go to GitHub → Security → Dependabot alerts"
echo "   2. Review each of the 6 alerts"
echo "   3. Use the information above to identify which packages need updates"
echo "   4. Update packages: npm update <package-name>"
echo "   5. Test after updates: npm run build && npm run test"
echo ""
echo "📄 Review template saved to: DEPENDABOT_ALERTS_REVIEW.md"
echo ""
