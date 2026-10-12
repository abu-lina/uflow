#!/usr/bin/env bash
# Probe both admin-decision surfaces for one email.
# Usage: ENVFILE=/path/.env.local ./probe-567.sh <email>
# Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in ENVFILE.
set -euo pipefail
EMAIL="$1"
set -a; . "${ENVFILE:?set ENVFILE}"; set +a
U="$NEXT_PUBLIC_SUPABASE_URL"; K="$SUPABASE_SERVICE_ROLE_KEY"

echo "project: $(echo "$U" | sed -E 's#https://([^.]+).*#\1#')"

echo "--- surface A: public.users (server gate, roles.ts getUserRole) ---"
curl -s "$U/rest/v1/users?email=eq.$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$EMAIL")&select=user_id,email,role" \
  -H "apikey: $K" -H "Authorization: Bearer $K"
echo

echo "--- surface B: auth.users metadata (client gate, useIsAdmin) ---"
curl -s "$U/auth/v1/admin/users?per_page=1000" -H "apikey: $K" -H "Authorization: Bearer $K" \
 | python3 -c "
import json,sys
email=sys.argv[1]
d=json.load(sys.stdin)
for u in d.get('users',[]):
    if (u.get('email') or '').lower()==email.lower():
        print(json.dumps({'auth_id':u['id'],'email':u['email'],
                          'user_metadata':u.get('user_metadata'),
                          'app_metadata':u.get('app_metadata'),
                          'last_sign_in_at':u.get('last_sign_in_at')},indent=1))
        break
else:
    print('NO auth.users ROW for '+email)
" "$EMAIL"

echo "--- verdict ---"
echo "client admin UI shows only if surface B user_metadata.role in (admin,moderator)"
