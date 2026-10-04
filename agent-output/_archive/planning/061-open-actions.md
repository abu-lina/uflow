---
ID: 061
Origin: 061
UUID: a61d4f2c
Status: Active
---

# Open Actions 061: Deferred Post-Deploy Follow-ups

## Summary

- UAT issued CONDITIONAL APPROVAL with two HIGH smoke gate items (approve/reject review paths) that must be validated in target environment before production promotion.
- Several known limitations require post-deploy verification or follow-up in subsequent sprints.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| Admin smoke gate — Approve path (click Approve, confirm provider approved) | DevOps operator | Before production deployment (Stage 2) | HTTP 200 from `PATCH /api/admin/review-provider` with `reviewStatus: 'approved'` | Open |
| Admin smoke gate — Reject path via RejectModal (reject with mandatory feedback) | DevOps operator | Before production deployment (Stage 2) | RejectModal opens, confirm disabled until feedback, HTTP 200 with rejected status | Open |
| `provider_description` column schema verification | DevOps | Before production promotion | `SELECT column_name FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'provider_description'` returns 1 row | Open |
| Page-level integration test for reject modal chain | Implementer | Next admin-edit-touching plan | Dedicated test covering handleRejectClick → modal → confirm → review API | Open |
| DRY fix for `offers/route.ts` + `needs/route.ts` | Implementer | Before any taxonomy-create change | Shared factory function extracted | Open |
| Non-atomic save+review UX improvement | Implementer | Next sprint | Distinct error paths for save-fail vs review-fail | Open |
| `offersIds`/`needsIds` UUID validation in Zod schema | Implementer | Next admin-edit-touching plan | `z.array(z.string().uuid())` | Open |
| Provider interface `provider_description` type alignment | Implementer | Next Provider-interface-touching plan | `provider_description?: string \| null` in Provider type | Open |
| Hard-coded English strings in admin edit page → i18n | Implementer | Next i18n pass | Translation keys added | Open |
| Rate limiter semantic mismatch (taxonomy shares adminReview bucket) | Implementer | Next rate-limit review | `rateLimiters.adminTaxonomy` added | Open |

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-03-25T13:42Z | DevOps | Created tracker from UAT conditional gate items and known limitations |
