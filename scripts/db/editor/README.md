# #987 food halal backfill: Supabase SQL Editor version

Plain SQL versions of `scripts/db/backfill-987-food-halal.sql` and `restore-987-food-halal.sql`. They use the same archive table (`public.halal_backfill_987_archive`), so the `psql` and editor paths agree. Run them by hand against the database you intend to change. Paste one file at a time, in order. Don't edit anything except the constants marked `EDIT`.

What the backfill does: every approved food provider that isn't yet all of `no_alcohol`, `no_pork`, `no_gambling` = true gets all three set to true. The old values go to the archive table first.

## Before you start: off-DB backup

The archive table lives in the same database, so it doesn't protect you from losing the database. Take a copy outside it first, either:

- `pg_dump` of `public.food_providers` (`pg_dump -t public.food_providers "$DB_URL" > food_providers_backup.sql`), or
- the Supabase dashboard backup, or
- a CSV export of `provider_id, no_alcohol, no_pork, no_gambling, updated_at` from `public.food_providers`, saved on your machine.

Confirm you're connected to the project you mean to change (project name at the top of the dashboard).

## Order

| Step | File                    | Changes data            | What you see                                                                                                                                                               |
| ---- | ----------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `1-dry-run.sql`         | no                      | A `== TOTAL ==` row, then one row per provider that would change. Write down `candidates` (this is N) and `all_true_before`. Read the rows with an explicit `false` first. |
| 2    | `2-rehearsal.sql`       | no (always rolled back) | An error: `REHEARSAL OK: N rows would change; rolled back`. That error is the success message.                                                                             |
| 3    | `3-run.sql`             | yes                     | No error, then one row: `archived_rows` = N and a `marker` text. Edit `expected_db_name` and `expected_changed` (= N) at the top first.                                    |
| 4    | `4-verify.sql`          | no                      | A table of checks; the last row `ALL CHECKS` must be `true`. Edit `expected_changed` (= N) and `all_true_before` (from step 1) in `params` first.                          |
| 5a   | `5-restore-dry-run.sql` | no                      | Only if you need to undo. Every archived row as `would restore` or `SKIPPED: edited since backfill`.                                                                       |
| 5b   | `5-restore.sql`         | yes                     | A `== TOTAL ==` row (`restored X, skipped Y`), then each skipped row by name.                                                                                              |

After step 3, purge caches (CDN / ISR) so the seals refresh.

## Errors

The editor doesn't show notices, so every result is a row set or an error message. An error in steps 2 and 3 rolls everything back; nothing is half applied.

| Message starts with                                                        | Meaning                                                     | What to do                                                                     |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `REHEARSAL OK`                                                             | Step 2 worked.                                              | Note N, go to step 3.                                                          |
| `ABORT: connected to database "x", expected_db_name is "y"`                | Wrong database or the constant isn't edited.                | Check the project, set `expected_db_name`, re-run.                             |
| `ABORT: set expected_changed`                                              | Constant not edited.                                        | Set it to N from step 2.                                                       |
| `ABORT: found X rows to change, expected_changed is N`                     | Data moved since the rehearsal.                             | Don't force it. Re-run steps 1 and 2 and use the new N after reading the list. |
| `ABORT: only X approved food providers`                                    | Wrong database (prod has about 157).                        | Stop. Check the project.                                                       |
| `ABORT: X approved food providers have no food_providers row`              | Data gap.                                                   | Stop and report; don't create rows by hand.                                    |
| `ABORT: expected N, changed X, archived Y` or `ABORT: below the bar after` | An internal check failed. Nothing was saved.                | Stop and report the full message.                                              |
| `lock timeout` / `canceling statement`                                     | Another transaction holds `food_providers`.                 | Wait a minute, re-run step 3 (step 2 first if more than a few minutes passed). |
| `relation ... does not exist` in steps 4 or 5                              | The archive table doesn't exist, so step 3 never committed. | Re-run from step 2.                                                            |

Step 4 shows a `false` row:

- Check 1 or 2: the archive doesn't match N. Run `5-restore-dry-run.sql` and report.
- Check 3 or 5: an approved food row is still below the bar. Run step 1 and report.
- Check 4: wrong `all_true_before` or `expected_changed` constants; fix them and re-run. If both are right, report.

Running step 3 twice is safe: the second run finds 0 rows, so set `expected_changed` to 0 for it; the archive isn't touched. Running step 5b twice is safe too: the second run restores nothing.

To backfill again after a restore, rename the archive first (see the comment at the top of `5-restore.sql`); otherwise restored rows count as already backfilled and are skipped.

## Local test

`scripts/db/test-editor-987.sh` feeds every file here to the local Supabase DB (127.0.0.1:54322) as a plain script, covers the abort paths, a real run, a second run and a restore, and puts the local data back. The test edits the constants and the small-DB threshold in temp copies only.
