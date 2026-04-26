---
ID: 104
Origin: 104
UUID: a273aed8
Status: Active
---

# Open Actions 104: Deferred Post-Deploy Follow-ups

## Summary

Manual browser visual verification of the Plan 104 Filter accordion UI on `/search` was deferred from QA and UAT phases due to environment constraints (production build requires valid Supabase secrets; interactive browser execution unavailable in agent sessions). All logic paths are fully automated-tested (1086 tests pass). The gap is CSS/layout-only (visual fidelity of icons, spacing, ring indicator styling vs Figma spec).

Release context: v0.10.28, `session/104-filter-ui-redesign` branch.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| **DF-1**: Manual browser verification of `/search` filter accordion visual fidelity | User / QA | Before Stage 2 push (or within 24h post-release) | Screenshot of `/search` with filter accordion showing: (1) Filter accordion open with 5 items, icons, labels; (2) One item selected showing `Filter · 1` badge; (3) Clear-all resets title to `Filter` | Open |

### DF-1 Acceptance Criteria

To close DF-1, provide screenshot/recording showing:

1. **Filter accordion rendered**: All 5 items visible with icons (Moon, HandHeart, HeartHandshake, CircleParking, PrayerRug) and two-line labels
2. **Filter selection + badge**: At least 1 item selected; accordion title shows `Filter · N`
3. **Clear-all reset**: After clicking "Alles löschen", title reverts to plain `Filter`
4. **No visual regression**: Was/Wo/Wer accordions unaffected (spot check)

### DF-1 Fallback

If DF-1 cannot be closed before release:
- Proceed with release
- Execute validation within 24h post-release
- If visual defects found: log as follow-up plan; no rollback needed (CSS-only, no data risk)

## Changelog

| Date (UTC)     | Agent  | Change                                                         |
|----------------|--------|----------------------------------------------------------------|
| 2026-04-26T15:56Z | devops | Created tracker from deferred DF-1 UAT validation; Stage 1 commit |
