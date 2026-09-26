---
ID: 264
Origin: 264
UUID: 90270baf
Status: QA Complete
---

# Plan 264 — Restore authenticated provider submission (`POST /api/providers` 401)

| Field          | Value |
| -------------- | ----- |
| Plan ID        | 264 |
| Target Release | Pending untagged release on origin/main (currently `0.15.18`, co-ships with #263); confirm at DevOps Stage 1. If already tagged at Stage 1, use the next available patch |
| Epic Alignment | Provider onboarding / community recommendations (create flows, #255 → #262 → #263) |
| Related Issues | Plan 263 / PR #423 (regressing change, commit 7b03ba00); Analysis [264-admin-recommend-401-analysis.md](../analysis/closed/264-admin-recommend-401-analysis.md) |
| Classification | Bugfix |
| Pipeline       | Abbreviated |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/425 |
| Created        | 2026-09-26T16:08Z |

## Changelog

| Timestamp (UTC) | Agent | Change |
|---|---|---|
| 2026-09-26T16:08Z | Planner | Plan created from analysis 264 (L1 root cause). NO-MEMORY MODE (artifact-first). ID/Origin/UUID inherited; `.next-id` untouched (worker session). |
| 2026-09-26T16:12Z | Planner | GitHub issue created: https://github.com/abu-lina/uflow/issues/425. Analysis moved to `analysis/closed/` (Status: Planned). |
| 2026-09-26T16:55Z | Planner | Revised per Critique 264 (REVISION REQUESTED). M1: D3 now points to [264-open-actions.md](264-open-actions.md) with owners and triggers. L1: Target Release aligned with Release Strategy (pending untagged 0.15.18). L2: CSRF posture recorded in D4, plus an optional `sameSite` pin in M2. L3: refresh-token rotation risk added to Risks. |
| 2026-09-26T16:56Z | Implementer | Status → In Progress after user acknowledged D3 deferral. TDD regression reproduces cookie-synced POST returning 401 before implementation. |
| 2026-09-26T17:28Z | QA | QA complete | Regression suites, full tests, lint, type-check, and production build passed; ready for UAT value-delivery validation. |
| 2026-09-26 | Code Reviewer | Code Review REJECTED | Plan 264 core approved on merit. HIGH-1 (4 hardcoded chat labels) fixed in review. Open: HIGH-2, a hardcoded `Chat` h1 in `src/app/(public)/chat/page.tsx` with no key; add `chat.pageTitle` in 6 locales. See [code review](../code-review/264-admin-recommend-401-code-review.md). |
| 2026-09-26 | Code Reviewer | Re-review: still REJECTED | HIGH-2 resolved (`df36013d`). New HIGH-3: about 11 hardcoded German strings in `src/app/(public)/saved/page.tsx`. These are pre-existing, and the file is touched only by the lint prop reorder. Awaiting disposition: fix before UAT, or risk accepted plus a follow-up plan. |
| 2026-09-26 | Code Reviewer | Status -> Code Review Approved | Focused re-review confirmed HIGH-3 remediation in `saved/page.tsx`, 6 locale files, and new `saved` page i18n regression tests. Code review verdict updated to APPROVED_WITH_COMMENTS; handoff returned to QA. |
| 2026-09-26T18:04Z | QA | Status -> QA Complete | Post-review re-test passed: focused 26 tests, full 2,577 tests, type-check, lint, i18n parity, production build, and manifest integrity. Ready for UAT live admin/non-admin validation. |

## Value Statement and Business Objective

As a **logged-in user (any role, including admin)**, I want to **submit a provider recommendation or owner listing and have it saved**, so that **the directory keeps growing and my contribution is not silently lost behind a generic error toast**.

## Objective

Make `POST /api/providers` recognise the session a logged-in browser actually sends, so that every create flow succeeds again for authenticated users. Anonymous callers must still get 401. Also close the test gap that let the regression pass CI.

## Root Cause (from analysis, L1 Proven)

`POST /api/providers` was added in 7b03ba00 / #263. It checks the login with `createSupabaseServerClient().auth.getUser()`. That client reads an `@supabase/ssr` cookie named `sb`, and the app never writes that cookie. The browser's session reaches the server only as the `sb-access-token` / `sb-refresh-token` cookies (written by `/api/auth/set`), and only `getUserFromCookie()` reads those. As a result, every caller looks anonymous and gets 401. The route's unit tests mock `@/lib/supabase/server`, so they never exercised this contract.

## Scope

**In scope**
- The authentication gate in [src/app/api/providers/route.ts](../../src/app/api/providers/route.ts).
- Updating [src/app/api/providers/route.test.ts](../../src/app/api/providers/route.test.ts) so its auth mocking matches the new helper.
- A new regression test that crosses the real cookie → route-auth boundary.
- CHANGELOG entry.

**Out of scope**
- The client-side session model (`AuthSyncer`, `/api/auth/set`, the browser Supabase client).
- `createSupabaseServerClient` and `cookieAdapter` themselves.
- The F6 variant routes (`/api/instagram/scrape`, badges, push, city-interest, outreach/claim). These are deferred; see Decision Record D3.
- Any change to `create-provider.server.ts` write logic, payload schema, rate-limit values, or UI.

**Affected surfaces fixed by this plan** (all go through the same route; L1 by code):

| Surface | Caller |
|---|---|
| `/create/recommend` | `StreamlinedRecommendForm` |
| Import flow | `StreamlinedImportForm` |
| Unified create form | `UnifiedProviderCreateForm` |
| Owner flow `/create/media` | `create/media/page.tsx` |

Chat-driven registration is not affected. It authenticates via `getUserFromCookie()` in `/api/chat` and calls the server module directly.

## Decision Record

| # | Decision | Status |
|---|---|---|
| D1 | **Auth helper**: the route derives the actor with the existing `getUserFromCookie()` helper. Do not introduce a new auth abstraction. | [RESOLVED] It is the helper already used by 20+ authenticated routes (`/api/chat`, `/api/admin/*`, `/api/providers/search` status gate). It validates the token server-side against GoTrue `/auth/v1/user` (it doesn't just decode the JWT locally), and POC-C proved it resolves the user from exactly the cookies the browser carries. |
| D2 | **Scope**: fix `/api/providers` only. | [RESOLVED] This is the only route on the regressed `/create/*` submit path. The F6 routes carried the defect before #263, and none of them sits on the reported flow (`InstagramImport` is used only on `/create-quick`). |
| D3 | **F6 variant routes + dual session model (analysis W1/W2)** | [DEFERRED: tracked in [264-open-actions.md](264-open-actions.md). OA-1 (F6 routes): owner Planner (control window), trigger = Plan 264 UAT-approved **or** any 401 report from a listed route. OA-2 (session model): owner Architect, trigger = before OA-1 planning starts. Reason: systemic change to session handling, outside a bugfix's scope and risk budget] |
| D4 | **Security posture preserved**: anonymous → 401 before any admin-client resolution or write; actor comes only from the session, never from the body; strict body allowlist unchanged; rate limit still keyed on the session user id. **CSRF**: the route becomes cookie-authenticated and relies on the `SameSite=Lax` attribute that `/api/auth/set` sets (Lax cookies are not sent on cross-site POSTs), the same posture as every other cookie-auth route. Loosening that attribute would make this write route CSRF-able. | [RESOLVED] Restores intended #263 behaviour without weakening any gate. The CSRF dependency is recorded explicitly. |
| D5 | **Entity ownership**: no change to ownership semantics. Recommendation mode records the submitter as `user_created_id`. Owner mode sets `provider_owner_id` to the session user, as #263 already does. The plan only applies to newly created rows and never touches existing providers, claimed or unclaimed. | [RESOLVED] The fix changes only *which* user id is resolved (a real one instead of none), not how it is used. |
| D6 | **Observability**: no new instrumentation in this plan. | [RESOLVED] `getUserFromCookie()` already emits structured `auth_attempt` / `auth_outcome` warnings on a miss (analysis W4 / Normal-level signal), so D1 gives this for free. Alerting on 401 rates is deferred with D3. |
| D7 | **Release**: ship in the same untagged release as #263. | [RESOLVED] `git tag --contains 7b03ba00` returns no tags, so the regression has not reached a release tag. Fixing it before that release goes out avoids shipping a broken create flow. |

## Assumptions

- A1: UAT is running a build that includes 7b03ba00 (analysis G1). The risk is low, because `POST /api/providers` exists only from that commit on. This will be verified at UAT.
- A2: Production deploys from release tags, so production is not yet affected (analysis G4; L2 inference from `git tag --contains`). DevOps confirms at Stage 1.
- A3: Browsers that are logged in but have not synced (`AuthSyncer` not yet run) will still get 401. This is the correct fail-closed behaviour and not a regression. The client already shows the error toast.

## Plan

### Milestone 1 — Route derives the actor from the synced session cookie

**Objective**: A logged-in user's `POST /api/providers` is authenticated; anonymous callers are still rejected.

Steps:
1. In [src/app/api/providers/route.ts](../../src/app/api/providers/route.ts), replace the session lookup that uses `createSupabaseServerClient().auth.getUser()` with the shared `getUserFromCookie()` helper from `@/lib/supabase/getUserFromCookie`.
2. Keep the order of operations as it is: auth check → rate limit (keyed on the resolved user id) → body validation → media URL validation → server create.
3. Remove the now-unused server-client import from the route if nothing else in the file uses it.

Acceptance criteria:
- With the cookies written by `/api/auth/set` for a valid session, the route no longer returns 401. It proceeds to validation/creation and attributes the submission to that user's id.
- With no session cookies, or with an invalid or expired token that cannot be refreshed, the route returns 401 `{ error: 'Authentication required' }`. It makes no admin-client call and no write.
- The response contract for 400 / 429 / 500 / 200 is unchanged.
- `npm run type-check` and `npm run lint` are clean for the touched files.

### Milestone 2 — Regression coverage on the real bug path

**Objective**: CI fails if the cookie contract between `/api/auth/set` and the route's auth gate ever breaks again.

Steps:
1. Add a regression test (for example under `src/__tests__/regression/264-*`) that calls the **real** `POST /api/providers`. Stub only `next/headers` `cookies()`, global `fetch` (GoTrue responses), and `@/lib/supabase/admin`. **Do not mock** `@/lib/supabase/server`, `@/lib/supabase/getUserFromCookie`, or `@supabase/ssr`.
2. Name the cases so the bug is visible, following the Client-State Precedence pattern in the project instructions: `[pre-fix FAILS]` / `[post-fix PASSES]` for an authenticated, cookie-synced submission.
3. Pin the writer and reader together: derive the cookie names used in the test from the real `/api/auth/set` response, not from hard-coded strings. A rename on either side must then fail the test. Optionally, also assert that the synced cookies keep `sameSite: 'lax'`, which guards the CSRF dependency recorded in D4.
4. Update [src/app/api/providers/route.test.ts](../../src/app/api/providers/route.test.ts) so its existing actor-derivation, allowlist, rate-limit and orphan-cleanup cases mock the helper the route now uses. Their assertions and intent stay the same.
5. Run the analysis POC ([cookie-contract.poc.test.ts](../analysis/closed/264-poc/cookie-contract.poc.test.ts)) as a reference if it helps. Do **not** commit it under a vitest `include` path; the new regression test supersedes it.

Acceptance criteria:
- The new regression test fails on the pre-fix route (it gets 401) and passes after Milestone 1. Record both runs in the implementation doc.
- The anonymous → 401 case is covered by the same real-helper test.
- The full `npm test` suite, `tsc`, and lint are green. Record the evidence in `agent-output/implementation/264-*.md` along with the TDD Compliance table (see Bugfix Handoff Completeness).

### Milestone 3 — Update version and release artifacts

Steps:
1. Add a CHANGELOG entry under the pending release section: "Fix: logged-in users could not submit provider recommendations/listings (401 from `/api/providers`), regression from #263."
2. Leave the `package.json` version to DevOps Stage 1 (see Release Strategy).

Acceptance criteria:
- The CHANGELOG entry is present and references Plan 264.
- The version matches what DevOps confirms at Stage 1.

## Release Strategy

- `origin/main` `package.json` = **0.15.18**. The latest tag is **v0.15.17**, and no tag contains 7b03ba00.
- **Intended bundling**: ship with the pending untagged release that carries #255 / #262 / #263. This keeps a broken create flow out of any tagged release. If DevOps Stage 1 finds that release already tagged, fall back to the next available patch.
- Bundling scan: no other non-closed plan in this worktree's `agent-output/planning/` targets this release specifically. Plans 213/217/218 use the generic "next available patch" wording, so the control window should confirm whether any of them co-ship.

## Deployment Path Audit

N/A. No Dockerfile, workflow, nginx, env-var, or volume changes are involved.

## Testing Strategy (high level)

- **Integration-style route test** with real auth helpers is the primary regression guard, crossing the cookie → route boundary (Milestone 2).
- **Existing unit tests** for the route stay in place, with their mocks aligned to the new helper.
- **Critical scenarios**: an authenticated recommendation, an authenticated owner submission, anonymous rejection, and an expired token that refreshes vs one that fails to refresh (already covered by `getUserFromCookie` tests; no duplication needed).
- Detailed test cases are QA's responsibility (`agent-output/qa/`).
- UAT: submit a recommendation on `https://uat.ummahflow.com/create/recommend` while logged in (admin and non-admin). Expect success and the success screen. Also confirm the deployed SHA (resolves A1).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `getUserFromCookie()` falls back to a GoTrue network call, adding latency to each submission | Medium | Low | Same cost as every other authenticated route; one call per submit |
| Refreshed token is not written back to cookies (existing helper limitation) | Low | Low | Existing behaviour app-wide; the client `AuthSyncer` re-syncs on `TOKEN_REFRESHED` |
| Refresh-token rotation side effect: with an expired access cookie, the helper refreshes server-side and consumes the refresh token. The browser may then present an already-used token and lose the session. Most likely on iOS Safari after backgrounding, when the user submits before `AuthSyncer` re-syncs | Low | Low (occasional unexpected logout, no data loss) | **Accepted known risk.** It already exists across 20+ routes, and this plan adds one entry point. Owned by [264-open-actions.md](264-open-actions.md) OA-2 |
| Test update in `route.test.ts` accidentally weakens the #263 assertions | Low | Medium | Acceptance criteria require the same assertions and intent; Critic/QA check the diff |
| F6 routes stay broken | Known | Medium (feature-dependent) | Deferred with owner and trigger (D3 → [264-open-actions.md](264-open-actions.md) OA-1) |

## Rollback

Revert the Plan 264 commit. The route would return to 401 for everyone, which is the current UAT state. There is no data or migration impact.

## Duration Estimates

| Phase | Range | Uncertainty drivers |
|---|---|---|
| Analysis | Done | — |
| Planning / Critic | 0.5–1 h | — |
| Implementation | 1–2 h | Size of the mock realignment in `route.test.ts` |
| QA | 0.5–1 h | — |
| UAT | 0.5 h | UAT deploy timing, reporter device availability |
| DevOps | 0.5 h | Whether the pending release is already tagged |

## Open Questions

- **OPEN QUESTION [RESOLVED]**: Include the F6 variant routes? No. They are deferred (D2/D3).
- **OPEN QUESTION [RESOLVED]**: Is production affected? It is not in any release tag (D7); DevOps confirms (A2).

## Housekeeping Note (not actioned in worker session)

The planning self-check found terminal-status docs outside `closed/`: `173-esbuild-upgrade-plan.md`, `203-open-actions.md`, `219-provider-card-gap-plan.md`. They were left in place to avoid cross-session merge noise, and the control window should move them.
