---
ID: 257
Origin: 256
UUID: 4E342738-ED30-4C82-9FEC-3B90A2DC57CF
Status: Active
Type: bug
Branch: fix/257-near-me-denied-keeps-city
Worktree: ../uflow-wt/257-near-me-denied-keeps-city
PR: 419
Created: 2026-09-26T10:55:55Z
---

# Request 257: Denying the geolocation prompt costs you the city

Follow-up to request 256, "Accepted limitations" item 1. Promoted to its own request rather than relitigated inside 256.

## Original request

> Mobile Near Me loses your city when you deny the geolocation prompt. On mobile results pages, activating Near Me navigates to the section root and strips the city from the path immediately, before the browser permission prompt resolves. Deny the prompt and you're left on /food with the city gone and nothing gained. Desktop has the identical flaw: `SearchBar.handleSelectNearMe` calls `syncUrl({active: true})` synchronously.

## Classification

- **Type:** bug
- **Route:** Bug flow (Diagnose -> Fix -> Code Review -> Done)
- **Confidence:** high. Behaviour is user-visible loss of state on a path the user did not consent to; no new capability, no reversed decision. 256 D4 governs _toggle-off_ losing the city, which this request does not touch.

## Phases

| #   | Phase                 | Status | Outcome                                                                                                                                      |
| --- | --------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Tracking file created | Done   | This file                                                                                                                                    |
| 1   | Sequencing check      | Done   | PR #417 merged `2026-09-26T10:33:19Z`. Branched from `origin/main` `8446b04f`, which contains #417. No conflict risk in `handleToggleNearMe` |
| 2   | Diagnose              | Done   | Root cause confirmed in code, both surfaces. See below                                                                                       |
| 3   | Grill                 | Done   | D2-D7 settled. User chose D3/D5, deferred D2/D4 to the orchestrator                                                                          |
| 4   | Fix                   | Done   | 1 commit `4008320a`, 4 files, 9 new/rewritten tests, TDD                                                                                     |
| 5   | Code Review           | Done   | Approved as-is. 0 Medium+, 4 Info accepted                                                                                                   |
| 6   | QA                    | Done   | Full suite green: 269 files, 2341 passed, 0 failed                                                                                           |
| 7   | Done                  | Done   | Pushed, PR #419 opened, learning persisted to `docs/ai/LEARNINGS.md` (`c665f892`)                                                            |

> Status stays `Active` until PR #419 merges, at which point it becomes `Committed` and this file moves to `requests/closed/` per the document-lifecycle skill.

## Sequencing check (the trap)

`gh pr view 417` → `state: MERGED`, `mergedAt: 2026-09-26T10:33:19Z`, `cr/256-mobile-location-chip` → `main`.

`origin/main` tip is `8446b04f "Mobile location chip + Near Me/city exclusivity (#256) (#417)"`. Worktree branched from `origin/main`, **not** from local `main`, which is still at `2674b96f` (pre-merge) and has uncommitted changes to `docs/ai/LEARNINGS.md` that would block a `--ff-only` pull. The canonical tree was left untouched.

## Diagnosis

Root cause is one line on each surface: the navigation that strips the city is issued **synchronously in the toggle handler**, in the same tick as `requestLocation()`, so it lands before the browser permission prompt resolves. Geolocation's outcome never feeds back into the URL decision.

### Mobile

`ProvidersContent.handleToggleNearMe` (`src/app/(public)/providers/ProvidersContent.tsx`, ~:229-252 post-#417):

```
setNearMeActive(true);
geolocation.requestLocation();   // async, prompt may still be open
router.push(buildNearMeUrl({ section, active: true, ... }));  // strips city NOW
```

`buildNearMeUrl` with `active: true` sets `basePath = getResultsPathForSection(section)`, discarding the `[city]` segment (`src/lib/search-params.ts:48`). Denial then leaves the user on `/food` with `nearMeActive` true, `geoStatus: 'denied'`, and no city.

### Desktop — identical, plus a second loss

`SearchBar.handleSelectNearMe` (`src/features/search/components/SearchBar.tsx:236-241`) calls `setSelectedLocation(LOCATION_ALL)` **and** `syncUrl({ active: true })` synchronously. `syncUrl` delegates to the same `buildNearMeUrl`. So desktop loses the city in two places, the URL and the `selectedLocation` context that drives the merged chip label.

### Why the fix is not "push later" alone

The URL-driven entry path already exists and must not double-navigate. `ProvidersContent` (~:197-204) auto-requests geolocation when `?near_me=1` arrives from the desktop chip:

```
useEffect(() => {
  if (nearMeFromUrl && !nearMeActive) setNearMeActive(true);
  if (nearMeFromUrl && geolocation.status === 'idle') geolocation.requestLocation();
}, [nearMeFromUrl]);
```

That effect never navigates, so it cannot conflict on its own. But a naive "navigate when status becomes granted" effect **would** fire on this path too, pushing `/food?near_me=1` a second time when the user is already there — a duplicate history entry that breaks Back, not merely a redundant push. Any fix needs the deferred navigation armed only by a real user toggle.

### In-repo precedent for the deferred-navigation shape

`useNearMeToggle` (`src/features/search/hooks/useNearMeToggle.ts:91-129`) already implements this exact pattern for the `/search` results page: toggle-on while `idle` calls `requestLocation()` and writes **no** URL; an effect watching `geolocation.status`/`coords` writes the URL only once `granted`. It needs no arming guard because it uses `router.replace` with coords that genuinely change; this request uses `push`, so it does.

`useGeolocation` (`src/hooks/useGeolocation.ts:103-180`) exposes only `{status, coords, requestLocation, reset}` — `requestLocation` takes no arguments and there is no success callback. Adding one changes a hook with 4 production call sites (`ProvidersContent:193`, `SearchBar:43`, `RootPageContent:76`, `useNearMeToggle:40`) and 12 test call sites.

### What the intermediate 'prompting' state already does (no new UI needed)

Staying on `/food/stuttgart` while the prompt is open is already coherent:

- `useNearMe` computes `isActive = active && coords !== null` (`useNearMe.ts:97`), so with no coords yet it is **false**.
- The paginated city query is gated `enabled: !nearMe.isActive`, so the Stuttgart list keeps rendering. No blank list, no spinner gap.
- The Near Me chip already pulses on `geoStatus === 'prompting'` (`DiscoveryFilterBar.tsx:61-64`).
- The denied hint already renders, gated on `nearMeActive && geoStatus === 'denied'` (`DiscoveryFilterBar.tsx:85-92`).

### Coupling the user needs to decide on (feeds Q3)

The existing denial hint is gated on `nearMeActive`. **Resetting `nearMeActive` to false on denial would silently delete the only feedback that the prompt was denied.** The two sub-decisions are not independent.

Also note `nearMeChipActive = geoStatus === 'granted' || (nearMeActive && geoStatus === 'idle')` (`DiscoveryFilterBar.tsx:51`) is false on `denied`, so the location chip (gated `!nearMeChipActive`) stays visible and keeps showing the city. Leaving `nearMeActive` true on denial does not produce a visually-active Near Me chip.

## Test impact (constraint tension, flagged)

The brief asks that five suites stay green. Four do, untouched:

- `src/__tests__/lib/search-params.test.ts` — `buildNearMeUrl`'s output is unchanged; only _when_ it is called changes.
- `src/__tests__/components/SearchBar.test.tsx` — contains **no** near-me coverage at all (grep for `near|Near`: zero matches). Desktop near-me is currently untested.
- `src/__tests__/regression/plan017-i18n-location-sentinel.test.tsx`
- `src/__tests__/regression/plan172-location-persistence.test.tsx` — no `near_me`/`nearMe` references.

One cannot stay green as written, because it is the test that encodes the bug:

- `src/__tests__/app/providers-content-location-chip.test.tsx` — `"pushes the section root with near_me=1 when Near Me is activated"` asserts the synchronous push, with `useGeolocation` mocked to a permanent `status: 'idle'` and `requestLocation` as a no-op. Deferring navigation **must** fail this assertion. It gets rewritten (toggle → no push; simulated grant → push). Its sibling `"pushes the near_me-stripped URL when Near Me is deactivated"` stays green: deactivation involves no permission and is not deferred.

## Decisions

| #   | Decision                                | Choice                                                                                                        | Rationale                                                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Sequencing                              | Branch from `origin/main` (contains #417), not local `main`                                                   | #417 merged before this request started, so the conflict scenario in the brief does not apply                                                                                                                                                                                                                                        |
| D2  | Deferred-nav mechanism                  | Effect watching `geolocation.status`, gated by a ref armed only by a real user toggle                         | Orchestrator call; user asked to advise. `useNearMeToggle.ts:121-129` is the existing in-repo shape. A `useGeolocation` success callback would change a hook with 4 production + 12 test call sites and still needs the arming guard on a `push` path                                                                                |
| D3  | UI during `prompting`                   | Reuse what exists; nothing new                                                                                | User decision. The chip already pulses (`DiscoveryFilterBar.tsx:61-64`), and `useNearMe.isActive` is `active && coords !== null`, so the city-scoped list keeps rendering with no blank state. Zero new markup, zero new i18n keys                                                                                                   |
| D4  | `nearMeActive` on denial                | Stays `true`; no navigation, city intact                                                                      | Orchestrator call; user asked for the better UX. The denial hint is gated on `nearMeActive && geoStatus === 'denied'` (`DiscoveryFilterBar.tsx:85-92`), so resetting it makes the tap a silent no-op. `nearMeChipActive` is already false on `denied`, so the chip does not look stuck on and the mobile location chip stays visible |
| D5  | Platform scope                          | Both mobile and desktop                                                                                       | User decision. Desktop has the identical flaw plus a second loss (`setSelectedLocation(LOCATION_ALL)`), and `SearchBar.test.tsx` has zero near-me coverage, so nothing existing breaks                                                                                                                                               |
| D6  | Desktop must request geolocation itself | `handleSelectNearMe` gains `geolocation.requestLocation()`; the prompt moves from post-navigation to on-click | Orchestrator call, forced by D5. `SearchBar` never calls `requestLocation` today (only `.status` and `.reset()`), so its status is permanently `idle` and it cannot defer on an outcome it never requests. Side effect: desktop's `showPermissionDenied` (`SearchBar.tsx:262-265`) and prompting pulse (`:399`) stop being dead code |
| D7  | Desktop chip label gate                 | `:393`/`:400` gate on `nearMeChipActive`, not raw `nearMeActive`                                              | Orchestrator call. Without it, D4 makes the desktop chip read "Near me" while results are still Stuttgart, hiding the city in the one place desktop shows it. `nearMeChipActive` already means "near-me is in effect" (granted, or URL-driven idle), so this is the truthful gate                                                    |

## Constraints (inherited, not up for debate)

- Never write `localStorage.selectedCity` / `sessionStorage.selectedCity` (256 D6).
- No remembered-previous-city state (256 D4; the pattern behind plans 044, 017, 172).
- 256 D4 (Near Me toggle-**off** is deliberately lossy) stays as-is. This request is about toggle-**on** under denial.
- Lint gate is "no NEW lint issues". Repo lint is already red on `main` (57 errors, 152 warnings), reserved as request 259.
- `gh pr edit` is broken on this repo (Projects-classic GraphQL deprecation, silently leaves the body unchanged). Use `gh api --method PATCH repos/abu-lina/uflow/pulls/N -F body=@file` and read the body back to confirm.
- Worktree has no `node_modules`; 256 symlinked the canonical repo's after confirming `package-lock.json` is byte-identical. Do not run `npm install` in either tree while a symlink stands.

## Implementation notes

- Branch: `fix/257-near-me-denied-keeps-city`, from `origin/main` `8446b04f`. Commit `4008320a` (+300/-32 across 4 files). Not pushed at time of writing.
- **Files changed (2 source, 2 test):**
  - `src/app/(public)/providers/ProvidersContent.tsx` — `pendingNearMeNavRef`; activation no longer pushes; new effect on `[geolocation.status]` pushes `buildNearMeUrl({active: true})` only on `granted`, disarms on `denied`/`unavailable`/`timeout` without navigating; deactivation path unchanged except it now disarms the ref
  - `src/features/search/components/SearchBar.tsx` — same ref + effect; `handleSelectNearMe` now calls `geolocation.requestLocation()` and drops the synchronous `setSelectedLocation(LOCATION_ALL)` + `syncUrl`; `deactivateNearMe` disarms; D7 label/MapPin gates moved to `nearMeChipActive`
  - `src/__tests__/app/providers-content-location-chip.test.tsx` — mocks made mutable (`geoMock`, `pathnameRef`); 1 test rewritten, 4 added
  - `src/__tests__/components/SearchBar-near-me.test.tsx` — new file, 4 cases (desktop near-me had zero coverage before)
- **`buildNearMeUrl` and `useGeolocation` were not touched.** Only _when_ the helper is called changed. No i18n keys, no `DiscoveryFilterBar` change, no `localStorage`/`sessionStorage` writes.
- Environment: worktree `node_modules` symlinked to the canonical repo's after confirming `package-lock.json` is byte-identical. Don't `npm install` in either tree while it stands.

## Review findings

Reviewed `4008320a` in full against `origin/main` `8446b04f`. **Approved as-is; no rework round.** No Critical/High/Medium findings.

### Standards axis

| Severity | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Location                       | Action |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| Info     | `handleSelectNearMe`'s dep array is `[geolocation]`, and `useGeolocation` returns a fresh object literal every render, so the callback's identity churns each render. Verified harmless: `handleSelectNearMe` is referenced exactly once, as an `onClick` (`SearchBar.tsx:447`), and appears in no dependency array, so it cannot drive an effect loop. `[geolocation.requestLocation]` would be tighter.                                                               | `SearchBar.tsx:240-244`        | Accept |
| Info     | The MapPin pulse ternary was deleted rather than preserved as the brief said. Verified correct, not a liberty: with the gate moved to `nearMeChipActive`, TypeScript narrows `geoStatus` to `'granted' \| 'idle'` inside the block (aliased-condition narrowing, both values are `const`), so `geoStatus === 'prompting'` is a no-overlap comparison error and the branch is unreachable. The icon cannot render while prompting. Deleting dead code is the right call. | `SearchBar.tsx:418-420`        | Accept |
| Info     | `'unavailable'` and `'timeout'` share the `'denied'` branch in both effects but only `'denied'` is covered by a test. Single OR condition over a closed union; the untested values take an identical path.                                                                                                                                                                                                                                                              | both effects                   | Accept |
| Info     | Effect placed after `useMapDiscovery` rather than next to the `nearMeFromUrl` effect, because it reads `isOpenNow`. Forced by hook ordering; the brief did not pin a location.                                                                                                                                                                                                                                                                                          | `ProvidersContent.tsx:234-255` | Accept |

### Spec axis

- **The arming guard is correct and actually guarded.** The URL-entry effect (`:197-204`) never arms the ref, so the desktop-chip entry path (`/food?near_me=1` → auto-request → `granted`) produces no push. Covered by the test `"does not push a duplicate URL when near_me=1 arrives via the URL"`, which renders at pathname `/food` with `near_me=1` and asserts zero pushes on the grant transition.
- **The toggle-off race is closed.** Deactivation disarms before `geolocation.reset()`, so a late in-flight `getCurrentPosition` success cannot navigate after the user turned Near Me off. Covered by its own test.
- **D4 verified end to end.** On `denied`: no navigation, `nearMeActive` still `true` (asserted via `filterBarProps().nearMeActive`), so the hint at `DiscoveryFilterBar.tsx:85-92` renders. Mobile's location chip stays visible because `nearMeChipActive` is false on `denied`.
- **D7 verified by assertion, not just by reading.** `SearchBar-near-me.test.tsx:124-126` queries the chip button and asserts `textContent` contains `Stuttgart` and does not contain the near-me label, on the denied path.
- **Desktop deactivation-on-city-pick still disarms even when `nearMeActive` is already false**, because the disarm sits above the existing `if (nearMeActive)` guard. Covered by `"does not navigate on a late granted after a city was picked"`.
- **256 D4 (toggle-off is lossy) untouched.** The deactivation branch still pushes immediately and still does not restore the city; its pre-existing test passes unedited.

### Accepted limitations (logged, not defects)

1. **Recovering from a denial takes two taps.** `nextActive = !(nearMeActive || geolocation.status === 'granted')` sees `nearMeActive` still `true` after a denial (D4), so the first tap deactivates (pushing the current URL again) and only a second tap re-prompts. Pre-existing logic from 256, unchanged here, and the direct cost of keeping the denial hint visible. Follow-up candidate if it annoys in practice.
2. **Desktop now issues two `getCurrentPosition` calls per activation** — one from `SearchBar` (new, D6) and one from `ProvidersContent`'s own instance after landing on `?near_me=1`. Only one browser prompt appears, since permission is per-origin and the second call resolves from the granted state or the 5-minute position cache. Consolidating the two instances is out of scope.
3. **256 limitation 2 is still open**: landing directly on a legacy `/food/stuttgart?near_me=1` URL stays contradictory until the user toggles. Not in this request's scope.

## QA results

- **Targeted suite: pass.** `npx vitest run src/__tests__/app/ src/__tests__/components/ src/__tests__/lib/search-params.test.ts src/__tests__/regression/plan017-i18n-location-sentinel.test.tsx src/__tests__/regression/plan172-location-persistence.test.tsx src/features/search/components/DiscoveryFilterBar.test.tsx` → 53 files, 393 passed, 3 skipped, 0 failed.
- **Four of the five "must stay green" suites green, unedited:** `search-params` (5), `plan017-i18n-location-sentinel` (5), `plan172-location-persistence` (3), `DiscoveryFilterBar` (6). The fifth, `providers-content-location-chip`, was edited by design: its `"pushes the section root with near_me=1 when Near Me is activated"` test asserted the synchronous push and _was_ the bug encoded. Now 11 tests, all green.
- **Type-check: clean.** `npm run type-check` exit 0.
- **Lint: no new issues.** `npx eslint` on the 4 changed files → exit 0, no output. Repo-wide lint remains red from pre-existing problems (57 errors, 152 warnings), reserved as request 259 and deliberately not touched.
- **Full suite: pass.** `npx vitest run` → 269 files passed, 2 skipped; 2341 tests passed, 28 skipped, 0 failed (27.7s). Exactly baseline (268 files / 2333 tests at `8446b04f`) plus this branch's +1 file and +8 tests. Only stderr noise was the expected `useAuth must be used within an AuthProvider` console error from `useAuth.test.tsx`'s own negative test.
- Coverage delta: +8 net-new tests. `SearchBar` near-me goes from zero coverage to 4 cases.
- Regressions: none.

## Learnings

Captured and persisted to `docs/ai/LEARNINGS.md` in commit `c665f892`, as `### 2026-09-26 — Defer the URL write, not just the state write, when an action depends on an async permission outcome (Request 257)`. Three points: (1) a status-watcher effect needs a gesture-armed ref when the same status transition is reachable from a second entry path, or it double-pushes and breaks Back; (2) deferring a state write turns display gates on the raw intent flag into lies, so audit every consumer and move them to the effective flag; (3) you cannot defer on an outcome you never request, and a hook whose status you render but never drive means another component is doing the asking. Plus the `useNearMeToggle.ts:91-129` precedent as the shape to grep for next time.

## Follow-up requests

- 256 "Accepted limitations" item 2 (landing directly on a legacy `/food/stuttgart?near_me=1` URL stays contradictory until the user toggles) is still open and is **not** in this request's scope.
- Recovering from a denied prompt takes two taps (see Accepted limitations 1). Worth its own request only if it proves annoying in use.
- Desktop runs two `useGeolocation` instances per near-me activation (see Accepted limitations 2). Consolidating them is a refactor, not a bug.
