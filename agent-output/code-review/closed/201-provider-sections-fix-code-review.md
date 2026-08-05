---
ID: 201
Origin: 201
UUID: 3e8b5fa2
Status: Committed
---

# Code Review — 201 Provider Sections Fix

**Plan**: [201-provider-sections-fix-plan.md](../planning/201-provider-sections-fix-plan.md)
**Implementation**: [201-provider-sections-fix-implementation.md](../implementation/201-provider-sections-fix-implementation.md)
**Reviewer**: Code Reviewer Agent
**Date**: 2026-08-05
**Verdict**: APPROVED_WITH_COMMENTS

---

## Review Context

Two surgical UI bugfixes in `ProviderDetailSections.tsx`:

1. **Bug 1 — Accordion exclusivity**: Three `ExpandSection` instances (`opening-hours`, `standorte`, `nearby`) were left in uncontrolled mode by Plan 195, causing them to maintain independent open state invisible to the shared `openSection` state machine. Fix: add `isOpen`/`onToggle` controlled props to the three missing instances.
2. **Bug 2 — Spacing inconsistency**: Root flex container used `gap-8` (32px) while the surrounding mobile layout uses 16px rhythm. Fix: `gap-8` → `gap-4`.

---

## Files Reviewed

| File | Role | Delta |
|---|---|---|
| `src/features/providers/components/ProviderDetailSections.tsx` | Primary implementation | +9 / -4 |
| `src/__tests__/features/providers/ProviderDetailSections.test.tsx` | Regression tests | +72 / 0 |
| `package.json` | Version bump `0.15.4` → `0.15.5` | +1 / -1 |
| `CHANGELOG.md` | Unreleased entry added | +7 / 0 |

---

## Checklist Results

### Architecture Alignment

- ✅ Extends existing controlled `ExpandSection` pattern established in Plan 195 — no new abstractions
- ✅ All changes stay within `src/features/providers/` feature domain
- ✅ No new imports, dependencies, or external calls introduced
- ✅ `locations!.map` non-null assertion replaced with `(locations ?? []).map` — correct safety improvement; outer `(locations?.length ?? 0) > 0` guard already ensures `locations` is non-empty at render time, so this is a lint compliance fix without runtime behaviour change

### Code Quality

- ✅ Prop ordering on all three new `ExpandSection` instances follows `isOpen → title → onToggle` — consistent with all six pre-existing instances
- ✅ Key strings (`'opening-hours'`, `'standorte'`, `'nearby'`) are idiomatic lowercase-hyphen and match the state-machine table in the plan
- ✅ `setOpenSection(next ? 'key' : null)` toggle pattern is identical to the three pre-existing controlled instances — no divergence
- ✅ `gap-4` change is a single-token CSS class swap; no risk of cascading side-effects

### TDD Compliance

| Test | Bug Covered | Pre-fix outcome | Post-fix outcome |
|---|---|---|---|
| `[pre-fix FAILS] keeps exactly one section open across all six sections` | Bug 1 accordion exclusivity | FAIL — `menuButton` stayed `aria-expanded=true` after clicking Opening Hours | PASS |
| `[pre-fix FAILS] uses gap-4 spacing for provider detail section stack` | Bug 2 spacing | FAIL — container had class `gap-8` | PASS |

TDD cycle confirmed: both tests were added before implementation, verified red (failure reasons documented in implementation doc), then green after implementation. 14/14 tests pass post-fix.

**Primary value-delivery coverage**: The primary behavior — "tapping any section collapses all others" — is directly exercised by the accordion test which cycles through all six sections, asserting previous section collapses on each click. ✅

### Mandatory Checklist Results

| Check | Applies | Result |
|---|---|---|
| 6b Path Refactor | ❌ N/A | — |
| 6c Agent Spec / Cross-Workspace Paths | ❌ N/A | — |
| 6d Deployment Path Audit | ❌ N/A — no Docker/workflow/env changes | — |
| 6e Outbound Data-Flow Cross-Trace | ❌ N/A — no new router.push with query params | — |
| 6f Interaction-Layer Audit | ❌ N/A — no pointer-events/overlay/z-index changes | — |
| 6g Shared Results Actionability | ❌ N/A — no inline admin actions added | — |
| 6h Deleted-Module Residue Sweep | ❌ N/A — no modules deleted | — |
| 6i Migration Filename Reference Check | ❌ N/A — no migrations | — |
| 6j Migration SQL Correctness Review | ❌ N/A — no migrations | — |
| **6k i18n String Literal Scan** | ✅ APPLIES — `ProviderDetailSections.tsx` modified | See F1 below |

**i18n scan**: 1 component checked — 2 hardcoded labels found. See F1 for disposition.

---

## Findings

### F1 — HIGH — Hardcoded German labels in modified component (pre-existing)

**Location**: `src/features/providers/components/ProviderDetailSections.tsx`

**Line 295**:
```tsx
<ExpandSection
  isOpen={openSection === 'standorte'}
  title="Weitere Standorte"           ← hardcoded German, no t() call
  onToggle={(next) => setOpenSection(next ? 'standorte' : null)}
>
```

**Line ~299** (within same block):
```tsx
label={loc.location_name || loc.address_city || 'Standort'}  ← hardcoded German fallback
```

All other section titles use `t('providerDetail.sections.*')`. No `weitereStandorte` translation key exists in the codebase (grep across entire workspace: 0 matches).

**Attribution**: These strings were introduced in Plan 195 (`title="Weitere Standorte"` was already present when Plan 201 received the file). Plan 201 added `isOpen` and `onToggle` props to this element but did not introduce or modify these string literals.

**Regression from Plan 201**: Zero — the strings were already served to production users in v0.15.4.

**Fix-in-Review**: NOT appropriate. A correct fix requires:
1. Adding a new key (e.g., `providerDetail.sections.furtherLocations`) to the LanguageProvider translation map across all locale files
2. Updating the test (which hardcodes `{ name: 'Weitere Standorte' }` as the button query)

This scope exceeds the 10-line / 3-file rule and touches sensitive locale infrastructure outside Plan 201's boundaries.

**→ Disposition: Risk accepted for this release**
- Approver rationale: Pre-existing in production since Plan 195 (v0.15.4). Regression delta from Plan 201 is zero. Track as tech debt item: "Add i18n key for Weitere Standorte section" (follow-up plan or Plan 195 housekeeping).

---

## Positive Observations

- The `locations!.map` → `(locations ?? []).map` change is a clean lint compliance fix. The outer `(locations?.length ?? 0) > 0` guard makes both expressions equivalent at runtime, but removing the non-null assertion reduces future maintenance risk.
- Test names use the `[pre-fix FAILS]` pattern per the project's client-state precedence regression test convention — this makes the bug → fix arc visible in test output.
- The CHANGELOG entry is accurate, well-scoped, and follows the project's established format.

---

## Verdict

**APPROVED_WITH_COMMENTS**

Plan 201's implementation is minimal, correct, and well-tested. The four production code changes — `gap-8 → gap-4`, plus three controlled-mode conversions for `opening-hours`, `standorte`, and `nearby` — precisely implement the plan without side-effects.

The single HIGH finding (F1) is a pre-existing i18n gap with zero regression from this plan. Disposition is explicitly "Risk accepted for this release" as documented above.

QA may proceed.

---

## Next Step

```
✅ PHASE COMPLETE: [4] Code Reviewer — Verdict: APPROVED_WITH_COMMENTS
📄 Output: agent-output/code-review/201-provider-sections-fix-code-review.md
➡️ NEXT: QA Agent for test execution
   Gate: QA doc status must be QA Complete before DevOps
```
