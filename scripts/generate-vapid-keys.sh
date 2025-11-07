#!/bin/bash

# Generate VAPID keys for push notifications
# Usage: ./scripts/generate-vapid-keys.sh

echo "Generating VAPID keys for push notifications..."
echo ""

# Check if web-push is installed
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not installed. Please install Node.js first."
    exit 1
fi

# Generate keys
npx web-push generate-vapid-keys

echo ""
echo "Add these keys to your .env.local file:"
echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key>"
echo "VAPID_PRIVATE_KEY=<private-key>"
echo "VAPID_EMAIL=your-email@example.com"
echo ""
echo "⚠️  Keep the private key secret! Never commit it to version control."

