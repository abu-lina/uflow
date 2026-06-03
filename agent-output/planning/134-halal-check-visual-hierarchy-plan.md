---
ID: 134
Origin: 134
UUID: a7c3e2f1
Status: In Progress
---

# Plan 134 — Halal Check Visual Hierarchy & Wording Finalization

| Field          | Value                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Plan ID        | 134                                                                                                       |
| Target Release | Bundled with Plan 133; next available minor after current origin/main v0.12.17; confirm at DevOps Stage 1 |
| Epic Alignment | Provider Detail UX — Trust & Transparency                                                                 |
| Related Issues | Plan 133 (Halal Proof Tier Rework — parent plan), GitHub #232                                             |
| Classification | Refactor                                                                                                  |
| Pipeline       | Abbreviated                                                                                               |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/237                                                              |
| Created        | 2026-05-31T22:30Z                                                                                         |

## Changelog

| Date              | Agent       | Change                                             |
| ----------------- | ----------- | -------------------------------------------------- |
| 2026-05-31T22:30Z | Planner     | Plan created as follow-on to Plan 133              |
| 2026-06-01T05:28Z | Implementer | Execution started (M1 visual hierarchy + TDD gate) |

## Value Statement and Business Objective

**As a** Muslim community user viewing a food/store listing on Ummah Flow,
**I want to** see a clear visual hierarchy where the platform's halal check (proof tier) is the dominant trust signal and the owner's self-declaration (attestation) appears as supporting evidence beneath it,
**so that** I quickly understand the verification depth without the two cards competing for attention at equal visual weight.

## Decision Record

| #   | Decision                                                                                                                                                                                                        | Status                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D1  | Keep AttestationCard always visible for food/store listings — the owner's spiritual oath ("I testify by Allah") carries significant weight for Muslim users and is not redundant even when a certificate exists | [RESOLVED] Spiritual trust and institutional trust are complementary, not duplicative          |
| D2  | ProofTierCard is the primary visual signal; AttestationCard is supporting evidence with reduced visual weight                                                                                                   | [RESOLVED] Platform verification is the headline trust signal; owner declarations reinforce it |
| D3  | Wording refinements (section → "Halal Check", tiers → "Online Checked"/"On-site Checked"/"Certificate Provided", NULL→tier 1 fallback) are pre-implemented on branch and in-scope for this release              | [RESOLVED] Changes already passing all gates (1276 tests, type-check, lint)                    |
| D4  | This plan bundles with Plan 133's release — same branch (`session/133-halal-proof-rework`), same feature delivery                                                                                               | [RESOLVED] Single feature increment, no separate version bump needed                           |

## Assumptions

1. Plan 133 M0-M6 are complete and passing all gates on `session/133-halal-proof-rework`.
2. The wording refinements (D3) are already committed to the branch and require no further code changes — only formalization in release artifacts.
3. The visual hierarchy work (D2) is purely CSS/layout — no schema, service, or translation changes needed.
4. The `AttestationCard` renders 4 `RowItem` components with 48×48px icon containers, which currently occupy significant vertical space and compete visually with the compact `ProofTierCard`.
5. The `ProofTierCard` has a distinct card appearance (`rounded-xl border bg-[#F8FBF9] p-4`) while `AttestationCard` has no card wrapper (just `className="mt-3"`), but the attestation's 4 large row items still dominate visually.

## Release Strategy

Bundled with: Plan 133 (Halal Proof Tier Rework). Both plans ship together on `session/133-halal-proof-rework`. Plan 134 adds visual polish and captures wording refinements that occurred during Plan 133's UAT review. Version bump and CHANGELOG handled in M3 of this plan (covering both 133 and 134 deliverables).

---

## Plan

### Milestone 1: AttestationCard Visual Hierarchy Rework

**Objective**: Reduce the visual weight of the `AttestationCard` so that `ProofTierCard` reads as the primary trust signal, while keeping the attestation content fully visible and accessible.

**Context for the implementer**:

- `ProofTierCard` (`src/features/providers/components/ProofTierCard.tsx`) is a compact card with border, background, shield icon, title, detail, and an expandable explainer. It occupies roughly 80-100px of vertical space in its collapsed state. This is the **primary** trust signal — "how did UmmahFlow verify this listing?"
- `AttestationCard` (`src/features/providers/components/AttestationCard.tsx`) renders 4 `RowItem` components (halal meat, no alcohol, no pork, no gambling), each with a 48×48px icon container. It currently occupies 250-300px of vertical space. This is the **secondary** trust signal — "what did the owner pledge before Allah?"
- Both render inside the "Halal Check" `ExpandSection` in `ProviderDetailSections.tsx`.

**Design intent**: The proof tier card should immediately catch the user's eye when the section expands. The attestation should feel like supporting detail — still present and readable, but subordinate. Think of it like a news article: headline (proof tier) then body (attestation).

**Tasks**:

1. Review the current rendering of both cards on the DEV preview page (`/proof-tier-example` and `/provider-detail-preview`)
2. Reduce the visual footprint of `AttestationCard` — the implementer should decide the best approach, which may include:
   - Reducing row item icon container size (currently `h-12 w-12` → consider `h-8 w-8` or `h-10 w-10`)
   - Reducing row item icon size (currently `h-6 w-6`)
   - Using smaller/lighter text for attestation row titles and subtitles
   - Adding a subtle visual separator between ProofTierCard and AttestationCard
   - Optionally collapsing the attestation detail text behind an expand toggle (preserving the oath headline)
3. Ensure the `ProofTierCard` card border/background styling remains distinct and visually dominant
4. Verify both mobile (320px) and desktop (1920px) viewports

**Acceptance Criteria**:

- [ ] ProofTierCard reads as the primary/dominant visual element in the "Halal Check" section
- [ ] AttestationCard content remains fully accessible (not hidden or removed)
- [ ] Visual hierarchy is clear: proof tier first, attestation second
- [ ] No layout breakage on mobile (320px) or desktop viewports
- [ ] Existing tests still pass after styling changes

---

### Milestone 2: Tests + Gate Verification

**Objective**: Confirm all tests, type-check, and lint pass after visual hierarchy changes.

**Tasks**:

1. Run full test suite: `npm test`
2. Run type check: `npm run type-check`
3. Run lint: `npm run lint`
4. Visually verify DEV preview pages reflect the hierarchy changes

**Acceptance Criteria**:

- [ ] All existing tests pass (1276+ tests)
- [ ] `npm run type-check` clean
- [ ] `npm run lint` clean (or lint:fix applied)
- [ ] DEV preview pages (`/proof-tier-example`, `/provider-detail-preview`) visually confirm hierarchy

---

### Milestone 3: Version + Release Artifacts

**Objective**: Update version and changelog for the combined Plan 133 + Plan 134 release.

**Tasks**:

1. Bump version in `package.json` (next available minor after v0.12.17; confirm at DevOps Stage 1)
2. Add CHANGELOG.md entry documenting:
   - Halal proof tier model (3-tier verification transparency)
   - Trust-centered wording: "Halal Check" section, "Online Checked"/"On-site Checked"/"Certificate Provided" tiers
   - NULL proof_tier defaults to Tier 1 (Online Checked) — no "pending" state
   - Baseline/proof UI separation with HalalTrustBanner above sections
   - AttestationCard visual hierarchy (supporting evidence below proof tier)
   - RPC fix (`upsert_joinhalal_providers`)
   - Import script cleanup
3. Update `system-architecture.md` changelog with Plan 133+134 summary
4. Update Plan 133 implementation doc status

**Acceptance Criteria**:

- [ ] `package.json` version updated
- [ ] CHANGELOG.md entry covers all user-facing and schema changes from Plans 133 + 134
- [ ] `system-architecture.md` changelog updated

---

## Testing Strategy

| Type            | Scope                                          | Coverage                                    |
| --------------- | ---------------------------------------------- | ------------------------------------------- |
| Unit            | Existing ProofTierCard + AttestationCard tests | Confirm no regressions from styling changes |
| Integration     | ProviderDetailSections                         | Section composition unchanged               |
| Visual (manual) | DEV preview pages                              | Hierarchy clear on mobile + desktop         |
| Type safety     | `npm run type-check`                           | No regressions                              |
| Lint            | `npm run lint`                                 | No regressions                              |

---

## Duration Estimates

| Phase                           | Estimate        | Uncertainty                       |
| ------------------------------- | --------------- | --------------------------------- |
| M1: Visual hierarchy rework     | 1-2 hours       | Low — purely CSS/layout, no logic |
| M2: Gate verification           | 15 min          | Very low                          |
| M3: Version + release artifacts | 30 min          | Low                               |
| **Total**                       | **1.5-3 hours** |                                   |

Key uncertainty: Implementer's design judgment on optimal visual reduction approach (icon size vs text size vs collapsing). Multiple valid approaches; any that achieves the acceptance criteria is acceptable.

---

## Risks

| Risk                                                                                    | Likelihood | Impact | Mitigation                                                                                                                 |
| --------------------------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| AttestationCard row item changes affect other consumers of `RowItem` component          | Low        | Medium | Changes should be scoped to AttestationCard's usage of RowItem (via className overrides or wrapper), not to RowItem itself |
| Visual hierarchy is subjective — implementer/reviewer may disagree on "dominant enough" | Medium     | Low    | DEV preview pages allow quick visual iteration; user review on DEV before merge                                            |

---

## Pre-Implemented Changes (for reference)

The following changes are already on the branch and passing all gates. They are in-scope for this release but require **no further implementation work**:

1. **Section title**: "Verification"/"Prüfung" → "Halal Check"/"Halal-Prüfung" (+ 4 other locales)
2. **Tier labels**: "Online Check" → "Online Checked", "Personal Visit" → "On-site Checked", "Certified" → "Certificate Provided" (+ 5 other locales)
3. **NULL handling**: `proofTier ?? 1` — NULL defaults to Tier 1 (Online Checked), no "pending" state
4. **Removed keys**: `pending`, `pendingDetail` removed from all 6 locale files
5. **Updated "whatIsThis"**: "What does this mean?" → "How do we check?" (+ 5 other locales)
6. **Updated explanation**: Reworded to reference "trust level" instead of "verification tier"
7. **Tests updated**: All assertions referencing old wording updated to match new labels
8. **Debug preview page**: Updated tier examples to reflect new labels, removed "Pending" example
