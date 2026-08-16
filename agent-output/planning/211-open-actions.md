---
ID: 211
Origin: 211
UUID: b7e2d4f1
Status: Active
---

# Open Actions 211: Deferred Post-Deploy Follow-ups

## Summary

On-device iPhone Safari validation was deferred to post-deployment on the UAT environment (Shift-Right Testing pattern). All automated QA gates passed; real-device validation requires physical iPhone hardware and a deployed environment with actual Supabase configuration.

Release context: v0.15.13 (Plan 211 — iPhone map tile rendering regression fix), PR #314 squash-merged 2026-08-16.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to Close | Status |
| ---- | ----- | ----------- | ----------------- | ------ |
| On-device iPhone Safari validation — 7 scenarios | UAT / DevOps Team | After deployment to https://uat.ummahflow.com | All 7 scenarios PASS on real iPhone; results documented in `agent-output/qa/closed/211-map-tiles-iphone-qa.md` "On-Device Validation Results" section | Open |

## Validation Scenarios

Execute these on **real iPhone hardware** running iOS 16+, Safari, at **https://uat.ummahflow.com**:

1. `/search` food map: Tiles visible (not grey) at default zoom
2. Zoom 17–19: Streets and buildings visible (no grey fill)
3. Pan repeatedly: Tiles continue loading without degradation
4. Near-me toggle + geolocation: Interaction works; location detected
5. Pin tap: Navigates to provider detail page
6. Hard refresh / reopen tab: Tiles load on second visit
7. Provider detail with photos: Supabase CDN images load correctly (validates Supabase-scoped SW regex did not break image handling)

## Closure Procedure

1. Execute all 7 scenarios on iPhone at https://uat.ummahflow.com
2. Document results in `agent-output/qa/closed/211-map-tiles-iphone-qa.md` (On-Device Validation Results section)
3. If all PASS: Update this document Status → Resolved; proceed with confidence in production release
4. If any FAIL: Coordinate with Implementer for hotfix

## Changelog

| Date (UTC)       | Agent  | Change                                              |
| ---------------- | ------ | --------------------------------------------------- |
| 2026-08-16T03:15Z | devops | Created tracker from deferred QA validation (Shift-Right testing) |
