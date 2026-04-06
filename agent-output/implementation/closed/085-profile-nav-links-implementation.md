---
ID: 085
Origin: 085
UUID: b4e9c7a3
Status: Committed
---

# Implementation 085 — Fix Profile Navigation Links

## Plan Reference

`agent-output/planning/085-profile-nav-links-plan.md`

## Date

2026-04-06T19:00Z

## Changelog

| Date (UTC)        | Handoff              | Request              | Summary                                             |
| ----------------- | -------------------- | -------------------- | --------------------------------------------------- |
| 2026-04-06T17:00Z | Critic → Implementer | Execute Plan 085     | Implement all milestones; plan approved with 0 blocking findings |

---

## Implementation Summary

Fixed 3 broken `router.push` path expressions and added 1 missing click handler in `ProfileContent.tsx`. All provider cards in the profile page now navigate to `/providers/:id` (public detail page) instead of `/profile/providers/:id` or `/profile/providers/:id/edit`.

**Value delivery**: Provider owners and recommenders can now click their cards in the profile page and land on the correct public detail page without a 404 or middleware redirect.

---

## Milestones Completed

- [x] **M1**: Fixed 4 navigation targets in `ProfileContent.tsx` (3 path changes + 1 new onClick)
- [x] **M2**: Added 8 regression tests in `plan085-profile-nav-links.test.tsx` (all passing)
- [x] **M3**: Version bumped `0.10.13 → 0.10.15`; CHANGELOG entry added; lockfile aligned

---

## Files Modified

| Path | Changes | Lines |
|------|---------|-------|
| `src/app/(public)/profile/ProfileContent.tsx` | 3 path substitutions + 1 new onClick added | 548, 593, 790-795, 885 |
| `package.json` | Version `0.10.13` → `0.10.15` | 3 |
| `package-lock.json` | Lockfile aligned with version bump | — |
| `CHANGELOG.md` | Added `[0.10.15]` entry referencing Plan 085 and issue #125 | — |

## Files Created

| Path | Purpose |
|------|---------|
| `src/__tests__/regression/plan085-profile-nav-links.test.tsx` | Regression tests for Plan 085 — 8 tests covering all 4 fixed call-sites |

---

## Change Detail

### M1 — Navigation Link Fixes (ProfileContent.tsx)

| # | Section | Before | After |
|---|---------|--------|-------|
| 1 | Mobile "Deine Inhalte" (line 548) | `/profile/providers/${id}` | `/providers/${id}` |
| 2 | Mobile Recommendations (line 593) | `/profile/providers/${id}/edit` | `/providers/${id}` |
| 3 | Desktop Created tab (line ~790) | _(no onClick)_ | `onClick={() => router.push('/providers/${id})')}` |
| 4 | Desktop Recommendations (line 885) | `/profile/providers/${id}/edit` | `/providers/${id}` |

**Unchanged (per plan D5/D6)**:
- `ProviderEditPage.tsx`, `ProviderEditForm.tsx`, `ProfileProviderDetailPage.tsx`, `ProfileProviderDetailButtons.tsx` — internal edit-flow nav
- `navigationUtils.ts` — layout/footer visibility rules

---

## Code Quality Validation

- [x] `npm run lint` — exit 0 (0 errors, 21 pre-existing warnings; none in changed files)
- [x] `npm run type-check` — exit 0 (0 errors)
- [x] `npm test` (full suite) — 89 passed, 1 skipped, 0 failed (862 tests)
- [x] No new lint warnings introduced by this change

---

## Value Statement Validation

**Original**: *"As a provider owner, I want to click my providers in the Profile page and land on their public detail page, so that I can view my content without hitting a 404 or being silently redirected."*

**How implementation delivers**: All 4 broken provider card click handlers in `ProfileContent.tsx` now navigate to `/providers/:id`. The public detail route has permissive RLS (`USING(true)`) and is exempted from middleware redirects — eliminating both failure mechanisms identified in the analysis.

---

## Local Verification

**Local verification: ⚠️ Blocked** — build environment not available in this worker session (no `.env.local` with Supabase credentials for WAT); missing environment would prevent auth-gated profile page from rendering.

UAT verification is delegated to QA per standard pipeline.

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `ProfileContent` mobile "Deine Inhalte" click | `plan085-profile-nav-links.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `mockPush` called with `/profile/providers/prov-uuid-085` instead of `/providers/prov-uuid-085` | ✅ Yes |
| `ProfileContent` mobile Recommendations click | `plan085-profile-nav-links.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `mockPush` called with `/profile/providers/prov-uuid-085/edit` instead of `/providers/prov-uuid-085` | ✅ Yes |
| `ProfileContent` desktop Recommendations click | `plan085-profile-nav-links.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `mockPush` called with `/profile/providers/prov-uuid-085/edit` instead of `/providers/prov-uuid-085` | ✅ Yes |
| `ProfileContent` desktop Created tab click | `plan085-profile-nav-links.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `mockPush` called 0 times (no onClick handler existed) | ✅ Yes |

_Bugfix regression exception applied: no new API surface, no new functions/classes. All 4 rows have verified pre-fix failure reasons and post-fix passing evidence._

---

## Test Execution Results

| Command | Result | Notes |
|---------|--------|-------|
| `node_modules/.bin/vitest run src/__tests__/regression/plan085-profile-nav-links.test.tsx` (pre-fix) | 8 FAIL | Correct pre-fix failures: wrong paths or 0 calls |
| `node_modules/.bin/vitest run src/__tests__/regression/plan085-profile-nav-links.test.tsx` (post-fix) | **8 PASS** | All nav link assertions green |
| `node_modules/.bin/vitest run` (full suite) | **89 passed, 1 skipped, 0 failed** | 862 tests; no regressions |

---

## Version Management

| Artifact | Before | After |
|----------|--------|-------|
| `package.json` version | `0.10.13` | `0.10.15` |
| `package-lock.json` version | `0.10.13` | `0.10.15` |
| CHANGELOG entry | — | `[0.10.15] - 2026-04-06` |

**Note**: Version bumped to `0.10.15` (preliminary — final version confirmed at DevOps Stage 1).

---

## Assumption Documentation

| Assumption | Rationale | Risk | Validation |
|------------|-----------|------|------------|
| `/providers/:id` is the intended destination for profile card clicks | Confirmed by issue #125 and Analysis 085 F1 | Low | UAT will verify |
| Desktop "Created" tab provider cards should have onClick (new behavior) | Critique 057 F3 documented this as desirable; parity with mobile | Low | UAT will verify |
| Community service links in same sections are unaffected | All 4 CS link paths already resolve to `/community-services/:id` (RLS issue is data-side, not routing) | Low | Confirmed by analysis |

---

## Outstanding Items

- The CS "Service nicht gefunden" error (DF-1 from Plan 082) is deliberately out of scope — tracked in `agent-output/planning/082-open-actions.md`
- 21 pre-existing lint warnings (none in changed files) remain; not introduced by this plan

---

## Next Steps

→ QA validates implementation
→ UAT: Navigate to `/profile` in UAT, click a provider card in "Deine Inhalte" — should open `/providers/:id` without 404
