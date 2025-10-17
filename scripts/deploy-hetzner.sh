#!/bin/bash

# Hetzner Deployment Script
# This script rebuilds and redeploys your app on Hetzner

echo "🚀 Starting deployment to Hetzner..."

# Pull latest code
echo "📥 Pulling latest code from git..."
git pull

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t uflow .

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
  --env-file .env.local \
  uflow

# Check if container is running
echo "✅ Checking container status..."
if [ "$(docker ps -q -f name=uflow)" ]; then
    echo "🎉 Deployment successful! Container is running."
    docker ps | grep uflow
else
    echo "❌ Deployment failed! Container is not running."
    echo "📋 Checking logs..."
    docker logs uflow --tail 50
    exit 1
fi

echo "✨ Deployment complete!"

