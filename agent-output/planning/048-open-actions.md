---
ID: 048
Origin: 048
UUID: 5e9ac41b
Status: Active
---

# Open Actions 048: Deferred Post-Deploy Follow-ups

## Summary

Combined open-actions tracker for two Plan 048 sessions (both used ID 048):
- **Session A**: Plan 048 — JoinHalal Admin Dry-Run Dashboard UI (target v0.8.8)
- **Session B**: Plan 048 — Provider modal Barakah badge visuals (target v0.8.9)

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Plan | Status |
|------|-------|-------------|-------------------|------|--------|
| Live browser validation of `/dashboard/import` — load page, run dry-run with limit 10, run with all, verify result state, copy command, and error state | DevOps / Operator | First successful deployment to UAT environment | Operator confirms: page loads, dry-run runs, result state renders, clipboard works, error state reachable | JoinHalal Admin (v0.8.8) | Open |
| Runtime latency measurement for `all` limit against live JoinHalal sitemap; escalate if >~30s to streaming/background job plan | DevOps / Operator | First deployment to live stack (UAT env) | Latency recorded in deployment doc note; if >30s, open a new plan | JoinHalal Admin (v0.8.8) | Open |
| Rate limiter for `POST /api/admin/import-joinhalal/dry-run` — match pattern in `src/app/api/admin/review-provider/route.ts` | Engineering | Before admin access is expanded beyond current operator set | Rate limiter added; lint + type-check pass | JoinHalal Admin (v0.8.8) | Open |
| Add `agent-output/qa/README.md` or remove the instruction reference (from QA-3 in Plan 048 QA report) | Process maintainer | Next session with QA mode tooling | File created or reference removed | JoinHalal Admin (v0.8.8) | Open |
| Browser visual verification: visit `https://uat.ummahflow.com/providers/be186e0a-ae33-42d6-951c-6cc4c455ba56` on desktop and confirm (a) no "Hatem Ipsum" text, (b) no legacy Iman/Zakat/Sunnah pills, (c) structured BadgeLabel visuals OR clean localised empty state in Barakah Effekte section | DevOps / UAT operator | After v0.8.9 deployment to UAT | Screenshot or browser evidence from UAT environment | Barakah badges (v0.8.9) | Open |

## Changelog

| Date (UTC)        | Agent  | Change                                                                          |
| ----------------- | ------ | ------------------------------------------------------------------------------- |
| 2026-03-19T17:40Z | devops | Created tracker for JoinHalal Admin (v0.8.8) deferred items                    |
| 2026-03-22T09:45Z | devops | Added Barakah badge URL verification item (v0.8.9 deferred)                    |
| 2026-03-22T11:00Z | devops | Merged both trackers on rebase conflict resolution                              |
