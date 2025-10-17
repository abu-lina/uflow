#!/bin/bash

# Script to resolve git conflict on Hetzner server
echo "🔧 Resolving git conflict on Hetzner..."
echo ""

ssh root@91.98.207.106 << 'EOF'
    cd /var/www/uflow
    
    echo "📋 Checking what changed locally..."
    git diff Dockerfile
    
    echo ""
    echo "💾 Stashing local changes..."
    git stash
    
    echo ""
    echo "📥 Pulling latest code from GitHub..."
    git pull
    
    echo ""
    echo "✅ Pull complete!"
    echo ""
    echo "📊 Current status:"
    git status
EOF

echo ""
echo "✅ Conflict resolved!"
echo ""
echo "🚀 Ready to deploy with latest code!"

