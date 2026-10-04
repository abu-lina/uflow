---
ID: 090
Origin: 090
UUID: a3f7b2e1
Status: APPROVED
---

# Critique — Plan 090: Home & Navigation Redesign

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| Artifact          | `agent-output/planning/090-home-nav-redesign-plan.md`                     |
| Analysis          | N/A (no prior analysis artifact)                                          |
| Date              | 2026-04-15T11:00Z                                                         |
| Status            | Initial                                                                   |

## Changelog

| Date              | Handoff          | Request                             | Summary                                              |
| ----------------- | ---------------- | ----------------------------------- | ---------------------------------------------------- |
| 2026-04-15T11:00Z | Planner → Critic | Review plan for implementation readiness | Initial critique — 2 MEDIUM findings, 2 LOW findings |
| 2026-04-15T11:30Z | Critic → Planner | APPROVED with revisions F1–F3       | Planner addressed all 3 actionable findings          |

---

## Value Statement Assessment

**Verdict: PASS** — Clear, well-formed user story.

The value statement follows the standard "As a / I want to / So that" format. The "so that" outcome ("discover halal businesses and community services immediately without navigating to a separate search page") is verifiable via the success criteria and directly supports the Master Product Objective ("Make UFlow the first thought when any Muslim seeks a service or business"). Reducing friction from the discovery path strengthens the core value loop.

No drift detected.

---

## Overview

Plan 090 proposes merging the Home and Search surfaces on mobile by replacing the Stage 3 root page content (currently: greeting header + flat category gallery) with a unified layout: search bar → section tab bar → section-filtered category galleries. The plan is well-scoped, explicitly limits blast radius to the Stage 3 mobile rendering path, and preserves all existing `/providers` functionality.

The plan builds on Plan 089's three-section infrastructure (Section type, SectionSelector, inferSectionFromCategory) and makes reasonable architectural decisions to keep the search bar as a navigation affordance rather than duplicating the inline search machinery.

---

## Architectural Alignment

**Verdict: ALIGNED** — The plan respects existing patterns.

- **Component placement**: New `HomeSearchBar` in `src/features/search/components/` follows the feature-domain placement convention.
- **Server/client boundary**: Home page is client-rendered (Stage 3 detection requires localStorage/client state), consistent with existing `RootPageContent` pattern.
- **i18n**: Additive keys, no removals. Uses `useLanguage` hook pattern.
- **State management**: Local `useState` for section selection is appropriate — the home page is a standalone discovery surface, not a shared state context.
- **No backend changes**: Postgres-first philosophy is respected — no new tables, RPCs, or schema changes.

---

## Scope Assessment

**Verdict: WELL-DEFINED** — Clear in/out boundaries with one notable gap.

In-scope and out-of-scope boundaries are explicitly stated. The plan correctly excludes desktop, Stage 1/2, bottom nav, and `/providers` page changes. The scope is tight and deliverable.

One concern: the plan acknowledges category-to-section mapping as a deferred decision (D7) but underestimates the gap between the current `inferSectionFromCategory` function (maps only 2 UUIDs) and the requirement to classify ~12+ categories across three sections. See Finding F1.

---

## Technical Debt Risks

**Verdict: LOW** — Minimal new debt introduced.

- The "Business" → "Stores" rename is UI-only with no data model change — clean separation.
- New i18n keys are additive.
- `HomeSearchBar` is a new leaf component with no shared state coupling.
- The plan appropriately defers implementation details (D7) to the implementer rather than prescribing a specific approach.

One potential debt: if the implementer hardcodes category-to-section mappings by UUID (extending `inferSectionFromCategory`), this creates a maintenance burden when new categories are added. See Finding F1 recommendation.

---

## Findings

### F1 — Category-to-Section Mapping Gap (MEDIUM)

| Field          | Value |
| -------------- | ----- |
| **Issue Title** | `inferSectionFromCategory` maps only 2 of ~12+ categories; plan underestimates mapping complexity |
| **Status**      | RESOLVED |
| **Severity**    | MEDIUM |

**Description**: The plan's M3 relies on mapping categories to sections for filtered galleries. The existing `inferSectionFromCategory()` in `sectionFilters.ts` only recognizes two UUIDs:
- `ESSEN_TRINKEN_CATEGORY_ID` → food
- `GEMEINSCHAFT_SPENDEN_CATEGORY_ID` → ummah
- Everything else → business (default)

This means with the current function, the Food tab would show 0 categories (the "Essen & Trinken" category is a parent/umbrella category, not the individual cuisine categories like Türkisch, Arabisch, Pakistanisch that appear in the gallery), and the Stores tab would show ~10+ categories including food-specific ones like "Restaurant & Cafe" and "Supermarkt".

The `categories` table has no `section` or `listing_type` column. The `applicable_to` field stores entity types (`'provider'`, `'community_service'`), not sections. The `listing_type` field exists on providers but not on categories.

**Impact**: Without addressing this, the home gallery tabs would render incorrectly — Food shows nothing meaningful, Stores shows everything. This is the plan's primary implementation risk.

**Recommendation**: The plan should explicitly acknowledge this gap as an **Assumption** (not just a deferred decision) and suggest one of:
1. A client-side mapping function that classifies known category UUIDs into sections (extending the existing pattern in `entityTypeUtils.ts` and `sectionFilters.ts`)
2. Querying categories through their related providers/community_services and filtering by `listing_type`
3. (Future) Adding a `section` column to the `categories` table

The plan's D7 acknowledges the decision is deferred but labels it as an M2 concern when it's actually an **M3** concern. Fix the milestone reference.

---

### F2 — MobileGreetingHeader Removal Not Documented (MEDIUM)

| Field          | Value |
| -------------- | ----- |
| **Issue Title** | Stage 3 currently renders MobileGreetingHeader (personalized city greeting); removal is undocumented |
| **Status**      | RESOLVED |
| **Severity**    | MEDIUM |

**Description**: The current Stage 3 rendering path in `RootPageContent` renders a `MobileGreetingHeader` (personalized greeting with user's city name) above the `CategoryGallerySection`. The plan proposes replacing this with the search bar + tab bar, which is correct per the design spec, but the removal of the greeting header is not mentioned in the plan's scope, affected files, or rollback sections.

The `MobileGreetingHeader` also appears in Stage 2 content. The plan states Stage 2 is untouched, which is correct, but the plan should explicitly note that the personalized greeting is **removed from Stage 3 only** to avoid implementer confusion.

**Impact**: LOW risk of actual breakage (the design spec clearly shows no greeting), but omitting this from the documented scope could cause the implementer to create a regression by failing to remove it, or conversely, accidentally removing it from Stage 2.

**Recommendation**: Add to M4 tasks: "Remove MobileGreetingHeader from Stage 3 rendering path (replaced by HomeSearchBar + SectionSelector)." Note in Affected Files that `MobileGreetingHeader` is used but not modified (only its invocation in Stage 3 is removed).

---

### F3 — D7 Deferred Decision References Wrong Milestone (LOW)

| Field          | Value |
| -------------- | ----- |
| **Issue Title** | D7 references "M2 implementation" but should reference M3 |
| **Status**      | RESOLVED |
| **Severity**    | LOW |

**Description**: Decision D7 states: "[DEFERRED: Implementer — exact mapping strategy depends on whether `listing_type` or category UUID grouping is more reliable; to be resolved during M2 implementation]". M2 is the HomeSearchBar component, which has no relationship to category-to-section mapping. The correct milestone is **M3** (Section-Filtered Category Galleries).

**Impact**: Minor confusion for the implementer about when this decision needs resolution.

**Recommendation**: Change D7 status to `[DEFERRED: Implementer — to be resolved during M3 implementation]`.

---

### F4 — Planner Chatmode File Missing (LOW — Process)

| Field          | Value |
| -------------- | ----- |
| **Issue Title** | `.github/chatmodes/planner.chatmode.md` does not exist |
| **Status**      | OPEN |
| **Severity**    | LOW |

**Description**: Per Critic instructions, the planner chatmode file should be checked at review start. The file does not exist in this workspace. This is a process note, not a plan quality issue.

**Impact**: None on this plan. Process-level gap.

**Recommendation**: No action required for Plan 090, but the missing file should be noted for future process improvement.

---

## Unresolved Open Questions

No `OPEN QUESTION` items found in the plan document.

---

## Decision Record Check

| # | Decision | Status | Critic Assessment |
|---|----------|--------|-------------------|
| D1 | Tab label rename | [RESOLVED] | Acceptable |
| D2 | City filter removed | [RESOLVED] | Acceptable |
| D3 | Search bar is navigation affordance | [RESOLVED] | Acceptable |
| D4 | Category galleries are section-aware | [RESOLVED] | Acceptable |
| D5 | Stage-based rendering retained | [RESOLVED] | Acceptable |
| D6 | `/providers` route unchanged | [RESOLVED] | Acceptable |
| D7 | Category-to-section mapping | [DEFERRED] | Wrong milestone reference (F3); underlying gap documented (F1) |

No [OPEN] decisions found.

D7 is marked DEFERRED with the implementer as downstream owner. Per Deferred Findings Rule: the downstream owner is identified (Implementer), the target is M3, and the trigger is M3 implementation start. Acceptable.

---

## Duration Estimates Check

**Verdict: PRESENT** — Duration estimates section is included with per-phase breakdowns and uncertainty ratings. Total range (9–16 hours) is reasonable for the scope. Key uncertainty driver (M3 category mapping) is correctly identified.

---

## Hotfix Scenario Analysis

**"How will this plan result in a hotfix after deployment?"**

1. **Category mapping produces empty tabs**: If the implementer's mapping logic results in a section (e.g., Food) showing 0 categories, users see an empty home screen tab. This would require a hotfix to adjust the mapping. **Mitigation**: M3 acceptance criteria require all three tabs to show content. QA should verify with production category data.

2. **iOS PWA search bar focus trap**: The plan correctly identifies this risk (using `div[role="search"]` instead of `<input>`) but doesn't include it as an M2 acceptance criterion. If an `<input>` is used and iOS PWA opens the keyboard on home page load, this would require a hotfix. **Mitigation**: Already noted in Risks table; should be elevated to M2 AC.

3. **"Stores" label confusion**: Users expecting "Business" may be confused by the rename. This is a UX decision, not a code issue. Low hotfix probability.

4. **Scroll position state leakage**: If section tab switching doesn't reset scroll position (M4 AC), users may see the bottom of a long gallery list when switching tabs. **Mitigation**: Covered by M4 AC "Scroll position resets to top when switching sections."

Overall hotfix risk: **LOW** — the plan's conservative scope (no backend changes, no `/providers` modification, Stage 3 only) limits the blast radius.

---

## Risk Assessment

| Risk | Plan Rating | Critic Rating | Notes |
|------|------------|---------------|-------|
| Category-to-section mapping incomplete | Medium/Medium | **Medium/High** | Upgraded impact — empty tabs on home screen is user-facing |
| Stage 3 detection conflicts | Low/High | Low/High | Agree |
| Performance regression | Low/Low | Low/Low | Agree |
| iOS PWA input focus | Medium/Medium | Medium/Medium | Agree, but should be M2 AC |

---

## Questions

1. **For the user**: The plan renames "Business" to "Stores" globally (including on the `/providers` SectionSelector). Is this intentional, or should the rename only apply to the home page tab bar? The current SectionSelector on `/providers` also shows "Business" — should that also change to "Stores"?

---

## Recommendations

1. **Address F1** (MEDIUM): Acknowledge the category mapping gap more explicitly. Either promote D7 from DEFERRED to an Assumption with a risk note, or add an M3 sub-task for "investigate and implement category-to-section classification."

2. **Address F2** (MEDIUM): Document the MobileGreetingHeader removal in M4's task list and in the Affected Files table.

3. **Address F3** (LOW): Fix D7 milestone reference from M2 to M3.

4. **Optional**: Add an M2 acceptance criterion: "HomeSearchBar uses a non-input element (div/button) styled as an input to avoid iOS keyboard activation on tap."

---

## Revision History

| Revision | Artifact Changes | Findings Addressed | New Findings | Status Changes |
|----------|-----------------|-------------------|-------------|----------------|
| Initial  | Plan created (2026-04-15) | — | F1 (MEDIUM), F2 (MEDIUM), F3 (LOW), F4 (LOW) | — |
| R1       | Plan revised (2026-04-15T11:30Z) | F1 RESOLVED (Assumption 5 + M3 Task 1 + D7 expanded), F2 RESOLVED (M4 Task 2 + Affected Files), F3 RESOLVED (D7 now references M3) | — | Critique: APPROVED |
