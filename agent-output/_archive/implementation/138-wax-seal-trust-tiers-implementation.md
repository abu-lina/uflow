---
ID: 138
Origin: 138
UUID: a7c3e91f
Status: Active
---

# Implementation — Plan 138: Wax Seal Trust Tiers (Bronze / Silver / Gold)

## Plan Reference

`agent-output/planning/138-wax-seal-trust-tiers-plan.md` (ID: 138, UUID: a7c3e91f)

## Date

2026-06-02

## Changelog

| Date       | Handoff     | Request               | Summary                                                                                  |
| ---------- | ----------- | --------------------- | ---------------------------------------------------------------------------------------- |
| 2026-06-02 | Implementer | Planner → Implementer | Full implementation of Plan 138 — replaced arc gauge + dimension matrix with wax seal UI |

---

## Implementation Summary

Replaced the arc gauge + dimension matrix in `ProofTierCard` with three progressive wax-seal images (Bronze / Silver / Gold). Component derives the active tier from `hasCertificate` + `verificationMethod`, renders all three seals with the active one highlighted and the others dimmed. Falls back to coloured circles when seal image files are absent. Summary sentence uses `{{highlight}}` tokens for bold inline emphasis. Gold-tier attestation is now inline within ProofTierCard (removed duplicate render from ProviderDetailSections). Plans 136 and 137 closed as superseded.

---

## Milestones Completed

- [x] M1: Asset preparation — `public/images/seals/` created with placeholder README; `onError` fallback covers dev/CI
- [x] M2: TDD gate — 16 tests written first, confirmed failing (12/16) before implementation, all 16 green after
- [x] M3: SealRow visual — `SealImage` (with `onError` fallback), `SealRow` (RTL-aware, `role="group"`), `SummaryText` (highlight-split)
- [x] M4: Summary sentence + translations — 7 new keys in all 6 locales; old 12 dead keys removed
- [x] M5: Gold attestation integration — `GoldAttestationSection` inline in ProofTierCard; `ProviderDetailSections` passes `listingType`, `noAlcohol`, `noPork`, `noGambling`
- [x] M6: Cleanup — ProviderDetailSections test updated (×2 references to old `level1Label`); unused `AttestationCard` import removed; Plan 137 closed (Superseded); Plan 136 not found (never created as a file — effectively closed by 137 also being superseded)
- [x] M7: CHANGELOG updated; implementation doc created; static gates pass

---

## Files Modified

| Path                                                                  | Change                                                                                                                                                                                                                                                    | Lines    |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `src/features/providers/components/ProofTierCard.tsx`                 | Full rewrite — replaced `VerificationArc`, `computeVerificationLevel`, dimension chips with `computeSealTier`, `SealImage`, `SealRow`, `SummaryText`, `HalalIcon`, `GoldAttestationSection`; new props `listingType`, `noAlcohol`, `noPork`, `noGambling` | ~363     |
| `src/features/providers/components/ProviderDetailSections.tsx`        | Added 4 new props to `<ProofTierCard>` call; removed unused `AttestationCard` import                                                                                                                                                                      | +5 / -2  |
| `src/__tests__/features/providers/ProviderDetailSections.test.tsx`    | Updated 2 stale assertions that checked for old `level1Label` value `'Online Check'` — replaced with `getByRole('group')` / `getAllByRole('group')`                                                                                                       | +2 / -2  |
| `src/features/providers/components/__tests__/ProofTierCard.test.tsx`  | Fixed unused `onError` in mock (`_onError`)                                                                                                                                                                                                               | +1 / -1  |
| `src/translations/en.ts`                                              | Replaced 12 dead keys with 7 new keys (`sealAltBronze`, `sealAltSilver`, `sealAltGold`, `summaryBronze`, `summarySilver`, `summaryGoldCert`, `summaryGoldCertOnly`)                                                                                       | +7 / -12 |
| `src/translations/de.ts`                                              | Same as en.ts                                                                                                                                                                                                                                             | +7 / -12 |
| `src/translations/ar.ts`                                              | Same as en.ts                                                                                                                                                                                                                                             | +7 / -12 |
| `src/translations/tr.ts`                                              | Same as en.ts                                                                                                                                                                                                                                             | +7 / -12 |
| `src/translations/ur.ts`                                              | Same as en.ts                                                                                                                                                                                                                                             | +7 / -12 |
| `src/translations/ps.ts`                                              | Same as en.ts                                                                                                                                                                                                                                             | +7 / -12 |
| `CHANGELOG.md`                                                        | Added Plan 138 entry under `[Unreleased]`; removed Plans 136 + 137 entries                                                                                                                                                                                | +2 / -2  |
| `agent-output/planning/137-prooftiercard-verification-matrix-plan.md` | Status changed to `Superseded` then moved to `closed/`                                                                                                                                                                                                    | —        |

## Files Created

| Path                                                                     | Purpose                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `public/images/seals/README.md`                                          | Placeholder explaining expected `seal-bronze.webp`, `seal-silver.webp`, `seal-gold.webp` files (pending product owner delivery) |
| `agent-output/implementation/138-wax-seal-trust-tiers-implementation.md` | This document                                                                                                                   |

---

## Multi-Plan State Audit

Multi-Plan State Audit: N/A — ProofTierCard had no prior-plan-introduced `useEffect` or localStorage hydration mutations. The `useState(false)` for `isExpanded` is the only pre-existing state and is unaffected by this change.

## Search/Filter Client-Interaction Trace

Search/Filter Client-Interaction Trace: N/A — ProofTierCard is a purely presentational component with no form submission, URL parameters, or search filtering logic.

---

## Code Quality Validation

- [x] `npx vitest run` — **1292 passed | 22 skipped | 0 failed** (164 test files)
- [x] `npm run lint` — **0 errors** (61 warnings pre-existing; none introduced by this PR)
- [x] `npm run type-check` — **0 errors** (clean `tsc --noEmit`)
- [ ] `npm run build` — not run (deferred to Code Review gate; no architectural change, only component refactor)

---

## Value Statement Validation

**Original value statement**: Replace the arc gauge + dimension matrix with three wax-seal images (Bronze / Silver / Gold) that give users an instant, recognisable trust signal. Simplify the UI to a single summary sentence + expandable evidence checklist. Move gold-tier attestation inline.

**How implementation delivers it**:

- The arc gauge SVG (`VerificationArc`) and dimension chips are fully removed — no dead code remains
- Three seals render in a `role="group"` row; the active tier is scaled up and fully opaque; inactive seals are dimmed and greyscale
- `computeSealTier` derives tier from `hasCertificate` (gold) → `verificationMethod === 'onsite'` (silver) → bronze, matching the plan's priority order
- `SummaryText` wraps `{{highlight}}` tokens in `<strong>` for inline emphasis without additional DOM elements
- `GoldAttestationSection` renders the Allah-gradient subtitle + all 4 commitment items when `tier === 'gold' && supportsAttestation && hasAnyDeclared`
- RTL handled via `isRtl` → reversed `TIER_ORDER` in `SealRow`
- Image `onError` fallback: coloured circle (#CD7F32 / #A8A9AD / #C8A848) with tier initial — zero broken-image icons even without real files

---

## TDD Compliance

| Function/Class            | Test File                | Test Written First? | Failure Verified? | Failure Reason                                                                                     | Pass After Impl? |
| ------------------------- | ------------------------ | ------------------- | ----------------- | -------------------------------------------------------------------------------------------------- | ---------------- |
| `computeSealTier`         | `ProofTierCard.test.tsx` | ✅ Yes              | ✅ Yes            | `SyntaxError: The requested module … does not provide an export named 'computeSealTier'`           | ✅ Yes           |
| `SealRow` / `SealImage`   | `ProofTierCard.test.tsx` | ✅ Yes              | ✅ Yes            | `Unable to find an element with the role "group"` / `querySelectorAll('img[data-src]').length = 0` | ✅ Yes           |
| `SummaryText`             | `ProofTierCard.test.tsx` | ✅ Yes              | ✅ Yes            | `Unable to find an element with the text: 'providerDetail.proofTier.summaryBronze'`                | ✅ Yes           |
| `GoldAttestationSection`  | `ProofTierCard.test.tsx` | ✅ Yes              | ✅ Yes            | `Unable to find an element with the text: 'providerDetail.attestation.noAlcohol'`                  | ✅ Yes           |
| `ProofTierCard` (updated) | `ProofTierCard.test.tsx` | ✅ Yes              | ✅ Yes            | Multiple assertion errors (12/16 failing)                                                          | ✅ Yes           |

Pre-implementation failure evidence: `12 failed | 4 passed (16)` — confirmed correct failure reasons before any implementation code was written.

---

## Test Coverage

- **Unit (ProofTierCard.test.tsx)**: 16 tests — covers all 3 tier derivation paths, SealRow group/alt, SummaryText key selection (4 variants), arc-absent guard, dimension-chip-absent guard, attestation show/hide logic (4 scenarios), checklist + expandable
- **Integration (ProviderDetailSections.test.tsx)**: 2 updated tests now assert `role="group"` presence after clicking the Halal Check accordion — confirms end-to-end rendering without regression

---

## Test Execution Results

```
npx vitest run
Test Files  164 passed | 2 skipped (166)
Tests       1292 passed | 22 skipped (1314)
Duration    ~24s
```

```
npm run lint
✖ 61 problems (0 errors, 61 warnings)
```

```
npm run type-check
(exit 0 — no output)
```

---

## Outstanding Items

- **Seal image files absent**: `seal-bronze.webp`, `seal-silver.webp`, `seal-gold.webp` not yet delivered by product owner. `onError` fallback covers this; no broken UI. Owner: product owner / design. Tracked in `public/images/seals/README.md`.
- **`npm run build`**: Not run — deferred to Code Review / CI gate. No new pages, API routes, or server components added.

---

## Next Steps

➡️ NEXT: Code Reviewer  
Gate: Review verdict must be APPROVED or APPROVED_WITH_COMMENTS before QA
