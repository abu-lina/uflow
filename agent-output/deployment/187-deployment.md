---
ID: 187
Origin: 187
UUID: c4e9a1f6
Status: Committed
---

# Deployment: Fix showAddress localStorage Sync Bug

## Changelog
| Date | Agent | Summary |
|------|-------|---------|
| 2026-06-18 | DevOps | Changes committed and PR created |

## Commit
- **Branch**: `fix/187-showaddress-localstorage-bug`
- **Message**: `fix: replace ?? with || for showAddress in syncFromLocalStorage`
- **PR**: https://github.com/abu-lina/uflow/pull/265

## Changes
1 file changed, 1 insertion, 1 deletion

### Files Changed
- `src/components/providers/ProviderEditForm.tsx:279`
  - `??` → `||` for `showAddress` field in `syncFromLocalStorage`

## Verification Gates
- [x] Test suite: 1757 passed, 0 failed
- [x] Type check: PASS
- [x] Build: PASS
- [x] Code review: APPROVED
- [x] QA: APPROVED

## Notes
- PR #265: https://github.com/abu-lina/uflow/pull/265
- Fixes a bug where editing provider details/opening hours caused the overview to show "Online" as the location. Root cause: `??` preserved stale `showAddress: false` from localStorage, overriding the DB's `show_address: true`.
