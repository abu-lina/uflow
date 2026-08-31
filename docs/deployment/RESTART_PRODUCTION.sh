#!/bin/bash

# Restart Production Container Script

set -e

echo "🔍 Checking existing containers..."
docker ps -a | grep uflow

echo ""
echo "🔍 Checking for production image..."
docker images | grep uflow

echo ""
echo "🚀 Starting production container..."

# Check if image exists
if docker images | grep -q "uflow.*latest"; then
    echo "✅ Found production image"
    
    # Start production container with all required environment variables
    # Load secrets from environment or .env file
    # NEVER hardcode secrets here - use: source .env.production
    docker run -d -p 3000:3000 \
      -e NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?Missing NEXT_PUBLIC_SUPABASE_URL}" \
      -e NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:?Missing NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
      -e SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY}" \
      -e NEXT_PUBLIC_SITE_URL="https://ummahflow.com" \
      -e NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY}" \
      -e TURNSTILE_SECRET_KEY="${TURNSTILE_SECRET_KEY}" \
      -e DISABLE_PWA=false \
      --name uflow-app uflow:latest
    
    echo ""
    echo "⏳ Waiting for container to start..."
    sleep 5
    
    echo ""
    echo "✅ Container status:"
    docker ps | grep uflow-app
    
    echo ""
    echo "🧪 Testing local connection:"
    curl -I http://localhost:3000 | head -5
    
    echo ""
    echo "📋 Container logs (last 10 lines):"
    docker logs uflow-app --tail 10
    
else
    echo "❌ Production image not found!"
    echo "You need to build the production image first."
    echo ""
    echo "Run:"
    echo "  docker build -t uflow:latest ."
fi




