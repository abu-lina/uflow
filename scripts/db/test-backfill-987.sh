#!/usr/bin/env bash
# #987: exercise backfill-987 and restore-987 against the LOCAL Supabase DB only.
# Commits and then undoes its own changes; an EXIT trap puts food_providers back even after a mid-run failure.
set -euo pipefail
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
cd "$(dirname "$0")"
q() { psql -X "$DB" -At -v ON_ERROR_STOP=1 -c "$1"; }
snap() { q "SELECT md5(string_agg(f::text, '|' ORDER BY provider_id)) FROM public.food_providers f"; }
bf() { psql -X "$DB" -v ON_ERROR_STOP=1 -v allow_small=1 "$@" -f backfill-987-food-halal.sql 2>&1; }
rs() { psql -X "$DB" -v ON_ERROR_STOP=1 "$@" -f restore-987-food-halal.sql 2>&1; }

ADDED=""
cleanup() {
  local rc=$?
  # Put the three answers and updated_at back from the backup, drop rows we added, drop test tables.
  if [ -n "$(q "SELECT to_regclass('public._987_test_bk')" 2>/dev/null)" ]; then
    q "UPDATE public.food_providers f SET no_alcohol=b.no_alcohol, no_pork=b.no_pork, no_gambling=b.no_gambling, updated_at=b.updated_at
       FROM public._987_test_bk b WHERE f.provider_id=b.provider_id" >/dev/null
    q "DROP TABLE public._987_test_bk" >/dev/null
  fi
  [ -z "$ADDED" ] || q "DELETE FROM public.food_providers WHERE provider_id IN ($ADDED)" >/dev/null
  q "DROP TABLE IF EXISTS public.halal_backfill_987_archive" >/dev/null
  [ "$rc" -eq 0 ] || echo "FAILED (exit $rc); local DB restored" >&2
}
trap cleanup EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

q "DROP TABLE IF EXISTS public.halal_backfill_987_archive" >/dev/null
q "DROP TABLE IF EXISTS public._987_test_bk" >/dev/null
q "CREATE TABLE public._987_test_bk AS SELECT * FROM public.food_providers" >/dev/null
# Local seed has approved food providers without a food_providers row; the script refuses those
# (prod has none), so give them a NULL-answers row for the test.
ADDED=$(q "WITH i AS (INSERT INTO public.food_providers (provider_id)
   SELECT p.provider_id FROM public.providers p WHERE p.listing_type='food' AND p.review_status='approved'
   AND NOT EXISTS (SELECT 1 FROM public.food_providers f WHERE f.provider_id=p.provider_id)
   RETURNING provider_id) SELECT coalesce(string_agg(quote_literal(provider_id::text), ','), '') FROM i")
S0=$(snap)

echo "== dry run lists ids and names and changes nothing"
OUT=$(bf -v mode=dry); grep -q "provider_id" <<<"$OUT" && grep -q "has_explicit_false" <<<"$OUT" || fail "dry run printed no listing"
[ "$(snap)" = "$S0" ] || fail "dry run changed data"
[ "$(q "SELECT to_regclass('public.halal_backfill_987_archive') IS NOT NULL")" = "f" ] || fail "dry run left the archive table behind"

echo "== rehearsal (default ROLLBACK) changes nothing and prints N"
OUT=$(bf -v mode=run)
N=$(sed -n 's/^candidates to change: //p' <<<"$OUT")
[ "${N:-0}" -gt 0 ] || fail "no candidates"
[ "$(snap)" = "$S0" ] || fail "rehearsal changed data"

echo "== COMMIT without expect_changed, with the wrong N, or with a bad finish is refused"
OUT=$(bf -v mode=run -v finish=COMMIT) ; grep -q "expect_changed" <<<"$OUT" || fail "no expect_changed demanded"
OUT=$(bf -v mode=run -v finish=COMMIT -v expect_changed=$((N+1))); grep -q "REFUSING" <<<"$OUT" || fail "wrong N accepted"
OUT=$(bf -v mode=run -v finish=BOGUS); grep -q "finish must be" <<<"$OUT" || fail "bad finish accepted"
[ "$(snap)" = "$S0" ] || fail "refused runs changed data"

echo "== real run"
bf -v mode=run -v finish=COMMIT -v expect_changed="$N" >/dev/null
[ "$(q "SELECT count(*) FROM public.halal_backfill_987_archive")" = "$N" ] || fail "archived != N"
[ "$(q "SELECT count(*) FROM public.food_providers f JOIN public.providers p USING (provider_id)
        WHERE p.review_status='approved' AND NOT (f.no_alcohol AND f.no_pork AND f.no_gambling)")" = "0" ] || fail "approved row still below the bar"
A1=$(q "SELECT md5(string_agg(a::text, '|' ORDER BY provider_id)) FROM public.halal_backfill_987_archive a")
S1=$(snap)

echo "== second run changes nothing and keeps the archive"
OUT=$(bf -v mode=run -v finish=COMMIT -v expect_changed=0); grep -q "candidates to change: 0" <<<"$OUT" || fail "second run found candidates"
[ "$(snap)" = "$S1" ] || fail "second run changed data"
[ "$(q "SELECT md5(string_agg(a::text, '|' ORDER BY provider_id)) FROM public.halal_backfill_987_archive a")" = "$A1" ] || fail "second run touched the archive"

echo "== restore skips a row edited since the backfill, and lists it by name"
EDITED=$(q "SELECT provider_id FROM public.halal_backfill_987_archive ORDER BY provider_id LIMIT 1")
q "UPDATE public.food_providers SET no_gambling = true, updated_at = now() + interval '1 second' WHERE provider_id = '$EDITED'" >/dev/null
OUT=$(rs); grep -q "SKIPPED: edited since backfill" <<<"$OUT" || fail "restore dry run did not list the edited row"
[ "$(snap)" != "$S0" ] || true
rs -v mode=run -v finish=COMMIT >/dev/null
[ "$(q "SELECT count(*) FROM public.halal_backfill_987_archive WHERE restored_at IS NULL")" = "1" ] || fail "expected exactly the edited row left unrestored"
[ "$(q "SELECT no_gambling FROM public.food_providers WHERE provider_id='$EDITED'")" = "t" ] || fail "restore overwrote an edited row"

echo "== second restore is a no-op"
S2=$(snap)
rs -v mode=run -v finish=COMMIT >/dev/null
[ "$(snap)" = "$S2" ] || fail "second restore changed data"

echo "== restored rows match the original values exactly"
OTHER=$(q "SELECT count(*) FROM public.food_providers f JOIN public._987_test_bk b USING (provider_id)
           WHERE f.provider_id <> '$EDITED' AND (f.no_alcohol, f.no_pork, f.no_gambling, f.updated_at) IS DISTINCT FROM (b.no_alcohol, b.no_pork, b.no_gambling, b.updated_at)")
[ "$OTHER" = "0" ] || fail "$OTHER restored rows differ from the original"

echo "== refuses a small DB without allow_small"
OUT=$(psql -X "$DB" -v mode=run -v finish=COMMIT -v expect_changed=1 -v i_am_prod=yes -f backfill-987-food-halal.sql 2>&1); grep -q "REFUSING" <<<"$OUT" || fail "did not refuse a small DB"

echo "PASS: $N rows backfilled and archived, COMMIT guards hold, re-run no-op, restore exact, edited row skipped, second restore no-op"
