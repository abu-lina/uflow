#!/bin/bash

# Update Nginx configuration for UAT
# This script updates only the nginx config without redeploying the app

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 Updating Nginx configuration for UAT...${NC}"

# Check if nginx-uat-template.conf exists
if [ ! -f "nginx-uat-template.conf" ]; then
    echo -e "${RED}❌ nginx-uat-template.conf not found in current directory${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Copy updated config
echo "📋 Copying updated nginx configuration..."
sudo cp nginx-uat-template.conf /etc/nginx/sites-available/uat-ummahflow

# Ensure symlink exists
echo "🔗 Ensuring symlink is in place..."
sudo ln -sf /etc/nginx/sites-available/uat-ummahflow /etc/nginx/sites-enabled/uat-ummahflow

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    
    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
    
    # Test UAT endpoint
    echo "🧪 Testing UAT endpoint..."
    sleep 2
    if curl -f https://uat.ummahflow.com/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ UAT endpoint is accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  UAT endpoint test failed (this may be normal if app is restarting)${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Nginx configuration updated successfully!${NC}"
    echo -e "${GREEN}UAT is live at: https://uat.ummahflow.com${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    echo "Please check the configuration file for errors."
    exit 1
fi
