# Request 281 diagnosis harnesses — THROWAWAY DEBUG SCRIPTS

Quarantined. Nothing here is imported by the app, referenced by the build, or run in CI.
Kept only so the Diagnose-phase evidence in
`agent-output/requests/281-sw-cleanup-unconditional.md` is reproducible. Delete the whole
directory once request 281 closes.

## Why Playwright and not a unit test

The bug is service-worker lifecycle plus `sessionStorage` scoping. Neither is simulable in
jsdom. The load-bearing trick is `chromium.launchPersistentContext(profile)`, then closing
and reopening the **same** profile: service-worker registrations, CacheStorage and the HTTP
disk cache survive on disk, `sessionStorage` does not. Each close/reopen is therefore one
browser-session boundary, which is exactly what `sessionStorage['sw-cleaned-up']` gates on.

## Scripts

| Script | Question | Target | Runtime |
| --- | --- | --- | --- |
| `repro.mjs` | Does the cleanup fire on prod, and what happens across session boundaries? | prod | ~60s |
| `trace-order.mjs` | Exact ordering of every `register` / `getRegistrations` / `unregister` call | prod | ~90s |
| `measure-reload.mjs` | How long after first-contentful-paint does the forced reload land, and was the page painted? | prod | ~110s |
| `slow-and-deeplink.mjs` | Same under Slow 3G, and with a non-`/` entry route | prod | ~90s |
| `differential.mjs` | Single-variable A/B (pre-seed the sessionStorage flag) proving causation, plus request/byte cost | prod | ~140s |
| `sw-update-fixture.mjs` | Does `RootClientLayout.tsx:253`'s `length === 0` guard strand clients on a stale `sw.js`? | **local** | ~25s |

```bash
node agent-output/debug/281/sw-update-fixture.mjs   # tightest loop: local, deterministic
node agent-output/debug/281/differential.mjs        # proves the bug on production
```

## Notes for anyone re-running these

- **Production access is read-only.** GETs of `/`, `/about`, `/food`, `/sw.js` and static
  chunks. No logins, no form posts, and nothing that touches the rate-limited endpoints
  (`check-email-exists`, `auth/reset-password`). Keep it that way.
- **Playwright resolution.** This worktree has no `node_modules`, so the scripts resolve
  `@playwright/test` from `/Users/NARAFIQ/Projects/uflow/node_modules`. Override with
  `PLAYWRIGHT_FROM=/abs/path/to/a/repo/with/node_modules`.
- **`location.reload` cannot be monkeypatched.** It is `[LegacyUnforgeable]` in Chrome, so
  `Object.defineProperty(location, 'reload', ...)` throws and silently kills the rest of an
  init script. `measure-reload.mjs` hooks `console.log` on the cleanup's own
  "Reloading page..." line instead, which is the statement immediately before the reload.
- **The SW script fetch for an update check is browser-internal** and does not surface via
  Playwright's `request` events, which is why `sw-update-fixture.mjs` exists as a local
  fixture rather than a production measurement.
- Artifacts land in `/tmp/sw281-artifacts/`; the committed subset is in `artifacts/`.
