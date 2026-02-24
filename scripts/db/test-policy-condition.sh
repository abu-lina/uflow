#!/bin/bash
# =====================================================
# TEST POLICY CONDITION VIA POSTGREST
# =====================================================
# This tests if the policy condition evaluates to TRUE
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

echo "Testing policy condition evaluation..."
echo "URL: $SUPABASE_URL"
echo ""

# Call the test function with NULL user_created_id
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/test_policy_condition" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"test_user_created_id": null}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Policy Condition Test: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Got policy condition evaluation"
  echo "Check if 'final_result' is true - if yes, policy SHOULD allow insert"
  echo "If 'final_result' is false, that's why the policy is blocking"
else
  echo "❌ Failed to test policy condition"
  echo "Response: $BODY"
fi
