#!/bin/bash

echo "🔍 Checking Deployment Configuration..."
echo ""

echo "📋 Local .env.local values:"
echo "NEXT_PUBLIC_SUPABASE_URL: $(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'=' -f2)"
echo "NEXT_PUBLIC_SITE_URL: $(grep NEXT_PUBLIC_SITE_URL .env.local | cut -d'=' -f2)"
echo ""

echo "🔐 GitHub Secrets to verify (go to https://github.com/abu-lina/uflow/settings/secrets/actions):"
echo "✓ NEXT_PUBLIC_SUPABASE_URL should be: https://rdtdtcfntopcxcigkqoq.supabase.co"
echo "✓ NEXT_PUBLIC_SUPABASE_ANON_KEY should match your .env.local"
echo "✓ RESEND_API_KEY should be: re_4m8Qc9hr_C9b2hRuL3dYDPnRu6mxwTLyL"
echo "✓ SUPABASE_SERVICE_ROLE_KEY should match your .env.local"
echo ""

echo "🌐 Testing live site..."
curl -s https://ummahflow.com/api/health | jq . 2>/dev/null || echo "Health endpoint not responding"
echo ""

echo "📝 Next steps:"
echo "1. Verify GitHub Secrets match your .env.local"
echo "2. Re-run the GitHub Actions workflow"
echo "3. Or manually SSH to Hetzner and restart container with correct env vars"

