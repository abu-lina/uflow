#!/bin/bash

echo "🚀 Deploying Supabase Auth Hooks for UmmahFlow"
echo ""
echo "This script will:"
echo "1. Check Supabase CLI installation"
echo "2. Deploy the Edge Function"
echo "3. Set environment secrets"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found"
    echo ""
    echo "Install it with:"
    echo "npm install -g supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if user is logged in
echo "🔐 Checking Supabase login..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo ""
    echo "Run: supabase login"
    echo ""
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Deploy the function
echo "📦 Deploying Edge Function..."
supabase functions deploy send-confirmation-email --project-ref rdtdtcfntopcxcigkqoq

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Failed to deploy Edge Function"
    exit 1
fi

echo ""

# Set secrets
echo "🔑 Setting environment secrets..."

echo "Setting RESEND_API_KEY..."
supabase secrets set RESEND_API_KEY=re_4m8Qc9hr_C9b2hRuL3dYDPnRu6mxwTLyL --project-ref rdtdtcfntopcxcigkqoq

echo "Setting SITE_URL..."
supabase secrets set SITE_URL=https://ummahflow.com --project-ref rdtdtcfntopcxcigkqoq

echo ""
echo "⚠️  IMPORTANT: After creating the auth hook in the dashboard:"
echo "1. Copy the generated webhook secret (starts with v1,whsec_)"
echo "2. Run this command to set it:"
echo "   supabase secrets set WEBHOOK_SECRET=YOUR_SECRET_HERE --project-ref rdtdtcfntopcxcigkqoq"
echo ""

echo "✅ Basic secrets set successfully"
echo ""

# List secrets to verify
echo "📋 Verifying secrets..."
supabase secrets list --project-ref rdtdtcfntopcxcigkqoq

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Go to: https://supabase.com/dashboard/project/rdtdtcfntopcxcigkqoq/auth/hooks"
echo "2. Create a new hook:"
echo "   - Hook name: send-confirmation-email"
echo "   - Hook type: Send Email"
echo "   - Events: User created"
echo "   - Function URL: https://rdtdtcfntopcxcigkqoq.supabase.co/functions/v1/send-confirmation-email"
echo "   - Enable the hook"
echo "3. Test by signing up a new user!"
echo ""
echo "📖 Full guide: DEPLOY_AUTH_HOOKS.md"

