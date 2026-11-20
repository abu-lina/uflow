#!/usr/bin/env bash
# #1004: run the editor-ready #987 scripts (scripts/db/editor/) against the LOCAL Supabase DB only.
# Each file is fed to psql as a plain script, exactly as pasted into the SQL Editor. The only edits are the
# constants the owner edits (expected db name, expected N) and a small-DB threshold, applied with sed to
# temp copies; the owner-facing files never contain a test override. An EXIT trap puts the local DB back.
set -euo pipefail
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
cd "$(dirname "$0")/editor" 2>/dev/null || { echo "FAIL: scripts/db/editor/ does not exist" >&2; exit 1; }
TMP=$(mktemp -d)
q() { psql -X "$DB" -At -v ON_ERROR_STOP=1 -c "$1"; }
# Plain-session run: ON_ERROR_STOP mimics the editor stopping at the first error. Never fails the script.
run() { psql -X "$DB" -At -v ON_ERROR_STOP=1 -f "$1" 2>&1 || true; }
snap() { q "SELECT md5(string_agg(f::text, '|' ORDER BY provider_id)) FROM public.food_providers f"; }
archive_exists() { q "SELECT to_regclass('public.halal_backfill_987_archive') IS NOT NULL"; }
archive_md5() { q "SELECT md5(string_agg(a::text, '|' ORDER BY provider_id)) FROM public.halal_backfill_987_archive a"; }

ADDED=""
cleanup() {
  local rc=$?
  if [ -n "$(q "SELECT to_regclass('public._1004_test_bk')" 2>/dev/null)" ]; then
    q "UPDATE public.food_providers f SET no_alcohol=b.no_alcohol, no_pork=b.no_pork, no_gambling=b.no_gambling, updated_at=b.updated_at
       FROM public._1004_test_bk b WHERE f.provider_id=b.provider_id" >/dev/null
    q "DROP TABLE public._1004_test_bk" >/dev/null
  fi
  [ -z "$ADDED" ] || q "DELETE FROM public.food_providers WHERE provider_id IN ($ADDED)" >/dev/null
  q "DROP TABLE IF EXISTS public.halal_backfill_987_archive" >/dev/null
  rm -rf "$TMP"
  [ "$rc" -eq 0 ] || echo "FAILED (exit $rc); local DB restored" >&2
}
trap cleanup EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

# set_const FILE 'sed-from' 'sed-to': edit a constant in a temp copy and prove the edit landed.
set_const() { sed -i.bak "s/$2/$3/" "$1"; ! diff -q "$1" "$1.bak" >/dev/null || fail "constant '$2' not found in $1"; rm -f "$1.bak"; }
# owner_copy FILE N: the file as the owner would edit it, plus the test-only small-DB threshold.
owner_copy() {
  cp "$1" "$TMP/$1"
  set_const "$TMP/$1" "expected_db_name text := 'EDIT_ME'" "expected_db_name text := 'postgres'"
  set_const "$TMP/$1" "expected_changed int := -1" "expected_changed int := $2"
  set_const "$TMP/$1" "min_approved_food int := 100" "min_approved_food int := 1"
}

for f in 1-dry-run 2-rehearsal 3-run 4-verify 5-restore-dry-run 5-restore; do
  [ -f "$f.sql" ] || fail "missing editor/$f.sql"
done
[ -f README.md ] || fail "missing editor/README.md"

echo "== files are plain SQL: no psql meta-commands, no psql variables, no RAISE NOTICE"
for f in *.sql; do
  ! sed 's/--.*//' "$f" | grep -nE '^[[:space:]]*\\|(^|[^:]):[A-Za-z_{?'"'"']|RAISE NOTICE' || fail "$f uses a psql feature or RAISE NOTICE"
done

q "DROP TABLE IF EXISTS public.halal_backfill_987_archive" >/dev/null
q "DROP TABLE IF EXISTS public._1004_test_bk" >/dev/null
q "CREATE TABLE public._1004_test_bk AS SELECT * FROM public.food_providers" >/dev/null
# Local seed has approved food providers without a food_providers row; the scripts refuse those (prod has none).
ADDED=$(q "WITH i AS (INSERT INTO public.food_providers (provider_id)
   SELECT p.provider_id FROM public.providers p WHERE p.listing_type='food' AND p.review_status='approved'
   AND NOT EXISTS (SELECT 1 FROM public.food_providers f WHERE f.provider_id=p.provider_id)
   RETURNING provider_id) SELECT coalesce(string_agg(quote_literal(provider_id::text), ','), '') FROM i")
S0=$(snap)

echo "== 1-dry-run lists rows and a count, changes nothing"
OUT=$(run 1-dry-run.sql)
N=$(grep -m1 '== TOTAL ==' <<<"$OUT" | cut -d'|' -f7)
[ "${N:-0}" -gt 0 ] || fail "dry run printed no TOTAL row with candidates: $OUT"
[ "$(grep -vc '== TOTAL ==' <<<"$OUT")" = "$N" ] || fail "dry run row count != candidates ($N)"
BEFORE=$(grep -m1 '== TOTAL ==' <<<"$OUT" | cut -d'|' -f9)
[ "$(snap)" = "$S0" ] || fail "dry run changed data"
[ "$(archive_exists)" = "f" ] || fail "dry run created the archive table"

echo "== 2-rehearsal errors with REHEARSAL OK: N and changes nothing"
cp 2-rehearsal.sql "$TMP/" ; set_const "$TMP/2-rehearsal.sql" "min_approved_food int := 100" "min_approved_food int := 1"
OUT=$(run "$TMP/2-rehearsal.sql")
grep -q "REHEARSAL OK: $N rows would change; rolled back" <<<"$OUT" || fail "rehearsal message wrong: $OUT"
[ "$(snap)" = "$S0" ] || fail "rehearsal changed data"
[ "$(archive_exists)" = "f" ] || fail "rehearsal left the archive table behind"

echo "== 3-run as shipped (placeholders, small-DB guard) aborts and changes nothing"
OUT=$(run 3-run.sql); grep -q "ABORT" <<<"$OUT" || fail "unedited 3-run did not abort: $OUT"
[ "$(snap)" = "$S0" ] || fail "unedited 3-run changed data"

echo "== 3-run with the small-DB guard on and right constants aborts (local DB is small)"
cp 3-run.sql "$TMP/"; set_const "$TMP/3-run.sql" "expected_db_name text := 'EDIT_ME'" "expected_db_name text := 'postgres'"
set_const "$TMP/3-run.sql" "expected_changed int := -1" "expected_changed int := $N"
OUT=$(run "$TMP/3-run.sql"); grep -q "ABORT" <<<"$OUT" || fail "small DB accepted: $OUT"
[ "$(snap)" = "$S0" ] || fail "small-DB abort changed data"

echo "== 3-run with the wrong N or the wrong db name aborts and changes nothing"
owner_copy 3-run.sql $((N+1)); OUT=$(run "$TMP/3-run.sql"); grep -q "ABORT" <<<"$OUT" || fail "wrong N accepted: $OUT"
owner_copy 3-run.sql "$N"; set_const "$TMP/3-run.sql" "expected_db_name text := 'postgres'" "expected_db_name text := 'not_this_db'"
OUT=$(run "$TMP/3-run.sql"); grep -q "ABORT" <<<"$OUT" || fail "wrong db name accepted: $OUT"
[ "$(snap)" = "$S0" ] || fail "aborted runs changed data"
[ "$(archive_exists)" = "f" ] || fail "aborted runs left the archive table behind"

echo "== 3-run with the right values: archived == changed == N, 4-verify passes"
owner_copy 3-run.sql "$N"; run "$TMP/3-run.sql" >/dev/null
[ "$(q "SELECT count(*) FROM public.halal_backfill_987_archive")" = "$N" ] || fail "archived != N"
[ "$(q "SELECT count(*) FROM public.food_providers f JOIN public.providers p USING (provider_id)
        WHERE p.listing_type='food' AND p.review_status='approved' AND NOT (f.no_alcohol AND f.no_pork AND f.no_gambling)")" = "0" ] || fail "approved row still below the bar"
cp 4-verify.sql "$TMP/"; set_const "$TMP/4-verify.sql" "-1::int AS expected_changed" "$N::int AS expected_changed"
set_const "$TMP/4-verify.sql" "-1::int AS all_true_before" "$BEFORE::int AS all_true_before"
OUT=$(run "$TMP/4-verify.sql"); grep -q '^ALL CHECKS|.*|t$' <<<"$OUT" || fail "4-verify failed: $OUT"
OUT=$(run 4-verify.sql); ! grep -q '^ALL CHECKS|.*|t$' <<<"$OUT" || fail "4-verify passed with placeholder constants"
A1=$(archive_md5); S1=$(snap)

echo "== second run changes nothing and keeps the archive"
owner_copy 3-run.sql 0; run "$TMP/3-run.sql" >/dev/null
[ "$(snap)" = "$S1" ] || fail "second run changed data"
[ "$(archive_md5)" = "$A1" ] || fail "second run touched the archive"
owner_copy 3-run.sql "$N"; OUT=$(run "$TMP/3-run.sql"); grep -q "ABORT" <<<"$OUT" || fail "second run accepted the old N: $OUT"
OUT=$(run "$TMP/4-verify.sql"); grep -q '^ALL CHECKS|.*|t$' <<<"$OUT" || fail "4-verify failed after the second run: $OUT"

echo "== 5-restore-dry-run lists an edited row as skipped and changes nothing"
EDITED=$(q "SELECT provider_id FROM public.halal_backfill_987_archive ORDER BY provider_id LIMIT 1")
q "UPDATE public.food_providers SET no_gambling = true, updated_at = now() + interval '1 second' WHERE provider_id = '$EDITED'" >/dev/null
S2=$(snap)
OUT=$(run 5-restore-dry-run.sql)
grep -q "$EDITED.*SKIPPED: edited since backfill" <<<"$OUT" || fail "dry run did not list the edited row: $OUT"
[ "$(grep -c 'would restore' <<<"$OUT")" = "$((N-1))" ] || fail "dry run did not list the other $((N-1)) rows as would restore"
[ "$(snap)" = "$S2" ] || fail "restore dry run changed data"

echo "== 5-restore restores untouched rows, skips and lists the edited row"
OUT=$(run 5-restore.sql)
grep -q "$EDITED.*SKIPPED: edited since backfill" <<<"$OUT" || fail "restore did not list the edited row: $OUT"
[ "$(q "SELECT count(*) FROM public.halal_backfill_987_archive WHERE restored_at IS NULL")" = "1" ] || fail "expected exactly the edited row left unrestored"
[ "$(q "SELECT no_gambling FROM public.food_providers WHERE provider_id='$EDITED'")" = "t" ] || fail "restore overwrote an edited row"
OTHER=$(q "SELECT count(*) FROM public.food_providers f JOIN public._1004_test_bk b USING (provider_id)
           WHERE f.provider_id <> '$EDITED' AND (f.no_alcohol, f.no_pork, f.no_gambling, f.updated_at) IS DISTINCT FROM (b.no_alcohol, b.no_pork, b.no_gambling, b.updated_at)")
[ "$OTHER" = "0" ] || fail "$OTHER restored rows differ from the original"

echo "== second restore is a no-op"
S3=$(snap); run 5-restore.sql >/dev/null
[ "$(snap)" = "$S3" ] || fail "second restore changed data"

echo "PASS: $N rows listed, rehearsed, backfilled and archived once, abort paths hold, re-run no-op, restore exact, edited row skipped, second restore no-op"
