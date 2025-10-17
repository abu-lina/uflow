#!/bin/bash

# Script to check and fix .env.local location on Hetzner
# Usage: ./fix-hetzner-env.sh YOUR_SERVER_IP

if [ -z "$1" ]; then
    echo "❌ Please provide your Hetzner server IP"
    echo "Usage: ./fix-hetzner-env.sh YOUR_SERVER_IP"
    exit 1
fi

SERVER_IP=$1

echo "🔍 Checking current .env.local location and contents..."
echo ""

ssh root@$SERVER_IP << 'EOF'
    echo "📄 Current .env.local in /var/www/:"
    if [ -f /var/www/.env.local ]; then
        echo "✅ Found in /var/www/.env.local"
        echo ""
        echo "🔍 NEXT_PUBLIC_SITE_URL value:"
        grep NEXT_PUBLIC_SITE_URL /var/www/.env.local || echo "⚠️ NEXT_PUBLIC_SITE_URL not set"
        echo ""
    fi
    
    echo "📂 Checking /var/www/uflow/ directory:"
    if [ -d /var/www/uflow ]; then
        echo "✅ Directory exists"
        if [ -f /var/www/uflow/.env.local ]; then
            echo "✅ .env.local already exists in /var/www/uflow/"
            echo "Current NEXT_PUBLIC_SITE_URL:"
            grep NEXT_PUBLIC_SITE_URL /var/www/uflow/.env.local
        else
            echo "⚠️ .env.local NOT in /var/www/uflow/"
        fi
    else
        echo "❌ /var/www/uflow/ directory doesn't exist!"
    fi
    
    echo ""
    echo "🐳 Docker container info:"
    docker inspect uflow-app --format '{{.Config.Env}}' 2>/dev/null | grep -o 'NEXT_PUBLIC_SITE_URL=[^]]*' || echo "⚠️ Could not read container env"
EOF

echo ""
echo "✅ Check complete!"
echo ""
echo "Do you want to:"
echo "1. View the full .env.local file"
echo "2. Move .env.local to correct location (/var/www/uflow/)"
echo "3. Update NEXT_PUBLIC_SITE_URL value"
echo ""
echo "Run the following commands manually:"
echo "  ssh root@$SERVER_IP"
echo "  cat /var/www/.env.local  # View current file"

