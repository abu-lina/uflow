#!/bin/bash

# Apply nginx MIME type fix to Hetzner production server via SSH
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
DOMAIN="ummahflow.com"
NGINX_CONFIG_PATH="/etc/nginx/sites-available/ummahflow"

echo -e "${BLUE}🌐 Applying nginx MIME type fix to Hetzner production server...${NC}"

# Check if nginx-template.conf exists
if [ ! -f "nginx-template.conf" ]; then
    echo -e "${RED}❌ nginx-template.conf not found in current directory${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if SSH is available
if ! command -v ssh &> /dev/null; then
    echo -e "${RED}❌ SSH command not found${NC}"
    exit 1
fi

echo "📋 Copying updated nginx configuration to server..."
scp nginx-template.conf ${SERVER_USER}@${SERVER_IP}:~/nginx-template.conf

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to copy file to server${NC}"
    echo "Please ensure:"
    echo "  1. You have SSH access to the server"
    echo "  2. Your SSH key is configured (or you can enter password)"
    echo "  3. The server is accessible at ${SERVER_IP}"
    exit 1
fi

echo "🔧 Applying configuration on server..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    set -e
    
    # Replace domain placeholder and copy config to nginx directory
    sed "s/{{DOMAIN}}/${DOMAIN}/g" ~/nginx-template.conf > /tmp/nginx-ummahflow.conf
    sudo cp /tmp/nginx-ummahflow.conf ${NGINX_CONFIG_PATH}
    
    # Ensure symlink exists
    sudo ln -sf ${NGINX_CONFIG_PATH} /etc/nginx/sites-enabled/ummahflow
    
    # Test nginx configuration
    echo "🧪 Testing nginx configuration..."
    if sudo nginx -t; then
        echo "✅ Nginx configuration is valid"
        
        # Reload nginx
        echo "🔄 Reloading nginx..."
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded successfully"
        
        # Clean up temp files
        rm -f ~/nginx-template.conf /tmp/nginx-ummahflow.conf
        
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
    echo -e "${GREEN}Production is live at: https://${DOMAIN}${NC}"
    echo ""
    echo "Please clear your browser cache and refresh the page to see the fix."
else
    echo -e "${RED}❌ Failed to apply fix${NC}"
    exit 1
fi

