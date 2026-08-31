---
ID: 204
Origin: 204
UUID: c8d2f47e
Status: Committed
---

# Analysis: Provider Edit Redirect to /providers on UAT

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-08-05T10:45Z | analyst | Initial analysis — RCA determined |

---

## Resolution

**Root cause confirmed [L1 Proven]**: `UAT_SUPABASE_SERVICE_ROLE_KEY` GitHub Secret was incorrect. Updated in GitHub Secrets and redeployed — provider edit now works on UAT.

---

## Value Statement and Business Objective

Admin/moderator users on UAT cannot edit providers — clicking "Edit" redirects to `/providers` instead of opening the edit page. This blocks moderation workflow testing and live content management.

---

## Objective

Determine why the provider edit redirect occurs and whether it's caused by a recent SQL/migration change.

---

## Context

- **Reporter observation**: Edit button is visible (Plan 203 fix confirmed working) but click redirects to `/providers`
- **Reporter hypothesis**: Recent SQL/migration may have changed a DB policy
- **Environment**: UAT (uat.ummahflow.com)
- **Prior occurrence**: `sql/fix-naveed-user-sync.sql` exists — evidence this exact user_id mismatch issue has happened before

---

## Methodology

1. Trace the edit button navigation path through the codebase
2. Identify all redirect-to-`/providers` control points
3. Analyze RLS policies, migrations, and auth chain
4. Classify findings by confidence level

---

## Findings

### F-1: Redirect origin identified — `(dashboard)` layout auth guard [L1 Proven]

The edit button navigates to `/dashboard/providers/{id}/edit`. The route group `(dashboard)` has a server-side layout at:

**File**: `src/app/(dashboard)/layout.tsx`

```typescript
export default async function DashboardLayout({ children }) {
  const user = await getUserFromCookie();
  if (!user) redirect('/login');
  
  const authorized = await isAdminOrModerator(user.id);
  if (!authorized) redirect('/providers');  // ← THIS IS THE REDIRECT
  
  return <>{children}</>;
}
```

**Conclusion**: The redirect to `/providers` happens because `isAdminOrModerator(user.id)` returns `false`.

### F-2: `isAdminOrModerator` queries `public.users` via service_role [L1 Proven]

**File**: `src/lib/auth/roles.ts`

```typescript
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = getSupabaseAdmin(); // service_role key — bypasses RLS
  const { data: allRows, error: queryError } = await supabase
    .from('users')
    .select('role, user_id, email')
    .eq('user_id', userId);

  if (allRows && allRows.length > 0) {
    return (allRows[0].role as UserRole) || 'user';
  }
  // ... fallback ...
  if (error || !data) {
    console.warn(`[getUserRole] Defaulting to 'user' role for ${userId}`);
    return 'user';  // ← SILENT FAILURE defaults to 'user'
  }
}
```

The service_role client bypasses RLS. The function defaults to `'user'` on ANY error or missing data.

### F-3: No code changes to auth chain since before the issue started [L1 Proven]

```
git log --oneline origin/main --since="2026-07-01" -- \
  "src/app/(dashboard)/layout.tsx" "src/lib/auth/roles.ts"
```
→ Empty result. No code changes to these files in July or August 2026.

### F-4: No migration alters `public.users` data or role column [L1 Proven]

Searched all migrations 094–121 for `ALTER TABLE.*users`, `DELETE FROM.*users`, `UPDATE.*users.*role`, `TRUNCATE.*users`. No matches.

### F-5: `FORCE ROW LEVEL SECURITY` not applied anywhere [L1 Proven]

Grep across all `supabase/` and `sql/` for `FORCE ROW LEVEL` — no matches. Service_role bypass is intact at the code level.

### F-6: Prior occurrence documented — `fix-naveed-user-sync.sql` [L2 Observed]

The script `sql/fix-naveed-user-sync.sql` demonstrates this EXACT issue has happened before for naveed@yaneel.com:
- `public.users.user_id` was out of sync with `auth.users.id`
- The fix: UPDATE `public.users SET user_id = (SELECT id FROM auth.users WHERE email = ...)` and SET `role = 'admin'`

### F-7: Middleware is NOT the cause [L1 Proven]

`shouldRedirectToWaitlist` only checks `APP_ROUTES` prefixes. `/dashboard/...` doesn't match any of them. The middleware passes through for dashboard routes.

---

## Root Cause

**L2 Observed** (cannot prove without querying UAT database directly):

The `public.users` table on UAT either:

1. **Has no row** for the current `auth.users.id` of naveed@yaneel.com (query returns 0 rows → defaults to `'user'` role)
2. **Has a row with `role = 'user'`** (the `handle_new_user()` trigger creates entries with `role = 'user'` by default)
3. **Has a row with a stale `user_id`** that doesn't match the current `auth.users.id` (previously documented in `fix-naveed-user-sync.sql`)

**Most likely scenario**: The auth.users entry for naveed@yaneel.com was recreated (e.g., UAT Supabase project reset, auth table refresh, or re-signup), causing the `handle_new_user` trigger to create a NEW `public.users` row with `role = 'user'`. The previous admin row either still exists (pointing to the old auth user ID) or was cascade-deleted.

**This is NOT caused by any code or migration change**. The code correctly queries the DB — the DB data itself is incorrect for this user on UAT.

---

## System Weaknesses

| # | Weakness | Risk Mechanism | Impact |
|---|----------|---------------|--------|
| 1 | `getUserRole` silently defaults to `'user'` on any query error/miss | Admin loses access without any error message or log trail | HIGH — blocks admin workflow, hard to diagnose |
| 2 | No admin seeding in deployment pipeline | UAT/staging environment refreshes lose admin role assignments | MEDIUM — recurs on every env reset |
| 3 | No observable telemetry for failed role lookups | `console.warn` only in dev mode; production silently degrades | MEDIUM — impossible to triage without adding logging |
| 4 | `handle_new_user()` trigger always sets `role = 'user'` | Auth recreation always loses admin/moderator status | LOW — expected behavior, but no recovery mechanism |

---

## Instrumentation Gaps

| # | Telemetry | Level | Purpose |
|---|-----------|-------|---------|
| 1 | Structured log when `isAdminOrModerator` returns `false` for a `/dashboard` route | Normal | Detect admin access failures in production |
| 2 | Structured log with user ID + email when `getUserRole` falls back to default | Normal | Diagnose user_id mismatches without DB access |
| 3 | Health-check endpoint that verifies admin user exists in `public.users` | Debug | Post-deployment validation |

---

## Immediate Fix (Database)

Run the following SQL on UAT Supabase SQL Editor to restore admin access:

```sql
-- Diagnose current state
SELECT 
  u.user_id as public_user_id,
  u.email,
  u.role,
  a.id as auth_user_id,
  CASE WHEN u.user_id = a.id THEN '✅ SYNCED' ELSE '❌ MISMATCH' END as sync_status
FROM public.users u
FULL OUTER JOIN auth.users a ON u.email = a.email
WHERE u.email = 'naveed@yaneel.com' OR a.email = 'naveed@yaneel.com';

-- Fix: Ensure public.users.user_id matches auth.users.id and role = admin
UPDATE public.users
SET 
  user_id = (SELECT id FROM auth.users WHERE email = 'naveed@yaneel.com' LIMIT 1),
  role = 'admin',
  updated_at = NOW()
WHERE email = 'naveed@yaneel.com'
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'naveed@yaneel.com');

-- If no row exists, create one
INSERT INTO public.users (user_id, email, role, created_at, updated_at)
SELECT id, email, 'admin', NOW(), NOW()
FROM auth.users
WHERE email = 'naveed@yaneel.com'
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'naveed@yaneel.com')
ON CONFLICT (email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  role = 'admin',
  updated_at = NOW();
```

---

## Analysis Recommendations

1. **Immediate**: Run the diagnostic SQL above on UAT to confirm the root cause (user_id mismatch, missing row, or wrong role)
2. **Immediate**: Apply the fix SQL to restore admin access
3. **Follow-up**: Add structured server-side logging to the `(dashboard)` layout when authorization fails — include user ID and email so this is instantly diagnosable next time
4. **Follow-up**: Add admin user seeding to the UAT deployment checklist / CI pipeline

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Exact current state of naveed@yaneel.com in UAT `public.users` | Cannot query UAT from worktree | Run diagnostic SQL in Supabase SQL Editor | User/Operator |
| 2 | What triggered the data inconsistency this time | No audit trail for auth.users changes | Check Supabase dashboard auth logs for user creation/deletion events | User/Operator |

---

## Open Questions

1. Was the UAT Supabase project recently reset or refreshed?
2. Did you re-sign-up or get a new magic link that may have created a fresh auth.users entry?
3. Were any manual SQL operations run on UAT recently (beyond the tracked migrations)?
