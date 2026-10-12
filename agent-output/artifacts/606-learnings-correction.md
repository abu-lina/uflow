# #606 LEARNINGS correction (Code Review phase)

Replace the existing 2026-10-12 #606 entry at the end of `docs/ai/LEARNINGS.md`
with the block below. Not applied in place: the review worker's write scope is
`agent-output/` only. The current entry states a false premise ("a real hex
colour is never all digits": `#000`, `#333`, `#666666` are all-digit hex) and
says "six" mocks where seven were edited.

---

### 2026-10-12 — A new table read in a shared service path breaks every hand-mock, and a full-table read silently caps at 1000 rows (issue #606)

- **Context**: `createProviderOrServiceServer` gained a pre-insert duplicate scan (`providers.select().not()`) and a conditional `cities.select()` for the recommend city check. Seven test files hand-mock the supabase `from(table)` router; every mock without `select` on `providers` failed with `admin.from(...).select is not a function`. Separately, `#606` comments tripped the i18n test's hex-colour regex, which stripped only `#415`. Code Review then found three things the green suite hid: the duplicate scan fetches the whole `providers` table with no `.range()`, so PostgREST `max_rows = 1000` (`supabase/config.toml:18`) silently truncates it on prod (more than 1045 pending rows alone); the env-gated live harness can never run, because `src/__tests__/setup.ts` overwrites `NEXT_PUBLIC_SUPABASE_URL` with `https://mock-supabase-url.com` before the test file loads, and its probe sends `SUPABASE_SERVICE_ROLE_KEY` to that unowned NXDOMAIN host; and the replacement strip `/#\d{3,}\b/` also deletes all-digit hex colours such as `#333`, which loosens the gate it was meant to unblock.
- **Learning**: Hand-rolled table-router mocks encode the service's old read set, and they return whatever rows the test hands them. That hides both a missing chain method and any server-side row cap. "Green with the mock" says nothing about a query that has to read every row. Env-gated live tests inherit whatever the global setup file sets, so gate on a variable the setup file never touches. When you strip sentinel strings before a regex gate, the strip pattern must not overlap the class the gate catches. Digits are valid hex.
- **Change to prevent repeat**: When a service gains a new table read, grep `table === '<name>'` across tests before running the suite. Never scan a table client-side for a match. Push the predicate into SQL (RPC or filtered query), or paginate with `.range()` and assert the page count in a test. Gate live tests on a dedicated variable (e.g. `UFLOW_LIVE_DB_URL`) and never send a key to a URL the test did not set itself. To strip issue refs, strip comments, or match `#\d+` only where a hex literal cannot appear. Never widen the strip.
- **Task/PR**: Branch `fix/606-providers-500`, issue #606
