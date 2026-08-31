---
ID: 185
Origin: 185
UUID: f8a2b7c5
Status: Committed
---

# Deployment: Fix Provider Modal Back-Navigation

## Changelog
| Date | Agent | Summary |
|------|-------|---------|
| 2026-06-18 | DevOps | Changes committed and PR created |
| 2026-06-18 | DevOps | UAT deployment successful — workflow run #27779661778 |

## Commit
- **Branch**: `fix/185-modal-back-navigation`
- **Message**: `fix: replace hardcoded /providers navigation with router.back() on modal close`
- **PR**: https://github.com/abu-lina/uflow/pull/263

## Changes
1 file changed, 1 insertion, 1 deletion, 1 prop removal

### Files Changed
- `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx`
  - Line 72: `router.push('/providers')` → `router.back()`
  - Line 146: removed `backPath="/providers"` prop

## Verification Gates
- [x] Test suite: 1757 passed, 0 failed
- [x] Type check: PASS
- [x] Build: PASS
- [x] Code review: APPROVED
- [x] QA: APPROVED

## Notes
- PR #263: https://github.com/abu-lina/uflow/pull/263
- UAT deployment: https://github.com/abu-lina/uflow/actions/runs/27779661778
- Fixes apply to: provider detail modal close, dashboard edit page back navigation
