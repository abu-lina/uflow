---
ID: 078
Origin: 078
UUID: f7a9c3e1
Status: Active
---

# Open Actions 078: Deferred Post-Deploy Follow-ups

## Summary

Plan 078 (iOS admin/provider toast safe-area fix) was committed in v0.10.7 with one deferred validation gate that must be completed before production promotion from UAT.

**Release/Version Context**: v0.10.7 — iOS toast safe-area overlap bugfix

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| DF-1: Physical-device visual gate for reachable moderation path | QA operator with device access (execution), UAT owner (sign-off) | Before production promotion from UAT | iPhone 15 Pro screenshots/video (approve + reject toasts below status bar) + Desktop Chrome/Firefox screenshots (no regression) + Android Chrome screenshot (no regression) on `/dashboard/providers/[id]/edit` | Open |

## DF-1 Details

**Reachable states in scope**:
- Approve action toast on `/dashboard/providers/[id]/edit`
- Reject action toast on `/dashboard/providers/[id]/edit`
- Desktop Chrome/Firefox toast regression check
- Android Chrome toast regression check

**Closure evidence required**:
- iPhone 15 Pro (or equivalent notch/Dynamic Island) screenshots/video proving approve + reject toasts are fully below status bar
- Desktop Chrome and Firefox screenshots proving no toast layout regression
- Android Chrome screenshot proving no toast layout regression

**Recommended tracker destination**: Continue in deployment release checklist until evidence is attached.

## Changelog

| Date (UTC) | Agent | Change |
|-----------|-------|--------|
| 2026-04-04T09:15Z | devops | Created tracker from UAT report DF-1 deferred validation gate |
