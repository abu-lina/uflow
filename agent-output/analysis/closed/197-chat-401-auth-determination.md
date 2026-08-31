---
ID: 197
Origin: 197
UUID: 7c3e9a12
Status: Planned
---

# 197 — Chat `/api/chat` 401 Determination

## Changelog

- 2026-08-02: Created. Determination reached and doc closed (Committed). NO-MEMORY MODE (memory daemon unavailable this session).

## Value Statement and Business Objective

Ensure the AI chatbot (a core UFlow discovery surface) does not appear broken to authenticated users, and that error messaging is truthful and context-appropriate. Correct auth rejection must not be misdiagnosed as a defect, and misleading copy must not erode user trust.

## Objective

Determine why `POST /api/chat` returned **401** for a request that carried `sb-access-token`/`sb-refresh-token` cookies decoding to `role: admin`.

## Context

- Endpoint: `POST https://uat.ummahflow.com/api/chat` → 401, HTTP/2, ~255ms
- `x-correlation-id: 1659a43a-ce88-444a-810c-a8f4008f4069`
- Request carried `sb-access-token` + `sb-refresh-token` cookies; decoded JWT payload showed `role: admin`, `role: authenticated`
- UI showed "Anmeldung erforderlich" (login required)
- **User clarification**: "The issue was I wasn't logged in."

## Methodology

Static code trace of the auth gate (no reproduction needed once the user confirmed unauthenticated state). Confirmed the single 401 source and the cookie/session lifecycle.

## Findings

### F1 — The only 401 source is the auth gate in the route handler — **L1 Proven**

`POST` in [src/app/api/chat/route.ts](../../src/app/api/chat/route.ts) calls `getUserFromCookie()`; if it returns null, it returns `401 { error: 'Authentication required' }` with the correlation ID header. Middleware does **not** gate `/api/chat` — the matcher in [src/middleware.ts](../../src/middleware.ts) excludes `api` (`/((?!api|_next/...).*)`). So the 401 is solely from `getUserFromCookie()` returning null.

### F2 — The 401 was correct: the session was not valid — **L1 Proven (via user confirmation)**

`getUserFromCookie()` ([src/lib/supabase/getUserFromCookie.ts](../../src/lib/supabase/getUserFromCookie.ts)) validates the access token against Supabase `/auth/v1/user`. A JWT payload decodes to `role: admin` regardless of expiry, so the presence of "admin-looking" cookies does not imply a live session. The user confirmed they were not logged in. The stale, expired `sb-access-token` (and a refresh that did not succeed) → null user → correct 401. **No authentication defect.**

### F3 — Stale auth cookies persist after client-side session expiry — **L2 Observed** (hardening opportunity, not a defect)

The browser client persists the session in localStorage; the httpOnly `sb-access-token`/`sb-refresh-token` cookies are only cleared on explicit logout ([src/app/api/auth/logout/route.ts](../../src/app/api/auth/logout/route.ts)). When the client session simply expires, the cookies remain and continue to be sent, so the server receives credentials it must reject. This is expected security behavior but produces "cookies present yet 401", which can look like a bug during triage.

### F4 — Misleading auth-required copy in the chat widget — **L1 Proven** (separate UX/copy bug)

[src/features/chat/components/ChatWidget.tsx](../../src/features/chat/components/ChatWidget.tsx) (~L97–L105) renders a hardcoded auth-required card: *"Um ein Restaurant zu registrieren, musst du angemeldet sein."* This text is shown for **any** auth-required error, so a user who asked "Empfiehl mir etwas" (recommend something) sees an irrelevant message about registering a restaurant. The string is also hardcoded rather than sourced from `src/translations/de.ts` (which already has `authRequired`/`loginRequired` keys). This is unrelated to the 401 correctness.

## Root Cause

The reported 401 has **no root-cause defect** — it was correct rejection of an unauthenticated request (F2). The only actionable code issue surfaced is the misleading, hardcoded auth-required copy in the chat widget (F4).

## System Weaknesses

- **Observability**: All diagnostic logging in `getUserFromCookie()` is gated behind `NODE_ENV === 'development'`, so on UAT/prod there are zero logs tied to the `x-correlation-id` explaining an auth outcome. This is why "cookies present but 401" required manual code tracing.
- **Cookie lifecycle**: No proactive clearing of stale auth cookies on expiry (F3).
- **Copy hygiene**: Hardcoded, context-specific error text in a shared chat error branch (F4).

## Instrumentation Gaps (normal vs debug)

- **Normal**: On a 401 from `/api/chat`, emit a structured, non-PII log keyed by `correlation_id` with an auth-outcome reason code (e.g. `no_cookie`, `token_expired_refresh_failed`, `token_invalid`). No tokens/PII.
- **Debug**: Behind a flag, include Supabase `/auth/v1/user` status and whether a refresh was attempted/succeeded, for short windows only.

## Analysis Recommendations (next steps — not implementation)

1. **No action required for the 401 itself** — confirmed correct behavior.
2. **Fix F4 (small copy/UX bug)**: make the chat auth-required message generic and i18n-sourced, not restaurant-specific. This is a candidate for a lightweight Planner → Implementer pass if the user wants it.
3. **Optional hardening (F3 + observability)**: consider clearing stale auth cookies on a definitive 401 and adding the normal-tier auth-outcome log. Lower priority.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Exact auth-outcome reason for this specific request (expired vs refresh-failed) | No prod logging tied to correlation ID | Add normal-tier auth-outcome log (see Instrumentation Gaps) | Deferred — not needed; user confirmed unauthenticated |

## Open Questions

- Does the user want F4 (chat auth-required copy) fixed now, and/or the optional F3/observability hardening? Awaiting direction before any pipeline continues.
