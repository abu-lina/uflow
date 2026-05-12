---
ID: 130
Origin: 130
UUID: b7e3a91d
Status: Committed
---

# Plan 130: Extract Reusable IconListRow Component

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Plan ID        | 130                                                                    |
| Target Release | next available patch after current origin/main v0.12.14; confirm at DevOps Stage 1 |
| Epic Alignment | UI Consistency & Design System Hardening                               |
| Related Issues | Continuation of Plan 126 (Nachweise/Attestation Display)               |
| Classification | Refactor                                                               |
| Pipeline       | Abbreviated                                                            |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/227                          |
| Created        | 2026-05-12T21:45Z                                                      |

## Value Statement and Business Objective

> As a developer, I want a shared `IconListRow` component that unifies the icon + label + sublabel row pattern currently duplicated across the search page and provider detail attestation card, so that visual consistency (padding, typography, spacing) is guaranteed across surfaces and future row-style lists require zero style duplication.

## Objective

Extract the repeated row pattern (48px icon slot → primary label → secondary label → optional trailing element) into a single reusable component in `src/components/ui/`. Refactor the three existing consumers to use it, fixing hardcoded colors and padding inconsistencies in the process.

## Assumptions

1. The search page food category row (`WasCategoryResults > CategoryRow`) is the canonical visual reference — its spacing, typography, and semantic tokens are correct.
2. The component belongs in `src/components/ui/` because it is a generic UI atom, not domain-specific.
3. No new design tokens or Tailwind config changes are needed — existing semantic tokens (`text-text-primary`, `text-text-muted`, `bg-background-selection`, etc.) cover all cases.
4. The `ExpandSection` component itself does not need changes — only the content rendered inside it needs consistent padding.

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| D1 | Component location: `src/components/ui/IconListRow.tsx` — it's a layout primitive, not domain-specific | [RESOLVED] Generic row pattern used across search and provider detail; fits the `ui/` atom layer |
| D2 | Replace hardcoded hex colors in `AttestationCard` (`#232323`, `#e3f2ef`) with semantic tokens (`text-text-primary`, existing Tailwind classes) | [RESOLVED] Hardcoded colors diverge from design system; semantic tokens ensure theme consistency |
| D3 | The component is presentational only (no click handler baked in) — consumers wrap it in `<button>` or `<div>` as needed | [RESOLVED] Search rows are buttons with hover; attestation rows are static divs. Keeping the component presentation-only avoids polymorphic complexity |
| D4 | Attestation sublabel typography stays `font-inter-tight text-base font-light` (matching Figma design) rather than adopting the search page's `font-inter text-sm text-text-muted` — the two surfaces intentionally differ in sublabel style | [RESOLVED] Sublabel is a render prop / ReactNode slot, so each consumer controls its own sublabel content and styling |

## Current State — Duplication Inventory

The identical row layout pattern exists in **5 files** (7 render sites):

| # | File | Render Site | Row Classes | Differences from canonical |
|---|------|------------|-------------|---------------------------|
| 1 | `src/features/search/components/WasCategoryResults.tsx` | `CategoryRow` (inline component, ~L130) | `flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-muted` | **Canonical reference** |
| 2 | `src/features/search/components/WasCategoryResults.tsx` | Recent search rows (~L200+) | Same as above | Duplicate of #1 |
| 3 | `src/features/search/components/WasServiceTypeResults.tsx` | Service type rows (~L95) + recent rows (~L130) | Same as #1 | Duplicate of #1 |
| 4 | `src/features/search/components/WoCityResults.tsx` | City result rows (~L47) | `flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-background-selection/50 focus:outline-none focus:ring-2 focus:ring-primary/30` | Different hover/focus classes; already accepts a `className` prop |
| 5 | `src/features/search/components/FilterSection.tsx` | Filter item rows (~L80) | `flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-background-selection/50 focus:outline-none focus:ring-2 focus:ring-primary/30` | Uses `p-2` (equivalent to `px-2 py-2`); icon slot carries selected-state ring |
| 6 | `src/features/providers/components/AttestationCard.tsx` | Commitment item rows (~L130) | `flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left` | No interaction styles (static display); uses hardcoded `text-[#232323]` and `bg-[#e3f2ef]` |

> Note: `UmmahFilterSection.tsx` shares only the icon-slot sub-pattern, not the full row layout — excluded from scope.

### Shared Sub-Pattern (Icon Slot)

All render sites share the 48×48px icon container:
- Container: `flex h-12 w-12 shrink-0 items-center justify-center rounded-xl`
- Background varies by surface: `bg-background-selection text-primary` (search/filter) vs `bg-[#e3f2ef] text-primary-dark` (attestation)

## Plan

### Milestone 1: Create `IconListRow` Component

**Objective:** Define a single reusable row component that encapsulates the shared layout.

**Location:** `src/components/ui/IconListRow.tsx`

**API Design:**
- `IconListRow` owns **layout only** — the row container `flex w-full items-center gap-3 rounded-xl` and inner slot structure
- Padding (`px-2 py-2` / `p-2`), interaction styles (`hover:*`, `transition-colors`, `focus:*`), and transition classes are **NOT** baked in — consumers pass them via `className` on their wrapping `<button>` or `<div>`
- This approach is proven by `WoCityResults`, which already accepts a `className` prop for its outer wrapper
- Slots: `icon` (ReactNode), `children` (ReactNode for the content area), `trailing` (optional ReactNode)
- No `'use client'` directive — the component is purely presentational with no hooks, so it works in both server and client component trees

**Acceptance Criteria:**
- Component renders the layout: icon slot → flex-1 content area → optional trailing slot
- Accepts `className?: string` to allow consumer-level padding and interaction style overrides
- Icon slot, content area (`children`), and trailing slot are ReactNode props — the component owns structure, consumers own content
- Exported with proper TypeScript interface
- No `'use client'` directive
- No domain-specific logic (no translation keys, no provider types)

### Milestone 2: Refactor `WasCategoryResults` to Use `IconListRow`

**Objective:** Replace the inline `CategoryRow` pattern and recent-search rows with `IconListRow`.

**File:** `src/features/search/components/WasCategoryResults.tsx`

**Acceptance Criteria:**
- `CategoryRow` uses `IconListRow` for layout
- Recent search rows use `IconListRow` for layout
- `IconSlot` helper remains in this file (it handles category image logic)
- Visual output is pixel-identical to current state
- Existing tests pass without modification (or with minimal selector updates)

### Milestone 3: Refactor `WasServiceTypeResults` to Use `IconListRow`

**Objective:** Replace duplicated row markup with `IconListRow`.

**File:** `src/features/search/components/WasServiceTypeResults.tsx`

**Acceptance Criteria:**
- Service type rows and recent-search rows use `IconListRow`
- Visual output is pixel-identical to current state

### Milestone 3b: Refactor `WoCityResults` to Use `IconListRow`

**Objective:** Replace duplicated row markup with `IconListRow`.

**File:** `src/features/search/components/WoCityResults.tsx`

**Acceptance Criteria:**
- City result rows use `IconListRow`
- The existing `className` prop (accepting `focus:outline-none focus:ring-2 focus:ring-primary/30 hover:bg-background-selection/50`) passes through correctly via the new `className` API
- Visual output is pixel-identical to current state

### Milestone 3c: Refactor `FilterSection` to Use `IconListRow`

**Objective:** Replace duplicated row markup with `IconListRow`.

**File:** `src/features/search/components/FilterSection.tsx`

**Note:** `FilterSection` renders a selected-state ring (`ring-2 ring-primary`) on the **icon slot** (not the outer row), and renders a `<Check>` overlay on the icon. The icon slot accepts ReactNode, so the selected-state ring and check badge remain the consumer's responsibility.

**Acceptance Criteria:**
- Filter item rows use `IconListRow`
- Selected-state ring on the icon container remains consumer-owned (passed as ReactNode to the `icon` slot)
- `p-2` padding passed via `className` to the outer wrapper
- Visual output is pixel-identical to current state

### Milestone 4: Refactor `AttestationCard` to Use `IconListRow` and Fix Tokens

**Objective:** Replace the duplicated row markup with `IconListRow` and migrate hardcoded colors to semantic design tokens.

**File:** `src/features/providers/components/AttestationCard.tsx`

**Acceptance Criteria:**
- Commitment item rows use `IconListRow` for layout
- Hardcoded `text-[#232323]` replaced with `text-text-primary` (or appropriate semantic token)
- Hardcoded `bg-[#e3f2ef]` replaced with appropriate semantic token (e.g., `bg-background-selection text-primary-dark` or a close semantic equivalent)
- Info badge rendered via the trailing slot
- The `ExpandSection` content area padding (`px-4 pb-4`) + row padding (`px-2 py-2`) produces consistent visual alignment with the search page
- Existing AttestationCard tests pass (update selectors if needed)

### Milestone 5: Test Verification and Visual QA

**Objective:** Confirm all existing tests pass and visual output matches across both surfaces.

**Acceptance Criteria:**
- `npm run type-check` passes clean
- All existing tests pass: `WasCategoryResults` tests, `AttestationCard` tests, `ProviderDetailSections` tests
- Add a basic test for `IconListRow` (renders icon, label, trailing slot)
- Visual comparison: search page (`/search?section=food`) rows and provider detail attestation rows use identical padding, border-radius, and gap

### Milestone 6: Version and Release Artifacts

**Objective:** Update version artifacts to match target release.

**Tasks:**
- Update `package.json` version
- Add CHANGELOG entry describing the refactor
- Commit message references Plan 130

**Acceptance Criteria:**
- Version matches target release
- CHANGELOG reflects the refactor

## Release Strategy

Standalone — no other active plans currently target the same release version. This is a follow-up to the completed Plan 126 (v0.12.13) and can ship independently as the next available patch.

## Testing Strategy

- **Unit tests:** Existing tests for `WasCategoryResults`, `WasServiceTypeResults`, `AttestationCard`, and `ProviderDetailSections` cover the consumer behavior. Add one focused test for `IconListRow` confirming it renders slots correctly.
- **Visual QA:** Manual comparison of `/search?section=food` and provider detail page attestation section to confirm identical row spacing.
- **Regression:** No functional changes — this is a pure presentational refactor. Existing test suites are the regression gate.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Subtle visual regression from token swap (e.g., `#e3f2ef` doesn't exactly match any semantic token) | Medium | Low | Implementer should compare rendered hex values; if no exact semantic match exists, keep the hex value and document it for future design-system alignment |
| Test selector breakage from changed DOM structure | Low | Low | Run full test suite after each milestone; update selectors as needed |

## Duration Estimates

| Phase | Estimate | Notes |
|-------|----------|-------|
| Implementation | 2–3 hours | 7 files (2 additional after scope expansion from critique), mechanical refactor |
| QA / Testing | 30–45 min | Existing tests + 1 new test + visual check across all 3 surfaces |
| DevOps | 15 min | Version bump + CHANGELOG |
| **Total** | **~3–4 hours** | Low uncertainty — well-understood pattern |

## Files Touched

| File | Action |
|------|--------|
| `src/components/ui/IconListRow.tsx` | **Create** — new reusable component |
| `src/components/ui/__tests__/IconListRow.test.tsx` | **Create** — basic render test |
| `src/features/search/components/WasCategoryResults.tsx` | **Edit** — import and use `IconListRow` |
| `src/features/search/components/WasServiceTypeResults.tsx` | **Edit** — import and use `IconListRow` |
| `src/features/search/components/WoCityResults.tsx` | **Edit** — import and use `IconListRow` |
| `src/features/search/components/FilterSection.tsx` | **Edit** — import and use `IconListRow` |
| `src/features/providers/components/AttestationCard.tsx` | **Edit** — import and use `IconListRow`, fix hardcoded colors |
| `package.json` | **Edit** — version bump |
| `CHANGELOG.md` | **Edit** — add entry |

## Changelog

| Date | Agent | Change | Detail |
|------|-------|--------|--------|
| 2026-05-12T21:45Z | Planner | Created | Initial plan |
| 2026-05-12T17:00Z | Planner | Revised | F-1: Added WoCityResults and FilterSection to duplication inventory and plan scope (M3b, M3c). F-2: Clarified IconListRow owns layout only — padding and interaction styles passed via className. F-3: Removed 'use client' requirement. Duration estimate updated to 3–4h. |
| 2026-05-12T17:05Z | Implementer | Started | Implementation kickoff after critique APPROVED; entering TDD gate with failing `IconListRow` test first. |
| 2026-05-12T19:10Z | Implementer | Completed | Implemented `IconListRow` + refactored all scoped consumers (`WasCategoryResults`, `WasServiceTypeResults`, `WoCityResults`, `FilterSection`, `AttestationCard`), added TDD test, updated release artifacts and passed lint/type-check/tests/build gates. |
| 2026-05-12T19:20Z | Code Reviewer | Approved with comments | Applied fix-in-review in `IconListRow` to replace invalid slot wrappers (`span` -> `div`), created code review artifact, and approved QA handoff. |
| 2026-05-12T19:28Z | QA | QA Complete | Executed focused test suite post-fix-in-review: type-check ✅, lint ✅ (delta, 0 new errors), all 7 test files 32/32 tests ✅. Validated fix-in-review wrapper correctness and confirmed rendering parity across all 5 consumers. Ready for UAT handoff. |
| 2026-05-12T19:30Z | UAT | Approved for release | Value statement delivered: reusable IconListRow component eliminates duplication across 5 consumers (search + provider surfaces), guarantees visual consistency through centralized layout and semantic tokens. All 5 milestones + UAT scenarios PASS. Ready for DevOps release execution. |
