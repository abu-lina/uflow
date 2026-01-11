#!/bin/bash
# =====================================================
# TEST AUTH CONTEXT VIA POSTGREST
# =====================================================
# This tests what auth.role() returns when anon key is sent
# =====================================================

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "❌ Missing SUPABASE_URL or ANON_KEY"
  exit 1
fi

echo "Testing auth context via PostgREST..."
echo "URL: $SUPABASE_URL"
echo ""

# Call the debug function via PostgREST
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/debug_auth_context" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Auth Context: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Got auth context - check the values above"
  echo "This shows what auth.role() and auth.uid() return when anon key is sent"
else
  echo "❌ Failed to get auth context"
  echo "Response: $BODY"
fi
