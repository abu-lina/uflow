#!/bin/bash

# Script to fix Dependabot Vite alerts in figma-imports projects
# Updates Vite to latest version in both archived projects

set -e

echo "🔧 Fixing Dependabot Vite Alerts"
echo "=================================="
echo ""

# Get latest Vite version
LATEST_VITE=$(npm view vite version)
echo "📦 Latest Vite version: $LATEST_VITE"
echo ""

# Project 1: Header-component
echo "📁 Updating Header-component..."
cd docs/design/figma-imports/Figma_imports/Header-component

if [ -f "package.json" ]; then
    CURRENT_VITE=$(grep -o '"vite": "[^"]*"' package.json | cut -d'"' -f4)
    echo "   Current: $CURRENT_VITE"
    echo "   Updating to: $LATEST_VITE"
    npm install vite@latest --save-dev --silent
    echo "   ✅ Updated"
else
    echo "   ⚠️  package.json not found"
fi

echo ""

# Project 2: Add Button Transition Effects
echo "📁 Updating Add Button Transition Effects..."
cd ../Add\ Button\ Transition\ Effects

if [ -f "package.json" ]; then
    CURRENT_VITE=$(grep -o '"vite": "[^"]*"' package.json | cut -d'"' -f4)
    echo "   Current: $CURRENT_VITE"
    echo "   Updating to: $LATEST_VITE"
    npm install vite@latest --save-dev --silent
    echo "   ✅ Updated"
else
    echo "   ⚠️  package.json not found"
fi

echo ""
echo "✅ Vite updated in both projects"
echo ""
echo "📋 Next steps:"
echo "   1. Verify: npm audit in each directory"
echo "   2. Test: Run 'npm run dev' in each directory (optional)"
echo "   3. Commit: git add package.json package-lock.json"
echo "   4. Verify alerts resolved in GitHub"
