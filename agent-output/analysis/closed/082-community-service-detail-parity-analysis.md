---
ID: 082
Origin: 081
UUID: b4e91f3a
Status: Planned
---

# Analysis 082 — Community Service Detail Page: Architectural + Design Parity Gap

## Changelog

| Date (UTC) | Agent | Event |
|------------|-------|-------|
| 2026-04-05T21:10Z | analyst | Created revised analysis after UAT failure on Plan 081 |

## Value Statement and Business Objective

**As a** community service owner, **I want to** open my community service detail page and see a page that looks and behaves identically to the provider detail page, **so that** I can view, bookmark, share, and manage my community service with the same quality experience as providers.

Plan 081's import-path fix was technically correct but insufficient: the page still shows "Service nicht gefunden" in production UAT, and even when data loads, the design diverges from the provider detail page design system.

## Objective

Identify all architectural and design-system gaps between the community service detail page and the provider detail page, to support a revised Plan 081 that achieves full parity.

## Context

- Plan 081 (v0.10.9) fixed the wrong Supabase client import in the community service Server Component
- UAT screenshot shows "Service nicht gefunden" — the `notFound()` path fires instead of rendering the service
- The user explicitly stated the implementation doesn't match their expectation: it should show the community service **similar to how a provider would be shown in detail view**
- Additionally, the design of the community service detail page does not follow the design system used by the provider detail page

## Methodology

Full code trace of both page architectures: Server Component → Client Component → UI Component, comparing data flow, error handling, design system usage, and React Query integration.

---

## Findings

### F1 — Server Component Architecture Mismatch [L1 Proven]

**Provider detail page** (`/providers/[provider_id]/page.tsx`):
```
Server Component → fetches data → passes as initialData (nullable) to Client
Client Component → useProvider() React Query hook → graceful loading/error/notFound
```
- Server passes `initialData` as **optional prop** — null is a valid value
- Client has React Query with 5-min stale time; can **re-fetch** if SSR data is null
- `notFound()` called only in **client** after React Query confirms error/null

**Community service detail page** (`/community-services/[community_service_id]/page.tsx`):
```
Server Component → fetches data → if null, HARD notFound() → never reaches client
Client Component → receives data as required prop → no React Query, no re-fetch
```
- Server calls `notFound()` immediately if `getCommunityServiceById` returns `null`
- Client receives `communityService` as a **required** (non-nullable) prop
- **No React Query hook** — data is static SSR-only; no client-side caching or refetching
- No `useCommunityService(id)` hook exists in the codebase

**Impact**: Any reason for `getCommunityServiceById` to return `null` (RLS visibility, stale auth context, recommendation-mode services with `user_created_id = NULL`) results in the hard "Service nicht gefunden" wall with no recovery.

### F2 — Missing `useCommunityService` React Query Hook [L1 Proven]

The hooks file `src/hooks/useCommunityServices.ts` contains:
- `useCommunityServicesForProvider(providerId)` — fetches **list** for a provider
- `useAllCommunityServices()` — fetches **all** community services
- `useCommunityServicesByCategory(categoryId)` — fetches by category

**Missing**: `useCommunityService(id)` — fetches a **single** community service by ID with React Query caching and SSR `initialData` support. This is the direct equivalent of `useProvider()` from `src/hooks/useProvider.ts`.

Without this hook, the client component cannot:
- Accept nullable `initialData` from SSR
- Re-fetch if SSR data was null (e.g., stale auth context)
- Benefit from client-side caching for instant re-navigation
- Show loading skeleton while fetching

### F3 — Desktop Design Divergence: CommunityServiceDetailModal vs ProviderDetailModal [L1 Proven]

Both are ~700–800 line components rendering similar data views, but they are **completely separate implementations**:

| Feature | ProviderDetailModal (811 lines) | CommunityServiceDetailModal (714 lines) |
|---|---|---|
| Image handling | `getAllTrustedImageUrlsWithFallback` utility | Manual inline `isTrustedUrl` filter |
| Badges section | `BadgeLabel` component + trust badge display | No badge support |
| Analytics | `trackEvent` (Plausible) for contact actions | No analytics tracking |
| Instagram normalization | `normalizeInstagramUrl` utility | Not present |
| Community services section | Shows linked community services | Shows linked providers |
| `initialCommunityServices` prop | Yes (SSR prefetched) | No |
| `customActionButtons` prop | Yes (admin buttons) | No |
| Skeleton loading | Uses `Skeleton` component | No loading state |

The community service modal does **not** use the same design system components as the provider modal. It has its own image carousel, bookmark handling, contact section, and layout — all independently implemented.

### F4 — Mobile Path Already Has Partial Parity [L1 Proven]

The `CommunityServiceDetailPageClient` transforms community service data into a `Provider`-shaped object and passes it to `ProviderDetailPageComponent` (which renders `ProviderDetailPage` — 1064 lines). This component already supports community services:

```typescript
// Line 140 in ProviderDetailPage.tsx
const isCommunityService = !!provider.community_service_id;
const bookmarkableType = isCommunityService ? 'community_service' : 'provider';
```

**However**, the transformation in `CommunityServiceDetailPageClient` is manual and fragile:
- Misses fields like `provider_description`, `social_facebook`, badge data
- Hardcodes `provider_images` as `JSON.stringify({ urls: [...] })` — brittle format coupling
- Does not pass `initialCommunityServices` or `customActionButtons`
- Does not pass badge data for trust section

### F5 — RLS Edge Case: recommendation-mode services with `user_created_id = NULL` [L2 Observed]

RLS SELECT policy (migration 046) owner clause: `user_created_id = auth.uid()`

Services created in "recommendation mode" (where another user recommends a service) have `user_created_id = NULL`. These services are:
- **Not visible** to the recommender (not their `user_created_id`)
- **Not visible** to non-authenticated users (unless `review_status = 'approved'`)
- Only visible to admins/moderators or via provider ownership chain

If the service being navigated to has `user_created_id = NULL` and `review_status ≠ 'approved'`, the server query returns `null` regardless of auth context quality. This is a **data-layer** issue, not fixable by import path changes.

### F6 — No `description` field rendered for community services [L1 Proven]

`CommunityService.community_service_description` is defined in the type but the `CommunityServiceDetailPageClient` does NOT map it to `provider_description` in the provider-shaped transform. The `ProviderDetailPage` component renders `provider.provider_description` for the description section. This means community services show no description on mobile.

---

## Architecture Comparison Summary

```
PROVIDER DETAIL PAGE (reference design):
┌─────────────────────────────────────────────┐
│ Server Component (page.tsx)                  │
│  ├─ getProviderById() → initialData (null OK)│
│  ├─ getCommunityServicesForProvider()         │
│  └─ passes both to Client                    │
├─────────────────────────────────────────────┤
│ Client Component (ProviderDetailPageClient)   │
│  ├─ useProvider() React Query hook            │
│  ├─ Loading skeleton if no initialData        │
│  ├─ notFound() only after RQ confirms error   │
│  ├─ DESKTOP: ProviderDetailModal              │
│  └─ MOBILE: ProviderDetailPage                │
├─────────────────────────────────────────────┤
│ Design System:                                │
│  ├─ BadgeLabel, TrustBadgesSection            │
│  ├─ BookmarkButton, Skeleton                  │
│  ├─ getAllTrustedImageUrlsWithFallback         │
│  ├─ trackEvent (Plausible analytics)          │
│  └─ Admin action buttons                      │
└─────────────────────────────────────────────┘

COMMUNITY SERVICE DETAIL PAGE (current state):
┌─────────────────────────────────────────────┐
│ Server Component (page.tsx)                  │
│  ├─ getCommunityServiceById() → null = 404!  │
│  └─ notFound() hard wall in server           │
├─────────────────────────────────────────────┤
│ Client Component (CommunityServiceDetailPage)│
│  ├─ NO React Query hook                      │
│  ├─ NO loading skeleton                      │
│  ├─ Manual provider-shape transform           │
│  ├─ DESKTOP: CommunityServiceDetailModal     │
│  │   (separate 714-line implementation)       │
│  └─ MOBILE: ProviderDetailPage (partial)      │
│       (transform misses description, badges)  │
├─────────────────────────────────────────────┤
│ Design System:                                │
│  ├─ NO BadgeLabel, NO TrustBadgesSection     │
│  ├─ NO BookmarkButton component (inline)     │
│  ├─ NO getAllTrustedImageUrlsWithFallback     │
│  ├─ NO analytics tracking                    │
│  └─ NO admin action buttons                  │
└─────────────────────────────────────────────┘
```

---

## System Weaknesses

| # | Weakness | Risk Mechanism | Detection |
|---|----------|---------------|-----------|
| W1 | Hard `notFound()` in server component | Any null from DB query = permanent 404 for user; no recovery | UAT screenshot (proven) |
| W2 | No React Query hook for single community service | No client-side caching, no re-fetch, no loading state | Code inspection (proven) |
| W3 | Two parallel modal implementations (714 + 811 lines) | Design drift between community service and provider views | Side-by-side comparison (proven) |
| W4 | Manual provider-shape transform is fragile | Missing fields (description, badges); format coupling (`JSON.stringify`) | Code trace (proven) |
| W5 | recommendation-mode services invisible to recommender | `user_created_id = NULL` causes RLS denial; no UI explanation | Migration 046 policy trace (observed) |

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Exact community service `review_status` and `user_created_id` in UAT screenshot | Determines if W5 is the specific trigger | DB query in Supabase dashboard | User |
| 2 | Whether `CommunityServiceDetailModal` should be replaced entirely by reusing `ProviderDetailModal` or kept as separate component | Design decision | Planner | Planner |
| 3 | Whether admin action buttons are needed for community services in detail view | Feature scope decision | User/Product Owner | User |

---

## Analysis Recommendations (next investigative steps only)

1. **Planner should revise Plan 081** to deliver full architectural parity: SSR-as-initialData + `useCommunityService(id)` React Query hook + graceful client-side loading/error handling
2. **Planner should evaluate** whether to reuse `ProviderDetailModal` for desktop (since `ProviderDetailPage` already supports community services on mobile) or invest in updating `CommunityServiceDetailModal` to match the design system
3. **User should confirm** whether the UAT screenshot is from a recommendation-mode service (`user_created_id = NULL`) — this affects whether an RLS policy change is also needed
4. **If desktop modal is to be unified**, Planner should scope the `provider_description` mapping gap (F6) and badges/analytics additions (F3)
