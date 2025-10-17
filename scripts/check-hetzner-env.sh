#!/bin/bash

# Quick script to check environment variables on Hetzner server
# Usage: ./check-hetzner-env.sh YOUR_SERVER_IP

if [ -z "$1" ]; then
    echo "❌ Please provide your Hetzner server IP"
    echo "Usage: ./check-hetzner-env.sh YOUR_SERVER_IP"
    exit 1
fi

SERVER_IP=$1

echo "🔍 Checking environment variables on Hetzner server..."
echo ""

ssh root@$SERVER_IP << 'EOF'
    echo "📂 Current directory:"
    pwd
    echo ""
    
    echo "📋 Checking if .env.local exists in /var/www/uflow:"
    if [ -f /var/www/uflow/.env.local ]; then
        echo "✅ .env.local found!"
        echo ""
        echo "🔍 Current NEXT_PUBLIC_SITE_URL value:"
        grep NEXT_PUBLIC_SITE_URL /var/www/uflow/.env.local || echo "⚠️ NEXT_PUBLIC_SITE_URL not found in .env.local"
        echo ""
        echo "📄 Full .env.local contents (sensitive data hidden):"
        sed 's/=.*/=***HIDDEN***/g' /var/www/uflow/.env.local
    else
        echo "❌ .env.local not found in /var/www/uflow"
        echo "Checking if directory exists..."
        ls -la /var/www/ 2>/dev/null || echo "Directory /var/www/ doesn't exist"
    fi
    echo ""
    
    echo "🐳 Checking running Docker container:"
    docker ps | grep uflow || echo "⚠️ No uflow container running"
EOF

echo ""
echo "✅ Check complete!"

