---
ID: 123
Origin: 123
UUID: 4f8e1a2c
Status: Released
---

# Plan 123 — Iteration 2 Fix: Profile Route Middleware Exemption

| Field          | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| Plan ID        | 123 (Iteration 2)                                                         |
| Target Release | v0.12.8 (next patch after v0.12.7; confirm at DevOps Stage 1)            |
| Epic Alignment | Core UX — Auth State Reactivity                                           |
| Related Issues | Continuation of GitHub issue for Plan 123 original fix (#213)             |
| Classification | Bugfix                                                                    |
| Pipeline       | Focused (Planner → Critic → Implementer → QA → DevOps)                  |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/215                             |
| Created        | 2026-05-04T19:55Z                                                         |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-05-04T10:55Z | devops | Created tracker from DF-1 deferred validation in UAT report |
| 2026-05-04T19:55Z | Planner | Converted to Iteration 2 fix plan after user confirmed DF-1 real-device test failed; root cause F6 identified by Analyst; Iteration 2 fix scoped |
| 2026-05-04T20:07Z | Implementer | Implementation started: entered TDD RED phase with failing middleware exemption regression tests |
| 2026-05-04T20:19Z | Code Reviewer | Code review complete; implementation approved and handed off to QA |
| 2026-05-04T20:24Z | QA | QA Complete — all automated gates pass; 4/4 regression tests PASS; 1243 full test suite PASS; version artifacts aligned to 0.12.8; no stale references; approved for UAT/DevOps |
| 2026-05-04T20:25Z | UAT | UAT Complete — value statement delivered; middleware exemption resolves bug; minimal risk; APPROVED FOR RELEASE; ready for DevOps Stage 1 |

---

## Context: Original DF-1 Item

Plan 123 (v0.12.7) fixed the auth race condition (premature `router.push` before auth context commit) and deferred real-device PWA validation as DF-1. The user has now confirmed: **after login, clicking the profile icon in the navbar still does not work — a full reload is required.**

The Analyst (Iteration 2 RCA, `agent-output/analysis/123-navbar-auth-state-rca.md` Rev 0.2) has identified the new root cause as **F6**: the Next.js Edge middleware in `src/middleware.ts` → `src/lib/middleware-utils.ts` redirects all `/profile` requests to `/providers` when `isAppLaunched = false`, for all non-admin users. This is independent of the auth race condition fixed in Iteration 1.

The Iteration 1 fix was correct; it was masked by this middleware blocker.

---

## Value Statement and Business Objective

**As a** logged-in user on UmmahFlow (early access mode, non-admin),  
**I want** to navigate to `/profile` by clicking the profile icon in the navbar,  
**so that** I can access my profile page without being silently redirected away or needing to reload the app.

**Business impact**: Every non-admin user in the current production configuration (`isAppLaunched = false`) is unable to access their profile page via client-side navigation after login. The middleware silently redirects to `/providers`. This renders the authentication UX broken for the entire user base in early access mode.

---

## Release Strategy

Standalone (no other known plans for v0.12.8). This is a targeted hotfix follow-on to v0.12.7.

---

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| D-I2-1 | Fix approach: add `/profile` special case exemption to `shouldRedirectToWaitlist` in `src/lib/middleware-utils.ts`, same pattern as the existing `/saved` exemption | [RESOLVED] Minimal, targeted fix at the confirmed root cause location. The `/profile` route's `ProfileContent` component already handles unauthenticated access by redirecting to `/login` — the middleware guard is redundant and harmful. |
| D-I2-2 | Scope: single-file change to `src/lib/middleware-utils.ts` only | [RESOLVED] No other files need to change for this fix. The middleware is the only layer blocking `/profile`. No Supabase, no React context, no auth provider changes. |
| D-I2-3 | Also exempt `/profile/*` subpaths (e.g. `/profile/edit`, `/profile/delete`) | [RESOLVED] Consistent with how `/providers/*` and `/saved` are handled — the middleware should not gate access to sub-routes when the page itself enforces auth. |
| D-I2-4 | Do NOT remove `/profile` from `APP_ROUTES` | [RESOLVED] `APP_ROUTES` controls which routes are `isAppRoute()` — removing from there changes other middleware behavior. The exemption in `shouldRedirectToWaitlist` is the correct and minimal change. |
| D-I2-5 | Regression tests: add middleware-utils unit test for `/profile` exemption | [RESOLVED] Pure function — easily testable without server. Write tests for `shouldRedirectToWaitlist('/profile', false)` with and without valid `accessToken` for admin vs regular user. |

---

## Assumptions

1. `isAppLaunched` is `false` on the user's test environment (UAT and production in current early access phase). This is consistent with `defaultFeatureFlags` (hardcoded `false`) and no `NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED=true` env var. If `isAppLaunched` were `true`, F6 would not apply and this plan would need a different root cause investigation.
2. The user reporting the bug is not an admin/moderator. If they were admin, the middleware would allow access via `isAdminOrModerator` check (with a valid `sb-access-token` cookie). The middleware redirect to `/providers` is the symptom described — consistent with a non-admin user.
3. `ProfileContent`'s own `useEffect` guard (`!loading && !effectiveUser → router.replace('/login')`) is sufficient to protect the profile page for unauthenticated access. Removing the middleware guard for `/profile` does not create a security or functional regression.
4. The Iteration 1 fix (auth race condition, v0.12.7) is correctly applied and tagged. This iteration builds on top of it.

---

## Schema Mutation Inventories

Not applicable — no schema changes in this plan.

---

## Removal Surface Enumeration

Not applicable — no capability is being removed. Access to `/profile` is being restored.

---

## Milestone Dependencies

Single milestone — no dependency graph needed.

---

## Baseline & Measurements

No performance or latency measurements required for this fix. Success is binary: navigate to `/profile` after login → page renders vs redirect to `/providers`.

---

## Milestones

### M1: Add `/profile` Middleware Exemption

**Objective**: Exempt `/profile` (and subpaths) from the `shouldRedirectToWaitlist` redirect in `src/lib/middleware-utils.ts`, using the same pattern as the `/saved` exemption.

**Files affected**:
- `src/lib/middleware-utils.ts` — add special case comment+block inside `shouldRedirectToWaitlist`

**Write inventory** (files that write/filter on the middleware exemption logic):
- `src/lib/middleware-utils.ts` — `shouldRedirectToWaitlist` — the change target
- `src/middleware.ts` — calls `shouldRedirectToWaitlist`; no change needed

**Read inventory** (files that read `/profile` routing via middleware-utils):
- `src/__tests__/` — any existing middleware-utils tests must be reviewed and updated

**What the change does**:

Inside `shouldRedirectToWaitlist`, before the final `return true` (redirect), add a special case block for `/profile` routes:

> **ILLUSTRATIVE ONLY** — Implementer decides exact placement and phrasing:
>
> ```
> // Special case: Allow access to /profile (and subpaths) in early access mode
> // ProfileContent and its sub-components handle authentication checks directly.
> // They redirect unauthenticated users to /login via their own useEffect guard.
> if (!isAppLaunched && (pathname === '/profile' || pathname.startsWith('/profile/'))) {
>   return false;
> }
> ```

**Acceptance criteria**:
- `shouldRedirectToWaitlist('/profile', false, undefined, undefined)` returns `false` (not a redirect)
- `shouldRedirectToWaitlist('/profile/edit', false, undefined, undefined)` returns `false`
- `shouldRedirectToWaitlist('/profile/delete', false, undefined, undefined)` returns `false`
- All previously exempted routes still behave as before (no regression)
- After login, clicking the profile icon navigates to `/profile` and the page renders
- Unauthenticated users clicking the profile icon are redirected to `/login` (by `ProfileContent`'s guard, not middleware)

---

### M2: Regression Tests

**Objective**: Add unit tests for the middleware-utils `shouldRedirectToWaitlist` function covering the new `/profile` exemption.

**Files affected**:
- Existing or new file in `src/__tests__/` for middleware-utils

**What to test**:
- `[post-fix PASSES]` — `shouldRedirectToWaitlist('/profile', false)` returns `false` (not redirected)
- `[post-fix PASSES]` — `shouldRedirectToWaitlist('/profile/edit', false)` returns `false`
- `[post-fix PASSES]` — `shouldRedirectToWaitlist('/profile', false)` returns `false` regardless of `accessToken` presence (exemption is unconditional for regular users)
- `[regression guard]` — `shouldRedirectToWaitlist('/providers', false)` still returns `false` (existing exemption not broken)
- `[regression guard]` — `shouldRedirectToWaitlist('/saved', false)` still returns `false` (existing exemption not broken)
- `[regression guard]` — `shouldRedirectToWaitlist('/admin', false)` still returns `true` (non-exempted route still blocked)

**Acceptance criteria**:
- Tests named with `[pre-fix FAILS]` (if retroactively demonstrable) or `[post-fix PASSES]` pattern per copilot-instructions
- Tests cover the `/profile` exemption and confirm no regression on adjacent routes

---

### M3: Version Management

**Objective**: Update release artifacts to v0.12.8.

**Tasks**:
- Update `package.json` version: `0.12.7` → `0.12.8`
- Add CHANGELOG entry: "Fixed `/profile` route inaccessible after login — middleware was redirecting non-admin users to `/providers` in early access mode"
- Run `npm install --package-lock-only` to align lockfile
- Commit message references Plan 123 Iteration 2

**Acceptance criteria**:
- `package.json` version = `0.12.8`
- CHANGELOG entry present under new version heading
- Lockfile aligned
- `npm run type-check`, `npm run lint`, `npm test -- --run` all pass

---

## State-Machine Coverage

The middleware's two paths for `/profile` when `isAppLaunched = false`:

| Path | Pre-fix | Post-fix |
|------|---------|---------|
| Non-admin user, no `sb-access-token` cookie → `/profile` | Redirect to `/providers` ❌ | Return `false` (allow); `ProfileContent` redirects to `/login` ✓ |
| Non-admin user, valid `sb-access-token`, not admin → `/profile` | Redirect to `/providers` ❌ | Return `false` (allow); `ProfileContent` renders ✓ |
| Admin user, valid `sb-access-token`, `isAdminOrModerator = true` → `/profile` | Allow (existing path) ✓ | Allow (same path; no regression) ✓ |
| Any user, `isAppLaunched = true` → `/profile` | Allow (short-circuits at top) ✓ | Allow (unchanged) ✓ |

All paths confirmed not broken.

---

## Testing Strategy

**Test types**: Unit tests (Vitest) on `shouldRedirectToWaitlist` pure function in `middleware-utils.ts`.

**Coverage expectations**:
- The function is pure (async only due to admin check) — test the synchronous `/profile` exemption branch directly
- Mock `validateUser` and `isAdminOrModerator` if needed, or test the pure sync path only (exemption fires before admin check)
- No browser or server integration tests needed — the exemption is purely structural

---

## Duration Estimates

| Phase | Estimate | Uncertainty |
|-------|----------|-------------|
| Implementation (M1) | 15–30 min | Very Low — single special-case block, ~5 lines |
| Tests (M2) | 30–45 min | Low — pure function unit tests |
| Code Review | 15 min | Low — tiny changeset |
| QA | 30 min | Low — automated only; manual validation is DF-1 resolution |
| DevOps (M3) | 20 min | Low — standard version bump |

**Total**: 2 hours end-to-end

---

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | `isAppLaunched` is `true` on test env — F6 is not the actual blocker | Low | Medium | If `true`, bug is different. Analyst gap G5 addresses this — user should verify `.env.local` / UAT env. |
| R2 | User is admin — middleware was allowing access anyway via cookie path | Low | Low | If admin, profile was always reachable. Non-admin symptom must have different cause. |
| R3 | ProfileContent's redirect guard is too aggressive for unauthenticated access | Low | Low | Existing guard `!loading && !effectiveUser` is already in production with no complaints. No change needed. |

---

## Validation

- `npm run type-check` passes
- `npm test -- --run` passes (including new M2 regression tests)
- `npm run lint` passes
- `npm run build` passes
- Manual UAT test (DF-1 closure): login on mobile PWA → click profile icon → profile page renders without redirect

---

## DF-1 Status

| Item | Owner | Status |
|---|---|---|
| **DF-1**: Real PWA runtime validation | User / DevOps | **Converted to Iteration 2 fix** — root cause identified (F6). Fix in this plan. Closure evidence: profile page renders after login without redirect, on real device. |
