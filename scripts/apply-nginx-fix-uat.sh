#!/bin/bash

# Apply nginx MIME type fix to UAT server via SSH
# This script copies the updated nginx config and reloads nginx

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server configuration
SERVER_IP="91.98.207.106"
SERVER_USER="root"
NGINX_CONFIG_PATH="/etc/nginx/sites-available/uat-ummahflow"

echo -e "${BLUE}🌐 Applying nginx MIME type fix to UAT server...${NC}"

# Check if nginx-uat-template.conf exists
if [ ! -f "nginx-uat-template.conf" ]; then
    echo -e "${RED}❌ nginx-uat-template.conf not found in current directory${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if SSH is available
if ! command -v ssh &> /dev/null; then
    echo -e "${RED}❌ SSH command not found${NC}"
    exit 1
fi

echo "📋 Copying updated nginx configuration to server..."
scp nginx-uat-template.conf ${SERVER_USER}@${SERVER_IP}:~/nginx-uat-template.conf

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to copy file to server${NC}"
    echo "Please ensure:"
    echo "  1. You have SSH access to the server"
    echo "  2. Your SSH key is configured (or you can enter password)"
    echo "  3. The server is accessible at ${SERVER_IP}"
    exit 1
fi

echo "🔧 Applying configuration on server..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    # Copy config to nginx directory
    sudo cp ~/nginx-uat-template.conf /etc/nginx/sites-available/uat-ummahflow
    
    # Ensure symlink exists
    sudo ln -sf /etc/nginx/sites-available/uat-ummahflow /etc/nginx/sites-enabled/uat-ummahflow
    
    # Test nginx configuration
    echo "🧪 Testing nginx configuration..."
    if sudo nginx -t; then
        echo "✅ Nginx configuration is valid"
        
        # Reload nginx
        echo "🔄 Reloading nginx..."
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded successfully"
        
        # Clean up temp file
        rm -f ~/nginx-uat-template.conf
        
        echo ""
        echo "🎉 Nginx configuration updated successfully!"
    else
        echo "❌ Nginx configuration test failed"
        echo "Configuration file has errors. Please check manually."
        exit 1
    fi
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Fix applied successfully!${NC}"
    echo -e "${GREEN}UAT is live at: https://uat.ummahflow.com${NC}"
    echo ""
    echo "Please clear your browser cache and refresh the page to see the fix."
else
    echo -e "${RED}❌ Failed to apply fix${NC}"
    exit 1
fi


