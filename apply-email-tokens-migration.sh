#!/bin/bash

# Script to apply email confirmation tokens migration to Supabase
# Usage: ./apply-email-tokens-migration.sh

set -e

echo "🔧 Applying Email Confirmation Tokens Migration..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check if required variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Extract project ref from Supabase URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -n 's/.*\/\/\([^.]*\).*/\1/p')

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Error: Could not extract project reference from NEXT_PUBLIC_SUPABASE_URL"
    exit 1
fi

echo "📋 Project Reference: $PROJECT_REF"
echo ""

# Check if migration file exists
if [ ! -f "create-email-confirmation-tokens-table.sql" ]; then
    echo "❌ Error: Migration file not found"
    echo "Expected: create-email-confirmation-tokens-table.sql"
    exit 1
fi

echo "✅ Migration file found"
echo ""

# Display migration preview
echo "📄 Migration Preview:"
echo "-----------------------------------"
head -n 20 create-email-confirmation-tokens-table.sql
echo "..."
echo "-----------------------------------"
echo ""

# Ask for confirmation
read -p "Apply this migration? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🚀 Applying migration..."
echo ""

# Use psql to apply migration directly
# Note: This requires psql to be installed
if command -v psql &> /dev/null; then
    # Build connection string
    DB_URL="${NEXT_PUBLIC_SUPABASE_URL/https:\/\//}"
    DB_HOST="${DB_URL/supabase.co/db.supabase.co}"
    
    # Apply migration using psql
    PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" psql \
        -h "$DB_HOST" \
        -U postgres \
        -d postgres \
        -f create-email-confirmation-tokens-table.sql
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration applied successfully!"
        echo ""
        echo "🧪 Testing..."
        
        # Test table creation
        PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" psql \
            -h "$DB_HOST" \
            -U postgres \
            -d postgres \
            -c "SELECT COUNT(*) FROM public.email_confirmation_tokens;" \
            2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Table verified successfully!"
            echo ""
            echo "🎉 All done! You can now:"
            echo "   1. Test signup flow"
            echo "   2. Check server logs for [TOKEN] messages"
            echo "   3. Verify tokens in database"
        else
            echo ""
            echo "⚠️  Table verification failed, but migration may have succeeded"
            echo "Check Supabase dashboard to verify"
        fi
    else
        echo ""
        echo "❌ Migration failed"
        echo "Please check the error message above"
        exit 1
    fi
else
    echo "⚠️  psql not found. Please apply migration manually:"
    echo ""
    echo "Option 1: Using Supabase Dashboard"
    echo "  1. Go to https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Open SQL Editor"
    echo "  4. Copy and run: create-email-confirmation-tokens-table.sql"
    echo ""
    echo "Option 2: Install psql and run this script again"
    echo "  brew install postgresql  # on macOS"
    echo "  apt-get install postgresql-client  # on Linux"
fi

echo ""
echo "📚 For more details, see: FIX_EMAIL_CONFIRMATION_TOKEN_ERROR.md"

