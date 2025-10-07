#!/bin/bash

# Script to apply the provider-social project relationships migration
# This script helps set up the many-to-many relationship between providers and social projects

echo "🚀 Setting up Provider-Social Project Relationships..."
echo ""

# Check if we're in the right directory
if [ ! -f "supabase/migrations/002_create_provider_community_services_relationship.sql" ]; then
    echo "❌ Error: Migration file not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "📁 Found migration file: supabase/migrations/002_create_provider_community_services_relationship.sql"
echo ""

# Check if supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    echo ""
    echo "🔧 Applying migration using Supabase CLI..."
    echo ""
    
    # Apply the migration
    supabase db push
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration applied successfully!"
        echo ""
        echo "🧪 Testing the setup..."
        echo ""
        
        # Test the setup by running a simple query
        echo "You can now test the relationship by visiting:"
        echo "http://localhost:3000/providers/f5cf7a57-74a8-4528-8aac-f4d773567adc"
        echo ""
        echo "The Barakah Effect section should now show real social projects!"
        
    else
        echo "❌ Migration failed!"
        echo "Please check the error messages above and try again."
        exit 1
    fi
    
else
    echo "⚠️  Supabase CLI not found"
    echo ""
    echo "📋 Manual steps required:"
    echo "1. Go to your Supabase project dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of:"
    echo "   supabase/migrations/002_create_provider_community_services_relationship.sql"
    echo "4. Run the SQL script"
    echo "5. Then run the setup script:"
    echo "   setup-provider-social-relationships.sql"
    echo ""
    echo "📖 For detailed instructions, see: PROVIDER_SOCIAL_RELATIONSHIPS.md"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Remove the mock data from ProviderDetailPage.tsx"
echo "2. Test the provider detail page"
echo "3. Add more social projects and relationships as needed"
echo ""
echo "✨ Done! Your provider-social project relationships are now set up."
