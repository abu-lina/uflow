#!/bin/bash

# Fix Nginx MIME type issues for UAT
# This script updates the Nginx configuration to properly serve static files

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Fixing Nginx MIME type configuration for UAT...${NC}"

# Check if we're on the server
if [ ! -f "/etc/nginx/sites-available/uat-ummahflow" ]; then
    echo -e "${YELLOW}⚠️  UAT Nginx config not found at /etc/nginx/sites-available/uat-ummahflow${NC}"
    echo "This script should be run on the Hetzner server."
    exit 1
fi

# Backup current config
echo "📋 Backing up current Nginx configuration..."
sudo cp /etc/nginx/sites-available/uat-ummahflow /etc/nginx/sites-available/uat-ummahflow.backup.$(date +%Y%m%d_%H%M%S)

# Check if nginx-uat-template.conf exists in current directory
if [ ! -f "nginx-uat-template.conf" ]; then
    echo -e "${RED}❌ nginx-uat-template.conf not found in current directory${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Copy updated config
echo "📝 Copying updated Nginx configuration..."
sudo cp nginx-uat-template.conf /etc/nginx/sites-available/uat-ummahflow

# Ensure symlink exists
sudo ln -sf /etc/nginx/sites-available/uat-ummahflow /etc/nginx/sites-enabled/uat-ummahflow

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    
    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
    
    echo ""
    echo -e "${GREEN}🎉 Nginx MIME type fix applied!${NC}"
    echo ""
    echo "Please:"
    echo "1. Clear your browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)"
    echo "2. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)"
    echo "3. Test https://uat.ummahflow.com"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    echo "Restoring backup..."
    sudo cp /etc/nginx/sites-available/uat-ummahflow.backup.* /etc/nginx/sites-available/uat-ummahflow
    exit 1
fi









