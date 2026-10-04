---
ID: 081
Origin: 081
UUID: c7e3a91d
Status: Planned
---

# 081 — Community Service Detail Page Server Component Crash

## Changelog

| Date | Event |
|------|-------|
| 2026-04-05 | Analysis started. RCA complete (L1 Proven). |

## Value Statement & Business Objective

Logged-in users cannot view or edit their own community services from the Profile screen. This blocks the core owner workflow (create → view → edit) and erodes trust in the platform.

## Context

- **Reporter**: User (Naveed, naveed@yaneel.com)
- **Environment**: Production (ummahflow.com)
- **Symptom**: Tapping any community service under "Deine Inhalte" on the Profile page shows "Something went wrong! An error occurred in the Server Components render."
- **Affected route**: `/community-services/[community_service_id]`
- **Working comparison**: Provider detail pages (`/profile/providers/[provider_id]`) work for the same user.

## Methodology

- Upstream code tracing from Profile click handler → route → Server Component → service function → Supabase query → RLS policy
- Comparative analysis: providers (working) vs community services (broken)
- Migration chain tracing for RLS policies on `community_services` table

## Findings

### F1 — Wrong Supabase client in Server Component (L1 Proven)

**File**: `src/app/(public)/community-services/[community_service_id]/page.tsx` (line 4)

```typescript
import { getCommunityServiceById } from '@/services/communityServices';
```

This Server Component imports from `communityServices.ts` (the **client** module), which uses:

```typescript
// src/services/communityServices.ts line 1
import { supabase } from '@/lib/supabase/client';
```

The `@/lib/supabase/client` module creates a Supabase client via `createClient()` from `@supabase/supabase-js` — a generic client with **no cookie/session support**. On the server, this client has no `auth.uid()` context; all queries execute as anonymous.

A correct server-side module **already exists** but is unused:

```typescript
// src/services/communityServices.server.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
```

This module uses `createServerClient` from `@supabase/ssr` with a `cookieAdapter` that reads `next/headers` cookies, preserving the user's auth session on the server.

### F2 — RLS policy blocks anonymous reads of non-approved services (L1 Proven)

**Migration**: `047_production_fix_rls_policies.sql` (active SELECT policy)

```sql
CREATE POLICY "Anyone can view community services" ON public.community_services
  FOR SELECT USING (
    review_status = 'approved'                          -- anon: only approved
    OR ((select auth.uid()) IS NOT NULL AND user_created_id = (select auth.uid()))  -- owner: any status
    OR ((select auth.uid()) IS NOT NULL AND provider_id IN (...))                   -- provider owner
    OR EXISTS (... role IN ('admin', 'moderator'))                                  -- admin
  );
```

For anonymous access (no `auth.uid()`), only `review_status = 'approved'` rows are visible. Community services with status `pending`, `needs_revision`, `rejected`, or `removed_by_owner` are invisible to the anonymous Supabase client used by the Server Component.

### F3 — Client module lacks PGRST116 error handling (L1 Proven)

**File**: `src/services/communityServices.ts` (line 178–226)

The client module's `getCommunityServiceById` uses `.single()` and throws on ALL errors:

```typescript
const { data, error } = await supabase.from('community_services')
  .select('*, category:categories(name_de, name_en)')
  .eq('community_service_id', id)
  .single<CommunityService>();

if (error) { throw error; }  // <-- throws PGRST116 (zero rows)
```

The server module (`communityServices.server.ts`) correctly handles this:

```typescript
if (error) {
  if (error.code === 'PGRST116') { return null; }  // <-- graceful null
  throw error;
}
```

### F4 — Providers work because of permissive SELECT RLS (L1 Proven)

**Migration**: `026_add_select_policy_for_providers.sql`

```sql
CREATE POLICY "Allow public read of providers" ON public.providers
  FOR SELECT TO PUBLIC USING (true);
```

Providers have a fully permissive SELECT policy (`USING(true)`) — any client can read any provider, regardless of auth or review status. This is why `/profile/providers/[id]` works with the same client-side Supabase pattern.

### F5 — Profile page loads via authenticated client-side context (L1 Proven)

The Profile page (`ProfileContent.tsx`, line 279–286) fetches community services via `useQuery` → `getCreatedCommunityServices(effectiveUser.id)`. This runs in the browser where the Supabase client has `persistSession: true` and holds the user's auth cookies. RLS allows the owner to see their own services regardless of status.

When the user taps on a community service, `router.push('/community-services/[id]')` triggers a server-side render of the detail page — where the auth context is lost because the wrong Supabase client is used.

## Root Cause

**Crash sequence** (L1 Proven — complete code path trace):

1. User on Profile page sees their community service (e.g., "Umma Moschee") with `review_status != 'approved'` (loaded via client-side auth)
2. User taps → `router.push('/community-services/{id}')`
3. Server Component executes `getCommunityServiceById(id)` from **client** module
4. Client module queries Supabase with anon client (no `auth.uid()`)
5. RLS policy: `review_status = 'approved'` → FALSE; `auth.uid() IS NOT NULL` → FALSE → **row invisible**
6. `.single()` returns 0 rows → Supabase error PGRST116
7. `getCommunityServiceById` catches error, re-throws (no PGRST116 handling)
8. Server Component render crashes → Next.js production error page

**Note**: If the community service IS approved, the page would render successfully with anon permissions. The bug manifests specifically for non-approved services viewed by their owner.

## Affected Code Locations

| File | Line | Issue |
|------|------|-------|
| `src/app/(public)/community-services/[community_service_id]/page.tsx` | 4 | Imports from client module instead of `.server` module |
| `src/services/communityServices.ts` | 178–226 | No PGRST116 handling in `getCommunityServiceById` |
| `src/services/communityServices.server.ts` | 20–73 | **Correct** implementation exists, unused by the page |

## Systemic Observation

The same client-module-in-Server-Component pattern exists in other pages (`src/app/(public)/providers/[provider_id]/page.tsx`). These haven't crashed only because the providers table has a fully permissive SELECT policy. If provider RLS is ever tightened (e.g., adding `review_status` filtering), those pages would exhibit the same crash.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Exact `review_status` of "Umma Moschee" and "Wüstenkind e.V." | No DB access in analysis | Query `SELECT review_status FROM community_services WHERE community_service_name IN ('Umma Moschee', 'Wüstenkind e.V.')` to confirm | Planner/Impl |
| 2 | Are all other Server Components using client Supabase at risk? | Not fully audited | Audit all `src/app/**/page.tsx` files importing from `@/services/*.ts` (non-.server) | Planner |

## Analysis Recommendations

1. **Confirm the hypothesis** (if DB access available): Query the actual `review_status` of the affected community services. If they are non-approved, this fully confirms the L1 finding. If they ARE approved, investigate whether a different error path is triggered (escalate to L3).
2. **Audit scope**: Check all Server Component pages for client-module imports that could break under restrictive RLS. Prioritize `src/app/(public)/providers/[provider_id]/page.tsx` which uses the same pattern.
3. **Do NOT widen provider SELECT RLS** without first fixing the Server Component import pattern across the codebase.

## Open Questions

None blocking. RCA is complete pending Planner action.
