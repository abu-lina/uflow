#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting deployment to Hetzner...${NC}"

# Load environment variables from .env.local
if [ -f .env.local ]; then
    echo "📋 Loading environment variables from .env.local..."
    source .env.local
else
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Run the deployment script
./deploy-hetzner-fixed.sh
