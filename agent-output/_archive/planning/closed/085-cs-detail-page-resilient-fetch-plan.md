---
ID: 085
Origin: 085
UUID: c7b4e2a9
Status: Committed for Release v0.10.16
---

# Plan 085 — Restore Resilient Fetch Pattern on CS Detail Page

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Plan ID        | 085                                                                    |
| Target Release | next available patch after current origin/main v0.10.15; confirm at DevOps Stage 1 |
| Epic Alignment | Community Service Detail Parity (Plan 082 continuation)                |
| Related Issues | Analysis 085 (`agent-output/analysis/085-cs-detail-page-404-analysis.md`) |
| Classification | Bugfix                                                                 |
| Pipeline       | Abbreviated (Planner → Critic → Implementer → QA → DevOps)            |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/130                          |
| Created        | 2026-04-07T15:30Z                                                      |

## Changelog

| Date               | Agent   | Change                                      |
| ------------------- | ------- | ------------------------------------------- |
| 2026-04-07T15:30Z  | Planner | Initial plan created from Analysis 085      |
| 2026-04-07T16:20Z  | Code Reviewer | Code review completed — APPROVED_WITH_COMMENTS |
| 2026-04-07T06:25Z  | QA | QA phase complete — all gates pass, 891 tests pass, 0 regressions |
| 2026-04-07T06:30Z  | UAT | Value statement validated — APPROVED FOR RELEASE |

## Value Statement and Business Objective

As an **admin or community service owner**, I want to **view community service detail pages regardless of their `review_status`** (pending, rejected, etc.), so that **admins can review/approve/reject services and owners can see their own submissions** — matching the existing resilient provider detail page pattern.

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| D1 | Match provider detail page architecture (nullable initialData → React Query client-side fallback) | [RESOLVED] — proven pattern in `ProviderDetailPageClient` since Plan 081 |
| D2 | Reuse existing `useCommunityService()` hook from `src/hooks/useCommunityServices.ts` (Plan 082 M2) | [RESOLVED] — hook is complete and tested, just unused |
| D3 | No Supabase/RLS changes needed | [RESOLVED] — RLS policies (migration 046) are correct; admin/owner clauses work client-side where `auth.uid()` resolves |
| D4 | Scope limited to CS detail page only; profile provider pages (`/profile/providers/[id]/...`) use `notFound()` correctly behind auth guards | [RESOLVED] — those pages are dashboard-scoped with session-required middleware |
| D5 | `CommunityServiceNotFound` component shown only after client-side fetch confirms null (not on server-side null) | [RESOLVED] — mirrors provider pattern: `if (error \|\| !provider) return notFound()` after React Query resolves |

## Release Strategy

Standalone (no other known non-closed plans targeting the next patch after v0.10.15).

## Assumptions

1. The `useCommunityService()` hook at `src/hooks/useCommunityServices.ts` is fully functional (created by Plan 082 M2, uses `getCommunityServiceById` from client-side `communityServices.ts`)
2. The client-side Supabase client properly carries the user's auth session (proven by provider pages working for admin/owner)
3. `CommunityServiceDetailModal` and `ProviderDetailPageComponent` can accept the same data shape when service is non-null (no changes to downstream components needed)
4. This fix ships on the existing `session/83-community-edit-ui` branch (or a new branch from `main` — implementer decides)

## Plan

### Milestone 1: Restore Server Page Nullable Pattern

**Objective**: Remove `notFound()` from CS server page and pass nullable data to client, mirroring the provider server page.

**What to change in** `src/app/(public)/community-services/[community_service_id]/page.tsx`:
- Remove the `notFound()` guard and the `notFound` import
- Pass `communityServiceId` as a prop (string, for client-side React Query)
- Pass `initialData` as nullable `CommunityService | null` (for SSR hydration when data exists)
- Conditionally render `ImagePreloader` only when `initialData` is non-null (already guarded)

**Reference pattern**: `src/app/(public)/providers/[provider_id]/page.tsx` — passes `initialData={provider}` (nullable) and `providerId={provider_id}` (string).

**Acceptance criteria**:
- Server page never calls `notFound()`
- Props passed to client: `communityServiceId: string`, `initialData: CommunityService | null`
- `ImagePreloader` only renders when `initialData` is non-null
- Comment "Do NOT call notFound() here" is honored (code matches comment)

### Milestone 2: Refactor Client Page to Use React Query Hook

**Objective**: Change `CommunityServiceDetailPageClient` to accept nullable `initialData` and use `useCommunityService()` for client-side fetching with the browser's auth session.

**What to change in** `src/app/(public)/community-services/[community_service_id]/CommunityServiceDetailPageClient.tsx`:
- Change props interface from `{ communityService: CommunityService }` to `{ communityServiceId: string; initialData?: CommunityService | null }`
- Import and call `useCommunityService({ communityServiceId, initialData })` from `@/hooks/useCommunityServices`
- Add loading state (skeleton) when `isLoading && !initialData` — same pattern as `ProviderDetailPageClient`
- Add error/not-found state: `if (error || !communityService) return notFound()` — after React Query resolves, not before
- Use the resolved `communityService` from the hook (not from props) for rendering and `buildProviderShapeFromCommunityService`

**Reference pattern**: `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx` lines 66-96.

**Acceptance criteria**:
- Component uses `useCommunityService()` hook for data fetching
- Loading skeleton shown while fetching (when no initialData)
- `notFound()` called only after React Query confirms null (client-side fetch with user session)
- Admin users see non-approved CS (RLS admin clause evaluated client-side)
- Owners see their own non-approved CS (RLS owner clause evaluated client-side)
- `buildProviderShapeFromCommunityService` still exported for existing tests

### Milestone 3: Update Regression Test

**Objective**: Update the existing test at `src/__tests__/app/community-service-detail-page.server-path.test.tsx` to verify the new pattern.

**What to change**:
- The test currently asserts `notFound()` IS called when data is null — reverse this to assert `notFound()` is NOT called
- Add assertion that the server page passes nullable `initialData` and `communityServiceId` props to the client component
- Keep the test that verifies server module (not client module) is used for the initial fetch

**Acceptance criteria**:
- Test verifies server page does NOT call `notFound()` when `getCommunityServiceById` returns null
- Test verifies server page passes `communityServiceId` and nullable `initialData` to client
- Test verifies server module is used (not client module) — existing test, keep as-is

### Milestone 4: Version and Release Artifacts

**Objective**: Update version artifacts to match the target release.

**Tasks**:
- Update `package.json` version
- Update `CHANGELOG.md` with bugfix entry
- Commit with descriptive message

**Acceptance criteria**:
- Version matches target release
- CHANGELOG entry under `[vX.Y.Z]` describes the bugfix: "Fix community service detail page returning 404 for non-approved services when viewed by admin or owner"

## Duration Estimates

| Phase          | Estimate   | Uncertainty |
| -------------- | ---------- | ----------- |
| Planning       | 30 min     | Low         |
| Implementation | 1-2 hours  | Low — clear pattern to follow |
| QA             | 30 min     | Low — focused scope |
| DevOps         | 30 min     | Low — patch release |
| **Total**      | **2-4 hours** | |

## Testing Strategy

- **Unit tests**: Update existing server-path test (M3). Verify server page doesn't call `notFound()`. Verify client component handles null `initialData` gracefully.
- **Integration**: Existing 891-test suite must pass with zero regressions.
- **Manual/UAT**: Admin views non-approved CS → page loads (not 404). Owner views own non-approved CS → page loads.

## Risks

| # | Risk | Mitigation |
|---|------|------------|
| R1 | `useCommunityService()` hook may have an issue not caught by existing tests | Hook mirrors `useProvider()` exactly; both use the same React Query pattern |
| R2 | `CommunityServiceDetailModal` may not handle the loading→data transition | It receives data only after React Query resolves; same as provider modal pattern |
| R3 | Type changes to `CommunityServiceDetailPageClient` props may break other imports | Grep for all imports of the component — it's only imported by the server page |

## Validation

- `npm run type-check` — 0 errors
- `npm test` — all tests pass, 0 regressions
- Manual: admin views pending CS detail page → loads correctly
- Manual: owner views own pending CS detail page → loads correctly
- Manual: anonymous views approved CS detail page → loads correctly (SSR fast path)

## Handoff Notes

- **For Implementer**: Follow `ProviderDetailPageClient` as the exact reference. The `useCommunityService()` hook is already built — just wire it in.
- **For QA**: Focus regression on: (a) approved CS still loads for anonymous, (b) non-approved CS loads for admin, (c) non-approved CS loads for owner, (d) truly non-existent CS shows "not found" after client fetch.
