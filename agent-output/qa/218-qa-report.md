---
ID: 218
Origin: 218
UUID: 377700d3
Status: QA Complete
---

# QA Report — Plan 218: Lucide "Dot" separator between open tag and distance on ProviderCard

| Field | Value |
| --- | --- |
| Plan | [218-dot-separator-plan.md](../planning/218-dot-separator-plan.md) |
| Analysis | [218-dot-separator-analysis.md](../analysis/218-dot-separator-analysis.md) |
| Critique | [218-plan-critique.md](../critiques/218-plan-critique.md) — APPROVED, 3 non-blocking findings (F-218-1/2/3) |
| Implementation | [218-dot-separator-implementation.md](../implementation/218-dot-separator-implementation.md) |
| Code Review | [218-code-review.md](../code-review/218-code-review.md) — APPROVED, 0 findings |
| Branch | `feature/218-near-me-list-dot-separator` (base `origin/main`) |
| QA Verdict | **QA Complete** |
| UAT Eligibility | **APPROVED FOR RELEASE** (technical gate passed; visual device check UAT-218-1 below) |

## Changelog

| Date (UTC) | Agent | Action |
| --- | --- | --- |
| 2026-08-17 | QA | Opened QA report. Test strategy defined (Phase 1). |
| 2026-08-17 | QA | Testing In Progress — independent re-run of targeted suites, plan 217/212 regression files, full suite, type-check, delta lint, build, DOM-structure audit, version-artifact check. |
| 2026-08-17 | QA | QA Complete. Verdict: APPROVED FOR RELEASE with 1 LOW observation (test-strength note, non-blocking). |

## Self-Check

Scanned `agent-output/qa/` and `agent-output/uat/` (excluding `closed/`). No documents with terminal status found outside `closed/`. No orphan closure required.

---

## Phase 1: Test Strategy

Scope derived from the plan's Value Statement ("dot separator … so the two fields read as two distinct pieces of information") and the analysis's behavior spec (dot between open tag and distance when **both** present; absent when either missing).

| # | Scenario (user perspective) | Automated coverage |
| --- | --- | --- |
| S1 | Both open status + distance present → a dot separator renders between them, inside the status row | `ProviderCard-distance.test.tsx` dot test 1 (positive) |
| S2 | Distance missing (open status only) → no dangling dot | Dot test 2 (negative: `distanceKm` undefined) |
| S3 | Open status missing (distance only) → no dangling dot | Dot test 3 (negative: no `opening_hours`) |
| S4 | Neither present → row itself absent (no empty wrapper) | Existing `ProviderCard.test.tsx:480` (`provider-open-status` absent) |
| S5 | Guard truth table complete: dot renders ⟺ `openStatus.visible && distanceLabel` | S1–S4 combined cover all 4 guard states |
| S6 | Shared-card blast radius: home near-me list + search near-me grid both still render correctly with the real card | `HomeNearMeList.test.tsx` (5) + `NearMeResultsGrid.test.tsx` (5) re-run against the changed component |
| S7 | Plan 217/212 regression: near-me list wiring, viewport, and map-switch behavior unaffected | `plan217-near-me-list.test.tsx` (3) + `plan212-near-me-viewport.test.tsx` (1) |
| S8 | No test depends on exact DOM structure around the insertion point | Grep audit of `provider-distance` / `provider-open-status` testids (see 2.4) |
| S9 | Static gates: types, lint, build | `npm run type-check`, delta `eslint`, `npm run build` |
| S10 | No version drift / release-blocker hygiene | `git diff origin/main...HEAD` file list + `package.json` comparison (see 2.5) |

**Visual verification (dot size, separator-vs-bullet reading, flex alignment) is explicitly deferred to the UAT device pass** — jsdom cannot verify pixel rendering. Recorded as **UAT-218-1** in the UAT section below, including the F-218-2 two-sided size contingency (icon-md up / icon-xs down).

---

## Phase 2: Test Execution Results

### 2.1 TDD Compliance Gate (first check)

Implementation doc contains the TDD Compliance table, complete:

| Function/Class | Test file | Written first? | Failure verified? | Pass after impl? |
| --- | --- | --- | --- | --- |
| `ProviderCard` dot separator | `ProviderCard-distance.test.tsx` | ✅ | ✅ (`TestingLibraryElementError: Unable to find an element by: [data-testid="provider-distance-separator"]`) | ✅ |

**GATE PASSED** — table present and complete. The two negative tests passing pre-fix is correct behavior (absence already produces the desired negative outcome); the positive test carried the red→green proof. Code review independently confirmed this reading.

### 2.2 Independent test execution (QA re-run, not trusting implementer evidence)

```
$ npx vitest run src/__tests__/components/ProviderCard-distance.test.tsx \
    src/__tests__/components/ProviderCard.test.tsx \
    src/__tests__/features/search/HomeNearMeList.test.tsx \
    src/features/search/components/NearMeResultsGrid.test.tsx \
    src/__tests__/regression/plan217-near-me-list.test.tsx \
    src/__tests__/regression/plan212-near-me-viewport.test.tsx
Test Files  6 passed (6)
     Tests  64 passed (64)
   Duration 1.82s
```

| Test file | Tests | Result |
| --- | --- | --- |
| `ProviderCard-distance.test.tsx` | 6 | ✅ (3 new dot tests + 3 existing distance-label tests) |
| `ProviderCard.test.tsx` | 44 | ✅ (open-status presence/absence, `queryByText('●')` absent intact) |
| `HomeNearMeList.test.tsx` | 5 | ✅ (near-me list unchanged against shared-card change) |
| `NearMeResultsGrid.test.tsx` | 5 | ✅ (search near-me grid unchanged) |
| `plan217-near-me-list.test.tsx` | 3 | ✅ (pre-fix/post-fix wiring regression intact) |
| `plan212-near-me-viewport.test.tsx` | 1 | ✅ (PWA viewport regression intact) |

Full suite (independent, complete re-run):

```
$ npx vitest run
Test Files  236 passed | 2 skipped (238)
     Tests  1929 passed | 24 skipped (1953)
   Duration 35.57s
```

Matches the implementer's recorded evidence exactly (236/238 files, 1929/1953 tests). No collateral breakage from the shared-card change anywhere in the repo.

### 2.3 Static gates

```
$ npm run type-check   → tsc --noEmit: PASS (exit 0)
$ npx eslint src/components/providers/ProviderCard.tsx src/__tests__/components/ProviderCard-distance.test.tsx
                        → PASS (clean, exit 0)
$ npm run build         → PASS (exit 0; SSG/dynamic pages generated, no errors)
```

### 2.4 DOM-structure audit (functional/conditional coverage check)

Grep for `provider-distance` / `provider-open-status` across the test suite — 3 files reference them:

- `ProviderCard.test.tsx:459,480` — asserts `provider-open-status` **presence/absence only**; no child-count or child-structure assertions. Unaffected.
- `ProviderCard-distance.test.tsx:46` — existing `provider-distance` absence assertion; unaffected by a sibling SVG.
- `HomeNearMeList.test.tsx:24,167-168` — uses `provider-distance-p1/p2` on **its own mock** of `ProviderCard` (line 13-28 `vi.mock`), never the real component. Unaffected.

**Conclusion: no test anywhere relies on the exact DOM structure around the insertion point.** The SVG dot is a sibling, not a child, of the queried spans — exactly as Analysis F9 predicted. The 3 new dot tests cover the full guard truth table (S1–S3) plus the existing row-absence test (S4) completes it.

Source verification of the behavior spec (dot between the two fields when both present): `ProviderCard.tsx:449-466` renders in order — open-status span (449-455) → guarded `<Dot>` (456-461) → distance span (462-466). Guard `openStatus.visible && distanceLabel` at line 456 matches plan Decision 6 exactly. `className="h-icon-sm w-icon-sm text-text-muted"` (line 458) matches Decision 3/4; `data-testid="provider-distance-separator"` (line 459) matches Decision 7. `icon-sm` token confirmed in `tailwind.config.ts:179` (20px). `lucide-react` `Dot` export confirmed installed (`node_modules`, `createLucideIcon` circle r=1, stroke-width 2 → ~3.3px effective disc at 20px per critique F-218-3's corrected math). `aria-hidden="true"` confirmed auto-applied (`Icon.js:33`), decorative separator, no a11y work needed — matches plan note.

### 2.5 Release-blocker checks

| Check | Result | Evidence |
| --- | --- | --- |
| Branch diff scope | ✅ | `git diff origin/main...HEAD` = 5 files: 2 source (`ProviderCard.tsx` +7, `ProviderCard-distance.test.tsx` +57) + 3 agent-output docs (planning/implementation/code-review). No unrelated source files. Feat commit `88901252` = 3 files. Matches plan File-by-File list (2 source files) + pipeline docs. |
| Version drift | ✅ | `origin/main:package.json` = `0.15.18`; branch `package.json` = `0.15.18`. No diff on `package.json`, `package-lock.json`, or `CHANGELOG.md` vs `origin/main`. Plan 217 already set the version; 218 rides it (no bump, per plan M4). |
| TDD compliance table | ✅ | Present and complete (see 2.1). |
| Type-check | ✅ | `tsc --noEmit` clean. |
| Delta lint | ✅ | eslint clean on both changed files. |
| Regression for actual behavior path | ✅ | 3 dot-conditional tests exercise the real guard expression (`openStatus.visible && distanceLabel`) with pre-fix red evidence. |
| No new dependency | ✅ | `lucide-react` already installed (`^0.577.0`), in active use elsewhere. |
| No schema/migration/API change | ✅ | Purely presentational JSX. |

### 2.6 Code change verification (map to plan file list)

| Plan file action | Actual | Match |
| --- | --- | --- |
| `ProviderCard.tsx`: add `import { Dot } from 'lucide-react';` | ✅ line 8, single additive import | ✅ |
| `ProviderCard.tsx`: guarded `<Dot>` between lines 454-455 | ✅ lines 456-461, guard `openStatus.visible && distanceLabel`, classes + testid exact | ✅ |
| `ProviderCard-distance.test.tsx`: 3 dot-conditional tests (M1) | ✅ 3 tests in `describe('dot separator (Plan 218)')`, fixtures inline (7-day `00:00-23:59` opening_hours shape per plan note) | ✅ |
| No changes to `HomeNearMeList.test.tsx` / `NearMeResultsGrid.test.tsx` | ✅ both untouched, still green | ✅ |
| Version bump | ✅ none — `0.15.18` preserved | ✅ |

No plan deviation found. Implementation matches the approved plan exactly.

---

## Findings

### F-QA-1 (LOW — observation, non-blocking, no code change required)
**Positive dot test asserts row containment but not explicit sibling order**
- **Severity**: LOW
- **Location**: `ProviderCard-distance.test.tsx:63-78` — `expect(row).toContainElement(separator)`
- **Description**: Plan M1 acceptance said "assert via `getByTestId('provider-distance-separator')` plus sibling order". The critique (F-218, focus area 4) sanctioned either `compareDocumentPosition` or "asserting the separator's position within the provider-open-status row". The implementation uses `toContainElement` — membership in the row, which satisfies the critique's sanctioned alternative but does not strictly prove the dot precedes the distance span in DOM order.
- **Impact**: None today — the source diff unambiguously places the dot between the spans (lines 456-461), and UAT-218-1 visually confirms placement. A future refactor that moved the dot after the distance badge would not be caught by this test alone.
- **Recommendation**: Optional strengthening — assert `separator.compareDocumentPosition(distanceSpan) & Node.DOCUMENT_POSITION_FOLLOWING` (separator precedes distance) or check `separator.nextElementSibling === distanceSpan`. Not required for this release.

---

## UAT Section (Value Delivery + Release Decision)

### Business value assessment

**Value statement (from plan):** "As a user browsing the home near-me list or search-page near-me results, I want a small dot separator between the open/closed status and the distance badge on each provider card, so that the two fields read as two distinct pieces of information instead of one run of text."

**Delivery confirmation:**

1. **Both near-me surfaces get the dot** — the change lives in the shared `ProviderCard`; `HomeNearMeList.tsx:123` and `NearMeResultsGrid.tsx:101` both pass `distanceKm` and render the real card. `HomeListView` passes no `distanceKm` → no distance, no dot. This matches the confirmed product decision (plan Decision 5: "user confirmed both near-me surfaces get the dot"; analysis F8 verified both call sites).
2. **Behavior spec met** — dot renders ⟺ both `openStatus.visible` and `distanceLabel` truthy (guard at line 456; S1–S4 cover the full truth table). Never a dangling separator.
3. **Consistency with design system** — `lucide-react` per `ICON_USAGE_STANDARDS.md`, `icon-sm`/`text-text-muted` existing tokens, `aria-hidden` decorative handling automatic. Matches the standard library the user requested.
4. **Visual reading is the one thing automation cannot prove** — jsdom renders the SVG element but cannot judge whether a ~3.3px dot at 20px reads as a separator rather than a stray glyph, nor confirm flex alignment. This is the UAT device pass (UAT-218-1).

**Verdict: the sum of implementation + code review + QA evidence demonstrates the value statement is delivered at the technical level.** No re-test of these gates is required in the UAT phase; the device pass executes the checklist below.

### UAT checklist (human device pass — owner: human QA/UAT on uat.ummahflow.com; combined with Plan 217 U1–U11)

| # | Check | Pass criteria |
| --- | --- | --- |
| UAT-218-1 | Dot separator visual check (home near-me list + search near-me grid) | On a card showing both "Geöffnet/Geschlossen" and a distance (e.g. "1,2 km"): (a) the dot is **visible** at `icon-sm` (20px, ~3.3px effective disc) and reads as a separator, not a stray glyph or bullet; (b) the dot sits **between** the open tag and the distance badge; (c) open tag, dot, and distance stay aligned in the flex row (`items-center`, no baseline jump); (d) cards showing only one field (open tag without distance, or distance without open tag) show **no dot**; (e) non-near-me home list (`HomeListView`) shows no dot anywhere. |

**F-218-2 contingency (size two-sided adjustment)** — trigger criteria for the human pass on UAT-218-1:
- If the dot reads as **too subtle / nearly invisible** → escalate **up** to `h-icon-md w-icon-md` (24px, ~4px effective): one-line change in `ProviderCard.tsx:458`, no new plan needed (plan Decision 3 contingency).
- If the dot reads as **too large / bullet-like** → escalate **down** to `h-icon-xs w-icon-xs` (16px, ~2.7px effective): one-line change, same file (critique F-218-2 adds this direction to the plan's one-directional contingency).
- Either adjustment is cosmetic; automated tests are size-class-agnostic (they assert on the testid, not pixel size), so no test re-run beyond the suite above is needed after a size-token swap.

### Shared-release context (Plan 218 + Plan 217 in v0.15.18)

- Plan 217 (near-me home List fix) is already merged to `main` (`ba79138f`) and **already UAT-deployed** with checklist U1–U11 pending on uat.ummahflow.com.
- Plan 218 rides the same unreleased `0.15.18` (no version bump — verified in 2.5).
- **Ordering dependency (flagged):** UAT-218-1 can only be executed on the combined pass **after Plan 218 merges to `main` and deploys to UAT**. Until then, uat.ummahflow.com runs the 217 code (no dot). The combined UAT pass (217 U1–U11 + 218 UAT-218-1) should be scheduled post-218-deploy; DevOps coordinates merge + UAT deploy first.

---

## QA Verdict

**Status: QA Complete**

**Release decision: APPROVED FOR RELEASE** (technical QA gate; UAT device check UAT-218-1 remains for the combined v0.15.18 pass)

Rationale:
- All 64 targeted tests across 6 files pass independently; full suite 1929/1953 pass (24 pre-existing skips), matching implementer evidence exactly.
- type-check, delta lint, and build all clean (exit 0, independently run).
- Guard truth table fully covered (S1–S4); no test depends on the DOM structure around the insertion point (grep-audited); plan 217/212 regression files green — the shared-card change breaks nothing.
- Release blockers clear: branch diff scoped to 2 source files + pipeline docs, `0.15.18` preserved with zero version-file drift, TDD compliance table present and honest.
- Source placement, guard, tokens, testid, and aria behavior all match the approved plan verbatim.
- 1 LOW observation (F-QA-1, test-strength note) — non-blocking, no code change required.

**Next**: DevOps merges `feature/218-near-me-list-dot-separator` → PR → deploy to UAT. Human UAT executes the combined pass (217 U1–U11 + UAT-218-1) on uat.ummahflow.com. Formal UAT doc (`agent-output/uat/218-…`) records the device-pass result.
