#!/bin/bash

# Deploy UAT environment to Hetzner server
# This script builds and deploys the UAT container on port 3001

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying UAT environment...${NC}"

# Check if .env.uat exists
if [ ! -f ".env.uat" ]; then
    echo -e "${RED}❌ .env.uat file not found!${NC}"
    echo "Please create .env.uat from env.uat.template and fill in your credentials."
    exit 1
fi

# Load UAT environment variables
echo "📋 Loading UAT environment variables..."
export $(cat .env.uat | grep -v '^#' | xargs)

# Validate required environment variables
echo "🔍 Validating required environment variables..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.uat${NC}"
    echo "See VERIFY_HETZNER_ENV.md for detailed instructions."
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.uat${NC}"
    echo "See VERIFY_HETZNER_ENV.md for detailed instructions."
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SITE_URL is not set, using default${NC}"
    export NEXT_PUBLIC_SITE_URL="https://uat.ummahflow.com"
fi

# Validate Supabase URL format
if [[ ! "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
    echo -e "${RED}❌ Invalid NEXT_PUBLIC_SUPABASE_URL format: $NEXT_PUBLIC_SUPABASE_URL${NC}"
    echo "Expected format: https://[project-ref].supabase.co"
    exit 1
fi

# Validate anon key format (should start with eyJ for JWT)
if [[ ! "$NEXT_PUBLIC_SUPABASE_ANON_KEY" =~ ^eyJ ]]; then
    echo -e "${RED}❌ Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format${NC}"
    echo "Expected a JWT token starting with 'eyJ'"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Build Docker image for UAT
echo "🔨 Building UAT Docker image..."
docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
    --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
    --build-arg DISABLE_PWA=false \
    -t uflow-uat:latest \
    -f Dockerfile \
    .

# Stop and remove existing UAT container if it exists
echo "🛑 Stopping existing UAT container..."
docker stop uflow-uat 2>/dev/null || true
docker rm uflow-uat 2>/dev/null || true

# Run UAT container on port 3001
echo "🐳 Starting UAT container on port 3001..."
docker run -d \
    --name uflow-uat \
    --restart unless-stopped \
    -p 3001:3000 \
    --env-file .env.uat \
    uflow-uat:latest

# Wait for container to start
echo "⏳ Waiting for UAT container to start..."
sleep 10

# Health check
echo "🏥 Performing health check..."
for i in {1..30}; do
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ UAT health check passed${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ UAT health check failed after 30 attempts${NC}"
        docker logs uflow-uat
        exit 1
    fi
    echo "Health check attempt $i/30..."
    sleep 2
done

# Update Nginx configuration for UAT
echo "🌐 Updating Nginx configuration for UAT..."
if [ -f "nginx-uat-template.conf" ]; then
    sudo cp nginx-uat-template.conf /etc/nginx/sites-available/uat-ummahflow
    sudo ln -sf /etc/nginx/sites-available/uat-ummahflow /etc/nginx/sites-enabled/uat-ummahflow
else
    echo -e "${RED}❌ nginx-uat-template.conf not found${NC}"
    exit 1
fi

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    exit 1
fi

# Test UAT endpoint through Nginx
echo "🧪 Testing UAT endpoint through Nginx..."
UAT_TEST=$(curl -s -o /dev/null -w "%{http_code}" "https://uat.ummahflow.com/api/health" || echo "000")
if [ "$UAT_TEST" = "200" ]; then
    echo -e "${GREEN}✅ UAT endpoint accessible through Nginx${NC}"
else
    echo -e "${YELLOW}⚠️  UAT endpoint returned HTTP $UAT_TEST (may need SSL certificate setup)${NC}"
    echo "Run: ./scripts/setup-uat-ssl.sh to set up SSL certificate"
fi

echo ""
echo -e "${GREEN}🎉 UAT deployment complete!${NC}"
echo -e "${GREEN}UAT is live at: https://uat.ummahflow.com${NC}"
echo -e "${GREEN}Health check: https://uat.ummahflow.com/api/health${NC}"







