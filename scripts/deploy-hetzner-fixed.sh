#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Hetzner deployment...${NC}"

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Error: Environment variables not set!${NC}"
    echo "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "Example:"
    echo "export NEXT_PUBLIC_SUPABASE_URL='your_url_here'"
    echo "export NEXT_PUBLIC_SUPABASE_ANON_KEY='your_key_here'"
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

# Deploy on server
echo -e "${YELLOW}🚀 Deploying on Hetzner...${NC}"
ssh root@91.98.207.106 << 'DEPLOY_SCRIPT'
cd /tmp
echo "Stopping existing container..."
docker stop uflow-app || true
docker rm uflow-app || true
echo "Loading new image..."
docker load < uflow.tar.gz
echo "Starting new container..."
docker run -d -p 3000:3000 --name uflow-app uflow:latest
echo "Reloading Nginx..."
systemctl reload nginx
echo "Cleaning up..."
rm -f uflow.tar.gz
echo "✅ Deployment complete!"
DEPLOY_SCRIPT

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 Deployment finished successfully!${NC}"
    echo -e "${GREEN}Your app is live at: http://91.98.207.106${NC}"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

# Clean up local file
rm -f uflow.tar.gz
echo -e "${BLUE}✨ Local cleanup complete!${NC}"
