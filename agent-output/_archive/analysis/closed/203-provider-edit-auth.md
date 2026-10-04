---
ID: 203
Origin: 203
UUID: b4e7f91a
Status: Committed
---

# 203 — Provider Edit Authorization Bug

**Changelog**

| Date | Author | Change |
|------|--------|--------|
| 2026-08-05 | @Analyst | Initial investigation, root cause identified |

---

## Value Statement and Business Objective

UFlow moderators/admins must be able to edit provider listings efficiently. A logged-in user (`naveed@yaneel.com`) holds an elevated role that should permit provider editing, but the edit entry point does not appear. This blocks content quality operations and creates an invisible failure mode that affects all users whose roles are granted via the `set-role` API.

---

## Scope

- **Account under test**: `naveed@yaneel.com` | **Env**: UAT
- **Provider under test**: `53e3cc73-1ef2-438a-9cbb-989b508218ce`
- **Observed behavior**: User cannot edit the provider (edit button absent or access denied)
- **Expected behavior**: Edit button visible and fully functional for role=admin or role=moderator

---

## Context

The system uses **two independent data sources** for role checks:

| Layer | Hook / Function | Source |
|-------|----------------|--------|
| UI visibility (client) | `useIsAdmin()` | `user.user_metadata?.role` — Supabase Auth JWT |
| Dashboard layout (server) | `isAdminOrModerator()` | `public.users.role` — PostgreSQL |
| GET provider API | `isAdminOrModerator()` | `public.users.role` — PostgreSQL |
| PATCH edit-provider API | `isAdminOrModerator()` | `public.users.role` — PostgreSQL |

The role assignment endpoint (`/api/admin/set-role`) updates **only** `public.users.role` and never touches Supabase Auth user metadata.

---

## Methodology

- Source code inspection of all three gate layers
- Tracing role assignment path through `set-role` → DB → Auth JWT
- Tracing UI render path through `useIsAdmin` → `AdminProviderDetailButtons`
- Inspection of `handle_new_user` trigger for default role behavior
- Inspection of signup/login routes for any metadata sync
- Cross-reference with security regression test `F-049`

---

## Findings

### F-1 · `set-role` only updates DB (L1 — Proven)

**File**: [src/app/api/admin/set-role/route.ts](src/app/api/admin/set-role/route.ts#L88-L107)

```typescript
// When user exists, updates DB only
const { data, error } = await supabaseAdmin
  .from('users')
  .update({ role })
  .eq('user_id', targetUserId)
  .select()
  .single();
```

There is **no call to** `supabaseAdmin.auth.admin.updateUserById()` anywhere in this route. `user_metadata.role` is never written.

### F-2 · `useIsAdmin` reads exclusively from `user_metadata` (L1 — Proven)

**File**: [src/hooks/useIsAdmin.ts](src/hooks/useIsAdmin.ts)

```typescript
const role = user?.user_metadata?.role;
const isAdmin = role === 'admin' || role === 'moderator';
```

No API call, no DB query. Pure client-side JWT metadata read.

### F-3 · Signup never sets `user_metadata.role` (L1 — Proven)

**File**: [src/app/api/auth/signup/route.ts](src/app/api/auth/signup/route.ts#L193-L204)

```typescript
user_metadata: {
  language: language || 'en',
  preferred_language: language || 'en',
  email_confirmed: emailConfirm,
  email_only_signup: emailOnly === true,
  // NOTE: no 'role' field
}
```

`role` is absent from the metadata object written on user creation.

### F-4 · Login never syncs DB role to JWT metadata (L1 — Proven)

**File**: [src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts)

The login route calls `tempClient.auth.signInWithPassword()` and returns the raw access/refresh tokens. No DB role lookup, no `updateUserById` call.

### F-5 · `handle_new_user` trigger inserts DB role = 'user' only (L1 — Proven)

**File**: [supabase/migrations/001_baseline.sql](supabase/migrations/001_baseline.sql#L611-L622)

```sql
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
AS $$
BEGIN
  INSERT INTO public.users (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');  -- always 'user', no metadata sync
  RETURN NEW;
END;
$$;
```

### F-6 · `auth.users` trigger linking `handle_new_user` not present in migrations (L2 — Observed)

The trigger `ON INSERT ON auth.users → handle_new_user()` found in the archived template (`docs/archive/`) is **absent from all active migration files**. The trigger likely exists in the Supabase dashboard (not under version control), but its only action is to insert the DB row — it has no access to auth metadata sync either way.

### F-7 · Edit button is gated entirely on `useIsAdmin()` (L1 — Proven)

**File**: [src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx](src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx#L63-L74)

```typescript
const { isAdmin } = useIsAdmin();
// ...
customActionButtons={
  isAdmin ? <AdminProviderDetailButtons providerId={providerId} variant="desktop" /> : undefined
}
```

If `isAdmin = false`, `AdminProviderDetailButtons` is **not rendered**. The edit button does not exist in the DOM. The same pattern applies to `ProvidersContent.tsx` (line 603).

### F-8 · Dashboard layout gate uses DB role — consistent but doesn't help with missing entry point (L1 — Proven)

**File**: [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx)

```typescript
const authorized = await isAdminOrModerator(user.id);
if (!authorized) redirect('/providers');
```

If `public.users.role` is correctly set to `'admin'` or `'moderator'`, the user CAN navigate directly to `/dashboard/providers/[id]/edit` and it will work. However, the edit button on the public provider page never appears to give them this entry point.

### F-9 · API gates (GET + PATCH) use DB role — would pass if DB is correct (L1 — Proven)

Files:
- [src/app/api/admin/providers/[id]/route.ts](src/app/api/admin/providers/[id]/route.ts#L25-L34)
- [src/app/api/admin/edit-provider/route.ts](src/app/api/admin/edit-provider/route.ts#L25-L34)

Both call `isAdminOrModerator(user.id)` → reads from `public.users.role`. If the DB role is correct, these APIs would accept the user's requests.

### F-10 · Security regression F-049 intentionally disallows server trust of `user_metadata.role` (L1 — Proven)

**File**: [src/__tests__/api/security-049-regression.test.ts](src/__tests__/api/security-049-regression.test.ts#L273-L290)

A prior security fix (Plan 049) deliberately ensured that server-side checks never trust `user_metadata.role` because it is client-mutable. This design is correct and must not be reverted.

---

## Root Cause

**L1 — Proven. Confidence: HIGH.**

The `set-role` API updates `public.users.role` in PostgreSQL but never syncs the new role to `user_metadata.role` in Supabase Auth. The client-side `useIsAdmin()` hook reads exclusively from `user_metadata.role`. Because `user_metadata.role` is never set (neither at signup, nor at login, nor at role assignment), `useIsAdmin()` always returns `false` for all users whose role was granted via `set-role`.

This creates a **split-brain**: the server correctly authorizes the user, but the client never learns about the elevated role and hides the edit entry point.

The primary symptom for `naveed@yaneel.com`:
- Edit button invisible on provider detail page → user cannot start an edit session
- If naveed constructs the direct URL manually (`/dashboard/providers/[id]/edit`), the server-side layout gate would PASS (assuming DB role is correct), and the edit form would load successfully

### Failure Mode Diagram

```
naveed logs in
    │
    ├─► Supabase Auth JWT issued
    │   └─► user_metadata.role = undefined  ← never set by any code path
    │
    │
    ├─► public.users.role = 'admin'|'moderator'  ← set by set-role API
    │
    │
Provider detail page loads
    │
    └─► useIsAdmin() reads user_metadata.role
        │
        ├─► role = undefined → isAdmin = false
        │
        └─► AdminProviderDetailButtons NOT rendered
            └─► Edit button: ABSENT ← BUG
```

---

## System Weaknesses

### SW-1 · Dual data sources with no sync contract
There is no single source of truth for role data. The DB and Supabase Auth metadata can diverge without detection. Any future role-related UI feature inherits this silent inconsistency.

### SW-2 · `useIsAdmin` comment states "UI visibility hint" but the hint is never populated
The comment in [src/hooks/useIsAdmin.ts](src/hooks/useIsAdmin.ts#L5-L6) says "UI visibility hint only" — but the hint source is never written by any runtime code path. The design intent is documented but the implementation contract is broken.

### SW-3 · `set-role` has no test coverage for the user_metadata sync
The set-role API has unit tests for DB updates and authorization gates, but no test verifies that `user_metadata.role` is updated in Supabase Auth after a successful role change.

### SW-4 · `auth.users` trigger not versioned in migrations
The `handle_new_user` trigger binding is managed in the Supabase dashboard, not in migration files. This is an infrastructure drift risk — a fresh deployment would not install the trigger automatically.

---

## Instrumentation Gaps

| Gap | Type | Minimum signal needed |
|-----|------|-----------------------|
| No server log when edit button is skipped due to `isAdmin=false` | Normal | Client-side log when `isAdmin` is checked and returns false with a non-null user |
| No alert when DB role and JWT metadata role diverge | Normal | Server middleware or login handler that compares DB role vs user_metadata.role and emits a structured warning |
| No test confirming `set-role` syncs to Auth metadata | Normal (regression gate) | Unit test verifying `updateUserById` is called with correct `user_metadata.role` after a successful DB update |

---

## Analysis Recommendations

1. **Verify naveed's DB role via `GET /api/admin/check-role`** (requires admin cookie) or directly in the Supabase dashboard. If `users.role` is NOT set, the Layout gate would also block direct URL access, and the role assignment step was never completed.

2. **Verify naveed's Supabase Auth user metadata** in the Supabase Auth dashboard (`Authentication → Users → naveed@yaneel.com`). Confirm whether `user_metadata.role` is absent, null, or set to a non-admin value. This will confirm whether the issue is purely the sync gap or also a missing DB role.

3. **Test direct URL access**: Have naveed navigate to `https://uat.ummahflow.com/dashboard/providers/53e3cc73-1ef2-438a-9cbb-989b508218ce/edit`. If they can load the edit form, this confirms the DB role is correct and only the UI gate is broken. If they are redirected to `/providers`, the DB role is also wrong.

4. **Confirm `set-role` was used** (not direct Supabase dashboard setup) to grant naveed's role. If the dashboard was used, `user_metadata.role` would already be set, and a different issue is present.

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| G-1 | Is `public.users.role` correctly set for naveed? | No direct DB access | Check Supabase dashboard or call `GET /api/admin/check-role` | QA/Admin |
| G-2 | Is `user_metadata.role` set for naveed? | No direct Auth metadata access | Check Supabase Auth dashboard | QA/Admin |
| G-3 | Did any OTHER admin user ever receive `user_metadata.role` via a code path not found in this codebase? | Not visible in code | Search Supabase dashboard for any admin users' user_metadata | QA/Admin |
| G-4 | Is `auth.users → handle_new_user` trigger active on UAT? | Not in migration files | Verify in Supabase UAT dashboard → Database → Triggers | DevOps |

Gaps G-1 and G-2 are the highest priority. They will confirm whether the fix is purely `set-role + user_metadata sync` or also requires a DB role fix for naveed.

---

## Open Questions

- Were other admins (not naveed) granted roles via a different mechanism (Supabase dashboard directly) that incidentally also sets `user_metadata.role`? If so, this would explain why the bug is isolated to naveed.
- Is the "cannot edit" reported as "edit button missing" or "access denied when loading edit URL"? This distinction changes whether it's purely the UI gate or also the Layout gate.
