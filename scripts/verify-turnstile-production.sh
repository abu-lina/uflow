#!/bin/bash

# Script to verify Turnstile configuration in production
# Usage: ./scripts/verify-turnstile-production.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 TURNSTILE PRODUCTION VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if HETZNER_HOST is set
if [ -z "$HETZNER_HOST" ]; then
    echo "❌ HETZNER_HOST not set"
    echo "Set it with: export HETZNER_HOST=YOUR_IP"
    exit 1
fi

echo "📡 Connecting to Hetzner server: $HETZNER_HOST"
echo ""

# Check Turnstile environment variables in production
echo "🔍 Checking Turnstile environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh root@$HETZNER_HOST << 'ENDSSH'
  echo "Container: uflow-app"
  echo ""
  
  # Check if container exists
  if ! docker ps -a | grep -q uflow-app; then
    echo "❌ Container 'uflow-app' not found"
    exit 1
  fi
  
  # Check if container is running
  if ! docker ps | grep -q uflow-app; then
    echo "⚠️  Container 'uflow-app' is not running"
    echo "Starting container..."
    docker start uflow-app
    sleep 5
  fi
  
  echo "✅ Container is running"
  echo ""
  echo "📋 Environment Variables:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Get Turnstile environment variables
  docker exec uflow-app env | grep TURNSTILE | while IFS='=' read -r key value; do
    if [ "$key" = "NEXT_PUBLIC_TURNSTILE_SITE_KEY" ]; then
      echo "Site Key (full): $value"
      echo "Site Key (first 20): ${value:0:20}..."
    elif [ "$key" = "TURNSTILE_SECRET_KEY" ]; then
      echo "Secret Key: ${value:0:20}... (hidden for security)"
    fi
  done
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Verification complete"
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 COMPARISON CHECKLIST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Compare the Site Key above with:"
echo "1. Browser console: 0x4AAAAAACAqOzp-Vvpm5W5a"
echo "2. Cloudflare widget site key"
echo "3. GitHub Secret: NEXT_PUBLIC_TURNSTILE_SITE_KEY"
echo ""
echo "All 3 should match EXACTLY!"
echo ""
echo "If they don't match:"
echo "  → Update GitHub Secret"
echo "  → Redeploy (container will restart with new env var)"
echo ""



