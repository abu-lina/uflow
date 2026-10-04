---
ID: 081
Origin: 081
UUID: c7e3a91d
Status: Committed
Target Release: 0.10.9 (patch release; DevOps confirms at Stage 1)
Related Issues: None (reported via internal testing, screenshots in session S81)
---

# Plan 081 — Fix Community Service Detail Page Server Component Crash

## Changelog

| Date | Agent | Event |
|------|-------|-------|
| 2026-04-05T18:15Z | analyst | RCA complete — L1 Proven: wrong Supabase client in Server Component |
| 2026-04-05T18:30Z | planner | Plan created from analysis 081 |
| 2026-04-05T19:00Z | critic | APPROVED with condition: F1 Risk #1 misdescription (offers/needs, not badges) |
| 2026-04-05T19:10Z | planner | Revised: corrected Risk #1, Assumption 3, Assumption 4 per critique F1+F2 |
| 2026-04-05T19:25Z | implementer | Implementation started (M1-M4) |
| 2026-04-05T20:05Z | code-reviewer | Code Review APPROVED_WITH_COMMENTS — no blocking defects |
| 2026-04-05T20:50Z | qa | QA Complete — All automated gates pass; manual workflows deferred to UAT |
| 2026-04-05T20:55Z | uat | UAT APPROVED FOR RELEASE — Value statement delivered; all predecessors pass; ready for DevOps |
| 2026-04-05T20:20Z | code-reviewer | Code Review Approved; no blocking defects found |

## Value Statement and Business Objective

**As a** community service owner, **I want to** open my own community services from the Profile screen without errors, **so that** I can view and optionally edit my content — a core owner workflow that is currently broken in production.

## Release Strategy

Standalone (no other known active plans targeting the same version).

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| D1 | Fix scope: change import in the crashing page from client module to existing `.server` module | [RESOLVED] — server module already implements identical API with correct auth context and PGRST116 handling |
| D2 | Harden the sibling Server Component (`providers/[provider_id]/page.tsx`) with the same fix | [RESOLVED] — latent risk; providers work only because of permissive `USING(true)` SELECT RLS; fix now to prevent future breakage |
| D3 | Scope limited to import fixes; no RLS policy changes | [RESOLVED] — RLS is correct; the bug is application-layer (wrong client) |
| D4 | Entity ownership: applies to all community services regardless of ownership | [RESOLVED] — the SELECT RLS already handles owner/admin/public visibility; the fix only ensures the server-side query carries the user's auth context |
| D5 | No new `.server.ts` functions needed | [RESOLVED] — both `getCommunityServiceById` and `getCommunityServicesForProvider` are already exported from `communityServices.server.ts`; `getProviderById` from `providers.server.ts` |

## Objective

Fix the Server Component render crash on `/community-services/[community_service_id]` and harden the analogous `/providers/[provider_id]` route by switching from client-side Supabase imports to the existing server-side modules that carry proper auth context.

## Assumptions

1. The `.server.ts` modules use `createSupabaseServerClient()` which reads cookies via `next/headers`, preserving auth context in Server Components. **Verified in code.**
2. The `communityServices.server.ts` `getCommunityServiceById` returns the same shape (`CommunityService | null`) as the client module — verified, including parallel offers/needs fetch.
3. The `providers.server.ts` `getProviderById` returns the same shape (`Provider | null`) as the client module — verified. The server version DOES fetch badges (via `getBadgesForEntityServer`) but does NOT resolve offer/need names (no parallel offers/needs fetch). The client version fetches offers, needs, AND badges. Implementer must address this gap to avoid initial-render regression (see Risk #1).
4. For `communityServices`, no other Server Component pages import runtime functions from the client module beyond the two identified files. For `providers`, additional server-side imports exist (`providers/page.tsx`, `profile/providers/[provider_id]/edit/page.tsx`, `profile/providers/[provider_id]/page.tsx`, `api/providers/search/route.ts`) but are not in scope for this bugfix (covered by Risk #2).

## Plan

### Milestone 1 — Fix the crashing community service detail page

**Objective**: Eliminate the Server Component crash by switching to the authenticated server-side Supabase client.

**Tasks**:
1. In `src/app/(public)/community-services/[community_service_id]/page.tsx`, change the import of `getCommunityServiceById` from `@/services/communityServices` to `@/services/communityServices.server`.
2. Verify the `CommunityService` type import — the server module re-exports the type from the client module, so `CommunityServiceDetailPageClient` props remain compatible.

**Acceptance Criteria**:
- Owner can open their own non-approved community service from the Profile page without error.
- Approved community services remain viewable by anonymous/non-owner users.
- No TypeScript compilation errors.

### Milestone 2 — Harden the provider detail page (latent risk)

**Objective**: Prevent the same class of bug from manifesting if provider RLS policies are ever tightened.

**Tasks**:
1. In `src/app/(public)/providers/[provider_id]/page.tsx`, change the import of `getCommunityServicesForProvider` from `@/services/communityServices` to `@/services/communityServices.server`.
2. In the same file, change the import of `getProviderById` from `@/services/providers` to `@/services/providers.server`.
3. Confirm type compatibility between server and client versions of `getProviderById`. The server version lacks parallel offers/needs name resolution (badges ARE present). Implementer must add offers/needs fetching to `providers.server.ts` `getProviderById` to match the client version's return shape, OR accept the 5-minute stale-data window where React Query's `initialData` is used without offer/need labels.

**Acceptance Criteria**:
- Provider detail page continues to render correctly for all users.
- No TypeScript compilation errors.
- No runtime regressions on provider detail view.

### Milestone 3 — Regression tests

**Objective**: Ensure the bug path is covered by tests that prevent regression.

**Tasks**:
1. Add a focused logic test for the community service detail page that verifies the import resolves to the server module (or mock-verifies that `createSupabaseServerClient` is called, not the browser client).
2. If existing tests import from the client module in server-side test contexts, update them accordingly.

**Acceptance Criteria**:
- At least one test exercises the community service detail page data-fetch path using the server client.
- Tests pass: `npm test`.

### Milestone 4 — Build verification and version management

**Objective**: Confirm clean build and prepare release artifacts.

**Tasks**:
1. Run `npm run type-check` — zero errors.
2. Run `npm run build` — successful standalone build.
3. Run `npm test` — all tests pass.
4. Update `package.json` version to the confirmed release version (DevOps Stage 1).
5. Add CHANGELOG.md entry documenting the fix.

**Acceptance Criteria**:
- `tsc`, build, and test gates all pass.
- CHANGELOG entry reflects: "Fix: Community service detail page crash for owners viewing non-approved services".
- Version in `package.json` matches the target release.

## Testing Strategy

- **Unit/logic tests**: Focused test verifying the server-side fetch path for community service detail page (Milestone 3). TDD pre-fix / post-fix pattern recommended given this is a bugfix.
- **Integration**: Build verification (`npm run build`) confirms no SSR import errors.
- **Manual UAT**: Owner opens non-approved community service from Profile → page renders. Owner opens approved community service → page renders. Anonymous user opens approved community service → page renders.
- **Regression scope**: Provider detail page remains functional after Milestone 2 changes.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `providers.server.ts` `getProviderById` returns different shape (missing offers/needs name resolution) | Medium | Medium — initial render for up to 5 min shows provider without offer/need labels until React Query refetches from client module | Implementer adds parallel offers/needs fetch to `providers.server.ts` `getProviderById` (preferred), OR documents the regression as accepted |
| Other Server Components or API routes import from client modules | Low | Medium | Audit in this session found only 2 files; systemic fix deferred if more found |
| Community service is actually approved and crash has different cause | Low | High | Analysis was L1 Proven; if hypothesis fails, escalate back to Analyst |

## Duration Estimates

| Phase | Estimate | Uncertainty |
|-------|----------|-------------|
| Implementation (M1+M2) | 15–30 min | Low — single-line import changes |
| Regression tests (M3) | 30–60 min | Medium — depends on existing test infrastructure |
| Build verification (M4) | 15–30 min | Low |
| QA / UAT | 30–60 min | Low — focused manual checks |
| **Total** | **1.5–3 hours** | |

## Validation & Rollback

- **Validation**: Build passes, tests pass, manual UAT confirms owner can open community services.
- **Rollback**: Revert the import change (single commit). No database or infrastructure changes.
- **Handoff notes**: This is a 2-file import fix with a regression test. No migrations, no config changes, no env var changes.
