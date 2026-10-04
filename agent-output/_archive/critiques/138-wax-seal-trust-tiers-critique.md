---
ID: 138
Origin: 138
UUID: a7c3e91f
Status: OPEN
---

# Critique — Plan 138: Wax Seal Trust Tiers (Bronze / Silver / Gold)

| Field    | Value                                                                  |
| -------- | ---------------------------------------------------------------------- |
| Artifact | `agent-output/planning/138-wax-seal-trust-tiers-plan.md`               |
| Date     | 2026-06-01T22:15Z                                                      |
| Status   | Initial                                                                |
| Verdict  | **APPROVED** — 5 findings (0 Critical, 1 Medium, 4 Low); none blocking |

## Changelog

| Date              | Handoff / Request       | Summary                                            |
| ----------------- | ----------------------- | -------------------------------------------------- |
| 2026-06-01T22:15Z | User → Critic (initial) | Initial critique of Plan 138 after planner handoff |

---

## Value Statement Assessment

**Present and well-formed.** The user story follows correct "As a / I want to / so that" structure. The value proposition is clear: replace technical verification detail with a universally understood trust metaphor (bronze/silver/gold). The cultural resonance angle (wax seal + حلال calligraphy) is meaningful for the target Muslim audience and differentiates UFlow from generic trust indicators.

---

## Overview

Plan 138 replaces the semicircle arc gauge (Plan 136) and dimension matrix rows (Plan 137) with a wax-seal-based visual tier system. The 4-level model from Plan 135 is collapsed into 3 tiers (bronze/silver/gold) where certificate possession is the primary differentiator. The plan also absorbs the standalone `AttestationCard` content into the gold tier's ProofTierCard, addressing user feedback about redundancy and the separate testification section.

The plan is well-structured with 7 milestones, clear acceptance criteria, a dependency graph, and an explicit image delivery handoff section for the product owner. Decision Record has 8 decisions, all RESOLVED with rationale. Duration estimates are provided.

---

## Architectural Alignment

**Strong alignment.** The plan re-converges with the original ADR (133-halal-proof-tier-adr.md) which defined a 3-tier proof model (Online Check / Personal Visit / Certified). Plan 135 temporarily diverged to a 4-level 2×2 matrix; Plan 138 collapses back to 3 tiers while preserving the 2-column data model. This is architecturally sound — the data model remains orthogonal and expressive, while the visual layer simplifies for user comprehension.

The 2-column schema (`verification_method` + `has_certificate`) from Plan 135 is not wasted: Gold-tier summary sentences still differentiate online+cert vs onsite+cert via distinct translation keys (`summaryGoldCert` vs `summaryGoldCertOnly`). The data dimensions remain available for future product needs even though the visual collapses them.

**ADR consistency note**: The ADR's original Tier 3 ("Certified") required "official halal cert + signed declarations (affidavits)". Plan 138's Gold only requires `hasCertificate = true` — attestation declarations are optional enrichment, not a gate. This is a defensible simplification consistent with the current data reality (only 2 providers have any declarations).

---

## Scope Assessment

**Appropriately scoped.** 7 milestones with clear boundaries. The dependency graph correctly identifies M1+M2 as parallelizable. The plan touches:

- 1 component refactor (ProofTierCard — replaces arc + dimension rows + absorbs attestation)
- 6 translation files (new summary keys, attestation keys)
- 3 static image assets (new)
- 1 component rendering change (ProviderDetailSections — already done)
- Test updates

No schema changes, no API surface changes, no deployment-sensitive work. The image dependency (M1) is correctly flagged as the primary scheduling risk.

---

## Technical Debt Risks

1. **AttestationCard becomes dead code**: Plan 138 absorbs attestation rendering into ProofTierCard for gold tier. M6.5 says "Verify AttestationCard is still exported (other consumers may exist)." The grep confirms no other render-site exists beyond the already-removed `ProviderDetailSections.tsx` call. The file will survive as an unused export. This is minor debt — it should be deleted or marked deprecated once Plan 138 ships.

2. **Plans 136 + 137 visual work discarded**: The arc gauge (Plan 136) and dimension matrix rows (Plan 137) were implemented in this session and are now being replaced entirely. This is expected iterative refinement within a design-exploration session — not technical debt per se — but the session has accumulated 6 plans (133–138) for what amounts to a single visual feature. Future sessions should consider iterating on mockups before committing to implementation.

---

## Findings

### F1 — Supersession of Plans 136 + 137 not formalized

| Field          | Value                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity       | LOW                                                                                                                                                                        |
| Status         | OPEN                                                                                                                                                                       |
| Issue          | Plan states it "supersedes Plans 136 (arc gauge) and 137 (dimension matrix)" in the Release Strategy section, but does not specify what status those plans should move to. |
| Impact         | Ambiguity during implementation — implementer may not know to close/supersede those plan documents.                                                                        |
| Recommendation | Add an explicit task (M6 or M7) to update Plans 136 and 137 status to "Superseded by Plan 138" and move their documents to `closed/`.                                      |

### F2 — Bold formatting in translation strings risks i18n fragility

| Field          | Value                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity       | MEDIUM                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Status         | OPEN                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Issue          | M4 requires bold formatting within summary sentences ("This provider was checked **on-site**"). The plan mentions two approaches (embedded HTML in translation strings vs split-and-wrap) but does not decide which. Embedded HTML (`<strong>`) in translation strings is fragile — translators may break tags; the split approach requires stable token boundaries across 6 locales with different word orders (especially Arabic RTL). |
| Impact         | If the approach is chosen at implementation time without design consideration, it could produce broken rendering in one or more locales, or require a hotfix for RTL languages.                                                                                                                                                                                                                                                          |
| Recommendation | Resolve the formatting approach in the plan. The existing `AttestationCard` already uses a "split around token" pattern for the "Allah" gold-gradient text — recommend reusing that pattern for consistency. Document the chosen approach in the Decision Record or M4 tasks.                                                                                                                                                            |

### F3 — ProofTierCard responsibility widening

| Field          | Value                                                                                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity       | LOW                                                                                                                                                                                                                                                      |
| Status         | OPEN                                                                                                                                                                                                                                                     |
| Issue          | M5 adds 4 new props (`noAlcohol`, `noPork`, `noGambling`, `listingType`) to ProofTierCard, making it responsible for both verification display AND attestation display. The component's name ("ProofTierCard") doesn't reflect this dual responsibility. |
| Impact         | Minor maintainability concern. Future developers may not expect attestation rendering inside a "proof tier" card.                                                                                                                                        |
| Recommendation | No plan change needed — this is a justified merge per user feedback. Consider a component rename (e.g., `HalalCheckCard`) at implementation time if it improves clarity. This is an implementer discretion item, not a plan-level concern.               |

### F4 — No explicit acceptance criteria for image accessibility

| Field          | Value                                                                                                                                                                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity       | LOW                                                                                                                                                                                                                                                                                                                     |
| Status         | OPEN                                                                                                                                                                                                                                                                                                                    |
| Issue          | M3 mentions `alt` text per tier for the seal images but does not specify what the alt text should convey. Wax seal images are decorative-but-meaningful — they carry trust information that must be accessible to screen reader users.                                                                                  |
| Impact         | If alt text is generic ("bronze seal"), screen reader users miss the trust-level meaning.                                                                                                                                                                                                                               |
| Recommendation | Specify that alt text should include the tier meaning, not just the visual description. Example: `alt={t('proofTier.sealAltBronze')}` → "Online verified" rather than "Bronze seal". The existing `aria-label` pattern on the `<section>` may be sufficient — confirm the accessible name chain covers the trust level. |

### F5 — Hotfix scenario: image path / CDN cache

| Field          | Value                                                                                                                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity       | LOW                                                                                                                                                                                                                                                                                    |
| Status         | OPEN                                                                                                                                                                                                                                                                                   |
| Issue          | Static images in `public/images/seals/` will be served directly by Next.js/CDN. If images are missing or have wrong paths in production, the seals render as broken images with no fallback.                                                                                           |
| Impact         | Visual regression visible to all users if the deploy misses the image assets.                                                                                                                                                                                                          |
| Recommendation | Implement a CSS fallback (e.g., colored circle with tier initial or emoji) so that if the image fails to load, the tier is still communicated. Alternatively, use Next.js `<Image>` with `onError` handler. This is an implementation detail — a brief note in M3 tasks would suffice. |

---

## Unresolved Open Questions

None. The plan has no `OPEN QUESTION` items.

## Decision Record Check

All 8 decisions are marked `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` decisions.

## Duration Estimates Check

**Present.** 3-row table with phase breakdown and total (2–3 days). The primary uncertainty (image delivery timing) is correctly identified.

---

## Risk Assessment

**Low overall risk.** No schema changes, no API surface, no deployment complexity. The main risks are:

1. **Image delivery timing** (external dependency on product owner) — correctly identified and mitigated with parallel M2
2. **i18n bold formatting** (F2) — the only Medium finding; solvable with an explicit design decision
3. **Wasted iteration** (Plans 136+137 work discarded) — accepted cost of design exploration within a worktree session

The plan does not introduce security concerns, performance regressions (images are small static assets), or data model risks.

---

## Recommendations

1. **Address F2** before implementation: decide on the bold-formatting approach for translation strings and document it in the plan.
2. **F1, F3, F4, F5** are informational — they can be addressed at implementation time without plan revision.
3. Proceed to implementation once the product owner confirms image delivery readiness.

---

## Verdict

**APPROVED** — Plan is clear, well-structured, architecturally aligned, and addresses the UAT feedback that drove it. The 3-tier collapse is a sound simplification. One Medium finding (F2: i18n formatting approach) should ideally be resolved in the plan but is not blocking.
