#!/bin/bash

# Hetzner Deployment Script
# This script rebuilds and redeploys your app on Hetzner

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting deployment to Hetzner...${NC}"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo "Please create .env.production from env.production.template and fill in your credentials."
    echo "See VERIFY_HETZNER_ENV.md for detailed instructions."
    exit 1
fi

# Pull latest code
echo "📥 Pulling latest code from git..."
git pull

# Load production environment variables
echo "📋 Loading production environment variables..."
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required environment variables
echo "🔍 Validating required environment variables..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.production${NC}"
    echo "See VERIFY_HETZNER_ENV.md for detailed instructions."
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.production${NC}"
    echo "See VERIFY_HETZNER_ENV.md for detailed instructions."
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SITE_URL is not set, using default${NC}"
    export NEXT_PUBLIC_SITE_URL="https://ummahflow.com"
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

# Build Docker image with build arguments
echo "🔨 Building Docker image with environment variables..."
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
  -t uflow \
  .

# Stop old container
echo "🛑 Stopping old container..."
docker stop uflow 2>/dev/null || true
docker rm uflow 2>/dev/null || true

# Start new container
echo "▶️ Starting new container..."
docker run -d \
  --name uflow \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  uflow

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Health check
echo "🏥 Performing health check..."
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Production health check passed${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Production health check failed after 30 attempts${NC}"
        echo "📋 Container logs:"
        docker logs uflow --tail 50
        exit 1
    fi
    echo "Health check attempt $i/30..."
    sleep 2
done

# Check if container is running
echo "✅ Checking container status..."
if [ "$(docker ps -q -f name=uflow)" ]; then
    echo -e "${GREEN}🎉 Deployment successful! Container is running.${NC}"
    docker ps | grep uflow
else
    echo -e "${RED}❌ Deployment failed! Container is not running.${NC}"
    echo "📋 Checking logs..."
    docker logs uflow --tail 50
    exit 1
fi

echo ""
echo -e "${GREEN}✨ Deployment complete!${NC}"
echo -e "${GREEN}Production is live at: https://ummahflow.com${NC}"
echo -e "${GREEN}Health check: https://ummahflow.com/api/health${NC}"

