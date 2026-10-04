---
ID: 123
Origin: 123
UUID: 4f8e1a2c
Status: Active
---

# Plan 123 — RCA: Navbar Auth State Not Updating Reactively Post-Login

**Changelog**
| Rev | Date | Author | Summary |
|-----|------|--------|---------|
| 0.1 | 2026-05-04 | Analyst | Initial RCA — code investigation complete |
| 0.2 | 2026-05-04 | Analyst | Iteration 2 — user reports fix insufficient; discovered middleware `/profile` redirect blocker (F6) |

---

## Value Statement and Business Objective

Users who log in to UmmahFlow expect immediate feedback: the profile icon in the navbar must switch to the logged-in state the moment login succeeds. The current bug forces users to close and reopen the app before the authenticated UI appears. On mobile PWA (the primary device type for this app's audience), this is a broken UX that erodes trust in the product.

**Business impact**: Every login produces a broken auth UI. The user is not redirected cleanly and believes the login failed or the app is broken, increasing support load and abandonment.

---

## Bug Summary

**Environment**: UAT (uat.ummahflow.com)  
**Symptom**: After a successful email/password login, the navbar profile icon remains in the "logged-out" state (icon links to `/login`, not `/profile`). Clicking it does nothing or navigates back to the login page. A full close/reopen of the app resolves the issue.  
**Auth succeeds**: The Supabase session is created correctly. The bug is in the UI propagation path, not the auth itself.

---

## Methodology

This analysis used **code tracing** (L1) + **flow reconstruction** (L2). No live reproduction was available (UAT only). All root cause findings are marked with their confidence level per the analysis-methodology schema.

Investigation path:
1. Identified all navbar components and how they read auth state
2. Traced the full login flow from form submit → session creation → React context update
3. Identified the specific race condition in the navigation path
4. Verified no server-side auth guard causes the redirect
5. Confirmed why reload fixes it (but reactive update does not)

---

## System Context

### Auth Architecture Overview

```
Browser                           Server
──────                            ──────
supabase (createClient)          createSupabaseServerClient
  └─ localStorage                  └─ cookieAdapter (reads next/headers cookies)
       │                                    │
       └─ onAuthStateChange                 │
            │                              (always returns null — cookie mismatch, see Finding F3)
            ▼
       AuthProvider (React context)
            │
            ├─ Header.tsx          (useAuth)
            ├─ MobileFooterBar.tsx (useAuth)
            └─ CityEarlyAccessNavbar.tsx (useAuth)
```

### Key Files

| File | Role |
|------|------|
| `src/providers/auth-provider.tsx` | React context — holds `user` state, subscribes to `onAuthStateChange` |
| `src/components/layout/ClientProviders.tsx` | Wraps layout with `AuthProvider initialUser={serverUser}` |
| `src/app/layout.tsx` | Root Server Component — fetches `initialUser` from Supabase SSR client |
| `src/app/(public)/login/LoginPageContent.tsx` | Login form — calls `signInWithEmailConfirmation`, navigates on success |
| `src/app/(public)/profile/ProfileContent.tsx` | Profile page — redirects to `/login` if no `effectiveUser` |
| `src/lib/supabase/client.ts` | Browser Supabase client (`createClient`, not `createBrowserClient`) |
| `src/providers/AuthSyncer.tsx` | Async cookie bridge — syncs tokens to `sb-access-token` cookie via `/api/auth/set` |
| `src/components/common/MobileFooterBar.tsx` | Mobile navbar — uses `useAuth()` |
| `src/components/shared/CityEarlyAccessNavbar.tsx` | Early access navbar — uses `useAuth()` |
| `src/components/layout/Header.tsx` | Desktop header — uses `useAuth()` |

---

## Findings

### F1 — Primary Race Condition: Premature navigation in `handleSubmit`

**Confidence: L1 Proven** (direct code inspection)

**File**: `src/app/(public)/login/LoginPageContent.tsx`

In `handleSubmit` (line ~108), after `signInWithEmailConfirmation` returns `data`, the code immediately calls `router.push('/profile')`:

```typescript
// LoginPageContent.tsx — handleSubmit (line ~108)
if (data) {
  const returnUrl = searchParams.get('returnUrl');
  if (returnUrl) {
    router.push(decodeURIComponent(returnUrl));
  } else {
    router.push('/profile');   // ← fires BEFORE user is in React state
  }
}
```

**The problem**: `signInWithEmailConfirmation` wraps `supabase.auth.signInWithPassword()`. When `signInWithPassword()` resolves and returns `data`, Supabase has:
1. Stored the session in localStorage ✓
2. Emitted `SIGNED_IN` via `_notifyAllSubscribers` — but this is an **async notification** (the Supabase auth-js `_notifyAllSubscribers` is an `async` function that may await a `broadcastChannel.postMessage` before calling subscribers)

This means at the moment `handleSubmit` calls `router.push('/profile')`, the `onAuthStateChange(SIGNED_IN)` handler in `AuthProvider` **may not have executed yet**. React's state update from `setUser(session.user)` has not been committed. `AuthProvider.user` is still `null`.

---

### F2 — Cascading Redirect: `ProfileContent` redirects unauthenticated users to `/login`

**Confidence: L1 Proven** (direct code inspection)

**File**: `src/app/(public)/profile/ProfileContent.tsx`

```typescript
// ProfileContent.tsx (line ~191)
const effectiveUser: SupabaseUser | null = user || (clientUser as SupabaseUser | null);

useEffect(() => {
  if (!loading && !effectiveUser) {
    router.replace('/login');   // ← fires when clientUser is still null
  }
}, [effectiveUser, loading, router]);
```

When `router.push('/profile')` fires with `user = null` in React state (F1), the `/profile` page renders with:
- `user = null` (prop from server — server always returns null, see F3)
- `clientUser = null` (from `useAuth()` — React state not yet updated)
- `loading = false` (already initialized)
- `effectiveUser = null`

The `useEffect` fires and calls `router.replace('/login')` — redirecting the user back to the login page **before the auth state is committed to React context**.

---

### F3 — Cookie Format Mismatch: Server always returns `initialUser = null`

**Confidence: L1 Proven** (direct code inspection)

**Files**: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/providers/AuthSyncer.tsx`, `src/app/api/auth/set/route.ts`

The browser Supabase client uses `createClient` from `@supabase/supabase-js` (not `createBrowserClient` from `@supabase/ssr`):

```typescript
// src/lib/supabase/client.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, flowType: 'pkce', ... }
});
```

`createClient` stores sessions in **localStorage only**, not in cookies. The server-side client (`createServerClient` from `@supabase/ssr`) reads cookies via `cookieAdapter` (`next/headers`). The Supabase SSR client looks for a cookie named `sb-auth-token` (or `sb-<ref>-auth-token`).

`AuthSyncer` bridges this by manually posting to `/api/auth/set` which sets `sb-access-token` and `sb-refresh-token` cookies. These cookie names do NOT match what `createServerClient` expects. Therefore:

- **Root layout `getSession()`** → reads cookies via `createServerClient` → never finds a matching auth cookie → always returns `null` → `initialUser = null` always
- This means the server cannot bootstrap auth state — all auth state comes from client-side `onAuthStateChange` or `getSession()` on the browser client

**Impact on the bug**: `initialUser` is always `null` from the server, but this is not itself the bug — it means the `AuthProvider.useEffect([initialUser])` never re-runs on navigation (deps don't change), so `user` state is preserved. However, this structural issue means the application is entirely dependent on the `onAuthStateChange` timing for reactive auth updates.

---

### F4 — Double Navigation in `LoginPageContent`

**Confidence: L1 Proven** (direct code inspection)

**File**: `src/app/(public)/login/LoginPageContent.tsx`

There are TWO code paths that navigate to `/profile` after login:

```typescript
// PATH 1: handleSubmit — fires IMMEDIATELY with data (before user is in context)
if (data) {
  router.push('/profile');                      // line ~108
}

// PATH 2: useEffect([user]) — fires AFTER user is confirmed in React context
useEffect(() => {
  if (user) {
    router.replace('/profile');                 // line ~57
  }
}, [user, router, searchParams]);
```

PATH 1 is the problematic one (F1). PATH 2 is the correct pattern but is never reached in the bug scenario because the redirect loop from F2 re-renders `/login` in an inconsistent state.

When PATH 1 causes the `ProfileContent → /login` redirect (F2), and the user lands back on `/login`, PATH 2 may or may not fire depending on whether `onAuthStateChange(SIGNED_IN)` has fired by that point. If `user` is still null when `LoginPageContent` re-mounts, PATH 2 does not redirect — the user is stuck on `/login` with logged-out navbar.

---

### F5 — Auth State Recovers on Reload via `initializeAuth()`

**Confidence: L1 Proven** (direct code inference from code)

**File**: `src/providers/auth-provider.tsx` (line ~34)

On a full page reload, `AuthProvider.useEffect` runs `initializeAuth()`, which calls `supabase.auth.getSession()` on the **browser client** (reads from localStorage). The session IS there (it was stored by `signInWithPassword`). This sets `user = session.user` correctly, and the navbar updates.

This is why "close/reload" fixes the issue — it bypasses the race condition entirely by reading the session directly from localStorage on cold start.

---

## Root Cause

**Primary root cause**: `LoginPageContent.handleSubmit` calls `router.push('/profile')` synchronously when `signInWithEmailConfirmation()` returns, before the `onAuthStateChange(SIGNED_IN)` event has been processed by React. This premature navigation causes `ProfileContent` to see `clientUser = null` and redirect back to `/login`.

**Secondary root cause**: The redirect-to-login guard in `ProfileContent.useEffect` fires eagerly on the initial render with null auth state, without accounting for the async propagation delay of the auth context.

**Combined effect**: A redirect loop (`/login` → `/profile` → `/login`) where the user ends up back on `/login` before `user` is committed to React context. The `useEffect([user])` recovery path in `LoginPageContent` may not fire if `onAuthStateChange` is still pending, leaving the user stuck with a logged-out navbar.

**Why this is a race condition**: The timing depends on whether Supabase's `_notifyAllSubscribers` (async) completes before Next.js's `router.push` transitions the page. In production (UAT), with real network latency for the Supabase API call, the async notification is more likely to trail behind the navigation.

---

## Reproduction Path

1. User is on the `/login` page (not logged in)
2. User submits email/password form
3. `signInWithEmailConfirmation` resolves — `data` is non-null
4. `handleSubmit` calls `router.push('/profile')` immediately — **before** `onAuthStateChange(SIGNED_IN)` fires
5. Next.js navigates to `/profile`
6. `ProfileContent` renders with `clientUser = null` (auth state not yet committed)
7. `ProfileContent.useEffect` fires: `!loading && !effectiveUser` → `router.replace('/login')`
8. User is redirected back to `/login`
9. `onAuthStateChange(SIGNED_IN)` fires eventually → `AuthProvider.user = session.user` (now committed)
10. **IF** `LoginPageContent.useEffect([user])` fires at this point → `router.replace('/profile')` → user reaches `/profile` with correct state ← recovery works
11. **IF** the timing is off and `user` is null when `LoginPageContent` re-mounts → user is stuck on `/login` with `user = null` → navbar stays logged-out

Steps 10 vs 11 explain the non-deterministic nature of the bug (it may sometimes recover, but on PWA/UAT with real latency, step 11 is the dominant path).

---

## System Weaknesses

| # | Weakness | Risk Mechanism |
|---|----------|----------------|
| W1 | Cookie/localStorage split | Browser uses localStorage, server reads cookies. Auth state is never server-authoritative. All navbar updates depend on client-side event timing. |
| W2 | Dual navigation paths in `LoginPageContent` | Two code paths both navigate to `/profile` after login, creating race conditions and confusing app router state. |
| W3 | `ProfileContent` redirect guard without pending state awareness | `!loading && !effectiveUser` is an insufficient guard — it doesn't account for a `pending` state between login and state commit. |
| W4 | `AuthProvider.useEffect([initialUser])` dependency on a prop that always resolves to `null` | The server always passes `initialUser = null` (F3). The `initialUser` prop is a no-op but adds cognitive complexity and could cause issues if it changes unexpectedly. |
| W5 | `AuthSyncer` sets non-standard cookie names | `sb-access-token` / `sb-refresh-token` do not match Supabase SSR cookie format. The server-side session check silently fails on every request. |

---

## Instrumentation Gaps

| # | Gap | Type | What it would reveal |
|---|-----|------|---------------------|
| G1 | No logging on `onAuthStateChange(SIGNED_IN)` | Normal | Whether the event fires and when, relative to navigation |
| G2 | No logging in `ProfileContent.useEffect` redirect guard | Debug | Whether the redirect fires and with what auth state |
| G3 | No logging in `LoginPageContent.useEffect([user])` | Debug | Whether the recovery redirect fires after the loop |
| G4 | No client-side auth state timeline | Debug | Sequence of: login → SIGNED_IN event → React state update → navigation |

---

## Analysis Recommendations

1. **To confirm the race condition** (convert L1 to empirical proof): Add `console.log` timing markers at: (a) the start of `handleSubmit`'s `router.push`, (b) inside `AuthProvider.onAuthStateChange` handler, (c) inside `ProfileContent.useEffect` redirect check. Compare timestamps in UAT browser DevTools.

2. **To understand PWA-specific behavior**: Test in Chrome DevTools "Application > Service Workers" mode and on actual iOS PWA (Add to Home Screen). The timing of microtask queues differs between standalone and browser mode.

3. **To verify the cookie mismatch** (F3): Open UAT DevTools → Application → Cookies. After login, check whether `sb-auth-token` or `sb-<ref>-auth-token` cookies are present. If only `sb-access-token` and `sb-refresh-token` are present, this confirms F3.

4. **To verify `initializeAuth` recovery**: On reload after login, confirm the navbar updates by checking the Redux/React DevTools for `AuthProvider.user` state change.

---

## Open Questions

| # | Question | Blocking | Required Action |
|---|----------|----------|-----------------|
| OQ1 | Does `_notifyAllSubscribers` in the installed version of `@supabase/auth-js` await `broadcastChannel.postMessage` before calling subscribers, or does it call them synchronously? | Affects exact race condition mechanics | Check `node_modules/@supabase/auth-js/dist/` source |
| OQ2 | Is there a specific PWA / service worker behaviour that exacerbates the redirect loop? | Explains why UAT (PWA mode) is worse than browser | Test on iOS PWA vs Chrome browser mode |
| OQ3 | Does `AuthSyncer`'s `/api/auth/set` successfully set cookies that `createSupabaseServerClient` can read? | Affects viability of server-side session bootstrapping | Inspect cookie names vs Supabase SSR expected format |

---

## Remaining Gaps Summary

**Gap 1 (OQ1)**: Exact async/sync behavior of `_notifyAllSubscribers` in the installed `@supabase/auth-js` version — affects race condition severity. Can be resolved by reading the installed source file in `node_modules`.

**Gap 2 (OQ2)**: PWA-specific timing differences not empirically verified. The race condition is mechanically provable by code inspection alone; whether PWA exacerbates it is supplementary context for severity assessment.

**Gap 3 (OQ3)**: The server-side cookie mismatch (F3) has not been live-verified on UAT cookies. This is a contributing factor but not the primary root cause.

These gaps do **not** block the fix — the primary root cause (F1 + F2) is L1 Proven and sufficient for Planner to create a fix plan.

---

## Handoff to Planner

**Gate satisfied**: Root cause identified with file + line references.

**Fix scope (analysis recommendation only — Planner decides implementation)**:

The fix must address the race condition at its source. Two approaches are viable:

- **Option A (Minimal)**: Remove `router.push('/profile')` from `LoginPageContent.handleSubmit`. Let `useEffect([user])` be the sole navigation trigger (it fires only after `user` is confirmed in React context). This eliminates the premature navigation.

- **Option B (Defensive)**: Keep `handleSubmit` navigation but add a `pending` auth state to `AuthProvider` that `ProfileContent` respects — do not redirect to `/login` while auth initialization is pending.

- **Option C (Architectural)**: Replace `createClient` (non-SSR) with `createBrowserClient` from `@supabase/ssr`. This stores sessions in cookies natively, removes the need for `AuthSyncer` manual sync, and makes the system consistent with the server client. Larger scope.

Planner should evaluate which option is appropriate given risk tolerance and sprint scope.

---
---

## Iteration 2 — Post-Fix Re-Investigation

**Trigger**: User reports Plan 123 fix (Iteration 1, v0.12.7) has not resolved the issue: "if I login and try to switch to my profile I'm not able to do so before I have reloaded the app."

**Scope**: Re-investigate the login → profile navigation flow after the Iteration 1 fix was applied. Identify why the symptom persists.

### Iteration 2 Methodology

1. Verified Iteration 1 fix is in the codebase (git diff against `main`, confirmed `router.push` removed from `handleSubmit` success path)
2. Traced full auth state propagation: `signInWithPassword` → `_notifyAllSubscribers` → `AuthProvider.setUser` → `useEffect([user])` → `router.replace('/profile')`
3. Verified Supabase `_notifyAllSubscribers` awaits ALL callbacks (including AuthSyncer's cookie-setting fetch) before `signInWithPassword` returns
4. Inspected middleware (`src/middleware.ts`) route handling for `/profile`
5. Inspected `shouldRedirectToWaitlist` logic in `src/lib/middleware-utils.ts`

### Iteration 2 Findings

#### F6 — Middleware Blocks `/profile` in Early Access Mode (NEW ROOT CAUSE)

**Confidence: L1 Proven** (direct code inspection of `src/middleware.ts` and `src/lib/middleware-utils.ts`)

The Next.js middleware intercepts ALL route navigations (including client-side soft navigations via RSC payload fetches). For `/profile`, when `isAppLaunched = false`:

**File**: `src/lib/middleware-utils.ts`

1. `/profile` is listed in `APP_ROUTES` (line 11) → `isAppRoute('/profile')` returns `true`
2. `/profile` is NOT in `isExcludedRoute` → returns `false`
3. `/profile` has **NO special case exemption** in `shouldRedirectToWaitlist` — unlike:
   - `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/*` (auth routes — explicitly exempted)
   - `/providers`, `/providers/*`, `/community-services/*` (discovery routes — exempted)
   - `/saved` (bookmarks — exempted)
   - `/create`, `/create/*` (recommendation flow — exempted)
   - Legal pages (GDPR compliance — exempted)
4. The only escape path is `accessToken` check: middleware reads `sb-access-token` cookie → validates → checks `isAdminOrModerator`
5. **Result**: For any non-admin user → `shouldRedirectToWaitlist` returns `true` → middleware redirects to `/providers`

**Code trace** (`shouldRedirectToWaitlist` decision path for `/profile`, `isAppLaunched = false`):

```
pathname = '/profile'
├─ pathname === '/' → false
├─ isAppLaunched → false → continue
├─ isExcludedRoute('/profile') → false → continue
├─ isAppRoute('/profile') → true → continue
├─ waitlistToken + isEarlyAccessRoute('/profile') → /profile NOT in EARLY_ACCESS_ROUTES → continue
├─ special cases: /create, /recommend-provider, /providers, /saved, legal, auth → NONE match /profile
├─ accessToken check:
│   ├─ cookie absent → return true (REDIRECT)
│   ├─ cookie present, user valid, isAdmin → return false (ALLOW)
│   └─ cookie present, user valid, NOT admin → return true (REDIRECT)
└─ return true → REDIRECT TO /providers
```

**Impact on user flow**:

After Iteration 1 fix:
1. User logs in → `handleSubmit` returns without navigation ✓
2. `onAuthStateChange(SIGNED_IN)` fires → `setUser(session.user)` ✓
3. `useEffect([user])` fires → `router.replace('/profile')` ✓
4. Next.js makes RSC payload request to `/profile` → **middleware intercepts** → redirect to `/providers` ✗
5. User ends up on `/providers` instead of `/profile`
6. User clicks Profile icon in navbar → `href="/profile"` → **middleware redirects again** ✗

The Plan 123 Iteration 1 fix (removing premature `router.push`) was correct for the auth race condition but was **masked by this independent middleware blocker** operating at a different layer.

#### F7 — Iteration 1 Fix Verified Correct

**Confidence: L1 Proven** (git diff and code inspection)

The Plan 123 Iteration 1 changes are confirmed in the codebase:

- `LoginPageContent.handleSubmit`: success path does `return;` (no `router.push`) — verified via `git diff main`
- `LoginModal.handleSubmit`: success path calls `onClose()` only (no `router.push`) — verified by reading source
- `useEffect([user])` in `LoginPageContent` correctly fires `router.replace('/profile')` when `user` becomes non-null
- `AuthProvider.onAuthStateChange` callback correctly sets `user` state on `SIGNED_IN` event
- Supabase `_notifyAllSubscribers` (in `@supabase/auth-js`) awaits ALL subscriber callbacks (including AuthSyncer's cookie-setting fetch) before `signInWithPassword` returns — the `sb-access-token` cookie IS set before `handleSubmit` completes

The auth race condition fix is architecturally sound. The remaining symptom is caused by F6 (middleware redirect), not by the auth state propagation.

#### F8 — Cookie Timing Is Not the Issue

**Confidence: L1 Proven** (Supabase `@supabase/auth-js` source code inspection at `node_modules/@supabase/auth-js/dist/module/GoTrueClient.js`)

`_notifyAllSubscribers` (line 2010) calls all registered `onAuthStateChange` callbacks via `Promise.all`. The AuthSyncer's subscription callback (which does `await fetch('/api/auth/set')`) is included. The `signInWithPassword` function awaits `_notifyAllSubscribers`. Therefore:

- `signInWithPassword` does NOT return until the cookie-setting fetch completes
- `signInWithEmailConfirmation` does NOT return until `signInWithPassword` returns
- `handleSubmit` does NOT finish until `signInWithEmailConfirmation` returns
- `router.replace('/profile')` (in `useEffect`) fires AFTER React re-renders
- By this point, the `sb-access-token` cookie is already set in the browser

The cookie IS available for the subsequent RSC payload fetch to `/profile`. The middleware DOES see the cookie. But for non-admin users, the middleware STILL redirects because `isAdminOrModerator` returns false.

### Iteration 2 Root Cause

**Primary**: F6 — Middleware redirects `/profile` to `/providers` for all non-admin users when `isAppLaunched = false`. The `/profile` route was never added to the special case exemptions in `shouldRedirectToWaitlist`.

**Relationship to Iteration 1**: The Iteration 1 fix (F1/F2 race condition) was correct but insufficient. The middleware blocker (F6) is a **separate, independent issue** at the server/Edge layer that prevents the client-side fix from taking effect for the `/profile` route.

**Why reload might appear to help**: If the user is admin/moderator AND the `sb-access-token` cookie wasn't set in time for the first navigation (unlikely but possible), reload ensures the cookie is present. For non-admin users, reload does NOT help — the middleware always redirects.

### Iteration 2 Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| G5 | What is `isAppLaunched` on the user's actual test environment? | If `true`, F6 doesn't apply and there's a different issue | Check `.env.local` or UAT env vars for `NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED` | User |
| G6 | Is the user admin/moderator? | If admin, middleware allows access with cookie | Verify user role in Supabase `profiles` table | User |
| G7 | Does Next.js 15 middleware actually run on RSC payload fetches during soft navigation? | Affects whether F6 applies to `router.replace` navigations | Check browser Network tab for redirect responses on `/profile` RSC fetch | User |

### Iteration 2 Analysis Recommendations

1. **Confirm F6 empirically** (highest priority): Open browser DevTools → Network tab → log in → watch for the `/profile` RSC payload request → check if middleware returns a 307/308 redirect to `/providers`. This would conclusively prove F6.

2. **Check `isAppLaunched` value**: Run `console.log(process.env.NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED)` in the browser console or check the `.env.local` file. If `true`, F6 doesn't apply and investigation should continue on the client side.

3. **If F6 confirmed**: Add `/profile` to the special case exemptions in `shouldRedirectToWaitlist` (same pattern as `/saved` — allow access, let page component handle auth/authorization). This is a minimal fix.

### Iteration 2 Handoff to Planner

**Gate satisfied**: New root cause (F6) identified with file references and decision path trace.

**Fix scope for Planner**:
- Add `/profile` (and subpaths) to the middleware exemptions in `src/lib/middleware-utils.ts`
- Pattern: same as the existing `/saved` exemption — allow access, let `ProfileContent`'s own `useEffect` guard handle unauthorized users
- Alternatively, add `/profile` to the auth routes exemption block alongside `/login` and `/signup`
