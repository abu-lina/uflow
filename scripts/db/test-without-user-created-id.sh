#!/bin/bash
# =====================================================
# TEST WITHOUT SENDING user_created_id AT ALL
# =====================================================
# Maybe the issue is sending null vs not sending the field
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

echo "Testing WITHOUT sending user_created_id field..."
echo "URL: $SUPABASE_URL"

# Test 1: Don't send user_created_id at all
echo ""
echo "=== TEST 1: Omit user_created_id entirely ==="
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/community_services" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "community_service_name": "Test Without user_created_id"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

# Test 2: Send minimal required fields only
echo ""
echo "=== TEST 2: Minimal insert with category_id ==="
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/community_services" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "community_service_name": "Test Minimal"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

# Test 3: Check what columns are required
echo ""
echo "=== Checking required columns ==="
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/community_services?limit=0" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -I 2>/dev/null | grep -i "content-profile\|x-"

echo ""
echo "Done testing"
