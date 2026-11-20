#!/usr/bin/env bash
# #987: exercise backfill-987 and restore-987 against the LOCAL Supabase DB only.
# Commits and then undoes its own changes; drops the archive table at the end.
set -euo pipefail
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
cd "$(dirname "$0")"
q() { psql "$DB" -X -At -v ON_ERROR_STOP=1 -c "$1"; }
fail() { echo "FAIL: $*" >&2; q "DROP TABLE IF EXISTS public.halal_backfill_987_archive" >/dev/null; exit 1; }
snap() { q "SELECT md5(string_agg(f::text, '|' ORDER BY provider_id)) FROM public.food_providers f"; }
run() { psql "$DB" -X -v ON_ERROR_STOP=1 -v allow_small=1 "$@" -f backfill-987-food-halal.sql; }

q "DROP TABLE IF EXISTS public.halal_backfill_987_archive" >/dev/null
# Make sure there is something to flip: one approved food row with an explicit false, one null.
# Local seed has approved food providers without a food_providers row; the script refuses those
# (prod has none), so give them a NULL-answers row for the test and remove it again at the end.
ADDED=$(q "WITH i AS (INSERT INTO public.food_providers (provider_id)
   SELECT p.provider_id FROM public.providers p WHERE p.listing_type='food' AND p.review_status='approved'
   AND NOT EXISTS (SELECT 1 FROM public.food_providers f WHERE f.provider_id=p.provider_id)
   RETURNING provider_id) SELECT coalesce(string_agg(quote_literal(provider_id::text), ','), '') FROM i")
cleanup() { [ -z "$ADDED" ] || q "DELETE FROM public.food_providers WHERE provider_id IN ($ADDED)" >/dev/null; }
trap cleanup EXIT
q "SELECT count(*) FROM public.food_providers f JOIN public.providers p USING (provider_id)
   WHERE p.review_status='approved' AND (f.no_alcohol IS NOT TRUE OR f.no_pork IS NOT TRUE OR f.no_gambling IS NOT TRUE)" | grep -qv '^0$' \
  || fail "local seed has no approved food row below the bar"

S0=$(snap)

echo "== dry run lists rows and changes nothing"
OUT=$(run -v mode=dry); grep -q "has_explicit_false" <<<"$OUT" || fail "dry run printed no listing"
[ "$(snap)" = "$S0" ] || fail "dry run changed data"
[ "$(q "SELECT to_regclass('public.halal_backfill_987_archive') IS NOT NULL")" = "f" ] || fail "dry run left the archive table behind"

echo "== rehearsal (default ROLLBACK) changes nothing"
run -v mode=run >/dev/null
[ "$(snap)" = "$S0" ] || fail "rehearsal changed data"

echo "== real run"
run -v mode=run -v finish=COMMIT >/dev/null
CHANGED=$(q "SELECT count(*) FROM public.halal_backfill_987_archive")
[ "$CHANGED" -gt 0 ] || fail "nothing archived"
[ "$(q "SELECT count(*) FROM public.food_providers f JOIN public.providers p USING (provider_id)
        WHERE p.review_status='approved' AND NOT (f.no_alcohol AND f.no_pork AND f.no_gambling)")" = "0" ] || fail "approved row still below the bar"
A1=$(q "SELECT md5(string_agg(a::text, '|' ORDER BY provider_id)) FROM public.halal_backfill_987_archive a")
S1=$(snap)

echo "== second run changes nothing and keeps the archive"
run -v mode=run -v finish=COMMIT >/dev/null
[ "$(snap)" = "$S1" ] || fail "second run changed data"
[ "$(q "SELECT md5(string_agg(a::text, '|' ORDER BY provider_id)) FROM public.halal_backfill_987_archive a")" = "$A1" ] || fail "second run touched the archive"

echo "== restore returns the original values exactly"
psql "$DB" -X -v ON_ERROR_STOP=1 -v finish=COMMIT -f restore-987-food-halal.sql >/dev/null
[ "$(snap)" = "$S0" ] || fail "restore did not return the original data"

echo "== refuses a small DB without allow_small"
OUT=$(psql "$DB" -X -v mode=run -v finish=COMMIT -f backfill-987-food-halal.sql 2>&1); grep -q REFUSING <<<"$OUT" || fail "did not refuse a small DB"
[ "$(snap)" = "$S0" ] || fail "refused run changed data"

q "DROP TABLE public.halal_backfill_987_archive" >/dev/null
echo "PASS: $CHANGED rows backfilled, archived, re-run no-op, restored exactly"
