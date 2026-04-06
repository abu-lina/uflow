---
ID: 085
Origin: 085
UUID: b4e9c7a3
Status: Released
---

# Plan 085 — Fix Profile Navigation Links

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Plan ID        | 085                                                                    |
| Target Release | Next available patch after v0.10.14 (current origin/main); confirm at DevOps Stage 1 |
| Epic Alignment | Profile UX — Content Management                                       |
| Related Issues | https://github.com/abu-lina/uflow/issues/125                          |
| Classification | Bugfix                                                                 |
| Pipeline       | Abbreviated                                                            |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/128                          |
| Created        | 2026-04-06T16:40Z                                                      |

## Changelog

| Date (UTC)          | Agent   | Action                  | Detail                                              |
| ------------------- | ------- | ----------------------- | --------------------------------------------------- |
| 2026-04-06T16:40Z   | planner | Created plan            | From Analysis 085 RCA findings                      |

---

## Value Statement and Business Objective

**As a provider owner**, I want to click my providers in the Profile page and land on their public detail page, so that I can view my content without hitting a 404 or being silently redirected.

---

## Release Strategy

Standalone (no other known plans for v0.10.15).

---

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| D1 | Provider card clicks navigate to public detail `/providers/:id`, not profile-scoped `/profile/providers/:id` | [RESOLVED] — public route has permissive RLS and middleware exemption; profile-scoped detail is owner-only and fails in early-access mode |
| D2 | Recommendation card clicks navigate to public detail `/providers/:id`, not edit page `/profile/providers/:id/edit` | [RESOLVED] — card click should show detail; edit intent requires explicit edit button inside detail page |
| D3 | Desktop "created" tab provider cards get `onClick` to `/providers/:id` | [RESOLVED] — parity with mobile behavior; documented as desirable in Critique 057 F3 |
| D4 | Community service "Service nicht gefunden" is OUT OF SCOPE | [RESOLVED] — RLS data-access issue (DF-1 from Plan 082), not a navigation bug; tracked separately |
| D5 | Edit-flow internal links (`ProviderEditPage`, `ProviderEditForm`, `ProfileProviderDetailButtons`, `ProfileProviderDetailPage`) remain unchanged | [RESOLVED] — these navigate within the `/profile/providers/` route tree for owner editing |
| D6 | `navigationUtils.ts` references remain unchanged | [RESOLVED] — layout/footer visibility rules, not navigation links |

---

## Objective

Fix 3 broken provider navigation links and add 1 missing click handler in `ProfileContent.tsx` so all provider cards in the profile page navigate to the correct public detail page.

---

## Scope

### In Scope

- Fix 3 incorrect `router.push` paths in `ProfileContent.tsx`
- Add 1 missing `onClick` handler to desktop "created" tab provider cards
- Add regression tests for navigation link correctness

### Out of Scope

- Community service "Service nicht gefunden" (RLS issue — DF-1 from Plan 082)
- Edit-flow internal links (5 files — deliberately untouched)
- `navigationUtils.ts` layout visibility rules
- Any UI/layout changes

---

## Assumptions

1. The public provider detail route `/providers/:id` is the correct destination for all profile card clicks (confirmed by issue #125)
2. Plan 082 M8 RLS fix is already deployed to origin/main (confirmed — commit a2c00f3b)
3. No middleware changes are needed — the `/providers/:id` route is already exempted

---

## Milestones

### M1: Fix Provider Navigation Links

**Objective**: Correct all provider card navigation targets in `ProfileContent.tsx`.

**Tasks**:

1. **Fix Mobile "Deine Inhalte" provider card** (line 548)
   - Change: `/profile/providers/${provider.provider_id}` → `/providers/${provider.provider_id}`

2. **Fix Mobile Recommendations provider card** (line 593)
   - Change: `/profile/providers/${provider.provider_id}/edit` → `/providers/${provider.provider_id}`

3. **Fix Desktop Recommendations provider card** (line 885)
   - Change: `/profile/providers/${provider.provider_id}/edit` → `/providers/${provider.provider_id}`

4. **Add Desktop Created tab provider card click handler** (lines ~790-795)
   - Add: `onClick={() => router.push(`/providers/${provider.provider_id}`)}`

**File touched**: `src/app/(public)/profile/ProfileContent.tsx` (single file, 4 changes)

**Acceptance Criteria**:
- All provider cards in profile page (mobile + desktop, "Deine Inhalte" + "Recommendations" + "Created") navigate to `/providers/:id`
- No edit-flow internal links are modified
- No `navigationUtils.ts` changes

---

### M2: Regression Tests

**Objective**: Add tests that verify the navigation links call `router.push` with the correct paths, preventing future regression.

**Tasks**:

1. Create test file verifying profile page provider card `onClick` handlers produce `/providers/:id` paths (not `/profile/providers/:id`)
2. Cover both "Deine Inhalte" and "Recommendations" sections
3. Verify the old (broken) path pattern is NOT used

**Acceptance Criteria**:
- Tests pass with the fix applied
- Tests would FAIL if someone reverts to the old `/profile/providers/:id` pattern
- Tests use client-state precedence pattern: name clearly as `[pre-fix FAILS]` / `[post-fix PASSES]`

---

### M3: Version Management

**Objective**: Update version artifacts to match target release.

**Tasks**:
1. Bump `package.json` version
2. Add CHANGELOG.md entry describing the fix
3. Commit with conventional message

**Acceptance Criteria**:
- `package.json` version matches target release
- CHANGELOG entry references Plan 085 and GitHub issue #125

---

## Testing Strategy

- **Unit/Component tests**: Regression tests for `router.push` call arguments in `ProfileContent.tsx` provider cards (M2)
- **Existing tests**: `profile-providers-server-path.test.tsx` should continue passing (not affected)
- **Manual UAT**: Verify on mobile UAT that clicking a provider card from "Deine Inhalte" opens `/providers/:id` detail page

---

## Duration Estimates

| Phase          | Estimate  | Uncertainty |
| -------------- | --------- | ----------- |
| Planning       | 15 min    | Low         |
| Implementation | 30 min    | Low — 4 line changes in one file |
| Testing        | 30 min    | Low — focused regression tests |
| Code Review    | 15 min    | Low         |
| QA             | 15 min    | Low         |
| DevOps         | 15 min    | Low         |
| **Total**      | **~2 hrs** | Low overall |

---

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Changing navigation target breaks user expectation of landing on owner-view | Low | Low | Public detail page is the standard UX; owner edit is accessible from within detail page |
| R2 | Desktop "Created" onClick addition has unintended side effects | Low | Low | `SelectableCard` already supports `onClick` prop in other sections |

---

## Handoff Notes

- **Single file change**: All fixes are in `src/app/(public)/profile/ProfileContent.tsx`
- **DO NOT TOUCH**: `ProviderEditPage.tsx`, `ProviderEditForm.tsx`, `ProfileProviderDetailPage.tsx`, `ProfileProviderDetailButtons.tsx`, `navigationUtils.ts`
- **Regression test pattern**: Use client-state precedence naming (`[pre-fix FAILS]` / `[post-fix PASSES]`)
- **Community service "Service nicht gefunden"**: Explicitly OUT OF SCOPE — this is DF-1 from Plan 082 (RLS issue)
