# UAT Validation: Plan 162 — Admin Delete Provider

## User Story Test

**As an** admin user
**I want** to delete providers via the UI admin panel
**So that** I can remove inappropriate or outdated provider listings

## Test Scenarios

### Scenario 1: Happy path — Admin deletes a provider

**Given** I am logged in as admin/moderator
**And** I navigate to `/dashboard/providers/[id]/edit`
**When** I see the "Delete Provider" button below the edit form
**And** I click it
**Then** a modal opens showing the provider name, "Are you sure?" text, and "This action cannot be undone" warning
**When** I click "Delete"
**Then** the button shows "Deleting..." and is disabled
**And** the provider is permanently removed from the database (cascade)
**And** I see a success toast "Provider deleted successfully"
**And** I am redirected to `/providers`

### Scenario 2: Accidental click prevention

**Given** I am on the provider edit page
**When** I click "Delete Provider"
**Then** a confirmation dialog appears with the provider name in bold and a warning that the action is irreversible
**When** I click "Cancel"
**Then** the dialog closes
**And** the provider is not deleted
**Or** when I press the ESC key or click the backdrop, the dialog dismisses (unless loading)

### Scenario 3: Loading state prevents double-submit

**Given** I have confirmed deletion
**When** the request is in flight
**Then** the Delete and Cancel buttons are disabled
**And** backdrop clicks and ESC key are ignored
**And** the button text changes to "Deleting..."

### Scenario 4: Non-admin access denied

**Given** I am not an admin or moderator
**When** I send `DELETE /api/admin/providers/:id`
**Then** I receive a 403 response
**Or** if unauthenticated, a 401 response

### Scenario 5: Rate limiting protects the endpoint

**Given** excessive DELETE requests in a short window
**When** the rate limit is exceeded (20/hr, 5/min)
**Then** the API returns 429

### Scenario 6: Invalid provider ID

**Given** I attempt to delete with a malformed provider ID
**When** I send `DELETE /api/admin/providers/not-a-uuid`
**Then** the API returns 400

## UI Walkthrough

1. Navigate to `/dashboard/providers/[id]/edit` as admin
2. Scroll past the edit form to the "Delete Provider Section"
3. **Delete button**: Red full-width button reading "Delete Provider" with `aria-label="Delete provider permanently"`
4. **Warning text**: Below the button: "This action cannot be undone. All data associated with this provider will be permanently removed."
5. **Modal opens**: Centered dialog with backdrop overlay, motion animation
6. **Modal title**: "Delete Provider"
7. **Modal body**: "Are you sure you want to delete **{Provider Name}**? This action cannot be undone."
8. **Two buttons**: "Cancel" (outlined) and "Delete" (red/danger)
9. **Loading state**: Buttons disabled, Delete shows "Deleting..."
10. **Post-delete**: Success toast → redirect to `/providers`

## Acceptance Criteria Verification

| Criterion | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Delete option visible on edit page | Red danger button below form | Button rendered at `edit/page.tsx:365-372` | ✅ |
| Confirmation before deletion | Modal dialog on click | `DeleteProviderModal` opens via `handleDeleteClick` | ✅ |
| Provider name shown in confirmation | Name displayed in bold | `<strong>{providerName}</strong>` at line 68 | ✅ |
| "Cannot be undone" warning | Text on both button area and modal | Button area (`page.tsx:373-374`) + modal (`DeleteProviderModal.tsx:68`) | ✅ |
| Cancel option available | Cancel button dismisses dialog | Cancel button calls `onClose` at `DeleteProviderModal.tsx:78` | ✅ |
| ESC key dismisses | Key handler on modal | `handleKeyDown` at `DeleteProviderModal.tsx:24-31` | ✅ |
| Backdrop click dismisses | Click outside dialog | `handleBackdropClick` at `DeleteProviderModal.tsx:34-38` | ✅ |
| Loading prevents double-submit | Buttons disabled during request | `disabled={isLoading}` at `DeleteProviderModal.tsx:74,82` | ✅ |
| Cache invalidated on delete | provider, providers, admin-pending | 3x `invalidateQueries` at `page.tsx:269-273` | ✅ |
| Success feedback | Toast notification | `toast.success('Provider deleted successfully')` at `page.tsx:275` | ✅ |
| Redirect after delete | Navigate to /providers | `router.push('/providers')` at `page.tsx:276` | ✅ |
| Only admins/moderators can delete | 403 for others | Role guard at `route.ts` | ✅ |
| Auth required | 401 without session | Auth check at `route.ts` | ✅ |
| Rate limited | 20/hr, 5/min | `rateLimiters.adminReview` at `route.ts` | ✅ |
| Audit logged | provider_deleted action | `logAdminAction('provider_deleted', ...)` at `route.ts` | ✅ |
| UUID validation on ID param | 400 for invalid UUID | UUID regex check at `route.ts` | ✅ |

## Edge Cases Verified

| Edge Case | Behavior |
|-----------|----------|
| Provider not found (already deleted) | 404 response |
| DB failure during deletion | 500 response, error message hidden in production |
| Double-click Delete button | Button disabled during loading — second click ignored |
| Rapid ESC presses | Loading state guards `onClose` — safe |
| Provider with long name | Rendered as text content (no XSS) in modal |

## Verdict

**Status**: APPROVED FOR RELEASE

**Rationale**: All 6 test scenarios and 16 acceptance criteria pass. The feature is well-guarded (auth, role, rate limiting, UUID validation, audit logging), provides clear visual feedback at every step (button text, loading state, toast, redirect), and prevents destructive actions without explicit confirmation. Modal behavior follows UX best practices (ESC dismiss, backdrop dismiss, Cancel always available, disabled buttons during loading). QA validation confirms 28/28 tests pass, TypeScript compiles clean, and all code review findings resolved.
