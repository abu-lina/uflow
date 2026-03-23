---
ID: 49
Origin: 49
UUID: 7dfe4b10
Status: Committed
---

# UAT Report: Plan 049 — UFlow Security Remediation

**Plan Reference**: `agent-output/planning/049-security-remediation-plan.md`
**Implementation Reference**: `agent-output/implementation/049-security-remediation-implementation.md`
**Code Review Reference**: `agent-output/code-review/049-security-remediation-code-review.md`
**QA Reference**: `agent-output/qa/049-security-remediation-qa.md`
**Date**: 2026-03-22
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date | Agent Handoff | Request | Summary |
| ---------- | ---------------- | -------------------- | ------------------------------ |
| 2026-03-22T21:24Z | QA | QA Complete, ready for UAT | APPROVED FOR RELEASE — all 13 security findings remediated, auth flow regression fixed and regression-tested, all automated gates green |

## Value Statement Under Test

> As a **Muslim user relying on UFlow for trusted discovery and account safety**, I want **critical access-control, auth-flow, and exposure vulnerabilities remediated before the next patch release**, so that **I can use UFlow without risk of account abuse, phishing through official channels, unauthorized privilege escalation, or avoidable data disclosure**.

## UAT Scenarios

### Scenario 1: Confirmed users can log in after the enumeration-safe API change

- **Given**: A user with a confirmed email account attempts to sign in via `/login`
- **When**: `signInWithEmailConfirmation()` calls `/api/check-email-exists` and receives `{ confirmed: true }`
- **Then**: Login proceeds to `supabase.auth.signInWithPassword()` without returning `EMAIL_NOT_FOUND`
- **Result**: PASS
- **Evidence**: `src/__tests__/lib/auth-check-email-callers.test.ts` — test "should proceed to signInWithPassword when API returns { confirmed: true }"; verified executed green at 2026-03-22T21:23Z

### Scenario 2: Confirmed users can request password reset after the enumeration-safe API change

- **Given**: A confirmed user with a registered email submits the forgot-password form
- **When**: `resetPasswordWithLanguage()` calls `/api/check-email-exists` and receives `{ confirmed: true }`
- **Then**: Token generation and email delivery proceed without returning `EMAIL_NOT_FOUND`
- **Result**: PASS
- **Evidence**: `src/__tests__/lib/auth-check-email-callers.test.ts` — test "should proceed to generate token when API returns { confirmed: true }"; all 3 fetch calls verified

### Scenario 3: Unconfirmed and non-existent emails are not distinguishable

- **Given**: An attacker or unconfirmed user submits any non-confirmed email to `/api/check-email-exists`
- **When**: The route receives either a non-existent or an unconfirmed email
- **Then**: Returns identical `{ confirmed: false }` response for both cases — attacker cannot determine registration state
- **Result**: PASS
- **Evidence**: `src/__tests__/api/security-049-regression.test.ts` — "does not reveal whether email exists"; `src/app/api/check-email-exists/route.ts` lines 86–100 show unwrapped unified response

### Scenario 4: Self-promotion to admin is blocked

- **Given**: An authenticated non-admin user attempts to call `POST /api/admin/set-role`
- **When**: The request is authenticated but the caller is not an admin or moderator
- **Then**: Returns `403 Forbidden` — role cannot be changed
- **Result**: PASS
- **Evidence**: `src/__tests__/api/security-049-regression.test.ts` — "non-admin should receive 403"; DB-backed `isAdminOrModerator()` gate confirmed in `src/app/api/admin/set-role/route.ts`

### Scenario 5: Branded emails cannot carry attacker-controlled phishing URLs

- **Given**: An attacker sends a `POST /api/send-auth-email` request with a hostile `confirmationUrl` pointing to `https://evil.com/phish`
- **When**: The route processes the request
- **Then**: The email is sent with a URL derived from the server-authoritative `NEXT_PUBLIC_SITE_URL`, not from the caller-supplied value
- **Result**: PASS
- **Evidence**: `src/__tests__/api/security-049-regression.test.ts` — "an attacker cannot override the confirmation URL domain"; `src/app/api/send-auth-email/route.ts` uses `new URL()` parsing with `siteUrl` origin override

### Scenario 6: Rate-limited auth endpoints reject repeat abuse

- **Given**: An attacker sends 6+ requests to `/api/send-auth-email` or `/api/generate-confirmation-token` from the same IP within 1 hour
- **When**: The 6th request arrives
- **Then**: Returns `429 Too Many Requests`
- **Result**: PASS
- **Evidence**: `src/__tests__/api/security-049-regression.test.ts` — rate limit tests for both routes; `checkRateLimit()` from `@/lib/rate-limit` wired into both handlers

### Scenario 7: Admin diagnostic endpoints require explicit key — no hardcoded fallback

- **Given**: A request arrives at `/api/auth/debug-ip-status` or `/api/auth/magic-link-diagnostic` with the hardcoded legacy key `debug-key-change-in-production`
- **When**: `ADMIN_DEBUG_KEY` env var is not set to that value
- **Then**: Returns `401 Unauthorized` — admin mode is unavailable
- **Result**: PASS
- **Evidence**: `src/__tests__/api/security-049-regression.test.ts` — "returns 401 when ADMIN_DEBUG_KEY is not set"; direct inspection of `src/app/api/auth/debug-ip-status/route.ts` confirms fallback removal

### Scenario 8: Push notifications require DB-backed role — not client-mutable metadata

- **Given**: A user whose `user_metadata.role` is set to `admin` but has no corresponding DB role record attempts to send a push notification
- **When**: `POST /api/push/send` is called
- **Then**: `isAdminOrModerator()` queries the database and returns `false` — request returns `403`
- **Result**: PASS
- **Evidence**: `src/__tests__/api/security-049-regression.test.ts` — "metadata-only role does not grant admin push access"; `src/app/api/push/send/route.ts` replaces `user_metadata.role` trust with `isAdminOrModerator()`

### Scenario 9: Browser security policy is enforced via CSP response header

- **Given**: A browser loads any page served by the Next.js application
- **When**: The response headers are inspected
- **Then**: `Content-Security-Policy` header is present (restored from the prior removed state)
- **Result**: PASS (code validation)
- **Evidence**: `next.config.js` `headers()` config now includes `Content-Security-Policy` entry using the existing `buildCsp()` function; confirmed via code inspection

### Scenario 10: Instagram scraper rejects path traversal and injection attempts

- **Given**: An attacker calls `POST /api/instagram/scrape` with a malformed username such as `../etc/passwd` or `<script>alert(1)</script>`
- **When**: The route validates the username
- **Then**: Returns `400 Bad Request` before performing any network operation
- **Result**: PASS
- **Evidence**: `src/__tests__/api/security-049-regression.test.ts` — path traversal and URL injection rejection tests; `/^[a-zA-Z0-9._]{1,30}$/` validation in `src/app/api/instagram/scrape/route.ts`

### Scenario 11: `ADMIN_DEBUG_KEY` is wired into both deployment paths

- **Given**: A deployment runs via GitHub Actions for production or UAT
- **When**: The `docker run` command is executed in the workflow
- **Then**: `-e ADMIN_DEBUG_KEY="${{ secrets.ADMIN_DEBUG_KEY }}"` is passed to the container for all four docker run invocations
- **Result**: PASS (code validation)
- **Evidence**: `.github/workflows/deploy-hetzner.yml` and `.github/workflows/deploy-uat.yml` — confirmed fix H1 applied in code review; both blue-green slots wired

## Value Delivery Assessment

The Value Statement has five distinct user safety commitments, each mapped to one or more remediated findings:

| Commitment | Finding(s) | Status |
|---|---|---|
| No account abuse | F-049-01 (CRITICAL role escalation), F-049-05 (HIGH push auth) | ✅ DELIVERED |
| No phishing through official channels | F-049-02 (CRITICAL email + token abuse, server-derived URL) | ✅ DELIVERED |
| No unauthorized privilege escalation | F-049-01, F-049-05 | ✅ DELIVERED |
| No avoidable data disclosure | F-049-03 (debug key removal), F-049-04 (enumeration), F-049-12 (PII log) | ✅ DELIVERED |
| Delivered before next patch release | Target v0.8.13 from v0.8.12 baseline; standalone release | ✅ ON TRACK |
| Auth flows remain functional for confirmed users | F-049-04 caller regression fixed + 4 TDD regression tests | ✅ DELIVERED |

**Implicit obligation in the Value Statement**: "I can use UFlow" — meaning the platform must not break for legitimate confirmed users as a side effect of the security fix. This was the exact regression QA caught. It has been remediated, regression-tested, and re-verified. The implicit obligation is met.

**Accepted trade-off**: Unconfirmed users who previously received `EMAIL_NOT_CONFIRMED` now receive `EMAIL_NOT_FOUND`. This is a deliberate, plan-scoped enumeration-prevention decision. It slightly degrades unconfirmed-user UX but is not a regression in platform safety for the target user persona (confirmed, active Muslim users). UAT accepts this as within scope.

## QA Integration

**QA Report Reference**: `agent-output/qa/049-security-remediation-qa.md`
**QA Status**: QA Complete

**QA Findings Alignment**: QA identified one blocking HIGH finding (auth caller contract regression) which was remediated by the Implementer and re-tested. The rerun produced 315 passing tests, 0 type errors, 0 lint errors. The initial QA failure was a correct catch; the fix and re-verification were executed correctly.

**Remediation Review**: QA re-executed the full gate in a terminal-enabled session after the fix. Evidence is direct (not artifact carry-over). UAT reviewed the executed terminal output in the QA report and confirms it is fresh.

## Technical Compliance

| Plan Deliverable | Status |
|---|---|
| M1: Close immediate critical exploit paths (F-049-01, F-049-02) | ✅ PASS |
| M2: Re-establish server-authoritative authorization (F-049-05) | ✅ PASS |
| M3: Harden auth-email and token workflows (rate limiting + server URL) | ✅ PASS |
| M4: Restore browser-side hardening (F-049-06 CSP) | ✅ PASS |
| M5: Reduce secondary exposure and diagnostic risk (F-049-03, -04, -07, -12, -13) | ✅ PASS |
| M6: Audit deployment path and verify dependency/security gates | ✅ PASS |
| M7: Version bump and release artifacts | ⬜ DEFERRED to DevOps (by plan design) |

**Test coverage**: 16 targeted Plan 049 regression tests + 315 project-wide tests passing. Coverage added for all 13 findings. Caller-level TDD gap from QA round 1 resolved.

**Known limitations**:
- Interactive browser validation (login UX, forgot-password UX, mobile messaging) is not automated; deferred to ops UAT window (see Deferred Follow-ups)
- `check-email-exists` still uses a local rate limit `Map` rather than the shared utility (pre-existing tech debt, INFO finding I1 in code review; not introduced by this plan)

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES

**Evidence**:
- The two CRITICAL findings (unauthenticated role escalation, unauthenticated auth-email/token generation) are both fully closed
- All four HIGH findings are remediated
- All four MEDIUM findings are remediated
- All three LOW findings are remediated
- `npm audit` reports 0 vulnerabilities (Next.js 15.5.14 closes GHSA-3x4c-7xq6-9pq8)
- The implementation stays within the plan's explicitly stated "patch-scoped, pragmatic" constraint — no auth architecture rewrite, no scope expansion

**Drift Detected**: None. The plan stated it would not expand into unrelated refactors; the implementation did not. The plan said it would validate deployment paths; the code review caught and fixed the missing `ADMIN_DEBUG_KEY` wiring. The plan said confirmed users must remain functional; the QA-fix round ensured exactly that.

## UAT Status

**Status**: UAT Complete

**Rationale**: All 13 audit findings are remediated, the value statement is demonstrably delivered, the one blocking regression found by QA has been fixed and regression-tested, and all automated gates are green. The implementation is a textbook example of patch-scoped security hardening: surgical, idiomatic, well-tested.

## Release Decision

**Final Status**: APPROVED FOR RELEASE

**Rationale**: The platform's minimum acceptable production security posture is restored. Both CRITICAL findings are closed. All HIGH, MEDIUM, and LOW findings are addressed. The auth flows required by real Muslim users are functional and regression-tested. Deployment configuration is correct. Dependencies are patched. No blocking drift from plan scope detected.

**Recommended Version**: `v0.8.13` — patch bump from `v0.8.12`

**Justification for patch (not minor)**: All changes are closing security vulnerabilities in existing feature surface. No new user-visible feature is added. A patch bump is correct.

**Key Changes for Changelog**:
- [SECURITY] `CRITICAL` — Added DB-backed role gate to `/api/admin/set-role`; prevents any authenticated user from self-promoting to admin
- [SECURITY] `CRITICAL` — Rate-limited `/api/send-auth-email` (5/hr per IP); `confirmationUrl` now derived server-side, blocking phishing URL injection
- [SECURITY] `HIGH` — Rate-limited `/api/generate-confirmation-token` (5/hr per IP)
- [SECURITY] `HIGH` — Replaced `user_metadata.role` trust in `/api/push/send` with DB-backed `isAdminOrModerator()` call
- [SECURITY] `HIGH` — Removed hardcoded `debug-key-change-in-production` fallback from debug-ip-status and magic-link-diagnostic
- [SECURITY] `HIGH` — `/api/check-email-exists` now returns identical `{ confirmed: false }` for both non-existent and unconfirmed accounts (prevents user enumeration)
- [SECURITY] `HIGH` — Restored `Content-Security-Policy` response header via `buildCsp()` in `next.config.js`
- [SECURITY] `MEDIUM` — Added Instagram username validation (`/^[a-zA-Z0-9._]{1,30}$/`) to reject path traversal and injection
- [SECURITY] `MEDIUM` — Removed email PII from auth token generation log
- [SECURITY] `LOW` — Centralized admin Supabase client in outreach claim/action routes
- [DEPS] Updated Next.js to 15.5.14 (closes GHSA-3x4c-7xq6-9pq8); `npm audit` 0 vulnerabilities
- [OPS] Added `ADMIN_DEBUG_KEY` to deployment workflows and env templates

## Next Actions

None — implementation is complete, tested, and approved.

**Ops action required before first deploy**: Add `ADMIN_DEBUG_KEY` (and optionally `UAT_ADMIN_DEBUG_KEY`) to GitHub repository secrets. Without this, admin diagnostic endpoints return 401 (fail-closed, not a breakage — but ops tooling unavailable).

## Deferred Follow-ups

| Item | Owner | Trigger/Due Window | Evidence to Close | Recommended Next |
|---|---|---|---|---|
| Interactive browser validation: confirmed-user login `/login`, unconfirmed-user login, confirmed-user forgot-password `/forgot-password`, resend confirmation via login modal | QA Lead / Ops | First 24h post-deploy of v0.8.13 | Manual test notes or Loom recording confirming expected UX flow | Add to Plan 050 retrospective acceptance criteria if not executed pre-release |
| `check-email-exists` local rate limit `Map` — migrate to shared `@/lib/rate-limit` utility | Implementer | Next sprint (non-blocking) | PR with `src/app/api/check-email-exists/route.ts` refactored to use shared utility | Track as tech debt in roadmap backlog |

---

Handing off to devops agent for release execution.
