---
ID: 085
Origin: 085
UUID: c7b4e2a9
Status: Planned
---

# Analysis: Community Service Detail Page Returns 404 for Valid Records

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-04-07 | Analyst | Initial analysis — root cause identified (L1 Proven) |
| 2026-04-07 | Analyst | Updated with UAT evidence. Confirmed admin/owner visibility gap. Upgraded F5 to L1 Proven. Added F6, F7. |

## Value Statement and Business Objective

Community services detail pages (`/community-services/[id]`) show "Service nicht gefunden" for records that exist in the database but have `review_status != 'approved'` — even for logged-in admin users. This blocks admin workflows: admins cannot view non-approved community services to approve/reject them, and owners cannot see their own pending submissions. Provider detail pages handle the same scenario gracefully via client-side React Query fallback.

**User requirements (confirmed)**:
1. As an admin, I should see everything (any `review_status`)
2. As a logged-in owner, I should see my own created items even if not approved

## Objective

Determine why community service detail pages return 404 while provider detail pages work correctly for equivalent RLS-restricted records.

## Context

- **Reported URL**: `http://localhost:3000/community-services/c1203f3f-dbb8-4b60-b9cd-165699017543`
- **UAT URL**: `https://uat.ummahflow.com/community-services/25cdd3af-18cb-48b4-849d-95fcb39bf609`
- **Reporter observation**: "it works for providers but not for community services"; admin couldn't see pending CS on UAT until manually approved
- **Screenshot**: "Service nicht gefunden" — custom `not-found.tsx` at `src/app/(public)/community-services/not-found.tsx`
- **Origin**: Regression introduced during Plan 083 rebase conflict resolution (Stage 2)
- **UAT evidence**: Pending CS was invisible → once approved, it became visible. Confirms the `review_status = 'approved'` is the only RLS clause that works server-side (admin/owner clauses require `auth.uid()` which the server-side client doesn't propagate).

## Methodology

1. Traced data flow from server page → service layer → Supabase query
2. Compared provider detail page vs community service detail page architecture
3. Reviewed RLS policies for both tables across all migrations (latest: 032 for providers, 046 for community services)
4. Identified architectural divergence introduced during rebase

---

## Findings

### F1: Code-Level Regression — `notFound()` Call (L1 Proven)

The CS server page calls `notFound()` when the server-side fetch returns `null`:

```typescript
// src/app/(public)/community-services/[community_service_id]/page.tsx (current)
const communityService = await getCommunityServiceById(community_service_id);
if (!communityService) {
    notFound();  // ← hard 404
}
```

The **provider** server page does NOT call `notFound()`:

```typescript
// src/app/(public)/providers/[provider_id]/page.tsx
const provider = await getProviderById(provider_id);
// No notFound() — passes nullable initialData to client
return <ProviderDetailPageClient initialData={provider} providerId={provider_id} />;
```

**Origin of regression**: During Plan 083 Stage 2 rebase, we took origin/main's `CommunityServiceDetailPageClient` (session/81 rewrite) which requires `communityService: CommunityService` (non-null). To satisfy the type constraint, we added `notFound()` to the server page. This reverted Plan 082 M1's explicit design: "Do NOT call notFound() here; the client component handles null gracefully via React Query."

The comment from Plan 082 M1 is still in the file, contradicting the code:
```typescript
// Do NOT call notFound() here; the client component handles null gracefully via
// React Query, allowing re-fetch and proper loading/error states.
const communityService = await getCommunityServiceById(community_service_id);

if (!communityService) {
    notFound();  // ← contradicts the comment above
}
```

### F2: Session/81 Client Rewrite Dropped React Query (L1 Proven)

Origin/main's `CommunityServiceDetailPageClient` (from session/81) was a rewrite that:
- Removed `useCommunityService()` React Query hook usage
- Changed props from `{ communityServiceId, initialData }` to `{ communityService }` (non-null)
- Inlines the data transform directly without client-side fetching

The `useCommunityService()` hook still exists at `src/hooks/useCommunityServices.ts` (created by Plan 082 M2) but is no longer called.

### F3: Equivalent Provider Architecture Is Resilient (L1 Proven)

Provider detail page uses a 3-layer resilient pattern:

| Layer | Provider | Community Service (current) |
|-------|----------|---------------------------- |
| Server fetch | `getProviderById()` via cookie auth | `getCommunityServiceById()` via cookie auth |
| Null handling | Pass nullable `initialData` to client | `notFound()` → hard 404 |
| Client fetch | `useProvider()` React Query hook + client Supabase | None — data must come from server |

When server-side cookie auth doesn't have the right context (e.g., the Next.js server component doesn't see the auth cookie for a non-approved row), providers still work because the client-side React Query hook fetches via browser Supabase (with the user's actual session). CS pages fail with a hard 404.

### F4: RLS Policies Are Correctly Configured (L1 Proven)

**Community services SELECT** (migration 046):
```sql
USING (
    review_status = 'approved'
    OR (auth.uid() IS NOT NULL AND user_created_id = auth.uid())
    OR (auth.uid() IS NOT NULL AND provider_id IN (
        SELECT provider_id FROM providers WHERE provider_owner_id = auth.uid()
    ))
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
)
```

**Providers SELECT** (migration 034, consolidated):
```sql
USING (
    review_status = 'approved'
    OR provider_owner_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator'))
)
```

Both policies correctly allow admin/moderator access to any record regardless of `review_status`. **Supabase RLS does not need adjustment.**

### F5: Server-Side Auth Cookie Propagation Doesn't Carry User Session (L1 Proven)

The `createSupabaseServerClient()` reads cookies via `next/headers` `cookies()`. **UAT testing proves** that the admin session is NOT propagated to the Supabase server-side query:

- Admin logged into UAT could NOT see a pending CS at `https://uat.ummahflow.com/community-services/25cdd3af-...`
- After the admin approved it (changing `review_status` to `approved`), the page worked immediately
- The RLS policy's admin clause (`EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role IN ('admin','moderator'))`) was not evaluated as true server-side

This means the server-side Supabase client operates effectively as **anon** — only `review_status = 'approved'` is ever true. The admin/owner clauses in the RLS policy are correct but irrelevant for server-side fetches.

Providers mask this issue because `ProviderDetailPageClient` receives nullable `initialData` and re-fetches via `useProvider()` React Query hook on the **client** side, where the browser's Supabase client has the actual user session.

### F6: Two User Requirements Not Met (L1 Proven — from UAT)

User confirmed two visibility requirements:

1. **As admin → see everything**: Currently fails for non-approved CS because server-side `notFound()` fires before client can retry with the admin's actual session
2. **As owner → see own items**: Same mechanism — the server query returns null for non-approved owned CS, triggering `notFound()`

Both work correctly for **providers** due to the React Query fallback pattern.

### F7: The Fix Already Exists in Codebase (L1 Proven)

The `useCommunityService()` React Query hook at `src/hooks/useCommunityServices.ts` (created by Plan 082 M2) already implements the client-side fetch fallback — identical pattern to `useProvider()`. It accepts `initialData?: CommunityService | null` and re-fetches via browser Supabase client.

The hook is complete but unused: session/81's rewrite of `CommunityServiceDetailPageClient` dropped it.

---

## Root Cause

**L1 Proven (confirmed via UAT)**: Two compounding issues:

1. **Server-side Supabase client does not carry user auth context** — queries execute effectively as anon, so only `review_status = 'approved'` RLS clause passes. Admin/owner clauses never evaluate to true server-side.
2. **`notFound()` call kills the request** — when the server query returns null (non-approved CS), the server page calls `notFound()` instead of passing null to the client. The client never gets a chance to fetch with the browser's actual user session.

**Not a Supabase/RLS issue**: The policies are correct. The admin clause, owner clause, and provider-owner clause all work — but only client-side where `auth.uid()` resolves to the logged-in user.

**Why providers work**: The provider detail page passes nullable `initialData` to the client → client uses `useProvider()` React Query hook → hook fetches via browser Supabase client (with real session) → admin/owner RLS clauses succeed.

---

## System Weaknesses

| # | Weakness | Risk Mechanism |
|---|----------|---------------|
| W1 | CS detail page has no client-side fetch fallback | Server-side auth failures cause hard 404 instead of graceful client-side retry |
| W2 | Session/81 client rewrite was taken during rebase without restoring Plan 082 React Query pattern | Architectural pattern lost during merge conflict resolution |
| W3 | Provider and CS detail pages have divergent resilience patterns | Creates a false sense of CS detail working during tests with approved data |
| W4 | No integration test covers non-approved CS visibility for admin/owner | Regression went undetected through 891-test suite |
| W5 | Server-side Supabase client auth propagation is opaque | No logging or health check for whether server-side queries run with anon vs authenticated context |

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | ~~What is the `review_status` of the reported CS?~~ | **CLOSED** — UAT confirmed pending CS invisible, approved CS visible | N/A | N/A |
| 2 | Why does `createSupabaseServerClient()` not propagate auth cookies? | Does not block fix (client-side fallback bypasses issue) | Investigate cookie adapter for completeness; may affect other server-fetched pages | Future analysis |
| 3 | Are there other pages that use `notFound()` with server-side Supabase and could have the same vulnerability? | Does not block fix | `grep -rn "notFound()" src/app/` to audit all notFound usages | Planner scope check |

---

## Analysis Recommendations

1. **Restore the Plan 082 resilient pattern** on CS detail page: remove `notFound()`, change `CommunityServiceDetailPageClient` to accept nullable prop, re-integrate `useCommunityService()` React Query hook (already exists at `src/hooks/useCommunityServices.ts`)
2. **Match the provider architecture exactly**: `page.tsx` passes nullable `initialData` → client uses React Query hook → browser Supabase client has actual session → admin/owner RLS clauses work
3. **Add regression test**: A test that verifies CS detail page does NOT call `notFound()` when server data is null (test already exists — just needs restoration: `src/__tests__/app/community-service-detail-page.server-path.test.tsx`)
4. **Scope check**: Audit other pages for the same `notFound()` + server-side-only pattern to prevent repeat across the codebase
