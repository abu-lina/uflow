#!/bin/bash
# =====================================================
# TEST DIRECT INSERT WITH DEBUG
# =====================================================
# This tests the actual INSERT and captures the full error
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

echo "Testing direct INSERT with full error details..."
echo "URL: $SUPABASE_URL"
echo ""

# Test insert with verbose output
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/community_services?select=community_service_id" \
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

echo "HTTP Status: $HTTP_CODE"
echo "Full Response: $BODY"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ SUCCESS - Insert worked!"
  echo "The policy is now working correctly"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ FAILED - Still getting 401"
  echo "Policy condition evaluates to TRUE, but INSERT is still blocked"
  echo "This suggests PostgREST is evaluating the policy differently during INSERT"
else
  echo "❌ FAILED - HTTP $HTTP_CODE"
  echo "Unexpected error"
fi
