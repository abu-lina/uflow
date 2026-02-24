#!/bin/bash
# =====================================================
# TEST PROVIDER INSERT (for non-Community Support categories)
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

echo "Testing provider insert (anonymous)..."
echo "URL: $SUPABASE_URL"
echo ""

# Test with return=representation
echo "=== TEST: Provider insert with return=representation ==="
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/providers" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "provider_name": "Test Provider - DELETE ME",
    "user_created_id": null,
    "provider_owner_id": null,
    "review_status": "approved"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ SUCCESS - Provider insert worked!"
else
  echo "❌ FAILED - Provider insert blocked"
  
  # Test without return=representation
  echo ""
  echo "=== TEST 2: Provider insert WITHOUT return=representation ==="
  RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/rest/v1/providers" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
      "provider_name": "Test Provider 2 - DELETE ME",
      "user_created_id": null,
      "provider_owner_id": null,
      "review_status": "approved"
    }')

  HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
  BODY2=$(echo "$RESPONSE2" | sed '$d')

  echo "HTTP Status: $HTTP_CODE2"
  echo "Response: $BODY2"
  
  if [ "$HTTP_CODE2" = "201" ] || [ "$HTTP_CODE2" = "204" ]; then
    echo "✅ INSERT works without return - SELECT policy is the issue"
  else
    echo "❌ INSERT itself is failing"
  fi
fi
