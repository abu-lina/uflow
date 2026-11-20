# #987 food halal backfill: Supabase SQL Editor version

Plain SQL versions of `scripts/db/backfill-987-food-halal.sql` and `restore-987-food-halal.sql`. They use the same archive table (`public.halal_backfill_987_archive`), so the `psql` and editor paths agree. Run them by hand against the database you intend to change. Paste one file at a time, in order. Click in the editor and deselect any text before you press Run; the editor runs only the selected text. Don't edit anything except the constants marked `EDIT`.

What the backfill does: every approved food provider that isn't yet all of `no_alcohol`, `no_pork`, `no_gambling` = true gets all three set to true. The old values go to the archive table first.

Explicit `false` answers on approved food providers are overwritten with `true`, and there is no per-row opt-out. If a row should stay `false`, stop, fix the data, and redo steps 1 and 2. The step 1 list is the moment to spot such rows.

## What actually protects you from the wrong project

Every Supabase project's database is named `postgres`, so `expected_db_name` only catches a connection to some other kind of database. It does not tell prod from UAT. The real protections are:

1. The project ref in the dashboard URL (`/dashboard/project/<ref>`). Check it before every step. Close tabs for other projects.
2. N from the rehearsal (`expected_changed`).
3. The exact approved food count from step 1 (`expected_approved_food`). A copy or UAT with a different count aborts.
4. The off-DB backup below.

## Before you start: off-DB backup

The archive table lives in the same database, so it doesn't protect you from losing the database. Take a copy outside it first, either:

- `pg_dump` of `public.food_providers` (`pg_dump -t public.food_providers "$DB_URL" > food_providers_backup.sql`), or
- the Supabase dashboard backup, or
- a CSV export of `provider_id, no_alcohol, no_pork, no_gambling, updated_at` from `public.food_providers`, saved on your machine.

Also run this read-only query once and read the result. It lists triggers on the table; an empty result means nothing fires on update. A trigger that writes elsewhere would also run during the backfill.

```sql
SELECT tgname, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'public.food_providers'::regclass AND NOT tgisinternal;
```

## Checklist

1. Off-DB backup taken (above).
2. Project ref in the dashboard URL is the one you mean to change.
3. Trigger query above read.
4. Step 1, then read the list, especially rows with an explicit `false`.
5. Step 2, note N.
6. Step 3 with the three constants edited.
7. Step 4 with the four constants edited; `ALL CHECKS` is `true`.
8. Purge caches (CDN / ISR). The run sets `updated_at = now()` on every changed row (about 101 on prod), so anything that sorts, caches or listens on `updated_at` treats them as freshly edited. Then spot-check a few formerly false providers on the public pages, and one provider of another listing type (it must be unchanged).
9. Export `public.halal_backfill_987_archive` to a CSV on your machine as the second copy.

## Order

| Step | File                    | Changes data            | What you see                                                                                                                                                                                                      |
| ---- | ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `1-dry-run.sql`         | no                      | A `== TOTAL ==` row, then one row per provider that would change. Write down `approved_food`, `all_true_before` and `other_rows`. Read the rows with an explicit `false` first. `candidates` is N on a first run. |
| 2    | `2-rehearsal.sql`       | no (always rolled back) | An error: `REHEARSAL OK: N rows would change; rolled back`. That error is the success message. N comes from here.                                                                                                 |
| 3    | `3-run.sql`             | yes                     | No error, then one row: `archived_rows` = N and a `marker` text. Edit `expected_db_name` (`postgres`), `expected_approved_food` (step 1) and `expected_changed` (N) at the top first.                             |
| 4    | `4-verify.sql`          | no                      | A table of seven checks; the last row `ALL CHECKS` must be `true`. Edit `expected_changed` (N), `all_true_before`, `approved_food` and `other_rows` (step 1) in `params` first.                                   |
| 5a   | `5-restore-dry-run.sql` | no                      | Only if you need to undo. Every archived row as `would restore`, or `SKIPPED: edited since backfill`, or `SKIPPED: provider row deleted`.                                                                         |
| 5b   | `5-restore.sql`         | yes                     | Edit `expected_db_name` first. A `== TOTAL ==` row (`restored X, skipped Y`), then each skipped row by name with its reason.                                                                                      |

Steps 2, 3 and 5b take a short lock on `public.food_providers` (`SHARE ROW EXCLUSIVE`, no writes to that table while it runs) and give up after 10 seconds.

## Errors

The editor doesn't show notices, so every result is a row set or an error message. An error in steps 2, 3 and 5b rolls everything back; nothing is half applied.

| Message contains                                                             | Meaning                                                     | What to do                                                                                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `REHEARSAL OK`                                                               | Step 2 worked.                                              | Note N, go to step 3.                                                                                       |
| `ABORT: connected to database "x", expected_db_name is "y"`                  | Not a `postgres` database, or the constant isn't edited.    | Set `expected_db_name` to `postgres`. If it still fails, stop.                                              |
| `ABORT: set expected_approved_food` / `set expected_changed`                 | Constant not edited.                                        | Set it from step 1 / step 2.                                                                                |
| `ABORT: found X approved food providers, expected_approved_food is Y`        | Wrong project, or the data changed since step 1.            | Stop. Check the project ref. If it is the right one, re-run steps 1 and 2.                                  |
| `ABORT: found X rows to change, expected_changed is N`                       | Data moved since the rehearsal.                             | Don't force it. Re-run steps 1 and 2 and use the new N after reading the list.                              |
| `ABORT: only X approved food providers`                                      | Wrong database (prod has about 157).                        | Stop. Check the project.                                                                                    |
| `ABORT: X approved food providers have no food_providers row`                | Data gap.                                                   | Stop and report; don't create rows by hand.                                                                 |
| `ABORT: candidates ... changed ... archived` or `ABORT: below the bar after` | An internal check failed. Nothing was saved.                | Stop and report the full message.                                                                           |
| `canceling statement due to lock timeout`                                    | Another transaction holds `food_providers` for over 10 s.   | Nothing was saved. Wait a minute and re-run the same step (step 2 first if more than a few minutes passed). |
| `relation ... does not exist` in steps 4 or 5                                | The archive table doesn't exist, so step 3 never committed. | Re-run from step 2.                                                                                         |

Step 4 shows a `false` row:

- Check 1 or 2: the archive doesn't match N. Run `5-restore-dry-run.sql` and report.
- Check 3: an approved food row is still below the bar. Run step 1 and report.
- Check 4, 5 or 6: a wrong constant (`all_true_before`, `expected_changed`, `approved_food`, `other_rows`), or data changed since step 1. Fix the constants and re-run; if they are right, report.
- Check 7: a row outside the archive carries the run's timestamp. Stop and report.

Running step 3 twice is safe: the second run finds 0 rows, so set `expected_changed` to 0 for it. It changes nothing and keeps the archive and its marker. Running step 5b twice is safe too: the second run restores nothing.

Restore only touches rows that are unchanged since the backfill: `updated_at` still equals the archive's `new_updated_at` and all three answers are still true. It cannot see an edit that changed neither, so run it soon after a backfill, not weeks later.

To backfill again after a restore, rename the archive first (see the comment at the top of `5-restore.sql`); otherwise restored rows count as already backfilled and are skipped.

## Local test

`scripts/db/test-editor-987.sh` feeds every file here to the local Supabase DB (127.0.0.1:54322) as one batch, like the editor. It builds its own fixtures (a NULL answer, explicit false answers, an all-true row, a missing `food_providers` row), covers every abort reason, the lock timeout, a real run, a second run, a restore with edited and deleted rows, a second restore, and that the archive stays locked down. It also checks that `2-rehearsal.sql` and `3-run.sql` share the same body and that the editor and `psql` paths archive the same rows. It refuses to start if a leftover backup or archive table exists, and puts the local data back on exit. The test edits the constants and the small-DB threshold in temp copies only.
