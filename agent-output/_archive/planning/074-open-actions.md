---
ID: 074
Origin: 074
UUID: b8f4c2e7
Status: Active
---

# Open Actions 074: Deferred Post-Deploy Follow-ups

## Summary

Plan 074 intentionally deferred a dev-only vulnerability chain in `tools/memory-backend`. This does not block the current release but requires explicit ownership and closure evidence in a future tool modernization cycle.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| DF-074-01: Upgrade memory-backend toolchain to remove deferred esbuild/vite chain | Engineering | Next tool modernization cycle, or before memory-backend gains network-facing exposure | `tools/memory-backend` audit evidence with 0 moderate/high/critical in chain + passing tests after upgrade | Open |

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-03 | devops | Created tracker from deferred validations |
