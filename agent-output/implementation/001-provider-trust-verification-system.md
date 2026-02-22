---
ID: 001
Origin: 001
UUID: ab8a542e
Status: Active
---

# Implementation: Provider Trust & Verification System (Plan 001)

## Plan Reference

- Active replan: agent-output/planning/001-provider-trust-verification-system-replan.md
- Superseded plan (archived): agent-output/planning/closed/001-provider-trust-verification-system.md
- Architecture gates: agent-output/architecture/001-provider-trust-verification-architecture-findings.md
- Analysis (archived): agent-output/analysis/closed/001-epic-2-1-technical-unknowns-analysis.md

## Date

- 2026-01-27

## Changelog

| Date       | Handoff/Request                            | Summary                                                                              |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| 2026-01-27 | User approved plan + chose background mode | Start implementation in git worktree; prioritize gates F1–F3                         |
| 2026-01-27 | Open questions resolved                    | No default badges for new providers; proceed with plan recommendations for items 2–5 |
| 2026-01-28 | Gates F1–F3 implemented                    | RLS hardening, unified role authority, DB-ranked unified search with trust scoring   |

## Implementation Summary

**Gates F1–F3 completed** (2026-01-28):

- **F1 (Privacy)**: Removed public `confirmation_count` exposure via column-level REVOKE; hardened RLS policies to restrict `badge_confirmations` SELECT to own rows only; created public-safe badge reader `getBadgesForEntityPublic()` that never selects sensitive fields.
- **F2 (Role Authority)**: Created `public.is_admin_or_moderator()` helper function; migrated all RLS admin checks from `auth.users.raw_user_meta_data->>'role'` to unified `public.users.role` via the helper.
- **F3 (DB-Side Ranking)**: Implemented `search_unified_entities_enhanced()` RPC with trust scoring (`UMMAH_FLOW_VERIFIED=100`, `COMMUNITY_CONFIRMED=50`, `SELF_DECLARED=10`); integrated into `searchBoth()` replacing client-side sorting; ensures stable pagination via deterministic ORDER BY.

**Next**: UI badge display components (Phase 1, Task 1.1)

## Milestones Completed

- [x] F1 privacy gate implemented (RLS hardening + column-level privilege revocation)
- [x] F2 role authority gate implemented (unified role helper function)
- [x] F3 DB-side ranking gate implemented (unified search RPC with trust scoring)
- [ ] UI badge display + endorsement flows implemented
- [x] Tests added and passing (service layer)

## Files Modified

| Path                        | Change                                                                                                                                  | Lines |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `src/services/badges.ts`    | Added `getBadgesForEntityPublic()`, removed confirmation_count from all public selects, updated admin functions to use aggregate counts | ~100  |
| `src/services/providers.ts` | Integrated unified search for 'both' strategy, replaced client-side sorting with DB-ranked results                                      | ~50   |
| `src/types/badges.ts`       | Made `confirmation_count` optional to reflect privacy contract                                                                          | ~5    |

## Files Created

| Path                                                                 | Purpose                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `supabase/migrations/027_unified_search_and_trust_privacy_gates.sql` | RLS hardening, role helper function, unified search RPC with trust scoring     |
| `src/services/unifiedSearch.ts`                                      | Unified search service (DB-ranked), hydration function for full entity details |
| `src/__tests__/services/unifiedSearch.test.ts`                       | TDD test for unified search RPC integration                                    |
| `src/__tests__/services/publicBadges.test.ts`                        | TDD test for privacy-safe badge fetch                                          |
| `src/__tests__/services/hydrateSearch.test.ts`                       | Test for search result hydration with badges                                   |

## Code Quality Validation

- [ ] Type-check: `npm run type-check`
- [ ] Lint: `npm run lint`
- [ ] Tests: `npm run test`

## Value Statement Validation

**Original**: Trust signals are credible and privacy-safe so users confidently choose providers.

**Implementation delivers**: TBD (filled after gates + UI work complete)

## TDD Compliance

| Function/Class                     | Test File                                      | Test Written First? | Failure Verified? | Failure Reason                                 | Pass After Impl? |
| ---------------------------------- | ---------------------------------------------- | ------------------- | ----------------- | ---------------------------------------------- | ---------------- |
| `searchUnifiedEntitiesWithTrust()` | `src/__tests__/services/unifiedSearch.test.ts` | ✅ Yes              | ✅ Yes            | Vite import resolution failed (module missing) | ✅ Yes           |
| `getBadgesForEntityPublic()`       | `src/__tests__/services/publicBadges.test.ts`  | ✅ Yes              | ✅ Yes            | TypeError: export not a function               | ✅ Yes           |
| `hydrateUnifiedSearchResults()`    | `src/__tests__/services/hydrateSearch.test.ts` | ✅ Yes              | ✅ Yes            | Next.js cookie context error (test env)        | ✅ Yes           |

## Test Coverage

- Unit: TBD
- Integration: TBD

## Test Execution Results

| Command                                                       | Result                     |
| ------------------------------------------------------------- | -------------------------- |
| `npx vitest run src/__tests__/services/ --reporter=dot --run` | ✅ 3 files, 4 tests passed |
| `npm run type-check`                                          | ✅ Pass (no errors)        |

## Resolved Open Questions (User Answers)

1. Badge Assignment for New Providers: **No default badges** (start with zero)
2. Endorsement Limits: **Agreed** (start per-session, monitor)
3. Badge Removal: **Agreed** (provider can remove before threshold; after threshold requires admin)
4. Trust Level Downgrade: **Agreed** (automatic downgrade if confirmations drop)
5. SEO Impact: **Agreed** (add structured data later)

## Flowbaby Memory Status

- Flowbaby retrieve/store currently failing due to workspace daemon being managed by another VS Code window; operating in no-memory mode until resolved.

## Outstanding Items

- TBD

## Next Steps

- Implement gates F1–F3 in code + DB migrations
- Hand off to QA after tests are green
