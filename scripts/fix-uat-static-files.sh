#!/bin/bash

# Fix UAT static files issue
# This script diagnoses and fixes missing static files in the UAT Docker container

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Diagnosing UAT static files issue...${NC}"
echo ""

# Step 1: Check if UAT container is running
echo -e "${BLUE}Step 1: Checking UAT container status${NC}"
if docker ps | grep -q "uflow-uat"; then
    echo -e "${GREEN}✅ UAT container is running${NC}"
    
    # Check container health
    echo ""
    echo -e "${BLUE}Container logs (last 20 lines):${NC}"
    docker logs --tail 20 uflow-uat
    
    # Check if static directory exists in container
    echo ""
    echo -e "${BLUE}Checking static directory in container:${NC}"
    if docker exec uflow-uat ls -la .next/static 2>/dev/null; then
        echo -e "${GREEN}✅ Static directory exists in container${NC}"
        
        # Show file structure
        echo ""
        echo -e "${BLUE}Static directory structure:${NC}"
        docker exec uflow-uat find .next/static -type f | head -20
    else
        echo -e "${RED}❌ Static directory missing or empty in container${NC}"
        echo "This confirms the issue - the container doesn't have static files."
    fi
else
    echo -e "${YELLOW}⚠️  UAT container is not running${NC}"
fi

# Step 2: Check build artifacts on host
echo ""
echo -e "${BLUE}Step 2: Checking build environment${NC}"
echo "Current directory: $(pwd)"

# Step 3: Offer to rebuild
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Diagnosis complete. Ready to fix?${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "The fix will:"
echo "  1. Rebuild the UAT Docker image with updated Dockerfile"
echo "  2. Add verification steps to ensure static files are copied"
echo "  3. Restart the UAT container"
echo "  4. Verify the fix worked"
echo ""
read -p "Proceed with fix? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Fix cancelled by user${NC}"
    exit 0
fi

# Step 4: Rebuild and redeploy
echo ""
echo -e "${BLUE}Step 3: Rebuilding UAT with updated Dockerfile${NC}"

# Check if .env.uat exists
if [ ! -f ".env.uat" ]; then
    echo -e "${RED}❌ .env.uat file not found!${NC}"
    echo "Please create .env.uat from env.uat.template"
    exit 1
fi

# Load environment variables
echo "Loading UAT environment variables..."
export $(cat .env.uat | grep -v '^#' | xargs)

# Validate required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Required environment variables not set${NC}"
    exit 1
fi

# Build with --no-cache to ensure fresh build
echo ""
echo -e "${BLUE}Building Docker image (this may take a few minutes)...${NC}"
docker build \
    --no-cache \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-arg NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://uat.ummahflow.com}" \
    --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
    -t uflow-uat:latest \
    -f Dockerfile \
    .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Stop existing container
echo ""
echo -e "${BLUE}Stopping existing UAT container...${NC}"
docker stop uflow-uat 2>/dev/null || true
docker rm uflow-uat 2>/dev/null || true

# Start new container
echo ""
echo -e "${BLUE}Starting new UAT container...${NC}"
docker run -d \
    --name uflow-uat \
    --restart unless-stopped \
    -p 3001:3000 \
    --env-file .env.uat \
    uflow-uat:latest

# Wait for container to start
echo "Waiting for container to start..."
sleep 10

# Verify static files in new container
echo ""
echo -e "${BLUE}Step 4: Verifying static files in new container${NC}"
if docker exec uflow-uat ls -la .next/static 2>/dev/null; then
    echo -e "${GREEN}✅ Static directory exists in new container${NC}"
    
    # Count files
    FILE_COUNT=$(docker exec uflow-uat find .next/static -type f | wc -l)
    echo "Found $FILE_COUNT static files"
    
    if [ "$FILE_COUNT" -gt 10 ]; then
        echo -e "${GREEN}✅ Static files appear to be present${NC}"
    else
        echo -e "${YELLOW}⚠️  Only $FILE_COUNT static files found (expected more)${NC}"
    fi
else
    echo -e "${RED}❌ Static directory still missing${NC}"
    echo "Build may have failed to generate static files."
    exit 1
fi

# Health check
echo ""
echo -e "${BLUE}Step 5: Health check${NC}"
for i in {1..30}; do
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ UAT health check passed${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ UAT health check failed${NC}"
        docker logs --tail 50 uflow-uat
        exit 1
    fi
    echo "Health check attempt $i/30..."
    sleep 2
done

# Test static file access
echo ""
echo -e "${BLUE}Step 6: Testing static file access${NC}"
echo "Testing direct container access to health endpoint..."
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
echo "Health endpoint returned: $HEALTH_CODE"

# Final verification through nginx
echo ""
echo -e "${BLUE}Step 7: Testing through nginx${NC}"
echo "Testing https://uat.ummahflow.com/api/health"
UAT_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://uat.ummahflow.com/api/health 2>/dev/null || echo "000")
if [ "$UAT_CODE" = "200" ]; then
    echo -e "${GREEN}✅ UAT accessible through nginx${NC}"
else
    echo -e "${YELLOW}⚠️  UAT returned HTTP $UAT_CODE through nginx${NC}"
    echo "You may need to reload nginx: sudo systemctl reload nginx"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Fix complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Clear your browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)"
echo "  2. Hard refresh https://uat.ummahflow.com (Ctrl+F5 or Cmd+Shift+R)"
echo "  3. Check browser console for any remaining errors"
echo ""
echo "If you still see 404 errors:"
echo "  - Run: docker exec uflow-uat find .next/static | head -20"
echo "  - Check nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "  - Review container logs: docker logs -f uflow-uat"

