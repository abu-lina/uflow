---
ID: 162
Origin: 162
UUID: b2c3d4e5
Status: Active
---

# Plan 162: Admin Delete Provider Feature

## Value Statement

Add a "Delete Provider" capability to the admin edit page, letting admins permanently remove providers with a single confirmation. The hard delete cascades through all child tables safely, and the feature follows existing patterns: the API endpoint mirrors `review-provider`, the modal mirrors `RejectModal`, and audit logging captures every deletion.

## Milestones

### M1: Service Layer + API Route
- **Files**: `src/services/admin/providers.ts`, `src/app/api/admin/providers/[id]/route.ts`, `src/lib/validations/adminSchemas.ts`
- **Changes**:
  - Add `deleteProvider(providerId: string)` to `src/services/admin/providers.ts` — calls `supabase.from('providers').delete().eq('provider_id', providerId).select()` via admin client; throws on error or no rows
  - Add `DELETE` handler to existing `src/app/api/admin/providers/[id]/route.ts` — auth check, admin/moderator check, rate limiting via `rateLimiters.adminReview`, Zod validation, calls `deleteProvider`, audit logs with action `provider_deleted`, returns `{ data: { deleted: true } }`
  - Add `providerDeleteSchema = z.object({ providerId: z.string().uuid() })` to `src/lib/validations/adminSchemas.ts`
- **TDD**: Unit test `deleteProvider` (success + not-found error) + API route integration test (auth, forbidden, rate-limited, success paths)
- **Verification**: `curl -X DELETE ...` returns 200 and the provider is removed from DB

### M2: Delete Confirmation Modal
- **Files**: `src/features/admin/components/DeleteProviderModal.tsx`
- **Changes**: New client component mirroring `RejectModal` — motion/AnimatePresence, ESC key, backdrop click dismiss, loading state. Simpler than RejectModal: no feedback textarea, just provider name + "Are you sure?" + Cancel / Delete buttons. Delete button is red (`bg-danger`) with "Delete" / "Deleting..." text.
- **TDD**: Render tests — open state shows provider name, close triggers `onClose`, confirm triggers `onConfirm`, disabled during loading
- **Verification**: Storybook or manual render with mock props

### M3: Page Integration
- **Files**: `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`
- **Changes**:
  - Add delete button as a standalone danger button below the `reviewFooterActions` area (not inside the form actions — deletion is independent of save/approve/reject)
  - Add `deleteModal` state (`{ isOpen: boolean; isLoading: boolean }`)
  - Add `handleDeleteClick`, `handleDeleteConfirm`, `handleDeleteClose` callbacks
  - `handleDeleteConfirm`: fetches `DELETE /api/admin/providers/${providerId}`, on success invalidates `['provider', providerId]`, `['providers']`, `['admin-pending-providers']`, shows success toast, redirects to `/providers`
  - Import and render `DeleteProviderModal`
- **TDD**: Component render test for delete button presence + modal interaction
- **Verification**: Click delete → modal appears → confirm → provider deleted from DB → redirected

## Architecture Overview

```
User clicks "Delete Provider"
  → DeleteProviderModal opens
  → User confirms
  → DELETE /api/admin/providers/:id
    → isAdminOrModerator check
    → Zod validation (providerDeleteSchema)
    → Rate limit check (rateLimiters.adminReview)
    → deleteProvider(providerId) [service layer]
      → getSupabaseAdmin().from('providers').delete().eq('provider_id', ...)
      → DB cascades to all child tables
    → logAdminAction('provider_deleted', ...)
    → Return 200
  → Client invalidates caches, redirects to /providers
```

No migration needed — all child FKs have `ON DELETE CASCADE` (Analysis F1).

## Implementation Details

### Service Layer

Add to `src/services/admin/providers.ts`:

```typescript
export async function deleteProvider(providerId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('providers')
    .delete()
    .eq('provider_id', providerId);

  if (error) {
    throw new Error(`Failed to delete provider: ${error.message}`);
  }
}
```

No `.select()` needed — we only need to know it succeeded (no error) or failed. The admin API can check `count` if it needs to distinguish "not found" from "deleted", but for a hard delete both outcomes are acceptable from the client's perspective (redirect regardless).

### API Route

Extend `src/app/api/admin/providers/[id]/route.ts` with a `DELETE` export. Follows the exact pattern from `review-provider/route.ts`:

1. Lazy-import `getUserFromCookie`, check auth
2. `isAdminOrModerator(user.id)` — 403 if no
3. Rate limit via `rateLimiters.adminReview.perHour` + `perMinute` — 429 if limited
4. Validate UUID format (same regex as GET handler)
5. Call `deleteProvider(providerId)` from service
6. `logAdminAction(user.id, 'provider_deleted', 'provider', providerId, { providerId }, { ipAddress, userAgent })`
7. Return `NextResponse.json({ data: { deleted: true } })`

Error handling:
- `CONFLICT` is not relevant for deletes (no optimistic concurrency needed)
- Catch-all: log error, return 500

### UI Component

Create `src/features/admin/components/DeleteProviderModal.tsx`:

```typescript
interface DeleteProviderModalProps {
  isOpen: boolean;
  providerName: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
```

Reuses the `RejectModal` shell without the feedback textarea:
- Title: "Delete Provider"
- Body: "Are you sure you want to delete {providerName}?"
- Two buttons: Cancel (outline) + Delete (red `bg-danger`, "Delete" / "Deleting...")
- Animations, ESC close, backdrop click dismiss

### Page Integration

In `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`:

**State**:
```typescript
const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; isLoading: boolean }>({
  isOpen: false, isLoading: false,
});
```

**Callbacks**:
```typescript
const handleDeleteClick = useCallback(() => {
  setDeleteModal({ isOpen: true, isLoading: false });
}, []);

const handleDeleteConfirm = useCallback(async () => {
  setDeleteModal(prev => ({ ...prev, isLoading: true }));
  try {
    const response = await fetch(`/api/admin/providers/${providerId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      toast.error(errorData.error || 'Failed to delete provider');
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] }),
      queryClient.invalidateQueries({ queryKey: ['providers'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] }),
    ]);

    toast.success('Provider deleted successfully');
    router.push('/providers');
  } catch {
    toast.error('Failed to delete provider');
    setDeleteModal(prev => ({ ...prev, isLoading: false }));
  }
}, [providerId, queryClient, router]);

const handleDeleteClose = useCallback(() => {
  if (!deleteModal.isLoading) {
    setDeleteModal({ isOpen: false, isLoading: false });
  }
}, [deleteModal.isLoading]);
```

**UI placement**: Add a standalone danger button below the main form, outside `reviewFooterActions`:

```tsx
<div className="mt-8 border-t border-neutral-200 pt-6">
  <button
    className="w-full rounded-lg bg-danger px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-danger-dark"
    type="button"
    onClick={handleDeleteClick}
    aria-label="Delete provider permanently"
  >
    Delete Provider
  </button>
  <p className="mt-2 text-xs text-content-muted text-center">
    This action cannot be undone. All data associated with this provider will be permanently removed.
  </p>
</div>

<DeleteProviderModal
  isLoading={deleteModal.isLoading}
  isOpen={deleteModal.isOpen}
  providerName={provider.provider_name}
  onClose={handleDeleteClose}
  onConfirm={handleDeleteConfirm}
/>
```

### Validation

Add to `src/lib/validations/adminSchemas.ts`:

```typescript
export const providerDeleteSchema = z.object({
  providerId: z.string().uuid('Invalid provider ID format'),
});
```

The API route validates the path param directly (UUID regex), so this schema is optional but available if we ever build a bulk-delete or body-based variant.

## Test Strategy

| Layer | Test | Approach |
|-------|------|----------|
| Service | `deleteProvider` succeeds | Mock `getSupabaseAdmin`, assert no error thrown |
| Service | `deleteProvider` fails (DB error) | Mock error response, assert `Error` thrown |
| API | 401 without auth | No cookie → 401 |
| API | 403 for non-admin | Mock `isAdminOrModerator` → false → 403 |
| API | 429 rate limited | Mock rate limiter → false → 429 |
| API | 200 success | Full integration with mocked service + audit |
| API | 400 invalid UUID | Malformed ID → 400 |
| Component | Modal renders | Render with `isOpen=true`, check provider name visible |
| Component | Confirm fires callback | Click Delete → `onConfirm` called |
| Component | Close fires callback | Click Cancel → `onClose` called |
| Component | Button disabled during loading | `isLoading=true` → Delete button disabled |
| Page | Delete button renders | Check for "Delete Provider" text |
| Page | Confirmation flow | Mock fetch, simulate click → confirm → check redirect |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Accidental deletion of wrong provider | Low | High | Confirmation dialog with provider name visible; redirect allows undo only via DB restore |
| Concurrent delete + edit | Low | Medium | After deletion, any pending PATCH returns 404; rate limiting reduces window |
| Cascade fails on child table without CASCADE | Very Low (all confirmed) | Critical | Verified all 17+ child FKs have CASCADE (Analysis F1); add integration test |
| Non-admin bypasses UI and calls API directly | Low | None | API requires `isAdminOrModerator` + rate limiting |
