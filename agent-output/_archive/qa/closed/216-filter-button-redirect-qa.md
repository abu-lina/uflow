---
ID: 216
Origin: 216
UUID: c91f3a2e
Status: Committed
---

# QA 216: Filter Button Redirects to Map Instead of Filter Page

## Changelog

| Date | Agent | Action | Notes |
|------|-------|--------|-------|
| 2026-08-17 | QA | Test strategy created | Phase 1 — plan, analysis, code review reviewed; branch `fix/216-filter-button-redirect` @ `752469f1` |
| 2026-08-17 | QA | Testing completed | Full suite, type-check, build, delta lint, targeted regression, real-browser validation (Playwright + dev server + live Supabase). Verdict: QA COMPLETE |

---

## Plan Reference

- **Plan**: `agent-output/planning/216-filter-button-redirect-plan.md`
- **Analysis**: `agent-output/analysis/216-filter-button-redirect.md`
- **Implementation**: `agent-output/implementation/216-filter-button-redirect.md`
- **Code Review**: `agent-output/code-review/216-filter-button-redirect-review.md` (verdict: APPROVED)
- **Branch / Commit**: `fix/216-filter-button-redirect` @ `752469f1` (code); `433cc04b` (docs)
- **Commit diff vs main**: exactly 3 code files — `src/app/(public)/search/page.tsx`, `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx`, `src/__tests__/features/search/HomeSearchBar.test.tsx`. No navigation code touched (D2 respected).

---

## Phase 1 — Test Strategy

**Bug mirror (user perspective)**: On a phone (<768px), tapping the filter (sliders) button on the home searchbar, or the edit button on the results page, lands on `/search?section=food` — which pre-fix rendered a full-screen map with no back button and no filters. The fix must make filters the default for all no-`view` entry paths while preserving the intentional map via `?view=map`.

**Approach**:
1. **Unit/regression (Vitest + Testing Library)** — destination render predicate in `search/page.tsx`; branch-state inventory B1-B8 from the plan; filter-button URL guards.
2. **Static gates** — `npm test`, `npm run type-check`, `npm run build`, delta eslint on the 3 changed files.
3. **Real-browser validation (Playwright chromium, headless)** — the jsdom suite cannot prove real `SearchMap`/Leaflet behavior; browser checks cover: iPhone width filter page, desktop width, `view=map` deep link, viewport resize crossing 768px, unknown-view fail-safe, bare-URL server defaults, real Supabase data flow.
4. **Gaps G1/G2** — disposition per plan decision D6 (carried to QA/UAT).

**Test files**:
- `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx` (6 tests) — the actual bug path and the branch inventory.
- `src/__tests__/features/search/HomeSearchBar.test.tsx` (20 tests) — button URL guard (no `view=map`).
- `src/features/search/components/SearchContextBar.test.tsx` (9 tests) — edit button URL (unchanged, asserted no-view).
- `src/app/(public)/search/page.test.tsx` (9 tests), `src/__tests__/regression/plan212-near-me-viewport.test.tsx` (1 test) — adjacent regressions.

---

## Phase 2 — Test Execution Results

### TDD Compliance Confirmation (gate)

**PASS.** The implementation doc contains a complete TDD Compliance table (6 rows: function, test file, written-first, failure verified, failure reason, pass-after-impl) plus red and green evidence. Pre-fix targeted run: 3 failures, all caused by `search-map` rendering when it must not (the exact bug). Post-fix targeted run: 26/26 pass. The regression tests mirror the actual bug path (filter button → filters, not map), and the client-state precedence pattern from the repo instructions is followed (`[pre-fix FAILS / post-fix PASSES]` naming, focused logic tests rather than SSR-only coverage).

### Gate Results (independently re-run on branch state)

| Gate | Result (QA re-run) | Notes |
|------|--------------------|-------|
| `npm test` (full) | PASS — 235 files, 1910 passed / 24 skipped | Matches implementation doc exactly |
| `npm run type-check` | PASS — exit 0 | |
| `npm run build` | PASS — exit 0 | Full route table generated |
| Delta eslint (3 changed files) | 0 errors, 1 pre-existing warning | `search/page.tsx:428` missing `t` dep — pre-existing, unrelated (confirmed INFO-1 in code review) |
| `npm run lint` project-wide | FAIL (pre-existing) | Unrelated uncommitted errors in chat/dashboard/API files; not introduced by this plan |

### Targeted Regression Runs

| Suite | Result |
|-------|--------|
| `plan208-mobile-search-map-switch.test.tsx` (6) | PASS |
| `HomeSearchBar.test.tsx` (20) | PASS |
| `SearchContextBar.test.tsx` (9) | PASS |
| `search/page.test.tsx` (9) | PASS |
| `plan212-near-me-viewport.test.tsx` (1) | PASS |

### Branch-State Coverage Assessment (B1-B8 vs. the tests that assert them)

| Branch | Plan claim | Unit test | Real-browser | QA assessment |
|--------|-----------|-----------|--------------|---------------|
| B1 mobile+food+`view=map` → map | preserved (tested) | Test 3 + pins test 5 | M1-M3 PASS | **Covered.** Map renders, accordions + bottom bar hidden |
| B2 mobile+food+no `view` → filters | **bug path — fixed** | Test 1 (primary regression) | C1-C3 PASS | **Covered.** `search-map` absent, accordions + bottom bar present |
| B3 mobile+food+non-`map` → filters | fixed (fail-safe) | Test 2 (`view=filters`) | M6 PASS (`view=Map` uppercase) | **Covered.** Exact-match comparison, any non-`map` fails safe |
| B4 mobile+ummah → filters | confirmed not broken | none (no test sets section=ummah) | n/a | Logically guaranteed — predicate change is monotonic (adds `&& urlView==='map'`); cannot turn map OFF→ON. LOW: explicit test optional |
| B5 mobile+store → filters | confirmed not broken | none | n/a | Same monotonic guarantee |
| B6 desktop+food+`view=map` → filters | confirmed not broken (tested) | Test 4 | C7 / D1 PASS | **Covered.** Desktop never shows map even with `view=map` |
| B7 desktop+food+no `view` → filters | confirmed not broken | implicit (desktop tests assert filters) | D1 PASS | Pre-existing behavior unchanged; verified in browser |
| B8 map throws → ErrorBoundary → filters | confirmed not broken | not exercised (ErrorBoundary stubbed to render children) | n/a | Code unchanged (`:783` still wraps `SearchMap` with `fallback={accordionBody}`). Test stub acceptable since the fallback path is untouched |

**Verdict on plan claims**: the tests assert what the plan claims for every branch that has a test; the untested branches (B4/B5/B7/B8) are logically guaranteed unchanged by the monotonic predicate edit or are untouched code. No over-correction detected — the map feature survives via B1.

### Mock-Fidelity Finding (accordion / controlled-open)

The `ExpandSection` mock in `plan208-mobile-search-map-switch.test.tsx` renders children unconditionally (ignores `isOpen`), while the real component gates children on `isOpen`. **Finding: LOW.** Impact is nil for this plan's assertions because:
- `suchen.accordions.woEmpty` is the Wo accordion **title** (`search/page.tsx:584-585`), which the real component renders regardless of `isOpen` — the assertion is faithful.
- The `search-map` testid assertions depend only on the top-level map-vs-filters branch, not on accordion internals.
- The real `ExpandSection` gating is covered in its own suite (`src/__tests__/components/ui/ExpandSection.test.tsx`: "hides body by default when defaultOpen is not set", "toggles body visibility when header is clicked") — the isOpen=false children-hidden requirement is satisfied there.
- Pre-existing pattern from Plan 208, not introduced by this plan. Recommendation: future tests asserting accordion body content should use a faithful mock or the real component.

---

## Real-Browser Validation (Playwright + local dev server + live Supabase)

Environment: headless Chromium, Next.js dev server on :3100, live Supabase project (`qrekonfhaenjdnjhwdum.supabase.co`), city Berlin (Stage 2/3, real provider data). Viewport: mobile 375x667 (iPhone UA), desktop 1280x800. Leaflet presence via `.leaflet-container`; filter presence via accordion headings (`h3`) and bottom-bar text.

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| C1 | Mobile `/search?section=food` → filters, no map | PASS | leaflet=0, h3=4 |
| C2 | Mobile filters: "Wo?" accordion header visible | PASS | |
| C3 | Mobile filters: bottom "Alles löschen" bar visible | PASS | |
| M1 | Mobile `/search?section=food&view=map` → map | PASS | leaflet=1, h3=0 |
| M2 | Map mode: accordions hidden | PASS | h3=0 |
| M3 | Map mode: bottom bar hidden | PASS | |
| D1 | Desktop 1280px `/search?section=food` → filters, no map | PASS | leaflet=0, h3=4 |
| D2 | Desktop bottom bar present | PASS | "Clear all" (desktop renders EN locale; earlier German-string check was a locale false-negative) |
| C7 | Desktop `/search?section=food&view=map` → filters (desktop guard) | PASS | leaflet=0, h3=4 |
| M4 | Resize 375→800 on `view=map`: map hides, filters shown | PASS | leaflet 1→0, h3=4 |
| M5 | Resize 800→375 on `view=map`: map returns | PASS | leaflet 0→1 |
| M6 | Mobile `view=Map` (unknown value): fails safe to filters | PASS | leaflet=0, h3=4 |
| S1 | Mobile bare `/search` (no params): server defaults → filters | PASS | leaflet=0, h3=4 |
| S2 | Mobile `/search?view=map` (no section): section defaults to food → map | PASS | leaflet=1, h3=0 |
| E2/E3 | Direct deep links (no-view → filters; `view=map` → map) | PASS | covered by C1/M1 |

**12 of 12 functional browser checks pass** (S2 and M1 initially "failed" only on first-compile races of the Leaflet chunk in dev; both pass on warm compile — recorded as environmental, not product defects).

### Environmental finding (not a plan defect)

The full home-screen flow (home searchbar → click filter button) could not be completed in this headless environment: **all** client-side `router.push` calls from the home page fail to commit (URL stays `/`; RSC returns 200 but the router does not navigate) — verified for two different destinations (`/search?section=food` and `/providers?q=berliner&section=food`). This is environmental: the commit diff proves zero navigation-code changes (buttons untouched per D2); client navigation from the `/search` page works in the same browser; and in production the navigation demonstrably worked (the original bug report describes being redirected to the map). The button→URL contract is pinned by `HomeSearchBar.test.tsx` (push exactly `/search?section=food`, no `view=map`), and the destination behavior is proven by C1-C3. **Recommendation: one manual UAT tap-check of the home filter button on a real device** (already in the UAT checklist below).

---

## Gap Disposition (analysis G1/G2, per plan D6)

- **G1 — Desktop repro explained?** QA disposition: the most probable explanation is that the reporter used a narrow window below 768px (split-screen or devtools responsive mode), which exercises the identical mobile code path — **now fixed by this plan** (no-`view` renders filters at any width). A genuine ≥768px desktop viewport has no code path to the map (both filter buttons are `md:hidden`/`sm:hidden`; the map predicate requires `isMobile`), verified in-browser at 1280px (D1, C7). Residual possibility — the reporter misidentified the control — requires reporter clarification and is non-blocking.
- **G2 — Desktop header "Filter" pill implicated?** QA disposition: no. The desktop header pill opens an in-place dropdown (`SearchBar.tsx:456-542`) and never navigates to `/search` or a map (analysis F6, plan D5). Out of scope by design decision D5. If the reporter meant this control, their description ("redirects to another map") does not match it.

Both gaps are **explained or non-blocking for this fix**; a note for the reporter is appended to the UAT section.

---

## Edge Cases (plan E1-E8) — Verification

| Edge | Expected | Verified |
|------|----------|----------|
| E1 non-food sections on mobile | map never renders | Monotonic predicate; unchanged code (B4/B5) |
| E2 direct `/search?section=food` (bookmark) | filters | Browser C1; jsdom test 1 |
| E3 `/search?section=food&view=map` | map | Browser M1; jsdom test 3 |
| E4 resize crossing 768px | map only toggles when `view=map` | Browser M4/M5 |
| E5 `view=map` persists across section switches | persists | Code-verified: `handleSectionChange` copies all params (`page.tsx:478-481`); accepted behavior (D7) |
| E6 empty-query submit path | filters | Same no-view destination; covered by B2 (jsdom test 1) |
| E7 ErrorBoundary fallback | filters on map throw | Code unchanged (`:783`); B8 |
| E8 unknown `view` value | fails safe to filters | Browser M6 (`view=Map`); jsdom test 2 |

---

## Value Delivery Check (plan Value Statement)

> "As a mobile user on iPhone and a desktop user, I want tapping the filter button on the home searchbar (and the edit button on the results page) to show me the filter page with all filters (Wo / Was / Wer / Filter accordions), so that I can refine my search instead of being dropped onto a full-screen map."

| User | Requirement | Evidence |
|------|-------------|----------|
| iPhone / mobile (<768px) | Filter button lands on filter accordions, not map | Browser C1-C3 (4 accordions, no map, bottom bar); jsdom test 1 + HomeSearchBar URL guard |
| Mobile map feature (Plan 208) | Still reachable deliberately | Browser M1-M3; jsdom test 3 |
| Desktop (≥768px) | Filter page shows all filters | Browser D1/C7/D2 (desktop never shows map); desktop header pill unchanged (D5) |
| Results-page edit button | Same correct destination | `SearchContextBar.test.tsx:141` (no-view URL) + shared predicate |
| Performance | No wasted Supabase pin query in filter mode | jsdom test 6 (`mockSupabaseFrom` not called with `locations`) |

**Value delivered for both iPhone and desktop users.** The fix also covers the latent empty-query submit path (E6) and deep links (E2) at no extra cost.

| 2026-08-17 | DevOps | Document closed | Status: Committed |
---

## Manual Validation Checklist (for UAT on real devices)

Real-browser automated checks passed in this environment, but UAT should repeat on physical devices / production build:

1. **iPhone (physical or Safari device emulation, <768px)**: home searchbar → tap filter (sliders) button → expect `/search?section=food` with Wo/Was/Wer/Filter accordions visible and NO map. Also confirm the results-page edit (SlidersHorizontal) button behaves identically.
2. **Desktop (≥1280px)**: open `/search?section=food` directly → accordions visible, no map; the header "Filter" pill still opens its in-place dropdown (unchanged control).
3. **Viewport resize crossing 768px**: on `/search?section=food&view=map`, shrink the window below 768px → map remains (view=map); then open `/search?section=food` (no view) and shrink below 768px → filters remain, no map flip.
4. **Deep link `/search?section=food`** on mobile → filters (was map pre-fix).
5. **Deep link `/search?section=food&view=map`** on mobile → map still renders (intentional map preserved).
6. **`search-map`/leaflet container absent** whenever filters are shown (i.e., all no-`view` and non-`map` view values).
7. **Home filter-button tap** on a real device (this environment could not commit client navigations from the home page — see environmental finding).
8. **Reporter follow-up (G1/G2)**: ask the original reporter which button/window width they used; if genuine desktop width, clarify it cannot reproduce (no code path).

Screenshots from this session (DOM-verified, pixel review by UAT): `/tmp/qa216-mobile-filters.png`, `/tmp/qa216-mobile-map.png`, `/tmp/qa216-desktop.png`, `/tmp/qa216-home-filter-final.png`.

---

## UAT Eligibility Statement

The implementation is eligible for UAT:
- Predecessor docs all show passing status: Implementation (tests/type-check/build green; lint exception documented as pre-existing), Code Review (APPROVED, no findings), QA (this doc — QA COMPLETE).
- No security, performance, or maintainability concerns introduced (code review; delta lint 0 new errors).
- Value statement demonstrably delivered at unit, regression, and real-browser levels.
- Target release v0.15.17 confirmed at DevOps Stage 1 (package.json currently 0.15.16; CHANGELOG entry for v0.15.17 to be added at release by DevOps).

---

## Verdict

# ✅ QA COMPLETE — APPROVED FOR RELEASE

- **Tests run**: 1910 unit/regression + 12 real-browser functional checks + 3 static gates + delta lint
- **Failures**: 0 product-related (1 environmental: home-page client navigation in headless dev; not plan-related, verified via commit diff and cross-destination reproducibility)
- **TDD compliance**: PASS (complete table, genuine red-green, bug-path regression tests)
- **Branch coverage B1-B8**: all plan-claimed branches verified; untested branches logically guaranteed monotonic-safe
- **Gaps G1/G2**: explained / non-blocking (narrow-viewport repro fixed; desktop has no code path)
- **Next**: UAT (manual checklist above), then DevOps (v0.15.17 release)
