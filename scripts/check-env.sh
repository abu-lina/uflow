#!/bin/bash
# Validate .env.local Supabase credentials before starting the dev server.
# Catches the "Unregistered API key" crash that silently breaks all SSR.
#
# Runs as `predev` npm hook — exits 0 to allow dev server, exits 1 to block.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}Missing $ENV_FILE — copy from .env.local.localdb or run: npx supabase status${NC}"
  exit 1
fi

# Extract current values
URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)
KEY=$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo -e "${RED}NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing in $ENV_FILE${NC}"
  exit 1
fi

is_local_url() {
  case "$1" in
    http://127.0.0.1:*|http://localhost:*|http://0.0.0.0:*) return 0 ;;
    *) return 1 ;;
  esac
}

# Only validate when pointing at local Supabase
if ! is_local_url "$URL"; then
  exit 0
fi

# Probe the local Supabase REST endpoint with the configured key
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $KEY" \
  "$URL/rest/v1/" \
  --connect-timeout 3 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "000" ]; then
  echo -e "${YELLOW}Local Supabase not reachable at $URL — is it running? (npx supabase start)${NC}"
  echo -e "${YELLOW}Proceeding anyway — server will fail if Supabase is needed.${NC}"
  exit 0
fi

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
  echo ""
  echo -e "${RED}Supabase API key rejected (HTTP $HTTP_CODE) — .env.local key doesn't match local instance.${NC}"
  echo ""

  # Try to auto-fix from supabase status
  if command -v npx &>/dev/null; then
    EXPECTED_KEY=$(npx supabase status 2>/dev/null | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if 'ANON_KEY' in d:
            print(d['ANON_KEY'])
            break
    except json.JSONDecodeError:
        continue
" 2>/dev/null || true)
    EXPECTED_URL=$(npx supabase status 2>/dev/null | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if 'API_URL' in d:
            print(d['API_URL'])
            break
    except json.JSONDecodeError:
        continue
" 2>/dev/null || true)

    if [ -n "$EXPECTED_KEY" ] && [ "$EXPECTED_KEY" != "$KEY" ]; then
      echo -e "${YELLOW}Auto-fixing: updating NEXT_PUBLIC_SUPABASE_ANON_KEY in $ENV_FILE${NC}"
      if [ "$(uname)" = "Darwin" ]; then
        sed -i '' "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$EXPECTED_KEY|" "$ENV_FILE"
      else
        sed -i "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$EXPECTED_KEY|" "$ENV_FILE"
      fi
      echo -e "${GREEN}Fixed ANON_KEY.${NC}"
    fi

    if [ -n "$EXPECTED_URL" ] && [ "$EXPECTED_URL" != "$URL" ]; then
      echo -e "${YELLOW}Auto-fixing: updating NEXT_PUBLIC_SUPABASE_URL in $ENV_FILE${NC}"
      if [ "$(uname)" = "Darwin" ]; then
        sed -i '' "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$EXPECTED_URL|" "$ENV_FILE"
      else
        sed -i "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$EXPECTED_URL|" "$ENV_FILE"
      fi
      echo -e "${GREEN}Fixed URL.${NC}"
    fi

    # Re-check after fix
    FIXED_KEY=$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)
    FIXED_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)
    RECHECK=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "apikey: $FIXED_KEY" \
      "$FIXED_URL/rest/v1/" \
      --connect-timeout 3 2>/dev/null || echo "000")

    if [ "$RECHECK" = "200" ]; then
      echo -e "${GREEN}Supabase credentials validated after auto-fix.${NC}"
      echo ""
      exit 0
    fi
  fi

  echo -e "${RED}Could not auto-fix. Update .env.local manually:${NC}"
  echo "  npx supabase status   # copy ANON_KEY and API_URL"
  echo "  # or: cp .env.local.localdb .env.local"
  exit 1
fi

# 200 = all good
if [ "$HTTP_CODE" = "200" ]; then
  exit 0
fi

echo -e "${YELLOW}Unexpected Supabase response (HTTP $HTTP_CODE) — proceeding.${NC}"
exit 0
