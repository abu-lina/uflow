---
ID: 085
Origin: 085
UUID: b4e9c7a3
Status: Planned
---

# Analysis 085 — Profile Navigation Links: Root Cause Analysis

## Changelog

| Date (UTC) | Agent Handoff | Request | Summary |
|------------|---------------|---------|---------|
| 2026-04-06T12:00Z | Orchestrator → Analyst | GitHub issue #125 RCA | 3 broken provider links in ProfileContent.tsx; community service links route correctly but may hit RLS wall |

## Value Statement and Business Objective

**As a provider owner or recommender**, I need to click my providers/community services in the profile page and land on their correct detail pages, so that I can view and manage my content without errors.

## Objective

Identify all broken navigation links in the profile page "Deine Inhalte" and "Recommendations" sections, classify root causes, and produce a complete list of affected call-sites for the Planner.

## Context

- Reported on UAT: `https://uat.ummahflow.com/profile`
- Issue symptoms: (1) provider cards navigate to `/profile/providers/:id` → 404; (2) community service links → "Service nicht gefunden" toast
- Prior art: Critique 057 F2 documented this exact navigation table; Analysis 083 identified the RLS server-import bug (fixed in Plan 082 M8)

## Methodology

- App Router directory inspection (confirm route existence)
- Code path tracing of all `router.push` calls in `ProfileContent.tsx`
- Cross-reference with middleware redirect logic
- Prior art review (Critique 057, Analysis 083)

---

## Findings

### F1: "Deine Inhalte" Provider Cards Navigate to Wrong Route (L1 Proven)

**Confidence**: L1 Proven — direct code inspection of `ProfileContent.tsx` line 548.

**Evidence**: Mobile "Deine Inhalte" section:
```typescript
// Line 548 — BROKEN
onClick={() => router.push(`/profile/providers/${provider.provider_id}`)}
```

The route `/profile/providers/[provider_id]/page.tsx` EXISTS in the App Router and renders a `ProfileProviderDetailPage` with owner-specific edit/delete buttons. The page was fixed for RLS in Plan 082 M8 (imports from `@/services/providers.server`).

**Why it 404s on UAT**: Two possible mechanisms:
- **(A) RLS for non-approved providers** (L2 Observed): If the provider has `review_status != 'approved'` and the server-side Supabase client's cookie context fails to resolve the owner's session, `getProviderById()` returns null → `notFound()` triggers → 404. This was the exact bug of Analysis 083 F1, fixed by switching to `providers.server`. If the UAT deployment includes Plan 082 M8, this should be resolved for properly authenticated owners.
- **(B) Middleware redirect in early-access mode** (L2 Observed): When `isAppLaunched = false` (the default), the middleware's `shouldRedirectToWaitlist()` redirects `/profile/providers/:id` to `/providers` (the list page) for non-admin users. The path starts with `/profile` (an APP_ROUTE), and there is **no special-case exemption** for `/profile/providers/` in `middleware-utils.ts` (unlike `/providers/` and `/community-services/` which are exempted at lines 179–184). This causes a redirect to the providers LIST page, not a 404 per se — but may be interpreted as "page not found" by the user.

**Intended fix per issue #125**: Change navigation to `/providers/:id` (public detail page). This resolves both mechanisms: the public route has a permissive RLS policy (`USING(true)`) and is exempted from middleware redirect.

**Affected code location**: `src/app/(public)/profile/ProfileContent.tsx` line 548

---

### F2: "Recommendations" Provider Cards Navigate to Edit Page (L1 Proven)

**Confidence**: L1 Proven — direct code inspection.

**Evidence**: Two locations navigate recommendations to the EDIT page instead of the public detail page:

```typescript
// Line 593 — Mobile Recommendations
onClick={() => router.push(`/profile/providers/${provider.provider_id}/edit`))

// Line 885 — Desktop Recommendations (SelectableCard)
onClick={() => router.push(`/profile/providers/${provider.provider_id}/edit`))
```

Clicking a recommendation card should show the detail page. The edit route (`/profile/providers/:id/edit`) exists and works for authenticated owners, but this is the wrong UX — a card click should show the detail, not jump directly to edit. This matches the expected behavior documented in Critique 057 F2.

**Intended fix**: Change both to `/providers/:id`.

**Affected code locations**:
- `src/app/(public)/profile/ProfileContent.tsx` line 593 (mobile)
- `src/app/(public)/profile/ProfileContent.tsx` line 885 (desktop)

---

### F3: Desktop "Created" Tab Provider Cards Have No Click Handler (L1 Proven)

**Confidence**: L1 Proven — direct code inspection of lines ~790-795.

**Evidence**: The desktop "created" tab renders `SelectableCard` for providers WITHOUT an `onClick` prop:
```typescript
// Lines ~790-795 — Desktop Created tab
<SelectableCard
  key={provider.provider_id}
  bottomText={address}
  category={getCategoryName(provider.category)}
  imageUrl={getProviderImageUrl(provider)}
  title={provider.provider_name}
  // NO onClick — cards are not navigable
/>
```

This was documented in Critique 057 F3 as "LOW severity, adding click navigation is likely desirable."

**Intended fix**: Add `onClick={() => router.push(`/providers/${provider.provider_id}`)}`.

**Affected code location**: `src/app/(public)/profile/ProfileContent.tsx` lines ~790-795

---

### F4: Community Service Links Route Correctly but May Hit RLS Wall (L2 Observed)

**Confidence**: L2 Observed — route path is correct; "Service nicht gefunden" is a data-level issue.

**Evidence**: All community service links navigate to `/community-services/:id`:
- Mobile "Deine Inhalte" (line ~560): `/community-services/${communityService.community_service_id}` ✅ route exists
- Mobile Recommendations (line ~603): `/community-services/${communityService.community_service_id}` ✅ route exists
- Desktop Created (line ~808): `/community-services/${communityService.community_service_id}` ✅ route exists
- Desktop Recommendations (line ~900): `/community-services/${communityService.community_service_id}` ✅ route exists

The "Service nicht gefunden" error is NOT a routing bug. The `CommunityServiceDetailPageClient` shows a not-found state when the React Query hook returns null data. This can occur due to:
- RLS policy for community services is more restrictive than providers (requires `review_status = 'approved'` OR owner match)
- Deferred gap DF-1 from Plan 082: recommendation-mode services with `user_created_id = NULL` are invisible to non-admin users

**Scope decision for Planner**: This is a data-access (RLS) issue, NOT a navigation link issue. It should be tracked separately from the link fixes.

---

### F5: Internal Edit-Flow Links Are Correct — Do NOT Change (L1 Proven)

**Confidence**: L1 Proven — these are internal navigation within the `/profile/providers/` route tree.

The following files use `/profile/providers/:id` or `/profile/providers/:id/edit` for legitimate edit-flow navigation:

| File | Line | Pattern | Purpose |
|------|------|---------|---------|
| `ProfileProviderDetailPage.tsx` | 59 | `/profile/providers/:id/edit` | "Edit" button on owner detail view |
| `ProfileProviderDetailButtons.tsx` | 104 | `/profile/providers/:id/edit` | "Edit" action button |
| `ProviderEditPage.tsx` | 18, 27 | `/profile/providers/:id` | "Back" from edit → detail |
| `ProviderEditForm.tsx` | 92, 317 | `/profile/providers/:id/edit` | Sub-page base URL, save success redirect |

These are internal to the `/profile/providers/` route tree and should NOT be changed.

---

### F6: `navigationUtils.ts` References Are Correct — Do NOT Change (L1 Proven)

**Confidence**: L1 Proven — these are layout/footer/navbar visibility rules.

Four references in `src/utils/navigationUtils.ts` use `/profile/providers/` to hide footer/navbar on profile provider detail/edit pages:
- Line 209: `shouldShowMobileFooter` footer-excluded patterns (Stage 3)
- Line 252: `shouldShowMobileFooter` footer-excluded patterns (early access)
- Line 318: `isProviderDetailPage` check
- Line 378: `shouldShowCityEarlyAccessNavbar` excluded patterns

These are layout-control patterns, not navigation links. They should remain unchanged.

---

### F7: Existing Tests Verify Server-Import Path — Not Affected (L1 Proven)

**Confidence**: L1 Proven — test file verified.

`src/__tests__/app/profile-providers-server-path.test.tsx` tests the Plan 082 M8 RLS fix (server import). These tests import the page modules directly and are not affected by navigation link changes. No tests need to be modified for this fix.

New tests SHOULD be added for the navigation link behavior (regression tests verifying `router.push` is called with correct paths).

---

## Summary of Affected Call-Sites (Fix Required)

| # | File | Line | Current Path | Correct Path | Section |
|---|------|------|-------------|--------------|---------|
| 1 | `ProfileContent.tsx` | 548 | `/profile/providers/:id` | `/providers/:id` | Mobile "Deine Inhalte" |
| 2 | `ProfileContent.tsx` | 593 | `/profile/providers/:id/edit` | `/providers/:id` | Mobile Recommendations |
| 3 | `ProfileContent.tsx` | 885 | `/profile/providers/:id/edit` | `/providers/:id` | Desktop Recommendations |
| 4 | `ProfileContent.tsx` | ~790 | _(no onClick)_ | `/providers/:id` | Desktop Created (add new) |

## Files NOT to Change

| File | Reason |
|------|--------|
| `ProfileProviderDetailPage.tsx` | Internal edit-flow nav |
| `ProfileProviderDetailButtons.tsx` | Internal edit-flow nav |
| `ProviderEditPage.tsx` | Internal edit-flow nav |
| `ProviderEditForm.tsx` | Internal edit-flow nav |
| `navigationUtils.ts` | Layout/footer visibility rules |
| `profile-providers-server-path.test.tsx` | Tests server import, unrelated |

---

## System Weaknesses

| # | Weakness | Risk Mechanism |
|---|----------|----------------|
| W1 | No regression test for profile page navigation targets | Navigation can silently break without detection |
| W2 | Middleware has no exemption for `/profile/providers/` | In early-access mode, profile provider detail pages are redirected even for authenticated users |
| W3 | Community service RLS is more restrictive than providers | Owner-created CS with `user_created_id = NULL` (recommendation-mode) are invisible — deferred DF-1 from Plan 082 |

## Instrumentation Gaps

| # | Gap | Type | Purpose |
|---|-----|------|---------|
| I1 | No navigation tracking for profile card clicks | Debug | Would help detect broken nav links in production |

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Status |
|---|---------|---------|-----------------|--------|
| 1 | Community service "Service nicht gefunden" — is this RLS or data issue? | No — separate from nav links | Investigate community_services RLS policy for owner-created services | Deferred — matches DF-1 from Plan 082 |
| 2 | Should desktop "created" community service cards also get click handlers? | No — they already have them | Verified: desktop CS cards at line ~800 have `onClick` to `/community-services/:id` | Resolved |

---

## Analysis Recommendations

1. **Fix scope is minimal**: 3 line changes + 1 new onClick handler, all in `ProfileContent.tsx`
2. **Add regression tests**: Test that `router.push` is called with `/providers/:id` (not `/profile/providers/:id`) for provider cards in both "Deine Inhalte" and "Recommendations" sections
3. **Community service "Service nicht gefunden" is OUT OF SCOPE**: This is an RLS/data issue (DF-1 from Plan 082), not a navigation issue. Track separately
4. **Middleware exemption for `/profile/providers/` is NOT needed if links change to `/providers/:id`**: The fix makes this moot since users will navigate to `/providers/:id` which is already exempted
