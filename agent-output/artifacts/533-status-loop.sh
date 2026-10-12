#!/usr/bin/env bash
# Issue 533 feedback loop: assert HTTP status codes for the soft-404 routes.
# Usage: BASE=http://localhost:3533 ./533-status-loop.sh
# Red when an unknown dynamic slug answers 200 instead of 404.
set -u
BASE="${BASE:-http://localhost:3533}"
fail=0

check() { # path expected
  code=$(curl -s -o /tmp/533-body.html -w '%{http_code}' "$BASE$1")
  title=$(grep -o '<title>[^<]*</title>' /tmp/533-body.html | head -1)
  if [ "$code" = "$2" ]; then verdict=PASS; else verdict="FAIL(want $2)"; fail=1; fi
  printf '%-6s %-4s %-50s %s\n' "$verdict" "$code" "$1" "$title"
}

check /food/zzz-not-a-real-city-xyz123 404
check /food/zzz-not-a-real-city-xyz123/also-fake 404
check /p/00000000-0000-0000-0000-000000000000 404
check /this-route-does-not-exist-at-all 404
check /food 200
check /food/berlin 200

exit $fail
