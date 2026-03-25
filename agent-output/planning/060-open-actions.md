---
ID: 060
Origin: 060
UUID: 60d3c8ae
Status: Active
---

# Open Actions 060: Deferred Post-Deploy Follow-ups

## Summary

Plan 060 is ready to be committed locally for `v0.9.1`, but two follow-ups remain visible after the lifecycle docs close:

1. **Live admin back-navigation validation** — UAT approved the fix based on strong automated evidence, but the exact browser `router.back()` path still needs a human check before production tagging.
2. **Admin draft-state cleanup** — `admin_edit_*_${providerId}` keys are intentionally left in place after the session; this is acceptable for the patch but should be cleaned on save/approve/reject in a future sprint.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| Validate live admin back-navigation in UAT or local dev: category selection persists after returning to `/dashboard/providers/[id]/edit`, then repeat for offers or needs | QA Lead / Operator | Before Stage 2 tag/push for `v0.9.1` | Screenshot or screen recording showing the sub-page selection, browser back-navigation, and persisted value on the edit form | Open |
| Clear `admin_edit_*_${providerId}` draft-state keys on save/approve/reject | Future sprint owner | Next admin moderation UX touch | Test coverage proving keys are removed after successful terminal moderation/save action | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-25T15:18Z | devops | Created tracker from deferred UAT validations and known low-priority cleanup follow-up |
| 2026-03-25T15:40Z | devops | User provided screenshot sequence confirming category back-navigation persistence in the admin edit flow. Action remains open because the required second sub-page proof (offers or needs) is still not evidenced. |
