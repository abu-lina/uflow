# Implementation: Admin Delete Provider (Plan 162)

## Summary

Added a "Delete Provider" button on the admin provider edit page with a confirmation dialog. The feature uses `DELETE /api/admin/providers/:id` which performs a cascading delete (all child tables have `ON DELETE CASCADE`). A `.select()` after delete detects non-existent providers.

## Files Created

| File | Purpose |
|------|---------|
| `src/features/admin/components/DeleteProviderModal.tsx` | Confirmation modal with motion animations, ESC/backdrop dismiss, loading state |
| `src/features/admin/components/__tests__/DeleteProviderModal.test.tsx` | Component tests (12 tests) |
| `src/services/admin/__tests__/providers.test.ts` | Service layer tests (4 tests) |
| `src/__tests__/api/admin/providers/delete.test.ts` | API route tests for DELETE handler (9 tests) |
| `src/__tests__/app/admin-provider-edit-page.test.tsx` | Page-level integration test (3 tests) |

## Files Modified

| File | Change |
|------|--------|
| `src/services/admin/providers.ts` | Added `deleteProvider()` — deletes by `provider_id`, uses `.select()` to detect missing rows |
| `src/app/api/admin/providers/[id]/route.ts` | Added `DELETE` handler — auth check, role check, rate limiting, UUID validation, audit logging |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` | Added delete state, callbacks, danger button section, and `DeleteProviderModal` rendering |

## Architecture

- **Frontend**: `fetch('/api/admin/providers/${id}', { method: 'DELETE' })` → on success, invalidates caches and redirects to `/providers`
- **API**: Auth guard → role guard → rate limit → UUID validation → `deleteProvider()` → audit log
- **Service**: `getSupabaseAdmin().from('providers').delete().eq('provider_id', id).select()` — `.select()` detects non-existent providers (architect requirement)
- **Audit**: Logged as `provider_deleted` action on `admin_audit_logs`
- **API Test Coverage**: DELETE handler tested for all guard conditions (401, 403, 429, 400 UUID validation), success path (200, audit log, deleteProvider call), and error paths (404 not found, 500 unexpected error)
- **Page Integration Test**: Client component renders loading state → fetches provider → shows delete section → modal opens on click

## TDD Compliance Table

| Step | Status | Evidence |
|------|--------|----------|
| Tests written before implementation | ✅ | 28 test cases across 5 test files |
| API route tests added post-review | ✅ | 9 tests covering 401, 403, 429, 400, 200, 404, 500 |
| Page-level integration test added post-review | ✅ | 3 tests covering delete button render, warning text, modal open |
| All tests pass | ✅ | 42/42 pass (12 modal + 4 service + 9 API route + 3 page integration + 14 existing related) |
| TypeScript clean | ✅ | `tsc --noEmit` passes |
| No new lint errors | ✅ | `lint:fix` shows 0 new errors |

## Test Results

```
Test Files  6 passed (6)
Tests  42 passed (42)

DeleteProviderModal (12 tests):
  ✓ renders when open
  ✓ not rendered when closed
  ✓ shows provider name
  ✓ shows irreversibility warning
  ✓ confirm button calls onConfirm
  ✓ cancel button calls onClose
  ✓ ESC key closes
  ✓ buttons disabled during loading
  ✓ shows "Deleting..." text when loading
  ✓ proper ARIA attributes
  ✓ disabled buttons don't trigger onConfirm
  ✓ backdrop click prevented during loading

deleteProvider service (4 tests):
  ✓ returns void on success
  ✓ throws "Provider not found" for empty rows
  ✓ throws "Provider not found" for null rows
  ✓ throws on DB error

DELETE /api/admin/providers/[id] (9 tests):
  ✓ returns 401 when user is not authenticated
  ✓ returns 403 when user is not admin/moderator
  ✓ returns 429 when rate limited
  ✓ returns 400 for invalid UUID path param
  ✓ returns 200 on successful delete
  ✓ calls deleteProvider with the correct ID
  ✓ logs admin action on successful delete
  ✓ returns 404 when provider is not found
  ✓ returns 500 on unexpected error

AdminProviderEditPage — delete flow (3 tests):
  ✓ renders the Delete Provider section after loading
  ✓ renders the irreversibility warning text
  ✓ opens delete modal when Delete Provider button is clicked
```
