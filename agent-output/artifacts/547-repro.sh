#!/usr/bin/env bash
# Issue 547 feedback loop. Red when a provider that EXISTS in the database
# answers /p/<id> with HTTP 404.
#
# Credentials stay in the environment. Never paste them into a file.
#   export SUPA_URL=https://<ref>.supabase.co
#   export SUPA_SERVICE_KEY=...        # service_role, RLS bypassed (ground truth)
#   export SUPA_ANON_KEY=...           # publishable/anon key, what middleware uses
#   export BASE_URL=https://uat.ummahflow.com
#   ./547-repro.sh <provider-uuid>
set -uo pipefail

ID="${1:-2e3f9942-8cce-4570-a474-24cba76963f0}"
BASE_URL="${BASE_URL:-https://uat.ummahflow.com}"

q() { # q <key> <query>
  curl -s "$SUPA_URL/rest/v1/$2" -H "apikey: $1" -H "Authorization: Bearer $1" -H 'accept: application/json'
}

SEL="providers?select=provider_id,review_status&provider_id=eq.$ID&limit=1"
truth=$(q "$SUPA_SERVICE_KEY" "$SEL")
anon=$(q "$SUPA_ANON_KEY" "$SEL")
status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/p/$ID")

echo "provider_id        : $ID"
echo "service_role rows  : $truth"
echo "anon rows          : $anon"
echo "GET /p/<id> status : $status"

exists=$([ "$truth" != "[]" ] && echo yes || echo no)
if [ "$exists" = yes ] && [ "$status" = "404" ]; then
  echo "RED: provider exists in the database but /p/<id> answers 404"
  exit 1
fi
if [ "$exists" = no ] && [ "$status" != "404" ]; then
  echo "RED: provider does not exist but /p/<id> answers $status (issue 533 soft-404)"
  exit 1
fi
echo "GREEN"
