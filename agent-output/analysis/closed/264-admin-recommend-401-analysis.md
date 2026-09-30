---
ID: 264
Origin: 264
UUID: 90270baf
Status: Planned
---

# 264 — Admin cannot recommend a provider (`POST /api/providers` → 401)

## Changelog

| Date | Agent | Change |
|---|---|---|
| 2026-09-26 | Analyst | Initial RCA. Root cause confirmed (L1) with an executable POC. Commit 7b03ba00 (#263) confirmed as the regressing change. NO-MEMORY MODE (artifact-first). |
| 2026-09-26T16:08Z | Planner | Status → Planned. Incorporated into [264-admin-recommend-401-plan.md](../../planning/264-admin-recommend-401-plan.md). F6 scope question resolved: deferred (plan D2/D3). |

## Value Statement and Business Objective

Recommending a provider is the main way the community grows the directory. Since #263 went out, every logged-in submission through the create flows fails with a generic error toast. Admins are affected, and so are all other users. No new providers can come in until this is fixed.

## Objective

Find out why a logged-in user's `POST /api/providers` returns 401 on UAT. Check whether 7b03ba00 caused it, and recommend a regression test that exercises the real bug path.

## Context

- Report: `https://uat.ummahflow.com/create/recommend`, logged-in admin, iOS 14.6 Safari UA (browser mode, not installed PWA).
- XHR `POST /api/providers` → **401** (126 ms). Console: `Error creating recommendation: Error: Authentication required`.
- Suspect: 7b03ba00 `fix(#263): submit providers server-side so RLS stops blocking child writes (#423)`, the newest commit on main.

## Methodology

1. **Upstream trace**: form → `createProviderOrService` → `fetch('/api/providers')` → route auth gate → `createSupabaseServerClient` → cookie adapter.
2. **Error-string discrimination**: matched the exact console message to the code path that produces it.
3. **Recent change check**: `git show 7b03ba00^:<file>` compared with HEAD for the write path and route existence.
4. **POC execution**: ran the real `@supabase/ssr@0.6.1` server client, the real `/api/auth/set` route, the real `getUserFromCookie`, and the real `POST /api/providers`. Only `next/headers` cookies, `fetch`, and the admin client were stubbed. File: [agent-output/analysis/264-poc/cookie-contract.poc.test.ts](264-poc/cookie-contract.poc.test.ts). It is kept outside the vitest `include` globs on purpose. To re-run it, copy it to `tests/poc-264/` and run `npx vitest run tests/poc-264`.

## Findings

### F1 — The 401 comes from the server route, not the client guard (L1 Proven)

- The client guard in [mutations.ts](../../../src/features/providers/services/mutations.ts#L124-L126) throws `'Authentication required to create a provider or service'`.
- The route in [route.ts](../../../src/app/api/providers/route.ts#L58-L61) returns `{ error: 'Authentication required' }` with status 401. The client then rethrows `data.error` ([mutations.ts](../../../src/features/providers/services/mutations.ts#L156-L158)).
- The console shows exactly `Authentication required` and the XHR is 401. So the browser **had** a user (`useAuth()` → [StreamlinedRecommendForm.tsx](../../../src/features/providers/StreamlinedRecommendForm.tsx#L299)) and the **server** could not see the session.

### F2 — The app's two session stores do not overlap (L1 Proven)

| Layer | Where the session lives | Evidence |
|---|---|---|
| Browser client | `localStorage` (plain `@supabase/supabase-js` `createClient`, not `createBrowserClient`) | [client.ts](../../../src/lib/supabase/client.ts#L91-L99) |
| Cookie sync | `AuthSyncer` → `POST /api/auth/set` writes **`sb-access-token`** and **`sb-refresh-token`** | [AuthSyncer.tsx](../../../src/providers/AuthSyncer.tsx#L16-L35), [auth/set/route.ts](../../../src/app/api/auth/set/route.ts#L12-L23); POC-A output: `[ 'sb-access-token', 'sb-refresh-token' ]` |
| `createSupabaseServerClient()` | `@supabase/ssr` storage cookie named **`sb`** (or chunks `sb.0…`), holding a serialized session | [server.ts](../../../src/lib/supabase/server.ts#L12-L17) (`cookieOptions.name: 'sb'`) |
| Writer for `sb` cookie | **None.** `cookieAdapter.set/remove` are no-ops and nothing else writes it | [cookieAdapter.ts](../../../src/lib/supabase/cookieAdapter.ts#L15-L20); workspace grep for `'sb'`/`sb.` finds only `server.ts` and an archived starter |
| `getUserFromCookie()` | Tries the SSR client, then **falls back** to `sb-access-token` → GoTrue `/auth/v1/user` | [getUserFromCookie.ts](../../../src/lib/supabase/getUserFromCookie.ts#L31-L57) |

POC results, run with the exact cookies a logged-in browser carries (`sb-access-token`, `sb-refresh-token`) and a `fetch` stub that returns a valid user for any `/auth/v1/user` call:

| Case | Result |
|---|---|
| B: `createSupabaseServerClient().auth.getUser()` | `user: null`, `AuthSessionMissingError: Auth session missing!`, **0 network calls**. The token is never even sent. |
| C: `getUserFromCookie()` | `user: admin-uuid`. The fallback reads `sb-access-token` and succeeds. |
| D: real `POST /api/providers` | **401 `{ error: 'Authentication required' }`**. Reproduces the UAT symptom exactly. |
| E (positive control): same client with a well-formed `sb` cookie | `user: admin-uuid`. This isolates the failure to the cookie name/format mismatch. |

### F3 — 7b03ba00 (#263) introduced the regression (L1 Proven by code/diff, L2 for UAT deploy)

- `src/app/api/providers/route.ts` is **new in 7b03ba00** (`git show 7b03ba00^:src/app/api/providers/route.ts` → not found).
- Before 7b03ba00, `createProviderOrService` wrote directly with the browser `supabase` client, which authenticates from its `localStorage` session. It made no call to a same-origin server route (`git show 7b03ba00^:…/mutations.ts`: only `supabase.from(...)` calls, no `fetch`).
- The route authenticates with `createSupabaseServerClient().auth.getUser()`. Per F2, that call **can never** resolve a user in this app. It should use `getUserFromCookie()`, which is the helper that 20+ other authenticated routes use (`/api/chat`, `/api/admin/*`, `/api/providers/search` status gate).
- `/api/instagram/scrape` uses the same broken auth pattern. The #263 author likely copied it from there (L3, pattern similarity only).
- **Conclusion**: #263 did not break the auth plumbing. That mismatch already existed and was latent. #263 routed the create flow through a server gate that uses the one auth helper that cannot see this app's sessions.

### F4 — Scope: every logged-in user, every create flow (L1 by code, not live-verified)

- The route has no role check, so "admin" does not matter. Any authenticated user gets the same 401.
- iOS Safari / browser display mode does not matter. The cookie names are the same on every platform (POC is platform-independent).
- All UI callers of `createProviderOrService` go through the same route:
  - [StreamlinedRecommendForm.tsx](../../../src/features/providers/StreamlinedRecommendForm.tsx#L1162) (`/create/recommend`)
  - [StreamlinedImportForm.tsx](../../../src/features/providers/StreamlinedImportForm.tsx#L980)
  - [UnifiedProviderCreateForm.tsx](../../../src/features/providers/UnifiedProviderCreateForm.tsx#L189)
  - [create/media/page.tsx](../../../src/app/(public)/create/media/page.tsx#L97) (owner flow)
- Not affected: chat-driven registration (`tool-executor.ts`). `/api/chat` authenticates via `getUserFromCookie()` and passes `userId` in.

### F5 — Why tests and review missed it (L1 Proven)

- [route.test.ts](../../../src/app/api/providers/route.test.ts#L15-L17) does `vi.mock('@/lib/supabase/server')` and hand-builds `auth.getUser()` results ([L149-L161](../../../src/app/api/providers/route.test.ts#L149-L161)). The test takes as given the exact contract that is broken, so the "authenticated" cases pass without testing anything real.
- [mutations.test.ts](../../../src/features/providers/services/mutations.test.ts) and the `255-*` regression suites stub `fetch`. They never get past the client → route boundary.
- No test anywhere exercises "cookies written by `/api/auth/set`" → "session visible to a route's auth helper".

### F6 — Variant: other routes share the latent defect (L1 for the helper, L2 per route)

These routes also gate on `createSupabaseServerClient().auth.getUser()`. Per POC-B, they will treat a cookie-synced browser session as anonymous:

`/api/instagram/scrape`, `/api/badges/[badgeId]/confirm`, `/api/badges/[badgeId]/revoke`, `/api/badges/entity`, `/api/admin/badges/verify`, `/api/admin/badges/unverify`, `/api/push/subscribe` (POST + DELETE), `/api/push/send`, `/api/city-interest/subscribe`, `/api/outreach/claim` (own `createServerClient`; not traced).

Not individually executed, and whether each one is reachable from the UI was not checked. This is out of scope for the #264 fix, but relevant to Planner/Architect as a systemic finding.

## Root Cause (L1)

`POST /api/providers` (added in 7b03ba00 / #263) authenticates with `createSupabaseServerClient().auth.getUser()`. That client reads the session from an `@supabase/ssr` cookie named `sb`, which this app never writes. The browser keeps its session in `localStorage` and syncs it to the server only as the custom `sb-access-token` / `sb-refresh-token` cookies. Only `getUserFromCookie()` reads those. The route therefore sees every caller as anonymous and returns 401 `Authentication required`. The route's unit tests mock the server client, so they never exercised this contract.

## Regression-Test Recommendation (real bug path)

The test must cross the **cookie → route auth** boundary with real code. A test that mocks `@/lib/supabase/server` or the route's auth call repeats F5 and can pass without testing anything.

1. **Route-level cookie-contract test** (primary, matching POC-D). Stub only `next/headers` `cookies()` (to return `sb-access-token` + `sb-refresh-token`), global `fetch` (GoTrue `/auth/v1/user` → user), and `@/lib/supabase/admin`. Do **not** mock `@/lib/supabase/server`, `@/lib/supabase/getUserFromCookie`, or `@supabase/ssr`.
   - `[pre-fix FAILS]`: POST with a valid recommendation body. Expect `status !== 401` and the provider insert called with `user_created_id === <user id>`. On the current HEAD it gets 401, which reproduces #264.
   - `[post-fix PASSES]`: the same assertion passes.
   - Negative: no cookies → 401 and no admin client resolved (keeps #263's anonymous gate).
2. **Contract pin between writer and reader**: take the cookies produced by the real `POST /api/auth/set` response (POC-A) and feed them into whatever auth helper the route uses. This keeps the writer and reader names/formats locked together, so a rename on either side fails CI.
3. **Tripwire (optional, analysis suggestion)**: a source-grep test that fails if any `src/app/api/**/route.ts` gates on `createSupabaseServerClient().auth.getUser()` without an equivalent cookie-contract test. This addresses F6. Planner decides whether it belongs in #264.

The POC file already contains cases A–E and can be adapted directly.

## System Weaknesses

| # | Weakness | Risk mechanism | Detection |
|---|---|---|---|
| W1 | Two server auth helpers with different session sources; one (`createSupabaseServerClient().auth.getUser()`) can never succeed | New routes copy whichever helper they find first | F6 grep; contract test (Rec. 2) |
| W2 | `cookieAdapter.set/remove` are silent no-ops; `@supabase/ssr` can never persist or refresh its own cookie | Hides the mismatch; no error, just `null` user | POC-B shows `AuthSessionMissingError` is swallowed as "no user" |
| W3 | Route tests mock the auth boundary itself | Auth-contract regressions pass CI | F5 |
| W4 | Client shows a generic toast; server logs nothing on 401 | Production 401s are invisible without a user report | Telemetry below |

## Instrumentation Gaps

| Signal | Level | Fields |
|---|---|---|
| Structured `auth_outcome` on `/api/providers` 401 (as `getUserFromCookie` already emits) | **Normal** | `route`, `result: no_user`, `reason` (`session_missing` / `token_invalid`), `has_sb_access_token_cookie: bool`. No token values |
| Counter/alert on 401 rate for create routes where the client had a user | **Normal** | route, status, count |
| Cookie-name inventory on auth miss (names only) | **Debug** | list of cookie **names** present, never values |

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Status |
|---|---|---|---|---|
| G1 | Confirm UAT is running 7b03ba00 | No deploy metadata in the worktree | Check the UAT deploy log or `/api/health` version for the SHA | Open (low risk: `/api/providers` POST exists only from 7b03ba00) |
| G2 | Live check that the reporter's browser carried `sb-access-token` | No request-cookie capture in the report | Not needed for RCA: the route returns 401 with or without that cookie (POC-B/D) | Deferred, non-blocking |
| G3 | Reachability/impact of F6 variant routes | Out of #264 scope | Architect/Planner: decide whether to track as a separate item | Open |
| G4 | Whether prod is affected | Scope limited to UAT | Confirm whether #423 has been promoted to prod | Open |

## Analysis Recommendations

- Planner: confirm G1 (deploy SHA), then plan against the L1 root cause above.
- Architect: review W1/W2 (dual session model) as a systemic item that goes beyond #264.

## Open Questions

- [RESOLVED] Should #264 cover only `/api/providers`, or also the F6 variant routes? → `/api/providers` only; F6 deferred (plan D2/D3).
