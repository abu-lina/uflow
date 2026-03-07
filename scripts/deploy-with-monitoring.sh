#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting deployment with monitoring...${NC}"

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Error: Environment variables not set!${NC}"
    echo "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

# Build the Docker image locally with proper build args
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t uflow:latest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --platform linux/amd64 .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

# Save the image
echo -e "${YELLOW}💾 Saving Docker image...${NC}"
docker save uflow:latest | gzip > uflow.tar.gz

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to save Docker image!${NC}"
    exit 1
fi

# Transfer to server
echo -e "${YELLOW}📤 Transferring to Hetzner...${NC}"
scp uflow.tar.gz root@91.98.207.106:/tmp/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to transfer file!${NC}"
    exit 1
fi

# Deploy on server with monitoring
echo -e "${YELLOW}🚀 Deploying on Hetzner with monitoring...${NC}"
ssh root@91.98.207.106 << 'DEPLOY_SCRIPT'
set -e

cd /tmp

# Stop and remove old container
echo "Stopping existing container..."
docker stop uflow-app || true
docker rm uflow-app || true

# Load new image
echo "Loading new image..."
docker load < uflow.tar.gz

# Start new container
echo "Starting new container..."
docker run -d -p 3000:3000 --name uflow-app -v uflow-image-cache:/app/.next/cache/images uflow:latest

# Wait for container to start
echo "Waiting for container to start..."
sleep 10

# Health check
echo "Performing health check..."
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Health check passed"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Health check failed after 30 attempts"
        docker logs uflow-app
        exit 1
    fi
    echo "Health check attempt $i/30..."
    sleep 2
done

# Update Nginx configuration using template
echo "Updating Nginx configuration..."
DOMAIN="ummahflow.com"
sed "s/{{DOMAIN}}/$DOMAIN/g" /tmp/nginx-template.conf > /etc/nginx/sites-available/ummahflow

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Test static file serving
echo "Testing static file serving..."
STATIC_TEST=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/_next/static/css/app/layout.css")
if [ "$STATIC_TEST" = "200" ]; then
    echo "✅ Static files serving correctly"
else
    echo "❌ Static files serving failed (HTTP $STATIC_TEST)"
fi

# Test health endpoint through Nginx
echo "Testing health endpoint through Nginx..."
HEALTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" "https://ummahflow.com/api/health")
if [ "$HEALTH_TEST" = "200" ]; then
    echo "✅ Health endpoint accessible through Nginx"
else
    echo "❌ Health endpoint failed through Nginx (HTTP $HEALTH_TEST)"
fi

# Cleanup
rm -f uflow.tar.gz
echo "✅ Deployment complete with monitoring!"
DEPLOY_SCRIPT

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 Deployment finished successfully!${NC}"
    echo -e "${GREEN}Your app is live at: https://ummahflow.com${NC}"
    echo -e "${GREEN}Health check: https://ummahflow.com/api/health${NC}"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

# Clean up local file
rm -f uflow.tar.gz
echo -e "${BLUE}✨ Local cleanup complete!${NC}"
