---
ID: 054
Origin: 054
UUID: c7e1b4a2
Status: Committed
---

# 054 - Remove Legacy Admin Panel: Architecture Findings

**Date**: 2026-03-24
**Trigger**: Session S054-remove-admin-panel — remove legacy in-app admin review panel
**Scope**: Next.js routes/components/services that implement the legacy admin provider review UI (Approve/Reject/Request Revision) and its dedicated API endpoints.

---

## Outcome Summary

The legacy **in-app Admin Panel** (dashboard UI for provider review) is being removed. This is a deliberate product/architecture change: the app should no longer expose a privileged UI surface at `/dashboard/*` for provider moderation.

This change is **architecturally safe** provided we:

1. Remove the route surface area and its coupled client components/services (done in implementation work).
2. Ensure **no remaining app flows depend on `/dashboard`** (redirects, PWA shortcuts, debug links).
3. Verify the “newer provider review workflow” exists and remains functional (must be verified by Implementer/QA, because it is not discoverable purely from the removed legacy UI).

---

## What Was Removed (Legacy Admin Panel)

### UI Routes

- Route group `src/app/(dashboard)/` (all pages + layout)
	- `/dashboard`
	- `/dashboard/providers`

### UI Components

- `src/components/admin/*`

### Legacy Admin Review API

- `/api/admin/pending-providers`
- `/api/admin/review-provider`

### Supporting Code (Legacy-only)

- `src/services/admin/providers.ts`
- `src/lib/validations/adminSchemas.ts`
- `src/lib/audit/adminAudit.ts`
- `tests/performance/admin-flow.js` (admin dashboard/review k6 performance script)

---

## Remaining Required Cleanup (Must Do Before Merge)

These are cross-cutting references that become dead/incorrect once `/dashboard` is removed:

- **Auth redirect target**: `src/providers/auth-provider.tsx` sets `emailRedirectTo` to `/dashboard`.
- **Middleware route protection**: `src/middleware.ts` still treats `/dashboard` as a protected route prefix.
- **PWA shortcuts**: `src/app/api/manifest/route.ts` contains multiple shortcut `url: '/dashboard'` entries.
- **Debug UI link**: `src/app/auth-debug/page.tsx` has a link to `/dashboard`.
- **Rate-limit configuration**: `src/lib/rate-limit.ts` contains `adminProviders` + `adminReview` limiters that were only used by the removed admin review endpoints.

**Expectation:** Implementer removes/updates these references so the app has no dead routes, no broken navigation, and no confusing redirects.

---

## Security & Role Model Notes

- Removing the admin UI reduces attack surface (fewer privileged UI entry points).
- Admin capabilities still exist via other `/api/admin/*` endpoints (e.g., diagnostics, role tools, badge verification routes). These MUST remain protected by server-side authorization checks (`isAdminOrModerator` or stricter), regardless of UI removal.

---

## Verification Requirements (Newer Workflow Must Remain)

Because the session requirement states that a **newer provider review workflow must remain intact**, the Implementer/QA MUST identify and verify the replacement review mechanism. At minimum:

- There is still a supported way for authorized operators to move a provider from `review_status = 'pending'` → `approved|rejected|needs_revision`.
- Any provider-creation flow still defaults to non-public visibility until approved (policy enforcement stays in DB/services layer).

If the newer workflow is an external/admin-only tool (Supabase Studio, internal scripts, or a separate operator app), document where it lives and how it is exercised.

---

## Verdict

**APPROVED_WITH_CHANGES** — removal is directionally correct, but merge must be blocked until the remaining `/dashboard` references and legacy rate-limit config are cleaned up, and the replacement provider review workflow is explicitly verified.