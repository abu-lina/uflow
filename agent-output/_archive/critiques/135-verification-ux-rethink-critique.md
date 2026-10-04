---
ID: 135
Origin: 135
UUID: a9c3e27d
Status: OPEN
---

# Critique — Plan 135: Verification UX Rethink

| Field    | Value                                                       |
| -------- | ----------------------------------------------------------- |
| Artifact | `agent-output/planning/135-verification-ux-rethink-plan.md` |
| Date     | 2026-06-01T16:00Z                                           |
| Status   | Initial                                                     |

## Changelog

| Date              | Handoff          | Request                         | Summary                                    |
| ----------------- | ---------------- | ------------------------------- | ------------------------------------------ |
| 2026-06-01T16:00Z | Planner → Critic | Review for clarity/completeness | Initial critique; 1 MEDIUM, 2 LOW findings |
| 2026-06-01T16:10Z | Critic → Planner | Revision requested              | All 3 findings addressed in plan revision  |
| 2026-06-01T16:10Z | —                | Final verdict                   | **APPROVED** — all findings RESOLVED       |

---

## Value Statement Assessment

**STRONG** — The user story clearly articulates WHO (Muslim community user), WHAT (visual scale + checklist + conditional declarations), and WHY (instant trust assessment without noise). It directly maps to 3 specific user critiques documented in the conversation history. The value is immediate and user-facing.

---

## Overview

Plan 135 extends the verification model introduced by Plan 133 from a single `proof_tier` integer to a two-dimensional model (`verification_method` × `has_certificate`). It redesigns the ProofTierCard into a VerificationCard with a visual progress scale and "What we verified" checklist, and hides the AttestationCard when no declarations exist.

The plan is well-structured with 7 sequential milestones, clear acceptance criteria, a dependency graph, and a complete decision record. All 6 decisions are RESOLVED with rationale.

---

## Architectural Alignment

- **Consistent with Plan 133 ADR core insight**: Separation of "gate" (baseline halal guarantee) from "transparency" (verification depth). Plan 135 preserves this while improving how depth is communicated.
- **Schema evolution is sound**: Two orthogonal columns (`verification_method`, `has_certificate`) correctly model the problem space without overloading a single integer. Aligns with project's Postgres-first philosophy (simple column types + constraints).
- **Supersession of Plan 134 D4 is acknowledged** (D4 in Plan 135): The plan explicitly calls out the reversal of "always-visible attestation." User feedback drove this change. Acceptable.
- **Note**: Plan 133 ADR chose "integer+CHECK over ENUM for extensibility" — Plan 135 moves to TEXT CHECK. This is a reasonable evolution and doesn't create architectural drift since the branch hasn't merged yet.

---

## Scope Assessment

Well-bounded: schema migration → service types → 2 component refactors → translations → gates → release. The dependency graph is correct. M3/M4 parallelize after M2, which is efficient.

---

## Technical Debt Risks

- The create-then-drop sequence (migration 090 creates `proof_tier`, migration 091 drops it) is acceptable because the branch is pre-merge. It maintains git bisectability. Not a debt concern.
- `computeHalalStars()` utility referenced by `ProviderCard` and `SearchResultsList` needs updating or removal — addressed in findings below.

---

## Findings

### F-1 — Incomplete Schema Mutation Inventory (MEDIUM)

| Field    | Value    |
| -------- | -------- |
| Status   | RESOLVED |
| Severity | MEDIUM   |

**Issue**: The plan's Schema Mutation Inventory lists only 3 files (migration, `services/providers.ts`, `ProofTierCard.tsx`, `ProviderDetailSections.tsx`). However, `proof_tier` is referenced in at least 6 additional locations not captured:

| File                                             | References                                                 | Impact                                                           |
| ------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `scripts/import-joinhalal.ts`                    | Lines 131, 416, 1387                                       | Type + payload construction — will break import pipeline         |
| `src/utils/sectionBadges.ts`                     | Lines 9, 28                                                | `computeHalalStars()` — reads `proof_tier` for card star display |
| `src/components/providers/ProviderCard.tsx`      | Line 23                                                    | Imports `computeHalalStars`                                      |
| `src/components/providers/SearchResultsList.tsx` | Line 123                                                   | Passes `proof_tier` to provider object                           |
| `src/app/(debug)/*.tsx`                          | 3 files                                                    | Debug preview pages with hardcoded proof_tier values             |
| Test files                                       | `sectionBadges.test.ts`, `ProviderDetailSections.test.tsx` | Will fail at compile                                             |

**Impact**: Implementer following the inventory as-is will miss these locations. TypeScript will catch most at compile time (M2 gate), but `scripts/import-joinhalal.ts` runs via `tsx` independently and may not be caught by `npm run type-check` unless it's included in `tsconfig.json`.

**Recommendation**: Update the Schema Mutation Inventory to include all references. Add an explicit task to M2: "Update or remove `computeHalalStars()` in `src/utils/sectionBadges.ts` and update its consumers (ProviderCard, SearchResultsList)." Add import script update to M1 tasks (alongside RPC update).

---

### F-2 — Import Script Not Explicitly in Milestones (MEDIUM)

| Field    | Value    |
| -------- | -------- |
| Status   | RESOLVED |
| Severity | MEDIUM   |

**Issue**: Plan 133 explicitly included "Update import script to match new RPC signature" as Decision D7 and a milestone task. Plan 135 changes the RPC signature again (removing `proof_tier` parameter, adding `verification_method` + `has_certificate`), but the import script (`scripts/import-joinhalal.ts`) is not listed as an M1 or M2 task. Only Assumption #5 alludes to it.

The import script has 3 direct `proof_tier` references including a type definition (line 131), a default value assignment (line 416), and an RPC payload field (line 1387). All three must be updated.

**Impact**: If the import script is not updated alongside the RPC, the next data import will fail silently or with a runtime error. This is the most likely "hotfix after deployment" scenario for this plan.

**Recommendation**: Add explicit task to M1: "Update `scripts/import-joinhalal.ts` — replace `proof_tier` type/payload with `verification_method` + `has_certificate`." This mirrors Plan 133 D7's approach.

---

### F-3 — `computeHalalStars` Utility Fate Undocumented (LOW)

| Field    | Value    |
| -------- | -------- |
| Status   | RESOLVED |
| Severity | LOW      |

**Issue**: `src/utils/sectionBadges.ts` exports `computeHalalStars()` which maps `proof_tier` to a 0-3 star count. This utility is consumed by `ProviderCard` (search results list cards show stars). Plan 135 removes the integer tier model — should this utility be:

- (a) Updated to derive a level from `verification_method` + `has_certificate`?
- (b) Removed entirely (stars no longer relevant)?
- (c) Replaced by a new utility?

The plan doesn't specify the fate of the star/badge display on provider CARDS (search results), only the detail page VerificationCard.

**Impact**: LOW — the implementer will encounter this during M2 type-check and resolve it naturally. But documenting intent avoids a design decision being made ad-hoc during implementation.

**Recommendation**: Add a note to M2 or Handoff Notes specifying whether the card-level star indicator should be preserved (mapped to new model) or removed.

---

## Unresolved Open Questions

None found in the plan document.

---

## Decision Record Check

All 6 decisions are marked `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` items.

---

## Duration Estimates Check

Present and reasonable. Implementation estimate (3–5h) appropriately accounts for schema + new component work with medium uncertainty.

---

## Hotfix Analysis

**Question**: "How will this plan result in a hotfix after deployment?"

**Most likely scenario**: Import script (`scripts/import-joinhalal.ts`) breaks on next data refresh because its RPC payload still references `proof_tier`. This is a runtime failure, not caught by `npm run type-check` if the script isn't in the project's tsconfig includes.

**Mitigation** (if F-2 is addressed): Explicit milestone task + verification that the script compiles independently (`npx tsx --check scripts/import-joinhalal.ts`).

**Second scenario**: NULL `verification_method` on a provider causes component crash. Already mitigated by schema DEFAULT + component null handling.

---

## Risk Assessment

| Rating | Justification                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOW    | All findings are addressable with inventory/task additions. No architectural concerns. Schema change is pre-merge. Well-scoped with clear dependencies. |

---

## Recommendations

1. **Address F-1 + F-2**: Update Schema Mutation Inventory to be complete; add import script task to M1. This is the primary gap.
2. **Address F-3**: Add one line to Handoff Notes clarifying `computeHalalStars` fate.
3. Proceed to implementation after Planner addresses findings (or user approves proceeding with them as-is).

---

## Verdict

**APPROVED** — All 3 findings addressed in plan revision. Schema Mutation Inventory is now comprehensive, import script is explicitly tasked in M1, and `computeHalalStars` fate is documented in M2 + Handoff Notes. No blocking concerns remain. Plan is ready for implementation.
