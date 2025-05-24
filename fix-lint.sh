#!/bin/bash

# Fix Tailwind shorthand issues
echo "Fixing Tailwind shorthand issues..."
npx eslint --fix "src/components/layout/MobileLayout.tsx"

# Fix curly braces issues
echo "Fixing curly braces issues..."
npx eslint --fix "src/components/shared/SoukDetailModal.tsx" "src/components/ui/Modal.tsx"

# Fix type imports
echo "Fixing type imports..."
npx eslint --fix "src/services/zakat_projects.ts"

# Remove console statements (this will require manual review)
echo "Removing console statements..."
npx eslint --fix "src/components/layout/MobileLayoutWrapper.tsx" "src/hooks/useIsMobile.ts" "src/services/zakat_projects.ts"

echo "Linting fixes applied. Please review the changes and fix any remaining issues manually." 