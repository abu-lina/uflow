#!/bin/bash
# =====================================================
# TEST WITHOUT RETURN=REPRESENTATION
# =====================================================
# If the SELECT policy is blocking, removing the
# Prefer header should allow the INSERT to succeed
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

echo "Testing WITHOUT Prefer: return=representation..."
echo "URL: $SUPABASE_URL"
echo ""

# Test without the Prefer header (no SELECT needed)
echo "=== TEST: Insert without return=representation ==="
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/community_services" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "community_service_name": "Test No Return"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ SUCCESS - INSERT works without return!"
  echo "The issue is the SELECT policy blocking return=representation"
elif [ "$HTTP_CODE" = "204" ]; then
  echo "✅ SUCCESS - INSERT works (204 No Content)!"
  echo "The issue is the SELECT policy blocking return=representation"
else
  echo "❌ FAILED - Issue is NOT the SELECT policy"
  echo "Something else is blocking at a different layer"
fi
