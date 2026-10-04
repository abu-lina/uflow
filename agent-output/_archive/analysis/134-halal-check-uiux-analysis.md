---
ID: 134
Origin: 134
UUID: b8d4e3f2
Status: Active
---

# Analysis 134 — Halal Check Section UI/UX Improvements

## Changelog
| Date | Author | Summary |
|------|--------|---------|
| 2026-06-03 | Analyst | Full UI/UX analysis of halal check section on provider detail page |

---

## Value Statement

**As a** Muslim community user viewing a provider listing on Ummah Flow,
**I want to** see a clear, non-redundant, and well-organized halal trust section that communicates verification depth at a glance,
**so that** I can quickly assess a provider's halal compliance without confusion or information overload.

---

## Methodology

1. **Code inspection** — Read all components, translations, tests, and layout files related to the halal check section.
2. **Visual hierarchy analysis** — Evaluated DOM structure, styling, and information flow for both mobile (320px) and desktop viewports.
3. **Redundancy audit** — Traced all 3 halal touchpoints (popup, section, banner) and assessed each for unique value.
4. **Accessibility scan** — Checked ARIA labels, keyboard navigation, screen reader support, and color contrast.
5. **Translation consistency** — Verified all 6 locale files have consistent keys for halal-related content.
6. **Dead link verification** — Confirmed `/halal` route does not exist in the app router.

---

## Detailed Findings

### F1 — HalalTrustBanner is redundant with "Halal Check" ExpandSection [CONFIDENCE: L1 Proven]

The `HalalTrustBanner` component renders at the bottom of both `ProviderDetailPage.tsx` (mobile, line 593) and `ProviderDetailModal.tsx` (desktop, line 754) with:

- **128px circular "حلال" seal icon** — Visually dominant, takes significant vertical space
- **Title**: "Restaurants on Ummah Flow are checked for halal compliance"
- **Description**: Generic text about halal requirements
- **"Learn more" link** → `/halal` (dead link)

Meanwhile, the "Halal Check" `ExpandSection` inside `ProviderDetailSections` shows the specific verification depth via `ProofTierCard` with seal, tier summary, checklist, and attestation.

**Impact**: A user scrolling through the page sees halal trust information twice — first in the section (with specific tier details), then again in the banner (with generic messaging). This creates confusion about credibility: "Which one should I trust? Why is there a second banner?"

**Recommendation**: Remove `HalalTrustBanner` from both layouts. The "Halal Check" section already provides superior information with proper tier context.

---

### F2 — "/halal" link is dead [CONFIDENCE: L1 Proven]

`HalalTrustBanner` links to `/halal` (line 40: `href="/halal"`). No route exists at `src/app/halal/`. Clicking this link will produce a 404.

**Impact**: Broken user experience — trust-eroding for a section specifically about trust.

**Recommendation**: If banner is kept, either:
- Create a proper `/halal` info page
- Link to an external resource (e.g., blog post about halal verification process)
- Remove the link entirely

If banner is removed (per F1), this is resolved automatically.

---

### F3 — Three halal touchpoints is too many [CONFIDENCE: L2 Inferred]

The provider detail page has 3 halal-related surfaces:

| # | Surface | Trigger | Content |
|---|---------|---------|---------|
| 1 | `HalalTrustPopup` | On page load (up to 10x) | Condensed `HalalTrustBanner` in a modal |
| 2 | "Halal Check" `ExpandSection` | User expands it | `ProofTierCard` with seal, summary, checklist, attestation |
| 3 | `HalalTrustBanner` | Always visible at bottom | Generic trust message + dead link |

**Impact**: Users see halal messaging 3 times in different forms. This is not reinforcing — it's confusing. Each surface should have a distinct purpose.

**Recommendation**: Consolidate to 1-2 surfaces:
- Keep the "Halal Check" section (primary, detailed)
- Keep the popup (onboarding, educational) but improve timing/relevance
- Remove the banner

---

### F4 — TrustBadgesSection placement is semantically wrong [CONFIDENCE: L2 Inferred]

`TrustBadgesSection` is rendered inside the "Halal Check" `ExpandSection` in `ProviderDetailSections.tsx` (lines 226-228). However, trust badges (Muslim-owned, Donates, Prayer Space, etc.) are about community trust signals, not halal compliance specifically.

**Impact**: Mixing community badges with halal verification muddies the section's purpose. A user looking for "is this place halal?" gets distracted by "Muslim-owned" badges.

**Recommendation**: Move `TrustBadgesSection` to the "Values & Amenities" section where it's more contextually relevant, or create a standalone "Trust Badges" section.

---

### F5 — Section title lacks tier visibility in collapsed state [CONFIDENCE: L2 Inferred]

The "Halal Check" `ExpandSection` button shows the generic `proofTier.sectionTitle` translation regardless of the provider's actual verification tier. A user scanning the page cannot see the verification level without expanding the section.

**Impact**: Users must click to discover verification depth. On mobile with limited viewport, this adds friction.

**Recommendation**: Add the tier level (Bronze/Silver/Gold) as a subtitle or badge in the section header. Something like:

> Halal Check · Bronze
> Halal Check · Silver
> Halal Check · Gold

---

### F6 — HalalTrustPopup appears too aggressively [CONFIDENCE: L2 Inferred]

The popup appears on every page load up to 10 times (tracked via localStorage). For a user browsing multiple providers, this popup can appear repeatedly for the first 10 listings they view.

**Impact**: User annoyance. The information is already available in the "Halal Check" section.

**Recommendation**: Reduce the view limit from 10 to 3, or only show on the first visit to any provider detail page.

---

### F7 — Accessibility gaps [CONFIDENCE: L2 Inferred]

- **Seal images**: `SealRow` in `ProofTierCard` has alt text passed via translation keys (good), but the `HalalTrustBanner` seal icon is decorative (`aria-hidden` not present on the SVG, text "حلال" is inside a `<span>` with no ARIA label)
- **GoldAttestationSection**: Has `aria-label` on the section (good), but individual items use plain `<div>` elements with `<p>` text — no list semantics
- **"How do we check?" expandable**: Uses `aria-expanded` (good)
- **Color contrast**: The teal checkmark icons (`#2B6D66`) on white background have adequate contrast (~3.5:1 WCAG AA for large text, but marginal for small icons)

**Impact**: Minor accessibility issues that should be addressed for broader user inclusion.

---

### F8 — Translation consistency across locales [CONFIDENCE: L1 Proven]

All 6 locales have consistent keys for `providerDetail.proofTier`, `providerDetail.attestation`, `providerDetail.halal`, and `providerDetail.popup`. No missing keys detected. ✅

---

## Improvement Recommendations (Priority Order)

### HIGH Priority

| # | Improvement | Files | Expected UX Impact |
|---|-------------|-------|-------------------|
| H1 | **Remove HalalTrustBanner** from ProviderDetailPage and ProviderDetailModal | `ProviderDetailPage.tsx`, `ProviderDetailModal.tsx`, (optionally delete `HalalTrustBanner.tsx` and update tests) | Eliminates redundancy, dead link, and reduces page scroll length by ~200px |
| H2 | **Add tier badge to ExpandSection title** for "Halal Check" | `ProviderDetailSections.tsx`, translation files | Users see verification level without expanding — reduces friction |
| H3 | **Move TrustBadgesSection** out of "Halal Check" section | `ProviderDetailSections.tsx` | Clearer information architecture — community trust separated from halal verification |

### MEDIUM Priority

| # | Improvement | Files | Expected UX Impact |
|---|-------------|-------|-------------------|
| M1 | **Reduce HalalTrustPopup view limit** from 10 to 3 | `HalalTrustPopup.tsx` | Less intrusive onboarding |
| M2 | **Add aria-label to HalalTrustBanner seal** (if kept) OR handle in H1 | `HalalTrustBanner.tsx` | Better screen reader support |

### LOW Priority

| # | Improvement | Files | Expected UX Impact |
|---|-------------|-------|-------------------|
| L1 | **Convert attestation items to `<ul>` list** | `ProofTierCard.tsx` | Better semantic HTML |
| L2 | **Ensure all icons have aria-hidden** | `ProofTierCard.tsx` | Better screen reader experience |

---

## Pipeline Status Assessment

### Existing Plan 134 Track A (Visual Hierarchy)
- **Status**: Code changes are committed. Pipeline incomplete.
- **Missing**: ~~Code Review~~, QA, UAT, DevOps
- **Note**: The code review in `agent-output/review/134-review.md` is actually for Track B (useCallback fix), NOT for the visual hierarchy changes. New code review needed for the halal changes (or included in this new round).

### This Session's Pipeline
- New improvements (H1, H2, H3) need full pipeline: Analyst → Planner → Architect → Implementer → Code Reviewer → QA → UAT → DevOps

---

## Implementation Order

Proceed in this order:

1. **H2 first** — Add tier badge to ExpandSection title (independent change, no cascading effects)
2. **H3 second** — Move TrustBadgesSection out of "Halal Check" (affects only ProviderDetailSections.tsx)
3. **H1 third** — Remove HalalTrustBanner (affects ProviderDetailPage.tsx, ProviderDetailModal.tsx, tests, translations)
4. **M1** — Reduce popup view limit (quick win)
5. Run tests after all changes
6. Code Review → QA → UAT → DevOps

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action |
|---|---------|---------|-----------------|
| G1 | Does removing HalalTrustBanner affect any existing test assertions? | Need to check `__tests__/components/HalalTrustPopup.test.tsx` and `__tests__/components/TrustBadgesSection.test.tsx` | Investigate test files for HalalTrustBanner references |
| G2 | What is the "Values & Amenities" section's visual state for moving TrustBadgesSection there? | Need to check if there's space/clear separation | Review the amenities section layout |

---

## Recommendations

1. **Proceed with H1, H2, H3 as the core improvements** — These address the most significant UX issues (redundancy, discoverability, IA)
2. **M1 as a quick follow-up** — Small config change, big UX improvement
3. **Remove HalalTrustBanner completely** rather than fixing the dead link — it's redundant
4. **Keep HalalTrustPopup** as an onboarding tool but reduce its frequency
5. **Visual hierarchy from Plan 134** is already solid — no further changes needed there
