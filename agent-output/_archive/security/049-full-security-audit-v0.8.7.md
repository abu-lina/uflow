# 049 — Full Security Audit: UFlow v0.8.7

| Field            | Value                                      |
|------------------|--------------------------------------------|
| **Document ID**  | 049                                        |
| **Type**         | Security Audit                             |
| **Status**       | Draft                                      |
| **Verdict**      | BLOCKED_PENDING_REMEDIATION                |
| **Version**      | v0.8.7                                     |
| **Date**         | 2026-03-22                                 |
| **Mode**         | Full 5-Phase Audit                         |
| **Prior Audit**  | 037 (dependency-only, v0.7.1, 2025-03-08)  |
| **Scope**        | Dependency, Auth, RLS, API, CSP, Secrets, Data Exposure |

---

## Executive Summary

UFlow v0.8.7 has **2 Critical**, **4 High**, **4 Medium**, and **3 Low** severity findings across 7 security review areas. The two critical findings — **unauthenticated privilege escalation** and **unauthenticated email/token generation endpoints** — require immediate remediation before any production deployment.

Since the last audit (Plan 037, dependency-only), major features shipped (provider outreach/claim, category filters, data import) without application security review. Several new API routes lack proper authorization checks.

### Finding Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2     | OPEN   |
| High     | 4     | OPEN   |
| Medium   | 4     | OPEN   |
| Low      | 3     | OPEN   |
| **Total** | **13** |       |

---

## Findings

### CRITICAL

#### F-049-01: Privilege Escalation via `/api/admin/set-role` (CRITICAL)

- **OWASP**: A01 Broken Access Control
- **CVSS**: 9.8 (Critical)
- **File**: `src/app/api/admin/set-role/route.ts`
- **Status**: OPEN

**Description**: The `/api/admin/set-role` endpoint allows **any authenticated user** to set **any user's role** (including their own) to `admin`. The route only checks `getUserFromCookie()` for basic authentication but performs **no authorization check** — no `isAdminOrModerator()` call, no role validation. Any regular user can promote themselves to admin and gain full system access.

**Impact**: Complete privilege escalation. Any authenticated user can become admin, access all admin APIs, modify/delete any data, view all user information, and manage the entire platform.

**Evidence**:
```typescript
// src/app/api/admin/set-role/route.ts — Lines 28-37
// Only checks authentication, NOT authorization
const user = await getUserFromCookie();
if (!user) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
// NO admin/moderator check follows — any authenticated user proceeds
const body = await request.json();
const { userId, email, role } = body;
```

Compare with other admin routes that correctly check authorization:
```typescript
// src/app/api/admin/pending-providers/route.ts (CORRECT pattern)
const hasAccess = await isAdminOrModerator(user.id);
if (!hasAccess) { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
```

**Remediation**:
```typescript
import { isAdminOrModerator } from '@/lib/auth/roles';
// After getUserFromCookie() check, add:
const hasAccess = await isAdminOrModerator(user.id);
if (!hasAccess) {
  return NextResponse.json(
    { error: 'Forbidden - Admin access required' },
    { status: 403 }
  );
}
```

---

#### F-049-02: Unauthenticated Email & Token Generation Endpoints (CRITICAL)

- **OWASP**: A01 Broken Access Control, A07 Authentication Failures
- **CVSS**: 8.6 (High-Critical)
- **Files**:
  - `src/app/api/send-auth-email/route.ts`
  - `src/app/api/generate-confirmation-token/route.ts`
- **Status**: OPEN

**Description**: Two API endpoints have **no authentication or authorization checks** and accept arbitrary input:

1. **`/api/send-auth-email`**: Accepts an arbitrary `to` email address and `confirmationUrl`, then sends branded UmmahFlow emails with the caller-supplied URL injected into the HTML template. An attacker can send phishing emails from `noreply@ummahflow.com` containing arbitrary URLs to any email address.

2. **`/api/generate-confirmation-token`**: Generates valid confirmation tokens for any email address without authentication. Has no rate limiting. Returns the raw token in the response, enabling token abuse.

**Impact**:
- **Phishing**: Attacker sends official-looking UmmahFlow emails containing malicious URLs to victims.
- **Token Forgery**: Attacker generates confirmation tokens for any user, potentially confirming accounts or resetting passwords.
- **Reputation**: UmmahFlow's domain/email reputation damage from phishing campaigns.

**Evidence** (`send-auth-email/route.ts`):
```typescript
export async function POST(request: Request) {
  const { to, type, language, confirmationUrl } = await request.json();
  // NO authentication check
  // NO rate limiting
  // confirmationUrl is injected directly into HTML email:
  // html: template.html.replace('{{CONFIRMATION_URL}}', confirmationUrl)
}
```

**Evidence** (`generate-confirmation-token/route.ts`):
```typescript
export async function POST(request: Request) {
  const { userId, email, type } = await request.json();
  // NO authentication check
  // NO rate limiting
  const token = crypto.randomBytes(32).toString('hex');
  // Returns raw token to unauthenticated caller
  return NextResponse.json({ token, expiresAt });
}
```

**Remediation**:
- Option A (Preferred): Make both endpoints **internal-only** by validating a shared internal secret header, or call these functions directly from server-side code instead of exposing them as API routes.
- Option B: Add authentication via `getUserFromCookie()` + verify the caller is requesting for their own account.
- For `send-auth-email`: **Always construct confirmationUrl server-side** from trusted `NEXT_PUBLIC_SITE_URL` — never accept it from the client.
- Add rate limiting to both endpoints.

---

### HIGH

#### F-049-03: Hardcoded Default Admin Debug Key (HIGH)

- **OWASP**: A05 Security Misconfiguration, A07 Authentication Failures
- **CVSS**: 7.5
- **Files**:
  - `src/app/api/auth/debug-ip-status/route.ts` (lines 20, 98)
  - `src/app/api/auth/magic-link-diagnostic/route.ts` (line 15)
- **Status**: OPEN

**Description**: The debug endpoints use `process.env.ADMIN_DEBUG_KEY || 'debug-key-change-in-production'` as the fallback admin key. If the `ADMIN_DEBUG_KEY` environment variable is not set (which is likely in some deployment scenarios), **anyone who knows this default string** (which is in the source code) can:
- List all blocked IPs
- Unblock arbitrary IPs
- Clear all IP blocks at once
- View diagnostic info for any user's IP/email

**Evidence**:
```typescript
const expectedKey = process.env.ADMIN_DEBUG_KEY || 'debug-key-change-in-production';
```

**Remediation**:
```typescript
const expectedKey = process.env.ADMIN_DEBUG_KEY;
if (!expectedKey) {
  return NextResponse.json(
    { error: 'Admin debug endpoint is not configured' },
    { status: 503 }
  );
}
```

---

#### F-049-04: User Enumeration via `/api/check-email-exists` (HIGH)

- **OWASP**: A07 Authentication Failures
- **CVSS**: 7.0
- **File**: `src/app/api/check-email-exists/route.ts`
- **Status**: OPEN

**Description**: The `/api/check-email-exists` endpoint uses the admin client (bypassing RLS) to list all users and check if an email exists, then returns a definitive answer. Rate limiting (5/min) is insufficient for automated enumeration. This enables attackers to verify which email addresses are registered on the platform.

Additionally, the signup endpoint (`/api/auth/signup`) returns HTTP 409 with `"User with this email already exists"` — another enumeration vector.

**Impact**: Credential stuffing attacks, targeted phishing, privacy violation.

**Remediation**:
- Return the same response regardless of whether the email exists: `"If this email is registered, you will receive a confirmation."` (for flows that need it).
- If email existence check is functionally required (e.g., login form UX), consider returning ambiguous messages and using CAPTCHA.

---

#### F-049-05: Push Notification Admin Check Uses Client-Mutable `user_metadata` (HIGH)

- **OWASP**: A01 Broken Access Control
- **CVSS**: 7.5
- **File**: `src/app/api/push/send/route.ts` (line 244)
- **Status**: OPEN

**Description**: The push notification send endpoint checks admin authorization via `authUser.user_metadata?.role`. In Supabase, `user_metadata` can be modified by the user themselves via `auth.updateUser()`. This means any user can set their `user_metadata.role` to `'admin'` and send push notifications to arbitrary users.

**Evidence**:
```typescript
const userRole = authUser.user_metadata?.role;  // Client-mutable!
const isAdmin = userRole === 'admin' || userRole === 'moderator';
```

**Remediation**: Use the server-authoritative role check from the database:
```typescript
import { isAdminOrModerator } from '@/lib/auth/roles';
const isAdmin = await isAdminOrModerator(authUser.id);
```

---

#### F-049-06: CSP Headers Removed — No XSS Protection Layer (HIGH)

- **OWASP**: A03 Injection, A05 Security Misconfiguration
- **CVSS**: 6.5
- **File**: `next.config.js` (headers section, ~line 325)
- **Status**: OPEN

**Description**: The Content-Security-Policy header has been explicitly removed from the response headers. The comment states: "CSP removed - Next.js 15 overrides custom CSP with its own nonce-based CSP". However, Next.js only applies nonce-based CSP when configured via `next.config.js` `experimental.serverActions` or similar — it does not automatically generate CSP headers.

The `buildCsp()` function still exists in the file but is only used in the `images.contentSecurityPolicy` option (which only applies to `<Image>` components), not in the HTTP response headers.

Meanwhile, the CSP function includes `'unsafe-inline' 'unsafe-eval'` for scripts, which is already weak, but having no CSP at all removes an important defense-in-depth layer against XSS.

Combined with 3 uses of `dangerouslySetInnerHTML`:
- `src/app/layout.tsx` (theme script — controlled, low risk)
- `src/components/shared/LandingHero.tsx` (translation string — low risk if i18n keys are trusted)
- `src/components/shared/AboutCard.tsx` (`quote.quote` — **risk depends on data source**, needs audit)

**Remediation**: Re-add CSP header to the `headers()` config. Remove `'unsafe-eval'` and minimize `'unsafe-inline'` usage with nonces.

---

### MEDIUM

#### F-049-07: Instagram Scrape Route — Unvalidated Username Input (MEDIUM)

- **OWASP**: A10 SSRF, A03 Injection
- **CVSS**: 5.5
- **File**: `src/app/api/instagram/scrape/route.ts`
- **Status**: OPEN

**Description**: The Instagram scrape route takes a user-supplied `username` and interpolates it directly into a URL:
```typescript
`https://www.instagram.com/${username}/?__a=1&__d=dis`
```
While the base URL is hardcoded to Instagram (limiting SSRF), there is no input validation on `username`. Path traversal characters, special characters, or excessively long inputs are not filtered. Additionally, this route has no rate limiting and no authentication.

**Remediation**:
- Validate username against Instagram's format: `/^[a-zA-Z0-9._]{1,30}$/`
- Add rate limiting
- Consider caching responses

---

#### F-049-08: In-Memory Rate Limiting — Not Effective in Multi-Instance Deployments (MEDIUM)

- **OWASP**: A04 Insecure Design
- **CVSS**: 5.0
- **Files**: `src/middleware.ts`, multiple API routes
- **Status**: OPEN

**Description**: All rate limiting uses in-memory `Map` stores. These:
1. Reset on every deployment/restart
2. Don't share state across multiple server instances
3. Can grow unbounded (middleware has a 10,000 entry cleanup, but API routes don't)

In the current single-instance Hetzner deployment this is functional, but it means:
- Rate limits reset on deploy (attackers can time attacks around deploys)
- Memory leaks in long-running processes

**Remediation**: Acceptable for current scale (<5,000 DAU per architecture principles), but document the limitation. Add memory bounds to all rate limit Maps, not just middleware.

---

#### F-049-09: Debug Endpoints Accessible in Non-Production via NODE_ENV Check (MEDIUM)

- **OWASP**: A05 Security Misconfiguration
- **CVSS**: 4.5  
- **Files**:
  - `src/app/api/debug/waitlist-flow/route.ts`
  - `src/app/api/debug/feature-flags/route.ts`
  - `src/app/api/debug/vapid/route.ts`
  - `src/app/api/auth/debug-ip-status/route.ts`
  - `src/app/api/auth/magic-link-diagnostic/route.ts`
- **Status**: OPEN

**Description**: Debug routes under `/api/debug/*` check `NODE_ENV === 'production'` to restrict access. This is reasonable but relies on correct ENV configuration. The waitlist-flow debug route uses the admin client and can expose user emails. The `debug-ip-status` and `magic-link-diagnostic` routes are accessible in production (they only check the admin key, which has the default hardcoded value per F-049-03).

**Note**: `/api/auth/debug-ip-status` and `/api/auth/magic-link-diagnostic` are **production-accessible** — they don't check `NODE_ENV`. Combined with F-049-03, this is a real exposure.

**Remediation**:
- Ensure `ADMIN_DEBUG_KEY` is set in all environments (resolve F-049-03)
- Consider adding `isAdminOrModerator()` check instead of/in addition to a static key
- Add explicit production block to diagnostic endpoints or ensure proper auth

---

#### F-049-10: Next.js Moderate Vulnerability (GHSA-3x4c-7xq6-9pq8) (MEDIUM)

- **OWASP**: A06 Vulnerable Components
- **CVSS**: ~5.0 (Moderate)
- **Package**: `next` 15.5.9 → fixed in 15.5.14
- **Status**: OPEN

**Description**: `npm audit` reports 1 moderate vulnerability: "Next.js: Unbounded next/image disk cache growth can exhaust storage". Fix available via `npm audit fix` (upgrade to `next@^15.5.14`).

This is separate from the prior Dependabot alerts (2 HIGH / 1 MODERATE from v0.8.1). The Dependabot alerts should be re-assessed against current package versions.

**Remediation**: `npm audit fix` to upgrade next to 15.5.14+.

---

### LOW

#### F-049-11: Plan 037 Dependency Overrides — Re-verification Needed (LOW)

- **OWASP**: A06 Vulnerable Components
- **CVSS**: 3.0
- **File**: `package.json` (overrides section)
- **Status**: OPEN

**Description**: Plan 037 added overrides for: `js-yaml ^4.1.1`, `minimatch >=3.1.5`, `immutable ^3.8.3`, `serialize-javascript >=7.0.4`, `dompurify ^3.3.2`. Current `npm audit` shows only 1 finding (the Next.js image cache issue), suggesting the overrides are still effective. However, the Dependabot 2H/1M alerts flagged since v0.8.1 should be cross-referenced.

**Remediation**: Run `npm audit` after fixing F-049-10, verify 0 findings. Cross-check with GitHub Dependabot alerts.

---

#### F-049-12: Email Logging Exposes User Emails in Server Logs (LOW)

- **OWASP**: A09 Logging Failures
- **CVSS**: 3.0  
- **Files**: Multiple auth routes (`signup`, `login`, `magic-link`, `confirm-email`)
- **Status**: OPEN

**Description**: Auth routes log user email addresses in `console.log` statements:
```typescript
console.log('[SIGNUP API] Received signup request:', { email, language });
console.log('[LOGIN API] Received login request:', { email, isTest });
console.log(`[SECURITY] Email confirmation attempt for: ${email} from IP: ${ip}`);
```

While useful for debugging, in production these logs may be stored in log aggregation systems without proper PII handling, potentially violating GDPR.

**Remediation**: Mask email addresses in production logs: `user@example.com` → `u***@e***.com`.

---

#### F-049-13: Outreach Route Duplicates Admin Client Creation (LOW)

- **OWASP**: A05 Security Misconfiguration
- **CVSS**: 2.0
- **Files**:
  - `src/app/api/outreach/claim/route.ts`
  - `src/app/api/outreach/action/route.ts`
- **Status**: OPEN

**Description**: Both outreach route files define their own local `getSupabaseAdmin()` function instead of importing from `@/lib/supabase/admin`. The local version does not set `autoRefreshToken: false, persistSession: false`, which means these admin clients could potentially cache sessions across requests.

**Remediation**: Import from the centralized `@/lib/supabase/admin` module.

---

## Positive Security Practices Observed

1. **RLS Properly Enabled**: All core tables have RLS enabled with well-structured policies using `(select auth.uid())` optimization.
2. **Rate Limiting Present**: Most sensitive endpoints have rate limiting (signup: 3/hr, login: 10/15min, magic-link: 10/hr).
3. **Anti-Bot Measures**: Honeypot fields, suspicious timing detection, disposable email blocking (600+ domains).
4. **Security Headers**: HSTS (2-year with preload), X-Content-Type-Options, X-Frame-Options, Referrer-Policy all present.
5. **`poweredByHeader: false`**: X-Powered-By header disabled.
6. **Token Validation**: Middleware properly validates JWTs and handles token refresh.
7. **Admin Routes Mostly Protected**: `pending-providers`, `review-provider`, `check-role`, `debug-auth` all correctly use `isAdminOrModerator()`.
8. **IP Blocking**: Progressive IP blocking system with configurable block durations.
9. **Zod Validation**: Admin routes use Zod schemas for input validation.
10. **GDPR Consent**: Signup route validates `termsAccepted` and `privacyAccepted`.
11. **`.env` files properly gitignored**.
12. **Environment variable validation**: Client Supabase module validates URL format and key format.

---

## Remediation Priority

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| **P0** (Immediate) | F-049-01: set-role privilege escalation | 15 min | Critical |
| **P0** (Immediate) | F-049-02: Unauthenticated email/token endpoints | 2 hr | Critical |
| **P1** (This Sprint) | F-049-03: Hardcoded admin debug key | 15 min | High |
| **P1** (This Sprint) | F-049-05: Push send admin check via user_metadata | 30 min | High |
| **P1** (This Sprint) | F-049-06: CSP headers removed | 1 hr | High |
| **P1** (This Sprint) | F-049-04: User enumeration | 1 hr | High |
| **P2** (Next Sprint) | F-049-07: Instagram scrape input validation | 30 min | Medium |
| **P2** (Next Sprint) | F-049-10: Next.js vulnerability | 15 min | Medium |
| **P2** (Next Sprint) | F-049-09: Debug endpoints exposure | 1 hr | Medium |
| **P3** (Backlog) | F-049-08: In-memory rate limiting | 2 hr | Medium |
| **P3** (Backlog) | F-049-11: Override re-verification | 30 min | Low |
| **P3** (Backlog) | F-049-12: Email logging PII | 1 hr | Low |
| **P3** (Backlog) | F-049-13: Outreach admin client duplication | 15 min | Low |

---

## STRIDE Threat Model Summary

| Threat | Status | Key Findings |
|--------|--------|-------------|
| **Spoofing** | ⚠️ RISK | F-049-02: Phishing via official email endpoint |
| **Tampering** | ⚠️ RISK | F-049-01: Role escalation allows data tampering |
| **Repudiation** | ✅ OK | Audit logging present for admin actions |
| **Info Disclosure** | ⚠️ RISK | F-049-04: User enumeration; F-049-12: PII in logs |
| **Denial of Service** | ⚠️ LOW | F-049-08: Rate limiting resets on deploy |
| **Elevation of Privilege** | 🔴 CRITICAL | F-049-01, F-049-05: Direct privilege escalation paths |

---

## Verdict

**BLOCKED_PENDING_REMEDIATION** — Two critical findings (F-049-01 and F-049-02) represent immediate exploitable vulnerabilities that must be fixed before any production deployment at this version. F-049-01 is a ~15 minute fix. F-049-02 requires more careful design but is essential.
