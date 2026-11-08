# Provider Review Queue — Design Spec

**Date:** 2026-11-08  
**Status:** Approved for implementation

---

## Problem

Admins have no central place to see food providers that have completed the automated enrichment and pre-screening pipelines and are waiting for a final approve/reject decision. The approve/reject action exists but is only reachable by navigating to individual provider edit pages.

## Success criteria

1. Admin lands on a single page and sees all providers in `review_status = 'pending'` that have been through both enrichment (`last_enriched_at IS NOT NULL`) and screening (`provider_screenings` row exists).
2. Admin can navigate from any queue row directly to the provider edit/review page.
3. Admin menu in the navbar surfaces all key admin tools, including this new page.

---

## Architecture

### Filtering signal

A provider is "enriched and screened" when:

- `providers.review_status = 'pending'`
- `providers.last_enriched_at IS NOT NULL`
- At least one row exists in `provider_screenings` for that `provider_id`

No new migration. The join runs at the service layer (consistent with the existing `getPendingProviders` pattern).

### New files

| Path                                                                   | Purpose                                      |
| ---------------------------------------------------------------------- | -------------------------------------------- |
| `src/services/admin/providers.ts`                                      | Add `getReadyForReviewProviders(pagination)` |
| `src/app/api/admin/providers/review-queue/route.ts`                    | `GET /api/admin/providers/review-queue`      |
| `src/app/(dashboard)/dashboard/providers/review/page.tsx`              | Review queue page                            |
| `src/features/admin/components/ProviderReviewQueue.tsx`                | Queue list component                         |
| `src/features/admin/components/__tests__/ProviderReviewQueue.test.tsx` | Component tests                              |
| `src/__tests__/services/admin/getReadyForReviewProviders.test.ts`      | Service unit test                            |

### Changed files

| Path                                       | Change                                                 |
| ------------------------------------------ | ------------------------------------------------------ |
| `src/components/layout/Header.tsx`         | Add admin nav links to profile dropdown when `isAdmin` |
| `src/translations/en.ts` + 5 other locales | New i18n keys                                          |

---

## Service layer

**`getReadyForReviewProviders(pagination: PaginationParams): Promise<PaginatedResult<PendingProvider>>`**

Added to `src/services/admin/providers.ts`. Uses the existing `getSupabaseAdmin()` client.

Query:

```sql
SELECT p.provider_id, p.provider_name, p.provider_images,
       p.category_id, p.address_city, p.contact_email,
       p.review_status, p.review_feedback, p.created_at, p.updated_at,
       p.user_created_id
FROM providers p
WHERE p.review_status = 'pending'
  AND p.last_enriched_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM provider_screenings s WHERE s.provider_id = p.provider_id
  )
ORDER BY p.created_at ASC
LIMIT $limit OFFSET $offset
```

Returns `PaginatedResult<PendingProvider>` — same types already in the file. Count query mirrors the filter.

---

## API

**`GET /api/admin/providers/review-queue`**

- Auth: `getUserFromCookie()` + `isAdminOrModerator()` (same guard as all other admin routes)
- Rate limit: reuse `rateLimiters.adminRead` if it exists, otherwise no rate limit (read-only queue)
- Query params: `limit` (default 50, max 100), `offset` (default 0)
- Response: `{ data: PendingProvider[], pagination: { total, limit, offset, hasMore } }`
- Errors: 401 Unauthorized, 403 Forbidden, 500 Internal Server Error

---

## Page

**`/dashboard/providers/review`**

Protected by the existing `(dashboard)` layout which already redirects non-admin users.

Structure mirrors `EnrichmentPage`:

```
<div className="flex h-screen-fix flex-col">
  <PageHeader title={t('providerReview.title')} variant="back-and-title" onBack={() => router.push('/dashboard')} />
  <main className="flex-1 overflow-y-auto px-4 py-6 pt-24">
    <ProviderReviewQueue />
  </main>
</div>
```

---

## `ProviderReviewQueue` component

`src/features/admin/components/ProviderReviewQueue.tsx`

- `'use client'`
- Fetches `GET /api/admin/providers/review-queue` on mount (same fetch-on-mount pattern as `HalalReviewQueue`)
- States: loading skeleton, error message, empty state, list
- Each row renders: provider name, city, created date (relative), and a "Review →" link to `/dashboard/providers/[id]/edit`
- Pagination: "Load more" button when `hasMore = true` (appends next page, no full reload)
- No inline approve/reject — the full review flow lives on the provider edit page

### Row data shown

| Field             | Display                                                |
| ----------------- | ------------------------------------------------------ |
| `provider_name`   | Heading                                                |
| `address_city`    | Secondary text                                         |
| `created_at`      | Relative date (e.g. "3 days ago")                      |
| `review_feedback` | Shown if non-null (e.g. from a prior `needs_revision`) |

---

## Admin nav menu (AC #2)

Extend the existing profile dropdown in `Header.tsx`. When `isAdmin`, add an "Admin" section above the account settings item:

```
─────────────────
  Admin
  ├─ Provider Review   → /dashboard/providers/review
  ├─ Halal Review      → /dashboard/halal-review
  ├─ Enrichment        → /dashboard/enrichment
  └─ Import            → /dashboard/import
─────────────────
  Account settings     → /profile
  Sign out
```

Implementation: a conditional block inside the existing dropdown `<div>`. No new component — it's 10–15 lines of JSX using the same button/Link pattern already there.

---

## i18n

New keys added to all six locale files (`en`, `de`, `ar`, `tr`, `ur`, `ps`):

```ts
providerReview: {
  title: 'Provider Review Queue',
  empty: 'No providers are ready for review.',
  loadError: 'Failed to load review queue.',
  loading: 'Loading review queue…',
  loadMore: 'Load more',
  reviewLink: 'Review',
},
navigation: {
  admin: 'Admin',
  adminProviderReview: 'Provider Review',
  adminHalalReview: 'Halal Review',
  adminEnrichment: 'Enrichment',
  adminImport: 'Import',
},
```

Non-English locales: English strings used as placeholder values — `npm run i18n:check` enforces all keys exist. Translations can be refined separately.

---

## Testing

**Service test** (`src/__tests__/services/admin/getReadyForReviewProviders.test.ts`):

- Mocks `getSupabaseAdmin()` (same pattern as existing `providers.test.ts`)
- Cases: returns paginated list, returns empty list, throws on DB error

**Component test** (`src/features/admin/components/__tests__/ProviderReviewQueue.test.tsx`):

- Mocks `fetch`
- Cases: loading state, error state, empty state, renders provider rows, "Load more" appends results

---

## Out of scope

- Inline approve/reject on the queue page (that flow lives on the provider edit page)
- Mobile-specific layout changes (existing dashboard pages are desktop-first)
- Filtering by screening status (can be a follow-on)
- Needs-revision providers in the same queue (separate status, separate queue if needed later)
