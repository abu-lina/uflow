#!/usr/bin/env bash
# #1004: run the editor-ready #987 scripts (scripts/db/editor/) against the LOCAL Supabase DB only.
# Each file is fed to psql as ONE batch (psql -c "$(cat file)"), like the SQL Editor does. The only edits
# are the constants the owner edits (db name, expected counts) and a small-DB threshold, applied with sed to
# temp copies; the owner-facing files never contain a test override. The test builds its own fixtures on
# approved food providers, and an EXIT trap puts food_providers back from a backup table.
set -euo pipefail
# Never inherit a connection target from the environment: this script talks to 127.0.0.1:54322 only.
for v in $(env | sed -n 's/^\(PG[A-Za-z_]*\)=.*/\1/p'); do unset "$v"; done
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
fail() { echo "FAIL: $*" >&2; exit 1; }
cd "$(dirname "$0")/editor" 2>/dev/null || fail "scripts/db/editor/ does not exist"
TMP=$(mktemp -d)

q() { psql -X "$DB" -At -v ON_ERROR_STOP=1 -c "$1"; }
# One batch per file, as the editor sends it. ON_ERROR_STOP makes an error exit non-zero; never fails the script.
run() { psql -X "$DB" -At -v ON_ERROR_STOP=1 -c "$(cat "$1")" 2>&1 || true; }
snap() { q "SELECT md5(string_agg(f::text, '|' ORDER BY provider_id)) FROM public.food_providers f"; }
snap_excl() { q "SELECT md5(string_agg(f::text, '|' ORDER BY provider_id)) FROM public.food_providers f WHERE provider_id NOT IN ('$A','$B','$F','$G')"; }
rowmd5() { q "SELECT coalesce(md5(f::text), 'none') FROM (SELECT 1) s LEFT JOIN public.food_providers f ON f.provider_id = '$1'"; }
archive_exists() { q "SELECT to_regclass('public.halal_backfill_987_archive') IS NOT NULL"; }
archive_md5() { q "SELECT md5(string_agg(a::text, '|' ORDER BY provider_id)) FROM public.halal_backfill_987_archive a"; }
marker() { q "SELECT obj_description('public.halal_backfill_987_archive'::regclass)"; }

# Puts food_providers back from the backup table: update, re-insert and delete in one transaction.
RESTORE_SQL="UPDATE public.food_providers f SET no_alcohol=b.no_alcohol, no_pork=b.no_pork, no_gambling=b.no_gambling, updated_at=b.updated_at
  FROM public._1004_test_bk b WHERE f.provider_id=b.provider_id;
INSERT INTO public.food_providers SELECT * FROM public._1004_test_bk b
  WHERE NOT EXISTS (SELECT 1 FROM public.food_providers f WHERE f.provider_id=b.provider_id);
DELETE FROM public.food_providers f WHERE NOT EXISTS (SELECT 1 FROM public._1004_test_bk b WHERE b.provider_id=f.provider_id);"

BK_CREATED=0
STARTED=0
cleanup() {
  local rc=$?
  set +e # every step runs, whatever fails before it
  if [ "$BK_CREATED" = 1 ]; then
    if psql -X "$DB" -v ON_ERROR_STOP=1 -c "$RESTORE_SQL" >/dev/null 2>&1; then
      q "DROP TABLE public._1004_test_bk" >/dev/null 2>&1
    else
      echo "WARNING: could not restore local food_providers; the original rows are in public._1004_test_bk" >&2
      rc=1
    fi
  fi
  [ "$STARTED" = 1 ] && q "DROP TABLE IF EXISTS public.halal_backfill_987_archive" >/dev/null 2>&1
  rm -rf "$TMP"
  [ "$rc" -eq 0 ] || echo "FAILED (exit $rc)" >&2
  exit "$rc"
}
trap cleanup EXIT

# set_const FILE 'sed-from' 'sed-to': edit a constant in a temp copy and prove the edit landed.
set_const() { sed -i.bak "s/$2/$3/" "$1"; ! diff -q "$1" "$1.bak" >/dev/null || fail "constant '$2' not found in $1"; rm -f "$1.bak"; }
# mk SRC CHANGED APPROVED MIN DBNAME: temp copy as the owner would edit it ("keep" leaves the shipped value);
# prints its path.
mk() {
  cp "$1" "$TMP/$1"
  [ "$5" = keep ] || set_const "$TMP/$1" "expected_db_name text := 'EDIT_ME'" "expected_db_name text := '$5'"
  [ "$3" = keep ] || set_const "$TMP/$1" "expected_approved_food int := -1" "expected_approved_food int := $3"
  [ "$2" = keep ] || set_const "$TMP/$1" "expected_changed int := -1" "expected_changed int := $2"
  [ "$4" = keep ] || set_const "$TMP/$1" "min_approved_food int := 100" "min_approved_food int := $4"
  echo "$TMP/$1"
}
# expect_abort FILE REGEX LABEL: the file errors with exactly this reason and changes nothing.
expect_abort() {
  local out; out=$(run "$1")
  grep -Eq "ERROR:  ABORT: $2" <<<"$out" || fail "$3: wrong or no abort reason: $out"
  [ "$(snap)" = "$SNAP_NOW" ] || fail "$3: changed data"
  [ "$(archive_exists)" = "f" ] || fail "$3: left the archive table behind"
}

echo "== files are plain SQL: no psql meta-commands, no psql variables, no RAISE NOTICE"
for f in 1-dry-run 2-rehearsal 3-run 4-verify 5-restore-dry-run 5-restore; do
  [ -f "$f.sql" ] || fail "missing editor/$f.sql"
  ! sed 's/--.*//' "$f.sql" | grep -nE '^[[:space:]]*\\|(^|[^:]):[A-Za-z_{?'"'"']|RAISE NOTICE' || fail "$f.sql uses a psql feature or RAISE NOTICE"
done
[ -f README.md ] || fail "missing editor/README.md"

echo "== safety: local stack only, nothing left over from an earlier run"
command -v psql >/dev/null || fail "psql not found"
psql -X "$DB" -At -c "SELECT 1" >/dev/null 2>&1 || fail "local Supabase DB not reachable at 127.0.0.1:54322 (run: supabase start)"
# The Docker bridge address is what the server reports for the local stack; a public address never matches.
[ "$(q "SELECT coalesce(inet_server_addr() <<= ANY (ARRAY['127.0.0.0/8','10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','::1/128']::inet[]), false)")" = "t" ] \
  || fail "the DB at 127.0.0.1:54322 does not report a loopback or private server address; refusing to write"
[ "$(q "SELECT to_regclass('public._1004_test_bk') IS NOT NULL")" = "f" ] \
  || fail "public._1004_test_bk exists: a previous run was interrupted and it holds the original local rows. Put them back (UPDATE/INSERT from it into public.food_providers), then DROP TABLE public._1004_test_bk. Not touching it."
[ "$(archive_exists)" = "f" ] \
  || fail "public.halal_backfill_987_archive already exists locally (rows: $(q "SELECT count(*) FROM public.halal_backfill_987_archive")). Drop it by hand if it is disposable, then re-run. Not touching it."
q "CREATE TABLE public._1004_test_bk AS SELECT * FROM public.food_providers" >/dev/null
BK_CREATED=1
STARTED=1

# Fixtures on six approved food providers: A all NULL, B/F/G explicit false, C all true, D all true (its row is
# removed for the missing-row test). Every other approved food provider is all true, and every row outside
# approved food is false, so a stray write shows up.
IDS=$(q "SELECT provider_id FROM public.providers WHERE listing_type='food' AND review_status='approved' ORDER BY provider_id LIMIT 6")
set -- $IDS
[ $# -eq 6 ] || fail "the local seed needs at least 6 approved food providers"
A=$1; B=$2; C=$3; D=$4; F=$5; G=$6
N=4
fixtures() {
  q "INSERT INTO public.food_providers (provider_id, no_alcohol, no_pork, no_gambling, updated_at)
       SELECT p.provider_id, true, true, true, '2020-01-01'::timestamptz FROM public.providers p
        WHERE p.listing_type='food' AND p.review_status='approved'
          AND NOT EXISTS (SELECT 1 FROM public.food_providers f WHERE f.provider_id=p.provider_id);
     UPDATE public.food_providers f SET no_alcohol=true, no_pork=true, no_gambling=true
       FROM public.providers p WHERE p.provider_id=f.provider_id AND p.listing_type='food' AND p.review_status='approved';
     UPDATE public.food_providers SET no_alcohol=false, no_pork=false, no_gambling=false
      WHERE provider_id IN (SELECT provider_id FROM public.providers WHERE NOT (listing_type='food' AND review_status='approved'));
     UPDATE public.food_providers SET no_alcohol=NULL, no_pork=NULL, no_gambling=NULL WHERE provider_id='$A';
     UPDATE public.food_providers SET no_alcohol=false WHERE provider_id IN ('$B','$F','$G');" >/dev/null
}
reset() { psql -X "$DB" -v ON_ERROR_STOP=1 -c "$RESTORE_SQL" >/dev/null; q "DROP TABLE IF EXISTS public.halal_backfill_987_archive" >/dev/null; fixtures; }
baseline() {
  SNAP_NOW=$(snap); SX0=$(snap_excl); B0=$(rowmd5 "$B"); C0=$(rowmd5 "$C")
  APPROVED=$(q "SELECT count(*) FROM public.providers WHERE listing_type='food' AND review_status='approved'")
  BEFORE=$((APPROVED - N))
  OTHER=$(( $(q "SELECT count(*) FROM public.food_providers") - APPROVED ))
}
fixtures
baseline
ARCH_SQL="SELECT md5(string_agg((provider_id,old_no_alcohol,old_no_pork,old_no_gambling,old_updated_at)::text, '|' ORDER BY provider_id)) FROM public.halal_backfill_987_archive"
ANS_SQL="SELECT md5(string_agg((provider_id,no_alcohol,no_pork,no_gambling)::text, '|' ORDER BY provider_id)) FROM public.food_providers"

echo "== psql backfill on the same fixtures (parity reference)"
psql -X "$DB" -v ON_ERROR_STOP=1 -v allow_small=1 -v mode=run -v finish=COMMIT -v expect_changed=$N -f ../backfill-987-food-halal.sql >/dev/null 2>&1 \
  || fail "the psql backfill failed on the fixtures"
P_ARCH=$(q "$ARCH_SQL"); P_ANS=$(q "$ANS_SQL")
reset; baseline

echo "== 1-dry-run lists the right rows and counts, changes nothing"
OUT=$(run 1-dry-run.sql)
TOTAL=$(head -1 <<<"$OUT")
[ "$TOTAL" = "|== TOTAL ==|||||$N|$APPROVED|$BEFORE|$OTHER" ] || fail "dry run TOTAL row wrong: $TOTAL (want candidates $N, approved $APPROVED, all-true $BEFORE, other $OTHER)"
[ "$(grep -vc '== TOTAL ==' <<<"$OUT")" = "$N" ] || fail "dry run row count != $N: $OUT"
for id in $A $B $F $G; do grep -q "^$id|" <<<"$OUT" || fail "dry run does not list $id"; done
for id in $C $D; do ! grep -q "$id" <<<"$OUT" || fail "dry run lists an all-true row $id"; done
[ "$(snap)" = "$SNAP_NOW" ] || fail "dry run changed data"
[ "$(archive_exists)" = "f" ] || fail "dry run created the archive table"

echo "== 2-rehearsal errors with REHEARSAL OK: N and changes nothing"
R=$(mk 2-rehearsal.sql keep keep 1 keep)
OUT=$(run "$R")
grep -q "ERROR:  REHEARSAL OK: $N rows would change; rolled back" <<<"$OUT" || fail "rehearsal message wrong: $OUT"
[ "$(snap)" = "$SNAP_NOW" ] || fail "rehearsal changed data"
[ "$(archive_exists)" = "f" ] || fail "rehearsal left the archive table behind"

echo "== 2-rehearsal and 3-run share one DO-block body (differences: constants, run-only and rehearsal-only parts)"
body() {
  sed -n '/^DO \$\$/,/^END \$\$;/p' "$1" | sed -E -e '/\[run-only\]/,/\[\/run-only\]/d' -e '/\[rehearsal-only\]/,/\[\/rehearsal-only\]/d' \
    -e '/^  (expected_db_name|expected_approved_food|expected_changed|min_approved_food) /d'
}
[ "$(body 3-run.sql | wc -l)" -gt 60 ] || fail "shared body extraction came back too short"
[ "$(grep -c 'rehearsal-only\]' 2-rehearsal.sql)" = "2" ] && [ "$(grep -c 'run-only\]' 3-run.sql)" -ge 6 ] || fail "region markers missing"
diff <(body 2-rehearsal.sql) <(body 3-run.sql) || fail "2-rehearsal and 3-run bodies drifted apart"

echo "== 3-run aborts with the exact reason and changes nothing"
expect_abort 3-run.sql 'connected to database "postgres", expected_db_name is "EDIT_ME"' "unedited 3-run"
f=$(mk 3-run.sql keep keep 1 postgres); expect_abort "$f" 'set expected_approved_food to approved_food from step 1' "approved count not set"
f=$(mk 3-run.sql keep $APPROVED 1 postgres); expect_abort "$f" 'set expected_changed to N from step 2' "N not set"
f=$(mk 3-run.sql $N $APPROVED keep postgres); expect_abort "$f" "only $APPROVED approved food providers" "small-DB floor"
f=$(mk 3-run.sql $N $((APPROVED+1)) 1 postgres); expect_abort "$f" "found $APPROVED approved food providers, expected_approved_food is $((APPROVED+1))" "wrong approved count"
f=$(mk 3-run.sql $((N+1)) $APPROVED 1 postgres); expect_abort "$f" "found $N rows to change, expected_changed is $((N+1))" "wrong N"
f=$(mk 3-run.sql $N $APPROVED 1 not_this_db); expect_abort "$f" 'connected to database "postgres", expected_db_name is "not_this_db"' "wrong db name"

echo "== a missing food_providers row aborts the rehearsal and the run"
q "DELETE FROM public.food_providers WHERE provider_id='$D'" >/dev/null
SNAP_NOW=$(snap)
expect_abort "$R" '1 approved food providers have no food_providers row' "rehearsal with a missing row"
f=$(mk 3-run.sql $N $APPROVED 1 postgres); expect_abort "$f" '1 approved food providers have no food_providers row' "run with a missing row"
q "INSERT INTO public.food_providers (provider_id, no_alcohol, no_pork, no_gambling) VALUES ('$D', true, true, true)" >/dev/null
baseline

echo "== a held lock ends in a lock timeout (rehearsal, run and restore), not an endless wait"
psql -X "$DB" -v ON_ERROR_STOP=1 -c "BEGIN; LOCK TABLE public.food_providers IN ACCESS EXCLUSIVE MODE; SELECT pg_sleep(16); COMMIT;" >/dev/null 2>&1 &
HOLD=$!
sleep 2
f_run=$(mk 3-run.sql $N $APPROVED 1 postgres); f_rs=$(mk 5-restore.sql keep keep keep postgres)
(run "$R" >"$TMP/lock-rehearsal.out") & P1=$!
(run "$f_run" >"$TMP/lock-run.out") & P2=$!
(run "$f_rs" >"$TMP/lock-restore.out") & P3=$!
wait "$P1" "$P2" "$P3" "$HOLD" || true
for o in rehearsal run restore; do
  grep -q "canceling statement due to lock timeout" "$TMP/lock-$o.out" || fail "$o did not hit the lock timeout: $(cat "$TMP/lock-$o.out")"
done
[ "$(snap)" = "$SNAP_NOW" ] || fail "lock-timeout runs changed data"
[ "$(archive_exists)" = "f" ] || fail "lock-timeout runs left the archive table behind"

echo "== 3-run with the right values: archived == changed == N, nothing else touched"
OUT=$(run "$f_run")
grep -q "^$N|backfill-987 applied via SQL Editor script; changed $N rows at " <<<"$OUT" || fail "3-run result row wrong: $OUT"
[ "$(q "SELECT string_agg(provider_id::text, ',' ORDER BY provider_id) FROM public.halal_backfill_987_archive")" = \
  "$(q "SELECT string_agg(x::text, ',' ORDER BY x) FROM unnest(ARRAY['$A','$B','$F','$G']::uuid[]) x")" ] || fail "archive holds the wrong rows"
[ "$(q "SELECT old_no_alcohol IS NULL AND old_no_pork IS NULL AND old_no_gambling IS NULL FROM public.halal_backfill_987_archive WHERE provider_id='$A'")" = "t" ] || fail "NULL answers not archived"
[ "$(q "SELECT old_no_alcohol IS FALSE AND old_no_pork AND old_no_gambling FROM public.halal_backfill_987_archive WHERE provider_id='$B'")" = "t" ] || fail "explicit false not archived"
[ "$(q "SELECT count(*) FROM public.food_providers f JOIN public.providers p USING (provider_id)
        WHERE p.listing_type='food' AND p.review_status='approved' AND (f.no_alcohol, f.no_pork, f.no_gambling) IS DISTINCT FROM (true, true, true)")" = "0" ] || fail "approved row still below the bar"
[ "$(snap_excl)" = "$SX0" ] || fail "a row outside the four candidates changed"
[ "$(rowmd5 "$C")" = "$C0" ] || fail "the already all-true row changed"
[ "$(q "SELECT count(*) FROM public.halal_backfill_987_archive WHERE new_updated_at IS NULL OR old_updated_at IS NULL")" = "0" ] || fail "archive timestamps missing"
echo "== the archive stays locked down (RLS on, no grants to anon or authenticated)"
[ "$(q "SELECT relrowsecurity FROM pg_class WHERE oid='public.halal_backfill_987_archive'::regclass")" = "t" ] || fail "archive has no RLS"
[ "$(q "SELECT count(*) FROM (VALUES ('anon'),('authenticated')) r(r),
        (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(p)
        WHERE has_table_privilege(r.r, 'public.halal_backfill_987_archive', p.p)")" = "0" ] || fail "anon or authenticated can reach the archive"
echo "== editor path and psql path archive the same rows and leave the same answers"
[ "$(q "$ARCH_SQL")" = "$P_ARCH" ] || fail "archive differs from the psql backfill's"
[ "$(q "$ANS_SQL")" = "$P_ANS" ] || fail "answers differ from the psql backfill's"

echo "== 4-verify passes with the right constants and fails with the placeholders"
V=$TMP/4-verify.sql; cp 4-verify.sql "$V"
set_const "$V" "-1::int AS expected_changed" "$N::int AS expected_changed"
set_const "$V" "-1::int AS all_true_before" "$BEFORE::int AS all_true_before"
set_const "$V" "-1::int AS approved_food" "$APPROVED::int AS approved_food"
set_const "$V" "-1::int AS other_rows" "$OTHER::int AS other_rows"
OUT=$(run "$V"); grep -q '^ALL CHECKS|all true||t$' <<<"$OUT" || fail "4-verify failed: $OUT"
[ "$(grep -c '|t$' <<<"$OUT")" = "8" ] || fail "4-verify did not return 7 checks plus ALL CHECKS, all true: $OUT"
OUT=$(run 4-verify.sql); ! grep -q '^ALL CHECKS|all true||t$' <<<"$OUT" || fail "4-verify passed with placeholder constants"
A1=$(archive_md5); S1=$(snap); M1=$(marker)

echo "== second run changes nothing, keeps the archive and the marker"
f=$(mk 3-run.sql 0 $APPROVED 1 postgres)
OUT=$(run "$f")
! grep -q "ERROR" <<<"$OUT" || fail "second run errored: $OUT"
grep -qxF "$N|$M1" <<<"$OUT" || fail "second run result row wrong: $OUT"
[ "$(snap)" = "$S1" ] || fail "second run changed data"
[ "$(archive_md5)" = "$A1" ] || fail "second run touched the archive"
[ "$(marker)" = "$M1" ] || fail "second run overwrote the marker"
SNAP_NOW=$S1
expect_abort_keep_archive() {
  local out; out=$(run "$1")
  grep -Eq "ERROR:  ABORT: $2" <<<"$out" || fail "$3: wrong or no abort reason: $out"
  [ "$(snap)" = "$S1" ] && [ "$(archive_md5)" = "$A1" ] || fail "$3: changed data or archive"
}
f=$(mk 3-run.sql $N $APPROVED 1 postgres); expect_abort_keep_archive "$f" "found 0 rows to change, expected_changed is $N" "second run with the old N"
OUT=$(run "$V"); grep -q '^ALL CHECKS|all true||t$' <<<"$OUT" || fail "4-verify failed after the second run: $OUT"

echo "== edits after the backfill: A answer changed without touching updated_at, G edited, F row deleted, B untouched"
q "UPDATE public.food_providers SET no_pork = false WHERE provider_id='$A'" >/dev/null
q "UPDATE public.food_providers SET updated_at = updated_at + interval '1 second' WHERE provider_id='$G'" >/dev/null
q "DELETE FROM public.food_providers WHERE provider_id='$F'" >/dev/null
SNAP_NOW=$(snap); AR0=$(rowmd5 "$A"); GR0=$(rowmd5 "$G"); SXR0=$(q "SELECT md5(string_agg(f::text, '|' ORDER BY provider_id)) FROM public.food_providers f WHERE provider_id NOT IN ('$A','$B','$F','$G')")

echo "== 5-restore-dry-run lists would restore and each skip reason, changes nothing"
OUT=$(run 5-restore-dry-run.sql)
grep -q "^$B|.*|would restore$" <<<"$OUT" || fail "B not listed as would restore: $OUT"
grep -q "^$A|.*|SKIPPED: edited since backfill$" <<<"$OUT" || fail "A (answer edited, updated_at kept) not skipped: $OUT"
grep -q "^$G|.*|SKIPPED: edited since backfill$" <<<"$OUT" || fail "G (updated_at moved) not skipped: $OUT"
grep -q "^$F|.*|SKIPPED: provider row deleted$" <<<"$OUT" || fail "F (row deleted) not skipped: $OUT"
[ "$(snap)" = "$SNAP_NOW" ] || fail "restore dry run changed data"

echo "== 5-restore as shipped aborts; with the db name set it restores B only and lists the skips"
expect_abort_restore() { local out; out=$(run 5-restore.sql); grep -q 'ERROR:  ABORT: connected to database "postgres", expected_db_name is "EDIT_ME"' <<<"$out" || fail "unedited 5-restore: $out"; [ "$(snap)" = "$SNAP_NOW" ] || fail "unedited 5-restore changed data"; }
expect_abort_restore

OUT=$(run "$f_rs")
grep -q '^|== TOTAL ==|restored 1, skipped 3$' <<<"$OUT" || fail "restore TOTAL row wrong: $OUT"
for id in $A $G; do grep -q "^$id|.*|SKIPPED: edited since backfill$" <<<"$OUT" || fail "restore did not list $id as edited: $OUT"; done
grep -q "^$F|.*|SKIPPED: provider row deleted$" <<<"$OUT" || fail "restore did not list F as deleted: $OUT"
[ "$(rowmd5 "$B")" = "$B0" ] || fail "B is not back to its pre-backfill row"
[ "$(rowmd5 "$A")" = "$AR0" ] && [ "$(rowmd5 "$G")" = "$GR0" ] || fail "restore overwrote an edited row"
[ "$(rowmd5 "$F")" = "none" ] || fail "restore re-created the deleted row"
[ "$(q "SELECT md5(string_agg(f::text, '|' ORDER BY provider_id)) FROM public.food_providers f WHERE provider_id NOT IN ('$A','$B','$F','$G')")" = "$SXR0" ] || fail "restore touched other rows"
[ "$(q "SELECT count(*) FROM public.halal_backfill_987_archive WHERE restored_at IS NOT NULL")" = "1" ] || fail "expected exactly one restored archive row"

echo "== second restore is a no-op"
S3=$(snap); AM1=$(archive_md5)
OUT=$(run "$f_rs")
! grep -q "ERROR" <<<"$OUT" || fail "second restore errored: $OUT"
grep -q '^|== TOTAL ==|restored 1, skipped 3$' <<<"$OUT" || fail "second restore TOTAL row wrong: $OUT"
[ "$(snap)" = "$S3" ] || fail "second restore changed data"
[ "$(archive_md5)" = "$AM1" ] || fail "second restore touched the archive"

echo "PASS: $N candidates (NULL and explicit false) listed, rehearsed, backfilled and archived once; abort reasons exact; lock timeout; archive locked down; editor and psql paths agree; restore skips edited and deleted rows; re-runs are no-ops"
