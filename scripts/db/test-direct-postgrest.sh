#!/bin/bash
# =====================================================
# TEST DIRECT POSTGREST REQUEST
# =====================================================
# This tests if PostgREST accepts the insert when we
# send the anon key directly as Authorization header
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

echo "Testing direct PostgREST request..."
echo "URL: $SUPABASE_URL"
echo "Anon Key Type: $(echo $ANON_KEY | cut -c1-10)..."

# Test insert with anon key as Authorization header
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/community_services" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "community_service_name": "Test Service - DELETE ME",
    "user_created_id": null,
    "provider_id": null,
    "review_status": "approved"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ SUCCESS - Insert worked!"
  echo "Now delete the test record from Supabase dashboard"
else
  echo "❌ FAILED - Insert blocked"
  echo "This confirms the policy is blocking even with anon key"
fi
