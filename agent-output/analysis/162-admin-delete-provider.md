---
ID: 162
Origin: 162
UUID: a1b2c3d4
Status: Active
---

# Analysis: Admin Delete Provider Feature

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-12 | Analyst | Initial analysis — investigation complete |

## Value Statement & Objective

Add a "Delete Provider" button to the admin provider edit page with a confirmation dialog, enabling admins to permanently remove providers while preventing accidental deletions.

## Context

- **URL**: `/dashboard/providers/[id]/edit` (client component page)
- **Current actions on edit page**: Save, Approve, Reject (via `reviewFooterActions` prop on `ProviderEditForm`)
- **No delete functionality currently exists** in the admin panel
- **Existing deletion patterns**: Soft-delete via `review_status = 'removed_by_owner'` (owner outreach flow); hard delete via `supabase.from('providers').delete()` (account deletion, RLS-based)

## Methodology

- Codebase exploration of migrations, API routes, services, components
- Foreign key analysis across all migration files
- Existing deletion pattern analysis

## Findings

### F1 — Database: All child tables cascade on delete (Proven)
All tables referencing `providers(provider_id)` have `ON DELETE CASCADE`:

| Table | Migration | FK |
|-------|-----------|----|
| `food_providers` | `083_m5a_supertype_unification.sql` | CASCADE |
| `store_providers` | `083_m5a_supertype_unification.sql` | CASCADE |
| `ummah_providers` | `083_m5a_supertype_unification.sql` | CASCADE |
| `food_menu` | `094_plan_145_provider_edit_page.sql` | CASCADE |
| `provider_delivery_links` | `094_plan_145_provider_edit_page.sql` | CASCADE |
| `locations` | `101_plan_151_multi_location.sql` | CASCADE |
| `provider_engagements` (both FKs) | `083_m5a_supertype_unification.sql` | CASCADE |
| `provider_offers` | `006_phase3_referential_integrity.sql` | CASCADE |
| `provider_needs` | `006_phase3_referential_integrity.sql` | CASCADE |
| `bookmarks` | `0000_initial_core_schema.sql` | CASCADE |
| `pending_enrichments` | `105_plan_156_auto_enrichment.sql` | CASCADE |
| `enrichment_candidates` | `archive/066_enrichment_candidates.sql` | CASCADE |
| `provider_owner_outreach` | `archive/058_create_provider_owner_outreach.sql` | CASCADE |
| `provider_owner_action_tokens` | `archive/058_create_provider_owner_outreach.sql` | CASCADE |
| `provider_outreach_tasks` | `archive/058_create_provider_owner_outreach.sql` | CASCADE |
| `provider_menu_items` | `archive/068_provider_catalog_tables.sql` | CASCADE |
| `provider_service_offers` | `archive/068_provider_catalog_tables.sql` | CASCADE |
| `community_projects` | `083_m5a_supertype_unification.sql` | CASCADE |
| `provider_badges` | `archive/016_create_badge_trust_system.sql` | CASCADE |

**No migration changes needed** — a simple `DELETE FROM providers WHERE provider_id = ?` will cascade cleanly.

### F2 — No existing `admin_delete_provider` RPC or API endpoint (Proven)
- `admin_update_provider` RPC exists in migrations `094`, `098`, `102`
- No `admin_delete_provider` RPC exists anywhere
- No `DELETE` endpoint in `/api/admin/` for providers

### F3 — RLS & admin access already sufficient (Proven)
- `getSupabaseAdmin()` (service-role client) can delete any row — bypasses RLS
- RLS DELETE policy (line 3784-3786 of baseline): allows admin/moderator and owner deletes
- Existing pattern in `src/services/account.ts`: uses anon client with `delete().eq('user_created_id', userId)` — works via RLS

### F4 — Soft delete (`removed_by_owner`) is a separate concern (Proven)
- `removed_by_owner` pattern (migration `060_add_removed_by_owner_status.sql`) is for owner-initiated removal via outreach
- This status is excluded from `AdminSearchOptions` and `ReviewStatusFilter` types
- For admin-initiated deletion, **hard delete is more appropriate** — admins have authority to fully remove content, and the cascade setup makes it safe

### F5 — Existing API route patterns to follow (Proven)
All admin API routes follow this pattern:
1. Lazy-import `getUserFromCookie()`
2. Check `isAdminOrModerator(user.id)`
3. Rate limiting via `rateLimiters.adminReview`
4. Zod validation
5. Call service layer (uses `getSupabaseAdmin()`)
6. Audit log via `logAdminAction()`
7. Return `NextResponse.json({ data: ... })`

### F6 — Audit logging pattern (Proven)
- `logAdminAction(adminUserId, action, targetType, targetId, details, { ipAddress, userAgent })`
- Actions used: `provider_review_approved`, `provider_review_rejected`, etc.
- New action: `provider_deleted`

### F7 — Rate limiter (Proven)
- `rateLimiters.adminReview`: 5/min, 20/hr — appropriate for delete as well
- Can reuse this rate limiter for the delete endpoint

### F8 — Cache invalidation (Proven)
Current invalidation on moderation actions:
- `['provider', providerId]`
- `['providers']`
- `['admin-pending-providers']`

After deletion, also invalidate `['provider', providerId]`, `['providers']`, `['admin-pending-providers']`.

### F9 — UI component pattern to follow (Proven)
- `RejectModal` at `src/features/admin/components/RejectModal.tsx` — the exact pattern to replicate
- Uses framer-motion (`motion`), `AnimatePresence`, ESC key handling, backdrop click dismiss, loading state

## Gap Tracking

| # | Unknown | Status | Resolution |
|---|---------|--------|------------|
| 1 | Any migration changes needed for cascade deletes? | Resolved | No — all cascades already in place |
| 2 | Which service layer approach? New RPC or direct delete? | Resolved | Direct `supabase.from('providers').delete()` via `getSupabaseAdmin()` — no RPC needed |
| 3 | Soft delete vs hard delete for admin? | Resolved | Hard delete — admins have authority, cascades clean |
| 4 | Any additional cleanup beyond DB cascade needed? | Resolved | No — cascade handles all child records |

## Analysis Recommendations

### Recommended Implementation Approach

**Phase: Hard delete via service-role admin client (no RPC needed)**

1. **Service layer**: Add `deleteProvider(providerId)` to `src/services/admin/providers.ts`
   - Uses `getSupabaseAdmin()`
   - Calls `supabase.from('providers').delete().eq('provider_id', providerId).select()`
   - DB cascades handle all child tables

2. **API route**: Create `DELETE /api/admin/providers/[id]/route.ts`
   - Follows existing admin API pattern (auth check, admin/moderator check, rate limiting, audit logging)
   - New action name: `provider_deleted`

3. **UI component**: Create `DeleteProviderModal` at `src/features/admin/components/DeleteProviderModal.tsx`
   - Mirrors `RejectModal` pattern (motion animations, ESC, backdrop click, loading state)
   - Simple confirmation: "Are you sure you want to delete [provider name]?"
   - No feedback textarea needed (unlike rejection)

4. **Edit page integration**: Add delete button + modal to `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`
   - Places delete action as a standalone danger button (not in `reviewFooterActions`)
   - After deletion: invalidate caches, redirect to `/providers`
   - Call the new DELETE API endpoint

5. **No database migration needed** — cascading FKs are already in place

### Open Questions
- None — all investigated findings are at confidence level Proven.

