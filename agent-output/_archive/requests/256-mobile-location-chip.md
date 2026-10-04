---
ID: 256
Origin: 256
UUID: 6E3A4289-77E1-43C9-A320-5C1A7F6AD0D6
Status: Active
Type: change-request
Branch: cr/256-mobile-location-chip
Worktree: ../uflow-wt/256-mobile-location-chip
PR: 417
Created: 2026-09-26T08:29:06Z
---

> Status stays `Active` until PR #417 merges, at which point it becomes `Committed` and this file moves to `requests/closed/` per the document-lifecycle skill.

# Request 256: Mobile location affordance on results pages

## Original request

> Pick up the topic of a mobile location chip. Analysis handed in verbatim:
>
> **What exists today**
>
> Mobile (`md:hidden` header): section tabs, search input with a sliders icon, then a chip row with only Near Me and Open Now. No location affordance at all. `DiscoveryFilterBar.tsx:46-83`
>
> Desktop (`hidden md:flex` chip row): a merged location chip that shows "Everywhere" / the city / "Near Me" and opens a dropdown, plus Open Now and Filter. `SearchBar.tsx:388-481`
>
> So there is no mobile "Everywhere" chip to convert. The real question is whether to add a location affordance to mobile.
>
> **Why I'd not port the desktop dropdown**
>
> 1. The mobile home list isn't city-scoped, so the chip would be a lie. `getMapLocations` takes no city parameter; it returns every approved food provider with coordinates, and `HomeListView` renders those pins straight through. `map-pins.ts:35-56` An "Everywhere" dropdown on home would either be a decorative label or require new city filtering in the home data path and the map. That's a data change, not a UI change.
> 2. Mobile already has a location picker, and it's better than the desktop dropdown. The sliders icon opens `/search`, whose "Wo:" accordion has city search, popular cities with provider counts, recent cities, city-exists validation, and a notify-me flow for cities with no providers. `page.tsx:656-696` A 48px-wide anchored dropdown can't do any of that.
> 3. A second picker means a third write path into location state, which is where this codebase keeps breaking. `/search` hydrates from `localStorage.selectedCity` `page.tsx:413-427` while results read the city from the path/URL. `ProvidersContent.tsx:158-167` You're still carrying legacy normalization for translated "Everywhere"/"Überall" leaking into the location param in two places (`SearchBar.tsx:168-172`, `ProvidersContent.tsx:160-164`), and plans 044, 017 and 172 were all location-state bugs. Adding another writer is the expensive option.
> 4. Anchored dropdowns are a desktop pattern. On mobile you'd want a bottom sheet or full-screen list. `/search` already is that.
>
> **The gap that is actually worth fixing**
>
> On mobile results, the active city is completely invisible. Plan 220 decided "D7 | City label visibility | No need to display selected city label explicitly", and the mobile header shows section, query, Near Me, Open Now, and nothing about location. A user who picks Stuttgart in `/search` gets Stuttgart-filtered results with no visible cause and no one-tap way to widen or clear it. A filter with no feedback is a worse problem than a missing dropdown.
>
> What I'd do instead of a dropdown:
>
> - Add a location chip to `DiscoveryFilterBar`, on results pages only, that displays the active city (or "Everywhere") and on tap routes to `/search` with the Wo accordion open. Display and route, not a second picker. One new read of a value that already drives the query, zero new state.
> - Put it first in the row. That row is `overflow-x-auto` and already grows an admin chip, so a city name pushes Open Now off-screen on an iPhone SE if it goes last. `DiscoveryFilterBar.tsx:48-48`
> - Make Near Me visually supersede it, the way the desktop chip merges the two states. Worth checking carefully: results-page Near Me is geolocation-based per plan 220 D4, while the city lives in the path, so both can be "on" at once and contradict each other.
>
> Leave the home chip row as chips only. Scoping home by city is a separate product decision and it cuts against the Near Me model home is built on (25km radius, `RootPageContent.tsx:100`).

## Classification

- **Type:** change-request
- **Route:** CR flow (Grill -> Implement -> Code Review -> Done)
- **Confidence:** high. Modifies existing behaviour on results pages and explicitly reverses a recorded decision (plan 220 D7). Not a new capability, not a bug.

## Phases

| #   | Phase                 | Status | Outcome                                                                                               |
| --- | --------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| 0   | Tracking file created | Done   | This file                                                                                             |
| 1   | Grill                 | Done   | D1-D8 settled. Code-grounded analysis at `agent-output/analysis/256-mobile-location-chip-analysis.md` |
| 2   | Spec                  | Done   | Written below, user confirmed: all three changes together, shared helper extracted                    |
| 3   | Implement             | Done   | 3 commits, 20 new tests, TDD                                                                          |
| 4   | Code Review           | Done   | 1 Medium fixed (`a1f35efc`), 2 Info accepted, 3 limitations logged                                    |
| 5   | QA                    | Done   | Full suite green: 2333 passed, 0 failed                                                               |
| 6   | Done                  | Done   | Pushed, PR #417 opened, both learnings persisted to `docs/ai/LEARNINGS.md`                            |

## Decisions

Decisions made during grilling, recorded as they land.

| #   | Decision                    | Choice                                                                                                   | Rationale                                                                                                                                                                                               |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Routing                     | Grill first, then implement                                                                              | The ask reverses plan 220 D7 and carried an open design question; not safe to hand to an implementer as written                                                                                         |
| D2  | Near Me vs city clash       | Mutually exclusive: activating Near Me clears the city, picking a city clears Near Me                    | User decision. Removes the contradictory "both on" state rather than papering over it with a visual merge. Larger change: touches location state                                                        |
| D3  | D2 scope                    | Mobile results pages only                                                                                | Desktop already enforces exclusivity (`SearchBar.tsx:219-220, 249-265`). D2 is a mobile-only gap, not a new cross-platform rule                                                                         |
| D4  | Near Me URL mechanism       | `router.push` to the section root, stripping the city. Toggle-off is lossy and does not restore the city | Matches desktop `syncUrl` exactly (`SearchBar.tsx:219-241`). Restoring the previous city would add the remembered-location-state writer that caused plans 044/017/172. Orchestrator call; user deferred |
| D5  | Chip state under Near Me    | Hide the location chip while Near Me is active                                                           | User decision. Post-D2 a Near Me session has no city, and a second location-describing chip competes with the Near Me chip                                                                              |
| D6  | `localStorage.selectedCity` | Leave untouched                                                                                          | User decision. It feeds onboarding gating, home stage and create flows, not results filtering. Clearing it would silently un-gate onboarding                                                            |
| D7  | Chip tap target             | Single target, routes to `/search?section=food&open=wo`                                                  | Orchestrator call; user deferred. An inline clear adds a second write path into location state and nests a sub-44px target inside a 32px chip in a scrollable row                                       |
| D8  | `open=wo` param persistence | Accept that it survives in-page section switches                                                         | `handleSectionChange` carries all params forward (`search/page.tsx:541-543`). Deleting it costs an effect plus a `router.replace` for a cosmetic issue                                                  |

## Verified facts (orchestrator, pre-grill)

- `DiscoveryFilterBar` renders exactly Near Me + Open Now + `adminSlot` in one `flex flex-nowrap overflow-x-auto` row. No location affordance exists on mobile. `src/features/search/components/DiscoveryFilterBar.tsx:46-83`
- Plan 220 records `D7 | City label visibility | No need to display selected city label explicitly`. `agent-output/planning/220-unify-food-results-with-home-list-view.md:27`
- Local `main` was level with `origin/main` at worktree creation (`2674b96f`).

## Spec

### Scope

Mobile results pages only: the `DiscoveryFilterBar` instance rendered by `ProvidersContent` via `DiscoveryHeader filterBarSlot`, which mounts only when `section === 'food'` and `!showGreeting` (`ProvidersContent.tsx:663-683`). The `HomeSearchBar` instance (`HomeSearchBar.tsx:115-124`) is unchanged. Non-food sections are unaffected because the bar is not mounted there.

### Change A — location chip in `DiscoveryFilterBar`

Two new optional props, so the chip's styling lives beside its siblings and the caller supplies only data plus intent:

- `locationCity?: string | null` — resolved city, `null` or `''` meaning Everywhere.
- `onLocationClick?: () => void` — tap handler. Chip renders only when this is provided, which is what keeps it off home.

Rendering:

- First child of the existing `flex flex-nowrap items-center gap-2 overflow-x-auto` row (`DiscoveryFilterBar.tsx:48`), before Near Me.
- Hidden when `nearMeChipActive` (D5).
- Label: `locationCity || t('search.everywhere')`. No new i18n keys; `search.everywhere` exists in all six locales.
- Styling: reuse the sibling inactive variant (`h-8 shrink-0 rounded-md border border-gray-200 bg-white px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide text-content-muted shadow-sm`). Trailing `ChevronDown` to signal it opens a picker and to distinguish it from the two toggle chips.
- Semantics: it navigates, so no `aria-pressed`. `aria-label` composed from existing keys as `` `${t('suchen.accordions.wo')}: ${label}` `` — again zero new keys.

### Change B — `/search` Wo accordion deep link

In `src/app/(public)/search/page.tsx`, initialize the accordion from a param instead of the hardcoded `'was'` (`:106`): `searchParams.get('open') === 'wo' ? 'wo' : 'was'`. One-shot initial read only; the existing re-sync effect (`:477-485`) does not touch the accordion. Per D8, no cleanup of the param.

### Change C — D2 mobile exclusivity

Extract the near-me URL logic out of desktop-only `SearchBar.syncUrl` (`SearchBar.tsx:214-244`) into a shared helper beside `buildResultsUrl` in `src/lib/search-params.ts`. It must preserve today's behaviour exactly: strip the city to `getResultsPathForSection(section)` when near-me is active, set/delete `near_me` and `open_now`, and delete stale `near_lat` / `near_lon` / `near_radius`.

Both call sites use it:

- `SearchBar.syncUrl` — refactor to delegate. No behaviour change on desktop.
- `ProvidersContent.handleToggleNearMe` (`:229-237`) — currently does no navigation. It gains the `router.push` to the stripped URL (D4).

Picking a city is expected to clear Near Me with no new code: the URL built by `/search` submit carries no `near_me`, so `nearMeFromUrl` (`ProvidersContent.tsx:190`) is false on landing. This needs a test, not an implementation.

`localStorage.selectedCity` is not touched (D6).

### Tests (TDD, Vitest)

`DiscoveryFilterBar` has no test file today; create one.

- `DiscoveryFilterBar`: chip renders first in the row when `onLocationClick` is given; shows the city; shows Everywhere for `null` and `''`; hidden when the Near Me chip is active; absent entirely when `onLocationClick` is omitted (the home case).
- `ProvidersContent`: chip label resolves from the path city and from the legacy `?location=` param; tap routes to `/search?section=food&open=wo`; Near Me toggle-on pushes the section-root URL with `near_me=1` and no city; landing on a city URL with no `near_me` leaves Near Me off.
- `/search` page: `?open=wo` opens the Wo accordion; no param keeps `was`.
- Must not regress: `src/__tests__/app/providers-content-location-resolution.test.tsx` (Everywhere/Überall → `''`), `src/__tests__/regression/plan017-i18n-location-sentinel.test.tsx`, `src/__tests__/regression/plan172-location-persistence.test.tsx`, `src/__tests__/components/SearchBar.test.tsx` (the desktop refactor must be behaviour-neutral).
- Note for the implementer: the four existing `ProvidersContent` tests mock `DiscoveryFilterBar` out (e.g. `providers-content-location-resolution.test.tsx:71-73`), so chip assertions either unmock it in a new file or assert on the props handed to the mock.

### Acceptance criteria

1. Mobile `/food/stuttgart`: chip row reads Stuttgart, Near Me, Open Now, in that order.
2. Mobile `/food`: the chip reads Everywhere (Überall in German).
3. Tapping the chip lands on `/search` with the Wo accordion already expanded.
4. Activating Near Me on `/food/stuttgart` navigates to `/food?near_me=1` and hides the location chip.
5. Deactivating Near Me leaves you on `/food` with the chip reading Everywhere. This loss of the city is intended (D4).
6. The home chip row is unchanged: no location chip.
7. Desktop behaviour is byte-for-byte unchanged; the shared-helper extraction is a pure refactor.
8. `localStorage.selectedCity` is never written by this change.

### Out of scope

City-scoping the home list; any desktop behaviour change beyond the helper extraction; restoring the previous city on Near Me toggle-off; new i18n keys; the unused-looking `NearMeOpenNowFilters` component (flagged as a possible follow-up).

## Implementation notes

- Branch: `cr/256-mobile-location-chip`. Three commits: `7e8dd81d` feat, `a1e49b3e` learning doc, `a1f35efc` review fix. Not pushed.
- **Files changed (5 source, 4 test, 1 doc):**
  - `src/lib/search-params.ts` — new `buildNearMeUrl` beside `buildResultsUrl`, the shared strip-city-on-near-me rule
  - `src/features/search/components/SearchBar.tsx` — `syncUrl` delegates to the helper; pure refactor, dropped the now-unused `getResultsPathForSection` import
  - `src/features/search/components/DiscoveryFilterBar.tsx` — `locationCity` + `onLocationClick` props, chip renders first, hidden under Near Me
  - `src/app/(public)/providers/ProvidersContent.tsx` — wires the chip; `handleToggleNearMe` gained the `router.push` (Change C)
  - `src/app/(public)/search/page.tsx` — `openAccordion` initialized from `?open=wo`
  - `docs/ai/LEARNINGS.md` — slot-prop mocking learning
- **Tests added: 20 across 4 files** (`DiscoveryFilterBar` had none before)
  - `src/features/search/components/DiscoveryFilterBar.test.tsx` (6) — chip first with city, Everywhere for `null`/`''`, click, no `aria-pressed`, hidden under active Near Me, absent without `onLocationClick`
  - `src/__tests__/lib/search-params.test.ts` (5) — city strip, pathname kept on deactivate, param preservation, stale `near_*` cleanup, `open_now` deletion
  - `src/__tests__/app/providers-content-location-chip.test.tsx` (7) — label from path and legacy `?location=`, chip tap target, Near Me on/off URLs, no `near_me` on landing
  - `src/__tests__/app/(public)/search/page-open-wo.test.tsx` (2) — `?open=wo` opens Wo, absent param keeps it closed
- Environment note: worktree `node_modules` is a symlink to the canonical repo's (lockfiles byte-identical). Don't `npm install` in either tree while it stands.

## Review findings

Reviewed commits `7e8dd81d` + `a1e49b3e` against `main` (10 files, +602/-31).

### Standards axis

| Severity | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Location                                                                                                                                                                    | Action                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Medium   | `buildNearMeUrl` appends `?` unconditionally, so an empty param set yields `/food?`. Its sibling `buildResultsUrl` guards this (`qs ? \`${path}?${qs}\` : path`) 15 lines earlier in the same file. Faithful to the old desktop `syncUrl`, but mobile now rewrites the URL on every Near Me toggle, so the wart becomes user-visible on the common path (`/food`with no filters, Near Me off). The new tests assert`/food?`and`/food/stuttgart?`, cementing it. | `src/lib/search-params.ts` (new helper); assertions at `src/__tests__/lib/search-params.test.ts:24,57` and `src/__tests__/app/providers-content-location-chip.test.tsx:230` | Fix. No pre-existing test asserts the empty case, so only the three new assertions change |
| Info     | Prettier rewrapped the untouched `showPermissionDenied` expression in `DiscoveryFilterBar.tsx`. Incidental churn, brings the file into conformance.                                                                                                                                                                                                                                                                                                             | `DiscoveryFilterBar.tsx:38-40`                                                                                                                                              | Accept                                                                                    |
| Info     | Worktree has no `node_modules`; the implementer symlinked the canonical repo's after confirming `package-lock.json` is byte-identical. Not committed (0 tracked paths).                                                                                                                                                                                                                                                                                         | worktree only                                                                                                                                                               | Accept, but don't run `npm install` in either tree while the symlink stands               |

### Spec axis

All eight acceptance criteria met. Verified independently:

- **AC7 (desktop unchanged) holds structurally, not just by test.** `DiscoveryHeader` is `fixed ... md:hidden` (`DiscoveryHeader.tsx:44`), so the chip cannot reach desktop and cannot duplicate the existing merged location chip. The `syncUrl` extraction is line-for-line faithful. `SearchBar.test.tsx` passed unedited.
- **`openNow` carry-through checked and correct.** I suspected the helper was writing an `open_now` param nothing reads. It isn't: `useMapDiscovery` initializes `isOpenNow` from `open_now` and re-syncs via effect (`useMapDiscovery.ts:92-98`), so threading `isOpenNow` through `buildNearMeUrl` keeps URL and state consistent.
- **D6 respected**: no `localStorage`/`sessionStorage.selectedCity` writes in the diff.
- **D5 respected**: chip gated on `!nearMeChipActive`.

### Accepted limitations (not defects, logged deliberately)

1. **Denying geolocation still costs you the city.** Activation navigates to the section root before permission resolves, so a denied prompt leaves you on `/food` with Stuttgart gone. Desktop `handleSelectNearMe` has the identical flaw. Fixing it means deferring navigation until permission settles, which is a design change beyond this spec. Follow-up candidate.
2. **Landing directly on a legacy `/food/stuttgart?near_me=1` URL stays contradictory** until the user toggles. D2 is enforced at the toggle, not on mount. Normalizing on mount would mean a navigation during render. Follow-up candidate.
3. **`docs/ai/LEARNINGS.md` merge-conflict risk**: this branch appends to the end of the file, and the canonical repo has an uncommitted change to the same file on `main`. Both are end-of-file appends, so expect a conflict at merge time.

## QA results

- **Suite: pass.** `npx vitest run` full suite: 268 files passed, 2 skipped; 2333 tests passed, 28 skipped. Zero failures.
- **Type-check: clean.** `npm run type-check` (`tsc --noEmit`) exit 0.
- **Lint: 209 problems (57 errors, 152 warnings), all pre-existing and none in this branch's files.** Offenders are in `src/lib/slugify.ts`, `src/lib/enrichment/*` and others. The branch touches no ESLint, TS or package config, so these provably cannot originate here. Gate read as "no new lint issues" (satisfied), not "repo lint green" (not satisfied, and not this request's to fix). Worth its own cleanup request.
- Coverage delta: 20 net-new tests; `DiscoveryFilterBar` goes from untested to covered.
- Regressions: none. `SearchBar.test.tsx`, `plan017-i18n-location-sentinel`, `plan172-location-persistence` and the four existing `ProvidersContent` suites all pass unedited.
- Noise, not a failure: `ProviderEditForm.regression.test.tsx` logs a `TypeError` from inside the component while every test in the file passes. Unrelated to 256, pre-existing.
- **Manual mobile verification: passed** (user, 2026-09-26). Last open item on the PR test plan, now ticked. All eight acceptance criteria confirmed by automated tests plus this manual pass.

## Follow-up requests

_New work discovered during this request. Do not act on these; finish the current request first._

IDs reserved (`.next-id` bumped to 261). Tracking files get created when each is actually started, not now.

| #   | ID  | Candidate                                                                                                                                                            | Why it surfaced               | Size                                                  |
| --- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------- |
| F1  | 257 | Don't navigate until the geolocation prompt resolves. Denying permission currently costs you the city for nothing. Affects desktop `handleSelectNearMe` identically. | Review, accepted limitation 1 | Medium; changes the activation flow on both platforms |
| F2  | 258 | Normalize legacy contradictory URLs like `/food/stuttgart?near_me=1` on mount. D2 is enforced at the toggle, not on arrival.                                         | Review, accepted limitation 2 | Small, but means a navigation during mount            |
| F3  | 259 | Repo-wide lint cleanup: 57 errors, 152 warnings on `main`, none from this branch. Consider whether the gate should run `lint:check` with `--max-warnings 0`.         | QA                            | Medium, mechanical                                    |
| F4  | 260 | `src/features/search/components/NearMeOpenNowFilters.tsx` appears to have no production callers outside its own test. Confirm and delete.                            | Grill-prep analysis           | Small                                                 |

## Learnings

_Captured after review and test (workflow.mdc rule)._

1. **Already in the branch** (`docs/ai/LEARNINGS.md`, commit `a1e49b3e`): when a component passes children via a slot prop to a mocked wrapper, assert on the element's props captured inside the wrapper mock, not on the child's own mock. The child is never rendered, so its mock never fires.
2. **Process learning, not yet persisted:** before scoping a mobile/desktop parity change, check whether the other platform already _enforces_ the rule rather than assuming it only _displays_ it. The originating note proposed making Near Me "visually supersede" the city "the way the desktop chip merges the two states". Desktop doesn't merge them visually; it enforces exclusivity structurally by routing to the section root and stripping the city (`SearchBar.tsx:219-241`). Verifying that reframed the work from "invent a cross-platform rule" to "close a mobile-only gap by extracting the rule desktop already had", which turned new logic into a shared-helper extraction. Corollary: when a request reverses a recorded decision (here plan 220 D7), record the reversal as its own decision with rationale instead of letting it land silently.
