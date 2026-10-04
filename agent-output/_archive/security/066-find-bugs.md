# 066 — Find-Bugs Audit: Recent Changes (PRs #86–#91)

| Field           | Value                                                    |
| --------------- | -------------------------------------------------------- |
| **Document ID** | 066                                                      |
| **Type**        | Find-Bugs Security Audit                                 |
| **Status**      | Complete                                                 |
| **Verdict**     | PASSED_WITH_FINDINGS                                     |
| **Date**        | 2026-03-28                                               |
| **Mode**        | Targeted Code Review (recent commits diff)               |
| **Prior Audit** | 049 (Full 5-Phase, v0.8.7, BLOCKED_PENDING_REMEDIATION)  |
| **Scope**       | Diff `297cd253..68b31ae6` — 35 files, +3734 / −102 lines |
| **Branch**      | session/066-find-bugs (forked from main)                 |

---

## Executive Summary

The recent changes introduce a comprehensive **admin provider edit** feature (PR #91) and a **mandatory rejection feedback** flow (PRs #89–#90). Seven new API routes, six new dashboard pages, two new service modules, and supporting utility/validation code were added.

The implementation follows good security patterns overall — auth checks on every API route, Zod schema validation, input sanitization, rate limiting, audit logging, and optimistic concurrency control. However, the audit identified **2 High**, **6 Medium**, and **5 Low** severity findings across security, code quality, and dependency categories.

No Critical findings were found in this diff. The two Critical items from audit 049 (privilege escalation, unauthenticated token endpoints) are **not affected** by these changes.

### Finding Summary

| Severity  | Count  | Category                             |
| --------- | ------ | ------------------------------------ |
| High      | 3      | 1 Security, 1 Code Bug, 1 Dependency |
| Medium    | 6      | 4 Security, 2 Code Bug               |
| Low       | 5      | 1 Security, 4 Code Quality           |
| **Total** | **14** |                                      |

---

## Findings

### HIGH Severity

#### H-1: Upload-image endpoint vulnerable to MIME type spoofing

| Field          | Detail                                                                                                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File:Line**  | `src/app/api/admin/upload-image/route.ts:36`                                                                                                                                                                                                                                                                |
| **OWASP**      | A04 Insecure Design                                                                                                                                                                                                                                                                                         |
| **Problem**    | File type validation relies solely on client-provided `file.type` (`file.type.startsWith('image/')`) which is trivially spoofable. No magic bytes verification. SVG files (valid `image/svg+xml`) can contain embedded JavaScript payloads.                                                                 |
| **Evidence**   | Line 36: `if (!file.type.startsWith('image/'))` — an attacker can craft a file with a malicious payload but set Content-Type to `image/png`. SVG files pass the check legitimately and can contain `<script>` tags.                                                                                         |
| **Fix**        | 1. Add an allowlist of safe extensions: `['jpg', 'jpeg', 'png', 'webp', 'gif']`. 2. Validate the file extension from `file.name` against the allowlist. 3. Optionally verify file magic bytes (first bytes match expected image format). 4. Explicitly reject SVG unless specifically needed and sanitized. |
| **References** | OWASP File Upload Cheat Sheet; CWE-434 (Unrestricted Upload of File with Dangerous Type)                                                                                                                                                                                                                    |

#### H-2: Needs/Offers API routes leak internal error messages in production

| Field          | Detail                                                                                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File:Line**  | `src/app/api/admin/needs/route.ts:88`, `src/app/api/admin/offers/route.ts:88`                                                                                                                                                                                                                          |
| **OWASP**      | A05 Security Misconfiguration                                                                                                                                                                                                                                                                          |
| **Problem**    | The catch block returns `error.message` directly to the client without checking `NODE_ENV`. Internal Postgres error messages (table names, constraint names, SQL details) leak to the response. Other admin routes (`edit-provider`, `review-provider`) correctly sanitize error output in production. |
| **Evidence**   | `{ error: error instanceof Error ? error.message : 'Failed to create need' }` — compared to `edit-provider/route.ts:140` which correctly uses `process.env.NODE_ENV === 'production' ? 'Failed to update provider' : error.message`.                                                                   |
| **Fix**        | Apply the same pattern as `edit-provider`: `const errorMessage = process.env.NODE_ENV === 'production' ? 'Failed to create need' : error instanceof Error ? error.message : 'Unknown error';`                                                                                                          |
| **References** | CWE-209 (Generation of Error Message Containing Sensitive Information)                                                                                                                                                                                                                                 |

#### H-3: picomatch dependency has high-severity vulnerability

| Field          | Detail                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File:Line**  | `package.json` (transitive dependency)                                                                                                                                                                                                |
| **OWASP**      | A06 Vulnerable Components                                                                                                                                                                                                             |
| **Problem**    | `npm audit` reports 1 high-severity vulnerability in `picomatch` plus 8 moderate-severity vulnerabilities across `@ducanh2912/next-pwa`, `@rollup/plugin-terser`, `brace-expansion`, `serialize-javascript`, `terser-webpack-plugin`. |
| **Evidence**   | `npm audit` output: `high: 1 — ['picomatch']`, `moderate: 8`                                                                                                                                                                          |
| **Fix**        | Run `npm audit fix` for auto-fixable issues. For remaining issues, evaluate if the vulnerable code paths are reachable, apply overrides if needed, or upgrade affected packages.                                                      |
| **References** | npm advisory database; OWASP A06:2021                                                                                                                                                                                                 |

---

### MEDIUM Severity

#### M-1: providerImages field bypasses sanitization in edit service

| Field          | Detail                                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File:Line**  | `src/services/admin/providerEdit.ts:73`                                                                                                                                                                                                                                                                                                                                    |
| **OWASP**      | A03 Injection                                                                                                                                                                                                                                                                                                                                                              |
| **Problem**    | All text fields in `updateProviderFields` are passed through `sanitizeTextInput()` except `providerImages`. This field is set directly: `updatePayload.provider_images = editData.providerImages;` — while every other string field uses `sanitizeTextInput()`. If this JSON string contains malicious content, it could lead to stored XSS when rendered on the frontend. |
| **Evidence**   | Lines 49–72: all fields sanitized. Line 73: `if (editData.providerImages !== undefined) { updatePayload.provider_images = editData.providerImages; }` — no sanitization.                                                                                                                                                                                                   |
| **Fix**        | Either validate that `providerImages` is valid JSON matching `{ urls: string[] }` structure (preferred), or apply `sanitizeTextInput()`. A Zod refinement in `adminSchemas.ts` for the field structure would be ideal.                                                                                                                                                     |
| **References** | CWE-79 (Cross-site Scripting)                                                                                                                                                                                                                                                                                                                                              |

#### M-2: Dashboard admin pages have no route-level auth protection

| Field          | Detail                                                                                                                                                                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------ | -------------------------------------------------------- |
| **File:Line**  | `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:1` (and all 6 edit sub-pages)                                                                                                                                                                                                                                          |
| **OWASP**      | A01 Broken Access Control                                                                                                                                                                                                                                                                                                          |
| **Problem**    | The `(dashboard)` route group has no layout, middleware, or server-side auth check. All pages are `'use client'` components that render for any user, then attempt admin API calls that return 401/403. This exposes admin UI structure/JavaScript to unauthenticated users and wastes server resources on unauthorized API calls. |
| **Evidence**   | No `layout.tsx` in `src/app/(dashboard)/`. Middleware matcher `'/((?!api                                                                                                                                                                                                                                                           | \_next/static | \_next/image | favicon.ico).\*)'` doesn't discriminate dashboard paths. |
| **Fix**        | Add a `src/app/(dashboard)/layout.tsx` that checks auth server-side (via `getUserFromCookie`) and redirects unauthenticated/non-admin users. Alternatively, add dashboard paths to middleware for auth gating.                                                                                                                     |
| **References** | OWASP A01:2021; CWE-862 (Missing Authorization)                                                                                                                                                                                                                                                                                    |

#### M-3: Array fields in admin schema lack UUID validation

| Field          | Detail                                                                                                                                                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File:Line**  | `src/lib/validations/adminSchemas.ts:48–50`                                                                                                                                                                                                                                                     |
| **OWASP**      | A03 Injection                                                                                                                                                                                                                                                                                   |
| **Problem**    | `offersIds`, `needsIds`, and `communityServiceIds` are validated as `z.array(z.string())` with no UUID format constraint. Arbitrary strings pass validation and are written to the database. While Postgres foreign key constraints may catch invalid UUIDs, the error messages leak (see H-2). |
| **Evidence**   | `offersIds: z.array(z.string()).optional()` vs `providerId: z.string().uuid()` which properly validates format.                                                                                                                                                                                 |
| **Fix**        | Change to `z.array(z.string().uuid()).optional()` for all three fields.                                                                                                                                                                                                                         |
| **References** | CWE-20 (Improper Input Validation)                                                                                                                                                                                                                                                              |

#### M-4: Upload-image endpoint missing rate limiting

| Field          | Detail                                                                                                                                                                                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File:Line**  | `src/app/api/admin/upload-image/route.ts:12`                                                                                                                                                                                                                                                                      |
| **OWASP**      | A04 Insecure Design                                                                                                                                                                                                                                                                                               |
| **Problem**    | Unlike all other admin API routes (`edit-provider`, `review-provider`, `needs`, `offers`) which use `rateLimiters.adminReview`, the `upload-image` endpoint has no rate limiting. An authenticated admin/moderator could abuse this to upload files at an unlimited rate, causing storage cost escalation or DoS. |
| **Evidence**   | No `rateLimiters` import or check anywhere in the file. Compare with `needs/route.ts:28` which checks `rateLimiters.adminReview.perHour(identifier)`.                                                                                                                                                             |
| **Fix**        | Add `rateLimiters.adminReview` (or a dedicated upload limiter) with appropriate thresholds (e.g., 10 uploads per minute).                                                                                                                                                                                         |
| **References** | CWE-770 (Allocation of Resources Without Limits)                                                                                                                                                                                                                                                                  |

#### M-5: Middleware API rate limiting is dead code

| Field          | Detail                                                                                |
| -------------- | ------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File:Line**  | `src/middleware.ts:92–115`                                                            |
| **OWASP**      | A05 Security Misconfiguration                                                         |
| **Problem**    | The middleware matcher is configured as `'/((?!api                                    | \_next/static | \_next/image                                                                                                                       | favicon.ico).\*)'`which **excludes**`/api` paths. Yet the middleware function contains API-specific rate limiting code (`if (isApiRoute)`) that can never execute. This creates a false sense of security and means any API route without its own rate limiter is unprotected. |
| **Evidence**   | Line 138: matcher excludes `api`. Lines 92–115: dead code path for API rate limiting. |
| **Fix**        | Either update the matcher to include API routes: `['/((?!\_next/static                | \_next/image  | favicon.ico).\*)']`, or remove the dead API rate limiting code from middleware and ensure each API route has its own rate limiter. |
| **References** | CWE-1164 (Irrelevant Code)                                                            |

#### M-6: rejectProvider hook type mismatches server contract

| Field          | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File:Line**  | `src/features/admin/hooks/useProviderReview.ts:62`                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Category**   | Code Bug                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Problem**    | The `rejectProvider` callback accepts `feedback?: string` (optional), but the server-side Zod schema (`providerReviewUpdateSchema`) requires `reviewFeedback` when `reviewStatus === 'rejected'`. If `rejectProvider` is called without feedback (TypeScript allows it), the server returns a 400 error with a confusing Zod validation message. The `ProvidersContent.tsx` was updated (PR #89) to pass mandatory feedback, but the hook type still allows the omission. |
| **Evidence**   | Hook: `const rejectProvider = useCallback((providerId: string, feedback?: string) => {`. Schema: `.refine((data) => { if (data.reviewStatus === 'rejected') { return typeof data.reviewFeedback === 'string' && data.reviewFeedback.trim().length > 0; } ... })`                                                                                                                                                                                                          |
| **Fix**        | Change hook signature to `(providerId: string, feedback: string)` to match the server contract. Add a type-level guard.                                                                                                                                                                                                                                                                                                                                                   |
| **References** | CWE-704 (Incorrect Type Conversion or Cast)                                                                                                                                                                                                                                                                                                                                                                                                                               |

---

### LOW Severity

#### L-1: Admin audit logging silently fails

| Field          | Detail                                                                                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File:Line**  | `src/lib/audit/adminAudit.ts:49–64`                                                                                                                                                                                                                                        |
| **Category**   | Security (Logging)                                                                                                                                                                                                                                                         |
| **Problem**    | `logAdminAction` catches all errors and falls back to `console.warn`/`console.error`. Security-critical audit events can be silently lost in production. The comment "If table doesn't exist, log to console as fallback" suggests the table may not even be deployed yet. |
| **Fix**        | At minimum, log audit failures to the structured logger with a distinct error code so they can be monitored. Consider making audit log failure a retriable operation or triggering an alert.                                                                               |
| **References** | OWASP A09:2021 (Security Logging and Monitoring Failures)                                                                                                                                                                                                                  |

#### L-2: localStorage JSON.parse without error handling

| Field          | Detail                                                                                                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File:Line**  | `src/app/(dashboard)/dashboard/providers/[id]/edit/needs/page.tsx:54`, `offers/page.tsx:54`, `social/page.tsx:44`                                                                                                                      |
| **Category**   | Code Bug                                                                                                                                                                                                                               |
| **Problem**    | All three dashboard sub-pages call `JSON.parse(stored)` on localStorage values without try-catch. If localStorage is corrupted or tampered, the page crashes. The same pattern exists in `ProviderEditForm.tsx` (lines 128, 134, 140). |
| **Fix**        | Wrap in try-catch: `try { setSelectedIds(JSON.parse(stored)); } catch { localStorage.removeItem(key); }`                                                                                                                               |
| **References** | CWE-20 (Improper Input Validation)                                                                                                                                                                                                     |

#### L-3: console.error used instead of structured logger in upload-image

| Field         | Detail                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File:Line** | `src/app/api/admin/upload-image/route.ts:65`, `src/app/api/admin/upload-image/route.ts:74`                                                                                                       |
| **Category**  | Code Quality                                                                                                                                                                                     |
| **Problem**   | Uses `console.error` for error logging while all other admin routes use the structured `logger.error` from `@/lib/logging/structuredLogger`. Inconsistent logging makes error monitoring harder. |
| **Fix**       | Import and use the structured logger.                                                                                                                                                            |

#### L-4: Deprecated onKeyPress used in dashboard pages

| Field         | Detail                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------- |
| **File:Line** | `src/app/(dashboard)/dashboard/providers/[id]/edit/needs/page.tsx:152`, `offers/page.tsx:152` |
| **Category**  | Code Quality                                                                                  |
| **Problem**   | Uses deprecated `onKeyPress` event handler. This is removed in modern browser standards.      |
| **Fix**       | Replace with `onKeyDown`: `onKeyDown={(e) => e.key === 'Enter' && createNeed()}`              |

#### L-5: getUserRole logs PII (emails) in development

| Field         | Detail                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File:Line** | `src/lib/auth/roles.ts:19–23`                                                                                                                                            |
| **Category**  | Security (Data Exposure)                                                                                                                                                 |
| **Problem**   | Development logging includes `rows: allRows` which contains user email addresses. While dev-only, PII in logs can end up in shared terminals, CI logs, or crash reports. |
| **Fix**       | Log only `rowCount` and `roles` in development, not full row data.                                                                                                       |

---

## Positive Security Practices Observed

The following security patterns in the recent changes are **well-implemented** and worth acknowledging:

| Practice                          | Example                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Auth on every route**           | All 6 new API routes check `getUserFromCookie()` + `isAdminOrModerator()`                        |
| **Zod schema validation**         | `providerReviewUpdateSchema` and `providerEditUpdateSchema` with proper refinements              |
| **Input sanitization**            | `sanitizeTextInput()` applied to all user-editable text fields (except providerImages)           |
| **Rate limiting**                 | `rateLimiters.adminReview` on edit-provider, review-provider, needs, and offers routes           |
| **Audit logging**                 | All mutation endpoints call `logAdminAction` with IP and user-agent                              |
| **Optimistic concurrency**        | `expectedUpdatedAt` parameter prevents silent overwrites by concurrent admins                    |
| **Payload size limits**           | `content-length` check on edit-provider and review-provider                                      |
| **Production error sanitization** | edit-provider and review-provider sanitize error messages in production                          |
| **Duplicate detection**           | Needs/Offers creation validates against existing items before insert + handles unique constraint |
| **UUID validation**               | Provider ID validated with regex in GET route, Zod `.uuid()` in PATCH routes                     |

---

## Cross-Reference with Audit 049

| 049 Finding                                 | Status in This Diff                                               |
| ------------------------------------------- | ----------------------------------------------------------------- |
| C-1: Unauthenticated privilege escalation   | **Not affected** — new routes all require auth                    |
| C-2: Unauthenticated email/token generation | **Not affected** — not in scope of these changes                  |
| H-1 through H-4                             | **Not affected** — these changes address a different feature area |

---

## Dependency Vulnerabilities (npm audit)

| Severity | Count | Packages                                                                                                  |
| -------- | ----- | --------------------------------------------------------------------------------------------------------- |
| High     | 1     | picomatch                                                                                                 |
| Moderate | 8     | @ducanh2912/next-pwa, @rollup/plugin-terser, brace-expansion, serialize-javascript, terser-webpack-plugin |

---

## Test Coverage Assessment

The diff includes comprehensive test files:

- `admin-edit-provider.test.ts` (171 lines) — API route tests
- `admin-taxonomy-create.test.ts` (172 lines) — taxonomy creation tests
- `ProviderEditForm.regression.test.tsx` (319 lines) — regression tests
- `AdminProviderDetailButtons.test.tsx` (76 lines) — component tests
- `admin-provider-edit.test.ts` (163 lines) — service layer tests
- `RejectModal.test.tsx` updates — mandatory feedback tests

**Gaps identified:**

1. No tests for `upload-image` route (no validation, error handling, or auth tests)
2. No tests for dashboard edit sub-pages (needs, offers, social, category, images pages)
3. No negative test for calling `rejectProvider` without feedback
4. No test for localStorage corruption/tampering scenarios

---

## Recommendations Priority

| Priority                    | Action                                           | Findings |
| --------------------------- | ------------------------------------------------ | -------- |
| **P0 (Before next deploy)** | Fix error message leakage in needs/offers routes | H-2      |
| **P0 (Before next deploy)** | Add file extension allowlist to upload-image     | H-1      |
| **P1 (This sprint)**        | Sanitize or validate providerImages field        | M-1      |
| **P1 (This sprint)**        | Add UUID validation to array fields in schema    | M-3      |
| **P1 (This sprint)**        | Add rate limiting to upload-image                | M-4      |
| **P1 (This sprint)**        | Add dashboard layout auth guard                  | M-2      |
| **P2 (Next sprint)**        | Fix middleware matcher or remove dead code       | M-5      |
| **P2 (Next sprint)**        | Update rejectProvider hook type                  | M-6      |
| **P2 (Next sprint)**        | Address npm audit findings                       | H-3      |
| **P3 (Backlog)**            | Address Low findings (L-1 through L-5)           | L-\*     |
