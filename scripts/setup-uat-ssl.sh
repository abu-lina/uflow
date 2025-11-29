#!/bin/bash

# Setup SSL certificate for UAT subdomain (uat.ummahflow.com)
# This script uses Certbot to obtain a Let's Encrypt certificate

set -e

echo "🔒 Setting up SSL certificate for uat.ummahflow.com..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot is not installed. Installing..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Obtain certificate for UAT subdomain
echo "📝 Obtaining SSL certificate for uat.ummahflow.com..."
sudo certbot certonly --nginx -d uat.ummahflow.com --non-interactive --agree-tos --email $(git config user.email || echo "admin@ummahflow.com")

# Verify certificate was created
if [ -f "/etc/letsencrypt/live/uat.ummahflow.com/fullchain.pem" ]; then
    echo "✅ SSL certificate created successfully!"
    echo "📁 Certificate location: /etc/letsencrypt/live/uat.ummahflow.com/"
else
    echo "❌ Failed to create SSL certificate"
    exit 1
fi

# Set up auto-renewal (certbot usually does this automatically, but let's verify)
echo "🔄 Setting up auto-renewal..."
sudo certbot renew --dry-run

echo "✅ SSL setup complete for uat.ummahflow.com!"
echo ""
echo "Next steps:"
echo "1. Configure Nginx with the UAT config (see docs/deployment/UAT_DEPLOYMENT.md)"
echo "2. Test the configuration: sudo nginx -t"
echo "3. Reload Nginx: sudo systemctl reload nginx"

