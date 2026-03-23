---
ID: 50
Origin: 50
UUID: a8c41f2e
Status: Active
---

# Open Actions 050: Deferred Post-Deploy Follow-ups

## Summary

Five follow-up items were deferred from UAT and Code Review for Plan 050 (Admin Provider Review Panel, v0.8.17). Items 1 and 2 are required browser-level validations that should be completed during or immediately after the v0.8.17 deployment smoke test. Items 3–5 are LOW-severity technical debt with future owners.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| 1. Desktop admin entry visibility: confirm "Admin Panel" appears in header dropdown for admin/moderator and is hidden for regular users | DevOps / operator | At v0.8.17 deployment smoke test | Screenshot or observation log showing admin user sees entry, regular user does not | Open |
| 2. Mobile admin entry visibility: confirm "Admin Panel" button appears in MobileProfileScreen for admin/moderator and is hidden for regular users | DevOps / operator | At v0.8.17 deployment smoke test | Screenshot or observation log showing mobile profile screen behavior | Open |
| 3. Live two-session concurrency conflict test: open same pending provider in two admin sessions; submit session A review; confirm session B shows exactly one conflict toast and auto-refreshes | DevOps / operator | At v0.8.17 deployment smoke test (requires ≥2 pending providers and 2 admin accounts) | Observation log of conflict toast and list refresh | Open |
| 4. JSDoc update for `expectedUpdatedAt` in `review-provider/route.ts` | Next implementer touching that route | Next unrelated touch of `src/app/api/admin/review-provider/route.ts` | `@param expectedUpdatedAt` entry added to JSDoc | Open |
| 5. i18n: replace hardcoded "Admin Panel" strings in Header.tsx and MobileProfileScreen.tsx | i18n pass / next admin UI work | When next-intl keys are added for admin surfaces | `t('admin.panelLabel')` or equivalent replaces hardcoded strings | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-23T14:10Z | devops | Created tracker from UAT deferred validations and code review LOW findings |
