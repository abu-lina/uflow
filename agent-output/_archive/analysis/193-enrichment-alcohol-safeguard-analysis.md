---
ID: 193
Origin: 193
UUID: a7f3c2b1
Status: Active
Type: Analysis
---

# Analysis: Enrichment Alcohol Safeguard for Provider Quality Gate

## Changelog
| Date | Agent | Action |
|------|-------|--------|
| 2026-06-20 | Orchestrator | Created from user request |

## Value Statement & Objective

Prevent a reviewer from approving a provider when automated enrichment (Wolt/Lieferando/UberEats) has detected alcohol on menu items, but the reviewer's manual website check missed it. The reviewer must be made aware of the discrepancy before approval.

## Context

### Background
The user manually checked a restaurant's website/menu and could not find evidence of alcohol being offered. However, Wolt enrichment later detected alcohol-related menu items (keywords like "Bier", "Wein", etc.) and created an enrichment candidate proposing `no_alcohol = false`. The current quality gate did not surface this conflict to the reviewer.

### Current System Flow
1. Provider is created (food type, no owner) → auto-enqueued for enrichment
2. Enrichment pipeline runs → detects alcohol from delivery platform menu items → creates `enrichment_candidates` with `field_name = 'no_alcohol'` and `proposed_value = false`
3. Reviewer manually checks website → can't find alcohol → sets `no_alcohol = true` via edit form (or leaves default)
4. Reviewer approves provider → `PATCH /api/admin/review-provider` → no conflict check exists
5. Enrichment candidate remains pending → potentially applied later via `EnrichmentReviewPanel` → `no_alcohol` flips to `false` without reviewer awareness

### The Gap
No bridge exists between the enrichment candidate system and the review approval gate. The `PATCH /api/admin/review-provider` route only checks auth, rate limits, and concurrency — never enrichment conflicts.

## Methodology
- Codebase exploration via explore agent (file patterns, grep searches)
- Read key files: review API route, enrichment service, alcohol detector, admin UI components, database schema

## Findings (Confidence Level: Proven)

### Finding 1: Review approval flow has no enrichment awareness
File: `src/app/api/admin/review-provider/route.ts`
- `PATCH /api/admin/review-provider` → calls `updateProviderReview()` → updates `review_status` on providers table
- No query to `enrichment_candidates` table
- No check for `no_alcohol` field conflicts

### Finding 2: Enrichment candidates can contradict manual review
The `enrichment_candidates` table stores `field_name = 'no_alcohol'` with `proposed_value = false` when Wolt/Lieferando detects alcohol. The `food_providers.no_alcohol` column is set to `true` by manual review. These two states can exist simultaneously with no cross-reference.

### Finding 3: Alcohol detector is robust with 19+ keywords
File: `src/lib/enrichment/delivery-platform/alcohol-detector.ts`
- 19 alcohol keywords (Bier, Wein, Schnaps, etc.)
- Returns `matchedKeywords` and `matchedItems` arrays
- Source (wolt/lieferando/ubereats) is tracked in enrichment candidates
- These details can be surfaced in the conflict warning

### Finding 4: Admin UI moderation cards have no enrichment warning
File: `src/components/providers/ProviderCard.tsx` (lines 547-583)
- Moderation mode shows Approve/Reject buttons
- No warning banner about pending enrichment conflicts
- No enrichment data is fetched in the search results (providers query doesn't join enrichment)

### Finding 5: Admin enrichment review exists but is decoupled
File: `src/features/admin/components/EnrichmentReviewPanel.tsx`
- Separate review surface for enrichment candidates
- No integration with the provider review (approve/reject) flow

## Remaining Gaps
| # | Unknown | Blocker | Required Action |
|---|---------|---------|-----------------|
| 1 | None | Analysis is complete | Proceed to planning |

## Recommendations for Planner

### Core Safeguard (Server-side)
1. Create `checkEnrichmentAlcoholConflict(providerId)` service function that queries `enrichment_candidates` for pending `no_alcohol` proposals with `proposed_value = false` and joins with `food_providers.no_alcohol` to detect conflicts
2. Add conflict check in `PATCH /api/admin/review-provider` before approval — return 409 with structured error including matched keywords, source, and candidate ID
3. Add a new lightweight API endpoint `GET /api/admin/enrichment/alcohol-conflicts?providerId=X` for UI consumption

### UI Warnings
4. Show warning badge on moderation `ProviderCard` when alcohol conflict exists
5. Show warning banner on provider detail page when conflict exists
6. Show warning on edit page when trying to approve

### Enrichment Detail in Response
Return enough detail for the UI to show:
- Matched keywords (e.g., "Bier, Wein")
- Enrichment source (e.g., "wolt")
- Number of matched menu items
- Candidate ID for quick resolution

