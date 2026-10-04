---
ID: 083
Origin: 082
UUID: d7f2a41c
Status: Planned
---

# Analysis 083 — UAT Findings: Profile Provider RLS + Admin CS Edit Route

## Changelog

| Date (UTC) | Agent Handoff | Request | Summary |
|------------|---------------|---------|---------|
| 2026-04-06T00:15Z | QA Phase 2 → Analyst | UAT findings from Plan 082 deployment | 2 issues: profile provider RLS import bug (F1) + missing admin CS edit route (F2) |
| 2026-04-06T01:30Z | planner | Status → Planned | F1 → Plan 082 M8; F2 → Plan 083 |

## Value Statement and Business Objective

**As an admin or service owner**, I need to edit my own providers from the profile page and edit community services from the admin dashboard, so that content management flows work end-to-end without hitting 404 or error walls.

## Objective

Investigate two UAT-surfaced issues blocking full Plan 082 acceptance, determine root causes, and provide factual findings for the Planner to revise Plan 082 scope.

## Context

- Plan 082 (v0.10.10) deployed to UAT at `https://uat.ummahflow.com` from `session/81-community-service-open` (commit f286a7fb)
- MW-1 (CS detail renders) ✅ PASS, MW-2 (design parity) ✅ PASS, MW-3 (admin button visible) ✅ PASS
- Two issues surfaced during manual UAT:
  1. Owner cannot open their own provider from profile: `https://uat.ummahflow.com/profile/providers/746ddf80-70ce-421f-85b1-6a82d78f185b`
  2. Admin clicking CS edit button hits 404: `https://uat.ummahflow.com/dashboard/community-services/25cdd3af-18cb-48b4-849d-95fcb39bf609/edit`

## Methodology

- Code path tracing of affected Server Components
- Import graph analysis (client vs server Supabase module usage)
- App Router directory structure inspection
- Comparison with working patterns (Plan 081 fix, admin provider edit page)

---

## Findings

### F1: Profile Provider Pages Use Client Supabase Module in Server Components (L1 Proven)

**Confidence**: L1 Proven — verified by direct code inspection; identical bug pattern as Plan 081 root cause.

**Affected files**:
- `src/app/(public)/profile/providers/[provider_id]/page.tsx` (line 5)
- `src/app/(public)/profile/providers/[provider_id]/edit/page.tsx` (line 4)

**Evidence**:
Both files import `getProviderById` from `@/services/providers` (client module). In a Server Component, this creates an anonymous Supabase client that fails RLS checks for non-approved records, even when the owner is authenticated.

**Current code** (both files):
```typescript
import { getProviderById } from '@/services/providers';
// + hard notFound() gate:
const provider = await getProviderById(provider_id);
if (!provider) return notFound();
```

**Working pattern** (fixed in Plan 081 for `/providers/[id]/page.tsx`):
```typescript
import { getProviderById } from '@/services/providers.server';
```

**Impact**: Owner sees 404 when navigating to their own non-approved provider from the profile page. Both `/profile/providers/[id]` (detail) and `/profile/providers/[id]/edit` (edit form) are affected.

**Fix complexity**: Low — 2-line import change per file, same pattern as Plan 081. `providers.server.ts` already exports `getProviderById` with the correct server Supabase client.

---

### F2: Admin Community Service Edit Route Does Not Exist (L1 Proven)

**Confidence**: L1 Proven — verified by `file_search` returning no results for `**/dashboard/community-services/**`.

**Evidence**:
- `AdminCommunityServiceDetailButtons` (created in Plan 082 CR fix) routes to `/dashboard/community-services/${communityServiceId}/edit`
- No directory exists at `src/app/(dashboard)/dashboard/community-services/`
- No admin API route exists for fetching/editing community services (only `api/admin/providers/[id]`)
- The dashboard layout (`src/app/(dashboard)/layout.tsx`) gates on `isAdminOrModerator`

**Impact**: Admin clicking the "Service bearbeiten" button on a community service detail page sees a 404.

**Scope assessment for a full admin CS edit page**:

| Component | Provider Equivalent | Exists for CS? | Effort |
|-----------|-------------------|----------------|--------|
| Dashboard page (`/dashboard/community-services/[id]/edit/page.tsx`) | `AdminProviderEditPage` (~285 lines) | ❌ | High — must adapt provider edit form for CS fields |
| Admin API GET (`/api/admin/community-services/[id]`) | `GET /api/admin/providers/[id]` | ❌ | Medium — admin bypass for RLS, UUID validation |
| Admin API PATCH (`/api/admin/edit-community-service`) | `PATCH /api/admin/edit-provider` | ❌ | High — CS has different editable fields |
| Admin API review (`/api/admin/review-community-service`) | `PATCH /api/admin/review-provider` | ❌ | Medium — approve/reject workflow |
| Admin service layer (`services/admin/communityServices.ts`) | `services/admin/providers.ts` + `providerEdit.ts` | ❌ | Medium |
| Edit form component | `ProviderEditForm` (~400 lines) | ❌ Needs CS-specific form | High |
| Sub-pages (category, images, offers, needs, social) | 5 sub-pages under `/edit/` | ❌ | Med-High per page |

**Key architectural finding**: The `community_services` table has many of the same fields as `providers` (name, description, images, address, contact, social, offers, needs, category) plus CS-specific fields (`is_verified`, `verified_at`, `verified_by`, `donation_count`, `community_service_logo`). A CS edit form could potentially reuse `ProviderEditForm` with adaptations, but the data structure differences (e.g., `community_service_name` vs `provider_name`, `community_service_images` vs `provider_images`) require a mapping layer.

**Alternative approaches**:
1. **Full CS admin edit page** (user's choice) — mirrors provider admin edit with CS-specific fields
2. **Reuse ProviderEditForm with adapter** — lower effort if field mapping is clean
3. **Simple read-only + approve/reject** — minimal viable: show CS details + approve/reject buttons without full edit

---

## System Weaknesses

| # | Weakness | Risk Mechanism |
|---|----------|----------------|
| W1 | Server Components have no lint rule enforcing `.server` imports | Any new SSR page can silently import client Supabase module |
| W2 | No admin CRUD surface for community services | As CS count grows, admins cannot moderate without DB access |
| W3 | `AdminCommunityServiceDetailButtons` routes to non-existent page | Users experience dead-end 404 on click |

## Instrumentation Gaps

| # | Gap | Type | Purpose |
|---|-----|------|---------|
| I1 | No structured log when profile provider fetch returns null under RLS | Normal | Would distinguish RLS-caused null from genuinely missing provider |
| I2 | No admin audit log for CS moderation actions | Normal | Required for compliance when CS admin edit is built |

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | How many profile routes use client imports in Server Components? | Low | Grep audit `from '@/services/...'` (not `.server`) in all `page.tsx` under `(public)` | Planner scope check |
| 2 | Can `ProviderEditForm` be reused for CS editing? | Medium | Field mapping analysis: CS fields vs Provider fields | Planner architecture decision |
| 3 | What CS-specific fields need admin editing? | Medium | Product decision: which CS fields are editable by admin | User/Product Owner |

---

## Analysis Recommendations

1. **F1 fix should be included in Plan 082 revision** — same bug class as Plan 081, 2-line import fix, no new architecture needed.
2. **F2 (admin CS edit page) requires a Planner scoping decision** — the user has requested a full admin CS edit page. The Planner should assess whether to:
   - Add milestones to Plan 082, or
   - Create a new Plan 083 (recommended if scope is large)
3. **W1 (lint rule)**: Consider adding an ESLint rule to flag `@/services/*` (non-`.server`) imports in files under `src/app/` that are Server Components (no `'use client'` directive). This is a systemic weakness that will recur.
4. **Gap audit**: Before closing F1, trace all `page.tsx` under `src/app/(public)/` for the same client import pattern to prevent recurrence.

---

## Next Steps

→ Handoff to Planner to revise Plan 082 with:
- F1: Profile provider import fix (low effort, same pattern)
- F2: Full admin CS edit page (high effort, new milestones)
- Gap audit of all Server Component imports
