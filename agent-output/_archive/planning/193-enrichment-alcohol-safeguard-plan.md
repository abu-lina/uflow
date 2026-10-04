---
ID: 193
Origin: 193
UUID: b8d4e3f2
Status: Active
Type: Plan
---

# Plan: Enrichment Alcohol Safeguard for Provider Quality Gate

## Overview

Add a quality gate that blocks provider approval when enrichment has detected alcohol (pending `no_alcohol = false` candidate) while the provider is marked as `no_alcohol = true` from manual review. The reviewer gets a clear warning with enrichment details.

## Implementation Steps

### Step 1: Create enrichment gate service (`src/services/admin/enrichment-gate.ts`)

New file containing `checkEnrichmentAlcoholConflict()`:

```typescript
export interface AlcoholConflict {
  candidateId: string;
  source: string;           // 'wolt' | 'lieferando' | 'ubereats'
  sourceUrl: string | null;
  enrichedAt: string;
  proposedValue: boolean;
  currentValue: boolean;
}

export interface AlcoholConflictResult {
  hasConflict: boolean;
  conflicts: AlcoholConflict[];
}

export async function checkEnrichmentAlcoholConflict(
  providerId: string
): Promise<AlcoholConflictResult>
```

Logic:
1. Query `food_providers` for `no_alcohol = true` given the `providerId`
2. Query `enrichment_candidates` for status `pending`, field_name `no_alcohol`, proposed_value `false`, provider_id matches
3. If both conditions met → return `hasConflict: true` with conflict details
4. Join with `providers` table to get `provider_name` for display

### Step 2: Modify review API route (`src/app/api/admin/review-provider/route.ts`)

Before the `updateProviderReview()` call when `reviewStatus === 'approved'`:

```typescript
import { checkEnrichmentAlcoholConflict } from '@/services/admin/enrichment-gate';

// Before approval, check for enrichment alcohol conflicts
if (validatedData.reviewStatus === 'approved') {
  const alcoholConflict = await checkEnrichmentAlcoholConflict(validatedData.providerId);
  if (alcoholConflict.hasConflict) {
    return NextResponse.json({
      error: 'Enrichment detected alcohol on menu items that contradicts your manual review. Please review the pending enrichment candidates before approving.',
      conflict: alcoholConflict,
      code: 'ALCOHOL_ENRICHMENT_CONFLICT',
    }, { status: 409 });
  }
}
```

### Step 3: Create lightweight API endpoint (`src/app/api/admin/enrichment/alcohol-conflicts/route.ts`)

`GET /api/admin/enrichment/alcohol-conflicts?providerId=X`

Returns `{ hasConflict, conflicts }` from `checkEnrichmentAlcoholConflict()`. Protected by `isAdminOrModerator`.

### Step 4: Add conflict warning UI component (`src/features/admin/components/AlcoholConflictWarning.tsx`)

New client component:

```typescript
interface AlcoholConflictWarningProps {
  conflicts: AlcoholConflict[];
  providerId: string;
  /** If true, render as a blocking banner (on approval) vs informational badge */
  blocking?: boolean;
}
```

Renders:
- Orange/red warning banner with AlertTriangle icon
- Text: "Enrichment detected alcohol on menu items via [source]. Review pending candidates before approving."
- Bullet list of matched sources
- Link to enrichment review page

### Step 5: Modify ProviderCard for moderation badge

In `src/components/providers/ProviderCard.tsx`, when `mode === 'moderation'`:
- Add an orange warning badge "⚠ Alcohol detected via enrichment" above the Approve/Reject buttons
- Pass `alcoholConflict: boolean` as prop to the card

### Step 6: Modify ProvidersContent to fetch conflict data

In `src/app/(public)/providers/ProvidersContent.tsx`:
- When admin has status filter active, batch-check enrichment alcohol conflicts for displayed providers
- Pass conflict data to `SearchResultsList` → `ProviderCard`

### Step 7: Add warning banner to provider edit page

In `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`:
- Fetch alcohol conflict data
- Show warning banner when trying to approve

### Step 8: Add tests

- `src/__tests__/services/admin/enrichment-gate.test.ts`
- `src/__tests__/api/admin/review-provider/alcohol-conflict.test.ts`
- Modify existing review API tests to cover conflict scenario

## Data Flow

```
Admin clicks "Approve" on ProviderCard
  → PATCH /api/admin/review-provider
    → checkEnrichmentAlcoholConflict(providerId)
      → Query enrichment_candidates WHERE provider_id=X AND field_name='no_alcohol' AND status='pending' AND proposed_value=false
      → Query food_providers WHERE provider_id=X AND no_alcohol=true
      → If both match → return conflict
    → If conflict → HTTP 409 with { error, conflict, code }
    → If no conflict → proceed with updateProviderReview()
  → Client receives 409
    → Show AlcoholConflictWarning component
    → Toast with error message
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/admin/enrichment-gate.ts` | `checkEnrichmentAlcoholConflict()` service function |
| `src/app/api/admin/enrichment/alcohol-conflicts/route.ts` | GET endpoint for conflict check |
| `src/features/admin/components/AlcoholConflictWarning.tsx` | Reusable warning UI component |
| `src/__tests__/services/admin/enrichment-gate.test.ts` | Unit tests for gate service |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/api/admin/review-provider/route.ts` | Add conflict check before approval, return 409 |
| `src/components/providers/ProviderCard.tsx` | Add `alcoholConflict` prop, render warning badge |
| `src/components/providers/SearchResultsList.tsx` | Pass `onAlcoholConflict` or conflict map |
| `src/app/(public)/providers/ProvidersContent.tsx` | Fetch conflicts for providers in view |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` | Show warning on edit page |

## Types/Interfaces

All defined in `src/services/admin/enrichment-gate.ts`:

```typescript
export interface AlcoholConflict {
  candidateId: string;
  source: string;
  sourceUrl: string | null;
  enrichedAt: string;
  proposedValue: boolean;
  currentValue: boolean;
}

export interface AlcoholConflictResult {
  hasConflict: boolean;
  conflicts: AlcoholConflict[];
}
```

## Test Plan

1. **Unit: enrichment-gate service**
   - Returns `hasConflict: false` when no alcohol enrichment candidates exist
   - Returns `hasConflict: false` when food_providers.no_alcohol is false
   - Returns `hasConflict: true` when both conditions match
   - Returns correct conflict details (source, candidateId, etc.)
   - Handles non-existent provider gracefully

2. **Integration: review API route**
   - Approval succeeds when no alcohol conflict
   - Approval returns 409 with correct error when alcohol conflict exists
   - Non-approval reviewStatus (reject, needs_revision) bypasses the check
   - Conflict response includes enrichment details

3. **UI: Warning renders correctly**
   - Badge visible on moderation cards with conflict
   - Badge hidden when no conflict
   - Clicking warning link navigates to enrichment review

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| False positive (enrichment wrongly detects alcohol) | Medium | Medium | Enrichment candidate is still pending — reviewer can reject it. The block is a warning, not a permanent block. |
| Performance impact on review API | Low | Low | Single indexed query on enrichment_candidates; providerId filter + field_name + status = fast index scan. |
| Reviewer workflow friction | Medium | Low | Adds one extra step (review enrichment candidates) but catches genuine errors. |
| Enrichment runs after approval | Medium | High | Post-approval case not covered by this gate. Future enhancement: trigger re-review when new alcohol candidates are created for approved providers. |

## Rollback Plan
Revert changes to `src/app/api/admin/review-provider/route.ts`. The service function and endpoint can remain — they're non-blocking reads.

## DB Changes
None needed. The `enrichment_candidates` table already has:
- `provider_id` (FK)
- `field_name` (text) — we filter for 'no_alcohol'
- `proposed_value` (JSONB) — we check for `false`
- `status` — we filter for 'pending'
- Index on `(provider_id, status)` exists per migration 066

And `food_providers` table has `no_alcohol` boolean column.

