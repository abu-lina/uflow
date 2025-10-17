#!/bin/bash

# Script to update Resend API key on Hetzner server
# Usage: ./update-resend-key.sh

echo "🔑 Update Resend API Key on Hetzner"
echo "===================================="
echo ""

# Prompt for API key
read -p "Paste your Resend API key (starts with 're_'): " RESEND_KEY

# Validate key format
if [[ ! $RESEND_KEY =~ ^re_ ]]; then
    echo "❌ Invalid key format. Resend API keys should start with 're_'"
    exit 1
fi

echo ""
echo "📤 Updating .env.local on Hetzner server..."

# Update the file on Hetzner
ssh root@91.98.207.106 "sed -i 's/RESEND_API_KEY=.*/RESEND_API_KEY=$RESEND_KEY/' /var/www/uflow/.env.local"

if [ $? -eq 0 ]; then
    echo "✅ API key updated successfully!"
    echo ""
    echo "🔍 Verifying update..."
    ssh root@91.98.207.106 "grep RESEND_API_KEY /var/www/uflow/.env.local | sed 's/\(RESEND_API_KEY=re_\).*/\1***HIDDEN***/'"
    echo ""
    echo "✅ Update complete!"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Deploy the updated code with email fixes:"
    echo "   ssh root@91.98.207.106"
    echo "   cd /var/www/uflow"
    echo "   git pull"
    echo "   ./deploy-hetzner.sh"
    echo ""
else
    echo "❌ Failed to update API key"
    exit 1
fi

