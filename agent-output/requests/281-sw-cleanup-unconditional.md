---
ID: 281
Origin: 281
UUID: 25D17620-1FA6-4455-B62B-2076AE333B01
Status: Active
Type: bug
Branch: fix/281-sw-cleanup-unconditional
Worktree: ../uflow-wt/281-sw-cleanup-unconditional
Created: 2026-10-02T05:51:48Z
---

# Request 281: cleanupServiceWorkers wipes the PWA cache every browser session

## Original request

Surfaced as a follow-up from request 280 (Serwist readiness research), promoted to
its own request because it must be settled before the Serwist migration lands.

> `cleanupServiceWorkers()` is called unconditionally from `ClientProviders.tsx:60-63`
> with no environment gate. It unregisters every SW, deletes every cache, and reloads
> the page once per session, directly fighting `ServiceWorkerRegistration`. Related:
> `RootClientLayout.tsx:253` only registers when `getRegistrations()` is empty, so a
> client with an existing `sw.js` never picks up a new one.

## Classification

- **Type:** bug
- **Route:** Bug flow (Diagnose -> gate -> Fix -> Code Review -> Done)
- **Confidence:** high on the code path existing; the Diagnose phase has to settle
  whether it actually fires in production and what the user-visible symptom is.

## Why this blocks the Serwist migration (request 280)

If every browser session unregisters the service worker and deletes every cache,
then after the Serwist migration you cannot tell whether a missing or stale service
worker is Serwist's fault or this cleanup's. The migration would land on top of
broken behaviour and its verification would be meaningless. Diagnose and fix this
first, then migrate.

## Static analysis (lead, pre-diagnosis)

Read on `origin/main` @ de0add38. This is the mechanism as far as static reading
goes. It is a **hypothesis about runtime behaviour, not a confirmed reproduction.**

Two effects mount together and race:

**A. `cleanupServiceWorkers()`** (`src/lib/pwa/serviceWorkerCleanup.ts:8-70`), called
from `src/components/layout/ClientProviders.tsx:60-63` in a bare
`useEffect(..., [])` with no environment, hostname, or feature gate.

Its only gate is `sessionStorage['sw-cleaned-up']` (line 15). `sessionStorage` is
**per browser session**, so the "runs once per session" comment in the file header
is accurate and is itself the defect: a one-time remediation for a historically
broken worker re-runs forever, once per session, with no version check and no
expiry. It then:

- `getRegistrations()` and unregisters every one (lines 23-39)
- `caches.keys()` and deletes every cache (lines 44-56)
- `window.location.reload()` (line 64)

**B. `ServiceWorkerRegistration()`** (`src/components/layout/RootClientLayout.tsx:237-273`)
registers `/sw.js` only when `getRegistrations()` returns an empty array (line 253).
It is correctly gated off localhost and 127.0.0.1 (lines 246-247); the cleanup has
no equivalent gate.

**Predicted per-session sequence in production** (hostname is not localhost, and
`DISABLE_PWA=false` in `deploy-hetzner.yml`, so a worker is registered):

1. New session. Both effects mount and both call `getRegistrations()`. Race.
2. Cleanup finds the worker from the previous visit, unregisters it, deletes every
   cache, sets the flag, reloads.
3. Registration either saw the pre-unregister list (length 1, so it skips) or the
   post-unregister list (length 0, so it registers). Non-deterministic.
4. After the forced reload, the flag is set, so cleanup returns early at line 17.
   Registration now sees 0 registrations and re-registers `/sw.js`.

**Predicted symptoms, to be confirmed or refuted in Diagnose:**

- A forced full reload on the first page load of every browser session.
- The offline cache never survives a session boundary, so the PWA re-downloads
  everything, every session.
- Line 62's `if (registrations.length > 0)` is dead weight: line 25 already returned
  early when the array was empty, so it is always true at that point. Harmless, but
  it is evidence the one-shot intent was never thought through.

A secondary defect independent of the cleanup: because registration is skipped
whenever any registration exists (line 253), a client holding an old `sw.js` never
picks up a new one through this path. Normal SW update flow can still refresh the
script, so whether this is user-visible needs confirming rather than assuming.

## Phases

| #   | Phase                    | Status  | Outcome                                                                                                                                               |
| --- | ------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Tracking file created    | Done    | This file                                                                                                                                             |
| 1   | Diagnose                 | Done    | Root cause **confirmed** on production. Primary defect real and user-visible; secondary defect (RootClientLayout.tsx:253) **refuted**. See Diagnosis. |
| 2   | Gate: confirm hypothesis | Done    | Passed. Hypothesis confirmed at runtime; fix option 1 (delete the cleanup) chosen by the lead.                                                        |
| 3   | Fix                      | Done    | Cleanup deleted, regression test added and proven red-before/green-after. See Implementation notes.                                                   |
| 4   | Code Review              | Pending |                                                                                                                                                       |
| 5   | Done                     | Pending |                                                                                                                                                       |

## Decisions

| #   | Decision                                                     | Choice                                                                                      | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Order relative to the Serwist migration                      | Diagnose this first                                                                         | A session-scoped cache wipe makes the migration unverifiable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2   | Scope of the Diagnose phase                                  | Confirm the runtime path before proposing any fix                                           | The mechanism above is static reading only; learning 278 is precisely the cost of shipping against an unverified path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 3   | Shape of the fix                                             | Delete `serviceWorkerCleanup.ts` outright, no environment gate and no `localStorage` marker | Q6: the `supabase-cache` route the cleanup flushed was deleted in the same commit that added it, 8 months ago. Nothing is left to remediate, so a gate would only preserve the bug for production users                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 4   | `ServiceWorkerRegistration` (`RootClientLayout.tsx:237-273`) | **Keep it.** Out of scope for 281                                                           | Removal is provably safe _today_ (`next.config.js:3` `register: true` makes `@ducanh2912/next-pwa` inject `window.workbox.register()` at module eval, no hostname gate, every page load; diagnosis Q3/Q5). It is **not** provable post-Serwist: that injected registration is the plugin's, and request 282 removes the plugin. Verifying the post-migration half needs `@serwist/next` actually installed, which belongs to 282. Deleting it now would mean 282 lands with no application-level registration and no evidence anything replaced it. Fold the deletion into 282, where it can be verified in the same breath |

## Diagnosis

Verdict: **root cause confirmed at runtime against production** (https://ummahflow.com,
main @ de0add38). The primary defect is real and user-visible. The _secondary_ defect
(`RootClientLayout.tsx:253`) is **refuted**: it is redundant dead code, not a bug.

One finding the static analysis missed changes the shape of the fix: there is a **third**
service-worker registration call site, and it is the one that actually keeps the PWA alive.

### TL;DR

| Q                                 | Answer                                                                                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Does it execute in production? | **Yes.** Cleanup code verbatim in the shipped bundle; fires on every page load.                                                                                                                                        |
| 2. Real user-visible symptom?     | **Forced full-page reload on the first page view of every browser session**, ~10ms after FCP on `/`, ~410-480ms after FCP on `/food`. Costs +1 full load, +~50 requests, +~30KB. PWA precache destroyed every session. |
| 3. The race                       | Resolved. `ServiceWorkerRegistration` always loses pre-reload (3/3, explained by React effect order). Post-reload it is **non-deterministic** (1/3 runs double-registered). Both outcomes are benign.                  |
| 4. Two session boundaries?        | **Confirmed permanent cycle.** 14/14 second-and-later sessions forced a reload.                                                                                                                                        |
| 5. Secondary defect at line 253?  | **Refuted.** Clients pick up a new `sw.js` even when `register()` is never called again.                                                                                                                               |
| 6. Why does it exist?             | One-shot remediation from **2026-02-05 (8 months ago)** for a `supabase-cache` route that no longer exists. Shipped with no version or date guard.                                                                     |

### Feedback loop

Six Playwright harnesses, all committed under `agent-output/debug/281/`. All are
throwaway debug scripts; none touch `src/`.

The load-bearing trick: `chromium.launchPersistentContext(profile)`, then close and
reopen the **same** profile. Service-worker registrations, CacheStorage and the HTTP
disk cache survive on disk; `sessionStorage` does not. That is exactly the "new browser
session" condition that `sessionStorage['sw-cleaned-up']` gates on, so each
close/reopen is one session boundary.

| Harness                 | Question                                                                | Runtime               |
| ----------------------- | ----------------------------------------------------------------------- | --------------------- |
| `repro.mjs`             | Does it fire on prod, and across session boundaries?                    | ~60s                  |
| `trace-order.mjs`       | Exact call ordering of every `register`/`getRegistrations`/`unregister` | ~90s                  |
| `measure-reload.mjs`    | How long after FCP does the reload land, was the page painted?          | ~110s                 |
| `slow-and-deeplink.mjs` | Slow 3G, and non-`/` entry routes                                       | ~90s                  |
| `differential.mjs`      | Single-variable A/B proving causation + request/byte cost               | ~140s                 |
| `sw-update-fixture.mjs` | Does the line-253 guard strand clients on a stale `sw.js`?              | **~25s, fully local** |

Production access was read-only throughout: GETs of `/`, `/about`, `/food`, `/sw.js` and
static chunks. No logins, no form posts, no rate-limited endpoints touched.

```bash
# the tightest loop, local, deterministic, 25s:
node agent-output/debug/281/sw-update-fixture.mjs

# the one that proves the bug on prod:
node agent-output/debug/281/differential.mjs
```

These scripts resolve Playwright from `/Users/NARAFIQ/Projects/uflow/node_modules`
because this worktree has no `node_modules`. Override with `PLAYWRIGHT_FROM=<repo>`.

Artifacts committed at `agent-output/debug/281/artifacts/` (full set, including all
screenshots, regenerates into `/tmp/sw281-artifacts/`).

### Q1 — It executes in production. Confirmed.

`/sw.js` is served (HTTP 200, 31348 bytes, `last-modified: Fri, 02 Oct 2026 05:35:54 GMT`,
`cache-control: no-cache, no-store, must-revalidate`). The cleanup ships verbatim in
`/_next/static/chunks/app/layout-c5426743d2c4a52d.js`:

```
nStorage.setItem("sw-cleaned-up","true"),e.length>0&&(console.log("[SW Cleanup] Reloading
page to apply changes..."),window.location.reload())}catch(e){console.error("[SW Cleanup]
Error during cleanup:",e)}}
```

So does the guarded registration, in the same chunk:

```
"serviceWorker"in navigator&&!window.location.hostname.includes("localhost")&&
!window.location.hostname.includes("127.0.0.1")&&navigator.serviceWorker.getRegistrations()
.then(e=>{0===e.length&&navigator.serviceWorker.register("/sw.js")...
```

There is no `compiler.removeConsole`, so every `[SW Cleanup]` line is visible in the
console of any production visitor. Observed live:

```
[SW Cleanup] Starting service worker cleanup...
[SW Cleanup] Found 1 service worker(s)
[SW Cleanup] Unregistering: https://ummahflow.com/sw.js
[SW Cleanup] All service workers unregistered
[SW Cleanup] Found 3 cache(s)
[SW Cleanup] Deleting cache: start-url
[SW Cleanup] Deleting cache: workbox-precache-v2-https://ummahflow.com/
[SW Cleanup] Deleting cache: static-resources
[SW Cleanup] All caches cleared
[SW Cleanup] Reloading page to apply changes...
```

### NEW — there is a third registration call site, and it is the important one

`next.config.js:3` sets `register: true`, so `@ducanh2912/next-pwa` injects its own
registration into the client bundle. It lives in the shared chunk
`/_next/static/chunks/8928-338cfa8a4cf19f8f.js` and runs at **module eval**, i.e. before
any React effect, on **every** page load, with no hostname gate and no "is something
already registered" check:

```js
window.workbox = new f(window.location.origin + '/sw.js', { scope: '/' });
window.workbox.register();
```

Consequences:

- The PWA would keep working perfectly if `ServiceWorkerRegistration` were deleted
  outright. `RootClientLayout.tsx:237-273` is redundant with the plugin.
- This is what re-registers the worker after the cleanup nukes it, which is why the
  defect is a self-sustaining per-session cycle rather than a one-time degradation.
- It also means the cleanup regularly unregisters a worker that is still **installing**:
  two trace runs logged `[SW Cleanup] Unregistering: undefined`, because
  `registration.active` was still `null` at line 36.

### Q2 — Symptom: a forced reload the user can see. Severity: medium-high.

`measure-reload.mjs`, 6 sessions on one persistent profile. The snapshot is taken
synchronously inside a `console.log` hook on the cleanup's own "Reloading page..." line,
which is the statement immediately before `window.location.reload()`.

(`location.reload` itself is `[LegacyUnforgeable]` in Chrome and cannot be monkeypatched;
`defineProperty` throws. Worth knowing before anyone tries to stub it in a test.)

```
run 1: loadEvents=[215] finalNavType=navigate NO RELOAD SNAPSHOT
run 2: loadEvents=[163,344] finalNavType=reload {"msAfterFcp":14.7,"domNodes":788,"visibleTextLen":759,
        "textHead":"UMMAH FLOW About Food Ummah Stores Login Register EVERYWHERE OPEN NOW In the name of Allah..."}
run 3: loadEvents=[165,336] finalNavType=reload {"msAfterFcp":10.1,"domNodes":788,"visibleTextLen":759,...}
run 4: loadEvents=[135,243] finalNavType=reload {"msAfterFcp":8.3,"domNodes":788,"visibleTextLen":759,...}
run 5: loadEvents=[166,335] finalNavType=reload {"msAfterFcp":11.6,"domNodes":788,"visibleTextLen":759,...}
run 6: loadEvents=[147,309] finalNavType=reload {"msAfterFcp":10.9,"domNodes":771,"visibleTextLen":759,...}

forced reloads: 5/6 sessions
ms after first-contentful-paint: min=8.3 max=14.7
```

At the moment of the reload the page is painted: 771-788 DOM nodes, 759 characters of
visible text, the real landing page content. Screenshot:
`artifacts/07-home-painted-at-moment-of-forced-reload.png`.

**Two load events per session is the whole symptom in one number.** `navigationType`
is `reload`, not `navigate`.

Timing varies by entry route (`slow-and-deeplink.mjs`):

| Entry    | Network                 | FCP       | reload fires | after FCP  |
| -------- | ----------------------- | --------- | ------------ | ---------- |
| `/`      | unthrottled             | 144-176ms | 152-188ms    | **8-15ms** |
| `/`      | Slow 3G (400kbps/400ms) | 740ms     | 758ms        | **18ms**   |
| `/food`  | unthrottled             | 204ms     | 610ms        | **406ms**  |
| `/about` | unthrottled             | 228ms     | 704ms        | **476ms**  |

On `/` it is a flash. On `/food` the listing renders, then 400ms later the page throws
itself away and refetches. **It fires on deep-link entries too**, because
`ClientProviders` is in the root layout: any route can be a session's first page view,
including a form.

Worst case observed: in the instrumented `trace-order.mjs` runs the reload landed
**3.4s and 7.2s** after load, because `caches.keys()` (line 45) blocked while the
service worker was mid-install. Reported for completeness, but it was partly an artefact
of my instrumentation; do not treat multi-second delays as the common case.

**Does the cache survive a session boundary? No.** Caches wiped every session:
`start-url`, `workbox-precache-v2-https://ummahflow.com/`, `static-resources`
(`images-cache` would go too once populated; the cleanup deletes _all_ CacheStorage keys
for the origin). The precache is rebuilt after the reload, so offline capability returns
within the session, but **every session opens with a window where the app is not
offline-capable**.

#### Causation, one variable changed (`differential.mjs`)

Arm B pre-seeds `sessionStorage['sw-cleaned-up']='true'` via an init script, which makes
`cleanupServiceWorkers()` return early at line 17. Nothing else differs, the app bundle
is untouched.

```
A session-2 CONTROL: cleanup allowed     reload=true  loads=2 caches=2 regs=1 reqs=128 79KB
A session-3 CONTROL: cleanup allowed     reload=true  loads=2 caches=2 regs=1 reqs=124 70KB
B session-2 TREATMENT: cleanup no-op     reload=false loads=1 caches=3 regs=1 reqs=73  42KB
B session-3 TREATMENT: cleanup no-op     reload=false loads=1 caches=3 regs=1 reqs=74  43KB
```

Suppressing exactly one `sessionStorage` key removes the reload and preserves the
caches. Per-session cost of the cleanup: **+1 full page load, +51 to +55 requests
(+70%), +27 to +36KB over the wire (+75%), and the `static-resources` cache** (present
in treatment at sessions 2 and 3, absent in control).

Honest caveat: the byte delta is modest because the HTTP disk cache survives and still
serves the chunks. "Re-downloads everything every session" from the static analysis
overstates it. The real costs are the visible reload, the discarded React Query state,
and the destroyed precache.

### Q3 — The race, resolved.

Mapped by minified offset in the layout chunk (`trace-order.mjs`):

| Offset                         | Source                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `layout…js:1:13995` / `:14061` | `RootClientLayout.tsx:251` `getRegistrations()` and `:256` `register("/sw.js")` |
| `layout…js:1:21520`            | `serviceWorkerCleanup.ts:23` `getRegistrations()`                               |
| `8928…js:1:184731`             | next-pwa's `window.workbox.register()`                                          |

**Pre-reload load, deterministic 3/3.** next-pwa registers first at module eval
(+141 to +228ms). `ServiceWorkerRegistration` then fires ~2ms _before_ the cleanup,
because `RootClientLayout` is a descendant of `ClientProviders` and React runs child
effects before parent effects:

```
+141.2ms register(".../sw.js") CALLED  @ 8928…js        <- next-pwa, module eval
+146.2ms getRegistrations#1 CALLED  @ layout…js:13995   <- ServiceWorkerRegistration
+148.0ms getRegistrations#2 CALLED  @ layout…js:21520   <- cleanupServiceWorkers
+149.6ms getRegistrations#1 RESOLVED length=1          <- so it skips registering
+149.7ms getRegistrations#2 RESOLVED length=1          <- so the cleanup nukes
+149.7ms unregister() CALLED on https://ummahflow.com/
```

`ServiceWorkerRegistration` **always loses** this round. Ordering is a stable consequence
of React's effect order, not luck.

**Post-reload load, non-deterministic.** 2/3 runs: workbox's `register()` landed first,
`getRegistrations` resolved `length=1`, registration skipped. 1/3 runs it inverted:

```
+110.0ms getRegistrations#1 CALLED  @ layout…js:13995
+112.4ms register(".../sw.js") CALLED  @ 8928…js
+112.9ms getRegistrations#1 RESOLVED length=0
+113.0ms register("/sw.js") CALLED  @ layout…js:14061   <- double register
```

Two concurrent `register()` calls for the same script and scope. Idempotent, so benign,
but the race is real and I am not going to claim a winner. **Neither outcome is harmful**,
which is the point: the race is noise, the reload is the bug.

### Q4 — Permanent per-session cycle. Confirmed.

```
SESSION 1 (fresh profile)  -> "No service workers found", flag set, NO reload. SW registers.
SESSION 2 (same profile)   -> Found 1 SW, unregister, 3 caches deleted, RELOAD. SW re-registers.
SESSION 3 (same profile)   -> Found 1 SW, unregister, 3 caches deleted, RELOAD. SW re-registers.
```

End-state after every session is identical: 1 registration, 2 caches, flag set. The
forced reload restores exactly the precondition the cleanup triggers on, so it never
converges. **This is forever, not a one-off.**

Counts across all harnesses:

- **Second-and-later sessions: 14/14 forced a reload.** Deterministic.
- **First-ever visit: 1/5.** Non-deterministic, and it is the _fast_ path that escapes:
  the cleanup's `getRegistrations()` usually resolves before next-pwa's `register()` has
  produced a registration object, so it logs "No service workers found" and skips the
  reload. The one reload came from the instrumented run, where added await hops delayed
  the effect to +1035ms. So a brand-new visitor usually escapes; a returning visitor
  never does.

### Q5 — Secondary defect refuted. Line 253 is dead code, not a bug.

The SW script fetch for an update check is browser-internal and Playwright's request
events do not surface it, so this cannot be measured against production. Settled with a
local fixture instead (`sw-update-fixture.mjs`): a static server whose `/sw.js` body is
bumped v1 -> v2 between loads, and a page reproducing each call site in isolation.

```
--- arm: none ---          (register() called once, then NEVER again)
   v1 -> v2   => picked up the new sw.js? YES
--- arm: guarded ---       (only RootClientLayout's length===0 check; it skipped registering)
   [fixture] guarded path saw 1 registration(s)
   v1 -> v2   => picked up the new sw.js? YES
--- arm: unconditional --- (only next-pwa's register)
   v1 -> v2   => picked up the new sw.js? YES
--- arm: both ---          (what production ships)
   v1 -> v2   => picked up the new sw.js? YES
```

Arm `none` is decisive: even with `register()` never called again, the client still moves
to v2. The browser performs a soft update check on every navigation inside the worker's
scope, independent of application code. Two production facts make this reliable here:
`/sw.js` is served `cache-control: no-cache, no-store, must-revalidate` (no 24h
update-check cap, no HTTP cache in the way), and the generated worker contains
`self.skipWaiting` and `clientsClaim`, so a new version activates immediately.

So `registrations.length === 0` at line 253 is **doubly** redundant: next-pwa already
registers unconditionally on every load, and the browser would update clients anyway. It
is cleanup-worthy, not a defect. **Do not spend fix budget here, and do not write a
regression test asserting stale-worker behaviour; there is nothing to assert.**

### Q6 — Why it exists: a one-shot remediation that was never one-shot.

`git log` gives exactly one commit for the file:

```
commit 3b44136567dbbcd016ff5c5094c7a1f07eb504cd
Date:   Thu Feb 5 22:03:53 2026 +0100
    refactor: update Next.js configuration and enhance client layout
    - Removed caching for Supabase in the Next.js PWA configuration to prevent network errors.
    - Deleted obsolete fallback service worker file from the public directory.
    - Added service worker cleanup on mount in ClientProviders to ensure proper resource management.
```

The same commit's `next.config.js` diff is the **actual** fix: it deleted a
`supabase-cache` `NetworkFirst` `runtimeCaching` route, with the comment "Caching
Supabase (e.g. NetworkFirst) can trigger fallback on failure and cause NetworkError."
The cleanup was the flush for clients already holding that worker.

That remediation is **8 months stale** (2026-02-05 vs 2026-10-02) and its target is long
gone:

- `supabase-cache` appears nowhere in the codebase today.
- The plugin itself was replaced: `next-pwa` -> `@ducanh2912/next-pwa` (`2b05fd28`,
  2026-02-21), and the workbox config was restructured again in `dd3dc99a` (2026-03-19,
  the Iconify fix).
- The cleanup has no version check, no date check and no expiry. It was gated on
  `sessionStorage`, which resets per session, so "runs once" was never true.
- The cache it needed to delete was a single named cache. It deletes all of them.
- Line 62's `if (registrations.length > 0)` is unreachable-as-false: line 25 already
  returned when the array was empty. Confirms the one-shot intent was never built.

**This changes the fix.** It is not "add an environment gate" to a remediation that is
still needed. Nothing needs remediating.

### What I could not determine

1. **Real-world first-visit reload rate.** The pre-reload race resolves on local timing
   (how fast `register()` produces a registration object vs how fast React mounts), so
   it will differ on real devices. A slow phone plausibly reloads on first visit more
   often than my 1/5. Returning-visitor behaviour (14/14) is not in doubt.
2. **Whether users have reported this.** The symptom is a sub-20ms flash on `/`, easily
   dismissed as a slow load. No telemetry available to me. Plausible/Sentry data for
   duplicate pageviews on session start would settle it; a doubled landing-page pageview
   rate would be the signature.
3. **Whether the original February `NetworkError` is truly gone.** I verified the
   `supabase-cache` route is gone from the config, not that no user anywhere still holds
   a February worker. Given `skipWaiting` plus 8 months of soft updates, a surviving
   stale worker is close to impossible, but I did not prove it.
4. **iOS Safari.** All measurements are Chromium. Safari's SW lifecycle and
   `sessionStorage` scoping differ; given this is a PWA with an iOS test checklist in
   `scripts/`, the fix should be spot-checked there.

### Ranked fix options

#### 1. Delete the cleanup outright. **Recommended.**

Delete `src/lib/pwa/serviceWorkerCleanup.ts` and the `useEffect` at
`ClientProviders.tsx:60-63` (plus the import at line 9).

- **Why:** Q6 shows nothing is left to remediate. Every rung of "does this need to exist"
  says no. Smallest diff, removes a file, removes the production console noise, and
  leaves the Serwist migration a clean field.
- **Trade-off:** if a user somewhere still holds a February-era worker, nothing flushes
  it. Mitigated by `skipWaiting` + the browser's soft update, both verified above. The
  honest framing: you are trading a hypothetical stale client for a reload every real
  user currently eats.
- **Regression test:** yes, and there is a correct seam. An e2e spec in `e2e/` asserting
  that a second visit in a fresh session does not force a reload. Assert
  `performance.getEntriesByType('navigation')[0].type === 'navigate'` and that no
  `[SW Cleanup]` console line appears. Needs the persistent-context trick from
  `repro.mjs`; the existing `e2e/pwa.spec.ts` patterns do not cover session boundaries.
  Note the e2e suite runs against localhost, where `ServiceWorkerRegistration` is gated
  off and `DISABLE_PWA=true`, so the test must assert the _absence of the cleanup_
  (which has no hostname gate and therefore does run on localhost) rather than SW
  behaviour.

#### 2. One-shot-ever marker in `localStorage`, versioned.

Replace the `sessionStorage` gate with something like
`localStorage['sw-cleanup-done'] === '2026-02-05'`.

- **Why:** keeps the remediation available while making "once" actually mean once per
  device.
- **Trade-off:** keeps 60 lines and a forced reload to carry a remediation Q6 says is
  obsolete. Still fires once for every existing user (they have no marker), so you still
  ship one reload to the entire user base, just once instead of forever. Pick this only
  if you want to flush February workers before deleting; then it becomes two releases,
  and you have to remember to do the second one.
- **Regression test:** yes, and harder: assert cleanup runs on session 1 and _not_ on
  session 2 of the same profile. Needs persistent context plus `localStorage`
  manipulation. Also needs a test that the marker is never written before the cleanup
  completes, or a mid-cleanup crash strands the client.

#### 3. Tighten / delete `ServiceWorkerRegistration` (`RootClientLayout.tsx:237-273`).

- **Why:** Q5 proves it is redundant with next-pwa's `register: true`, and the
  `length === 0` guard is doubly redundant. Deleting all 37 lines removes the
  post-reload double-register race entirely.
- **Trade-off:** independent of this bug and does not fix the reload. Worth doing, but as
  a follow-up or folded into the Serwist migration (which replaces the registration layer
  anyway), not as the fix for 281. If anything is "tightened" rather than deleted, it
  must not reintroduce a hostname gate that disagrees with the plugin's.
- **Regression test:** no new test. Existing `e2e/pwa.spec.ts` plus
  `scripts/verify-pwa-output.js` already cover "a worker registers". The local
  `sw-update-fixture.mjs` arms are the evidence that removal is safe.

#### 4. Add an environment/hostname gate to the cleanup. **Not recommended.**

- **Why not:** this is the fix the title of the request implies, and the diagnosis says it
  is wrong. The cleanup's problem is not that it runs in the wrong environment; it is
  that production is exactly where it runs and production is where it does the damage. A
  hostname gate would _preserve_ the bug for every real user and hide it from local dev.
  Listed only so it is explicitly ruled out.

**Pick 1.** Add 3 as a follow-up. Either way, 281 should land before the Serwist
migration, since the reload-plus-wipe cycle would otherwise make the migration's
verification meaningless.

## Implementation notes

- Branch: `fix/281-sw-cleanup-unconditional`

### Files changed

| File                                                       | Change                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/pwa/serviceWorkerCleanup.ts`                      | **Deleted** (70 lines). The directory `src/lib/pwa/` is now empty and gone too.                                                                                                                                                                                                                                                                                    |
| `src/components/layout/ClientProviders.tsx`                | Dropped the import (line 9), the `useEffect` call site and its stale "once per session" comment (lines 60-63), and `useEffect` from the React import, which no longer has any other use in the file.                                                                                                                                                               |
| `src/components/layout/__tests__/ClientProviders.test.tsx` | Dropped the `vi.mock('@/lib/pwa/serviceWorkerCleanup')` block and the now-unused `mockCleanupServiceWorkers` spy. No assertion depended on the cleanup, so the Sonner safe-area test is unchanged and still passes. Two cosmetic Prettier hunks came along because the file was already unformatted on `main` and `lint-staged` runs `prettier --write` on commit. |
| `e2e/sw-session-boundary.spec.ts`                          | **New** regression spec (152 lines).                                                                                                                                                                                                                                                                                                                               |

Nothing else in the repo referenced `cleanupServiceWorkers`, `serviceWorkerCleanup`
or `sw-cleaned-up`; the only remaining hits are this request file and the
`agent-output/debug/281/` evidence trail.

### Tests added

`e2e/sw-session-boundary.spec.ts`, test name "a returning session is not forced to reload".

It reuses the load-bearing trick from the diagnosis harnesses:
`chromium.launchPersistentContext(profileDir)`, then close and reopen the **same**
profile. The service-worker registration and CacheStorage survive on disk,
`sessionStorage` does not, which is exactly the state the old cleanup triggered on.
Playwright's default per-test context shares nothing between tests, so the stock
`page` fixture can never reproduce this.

On the second session it asserts:

1. no `[SW Cleanup]` console line,
2. `performance.getEntriesByType('navigation')[0].type === 'navigate'`, not `reload`,
3. exactly one document `load` event,
4. the registration and at least one cache survived the boundary.

Plus one precondition on session 1 (`registrations > 0`) whose only job is to stop
the spec passing vacuously: with no worker registered the cleanup returned early at
line 25 without reloading, and the whole thing would go green for the wrong reason
(learning 278).

Three things worth knowing if you touch it:

- **It needs a production build.** `test.skip` triggers on `GET /sw.js !== 200`
  rather than on `process.env.CI`, so it runs in CI (`webServer` is
  `npm run start`) _and_ against any local `npm run build && npm run start`, and
  skips loudly under `next dev` where the PWA plugin is off.
- **Count `load` events, not `framenavigated`.** The App Router does a
  same-document history navigation on the landing page, so `framenavigated` reads 2
  on a perfectly healthy session. That cost one red/green cycle to find.
- **One `x-forwarded-for` per session.** The middleware rate limiter allows 30 API
  requests/min per IP and one landing-page load spends a good chunk of it; sharing
  one IP across both sessions produced a 429 in the pre-fix run.

### Red-before / green-after

Both runs used a local `npm run build` (`DISABLE_PWA` unset, so the plugin is on and
`public/sw.js` is generated) served by `CI=1 npx playwright test`, i.e. `npm run start`.

Red, with `serviceWorkerCleanup.ts` restored and the final spec unchanged:

```
✘ 1 [chromium] › a returning session is not forced to reload (15.3s)
  Error: no code may unregister workers and wipe caches on a session boundary
  + "[SW Cleanup] Starting service worker cleanup..."
  + "[SW Cleanup] Found 1 service worker(s)"
  + "[SW Cleanup] Unregistering: http://127.0.0.1:3000/sw.js"
  + "[SW Cleanup] All service workers unregistered"
  + "[SW Cleanup] Found 2 cache(s)"
  + "[SW Cleanup] Deleting cache: start-url"
  + "[SW Cleanup] Deleting cache: workbox-precache-v2-http://127.0.0.1:3000/"
  + "[SW Cleanup] All caches cleared"
  + "[SW Cleanup] Reloading page to apply changes..."
```

The console assertion fires first, so the reload assertions were checked separately
by temporarily reordering them against the same buggy build:

```
✘ Error: expect(received).toBe(expected)
  Expected: "navigate"
  Received: "reload"
```

Green, after the deletion:

```
✓ 1 [chromium] › a returning session is not forced to reload (14.4s)
  1 passed (17.1s)
```

Also green at `--repeat-each=2` (2 parallel workers, 2/2 passed), because the
pre-reload race in the diagnosis made flakiness a fair worry.

This also reproduces the production bug on `127.0.0.1` for the first time: the
diagnosis could only show it against https://ummahflow.com. The cleanup has no
hostname gate and the plugin's injected registration is not hostname-gated either,
so a local production build is enough.

### Verification

| Check                                                                     | Result                                                                           |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `npx vitest run src/components/layout/__tests__/ClientProviders.test.tsx` | 1 passed                                                                         |
| `npx playwright test e2e/sw-session-boundary.spec.ts` (CI=1, prod build)  | 1 passed; red before the fix, see above                                          |
| `npm run lint`                                                            | 0 errors, 132 warnings, all pre-existing. Zero in any file this request touched. |
| `npx tsc --noEmit`                                                        | clean                                                                            |
| `scripts/verify-pwa-output.js` (runs as `postbuild`)                      | `OK: public/sw.js generated and imports sw-push-handler.js` on every build       |

No existing guard, assertion or lint rule was weakened, skipped or deleted.

`public/manifest.json` was reverted before committing: `prebuild`
(`scripts/generate-manifest.js`) rewrites it with `"url": "/providers"` where the
committed file has `"/food"`, and committing that churn would break the plan228
regression test.

## Review findings

### Standards axis

### Spec axis

## QA results

- Suite: pass / fail
- Regressions:

## Follow-up requests

_New work discovered during this request. Do not act on these; finish the current request first._

- **Fold the `ServiceWorkerRegistration` deletion into request 282.** All 37 lines
  (`RootClientLayout.tsx:237-273`) are redundant with the plugin's injected
  registration today, and deleting them also removes the benign post-reload
  double-register race. It was deliberately left in place here (Decision 4) because
  the evidence that something still registers only covers the current
  `@ducanh2912/next-pwa` setup. 282 replaces that plugin, so it is the request that
  can prove the post-migration half and delete the code in the same breath.
- **`DevServiceWorkerReset` (`RootClientLayout.tsx:218-235`) is a second blind
  unregister-plus-wipe-all-caches effect.** It is gated to
  `NODE_ENV === 'development'` **and** localhost/127.0.0.1, so it is dead code in any
  production build and did not contribute to this bug. But it means `npm run dev`
  can never hold a service worker, which is worth a deliberate decision during the
  Serwist migration rather than inheriting it by accident.

## Learnings

_Captured after review and test (workflow.mdc rule)._
