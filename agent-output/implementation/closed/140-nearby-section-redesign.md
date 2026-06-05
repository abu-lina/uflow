---
ID: 140
Origin: 140
UUID: a57daf4c
Status: Released
---

## Changelog
| 2026-06-04 | DevOps | Document closed | Status: Released |

# Implementation: Nearby Section Redesign (Plan 140)

## Summary of Changes

**File modified:** `src/features/providers/components/ProviderDetailSections.tsx`

1. **Added `MapPin` import** (line 8) — alphabetically inserted into the existing `lucide-react` import block.

2. **Replaced nearby item rendering** (lines 236-242) — the plain `<p>` elements rendering `nearby.provider_name` were replaced with `<DetailListItem>` components using the `MapPin` icon, matching the visual pattern used by the amenities and menu sections.

## TDD Compliance

This is a design/UI change — test-before-code does not strictly apply. Existing tests were run to confirm no regression:

- `src/__tests__/features/providers/ProviderDetailSections.test.tsx` — 8 tests passed
- All 164 test files passed (1300 tests, 22 skipped)

## Verification Results

| Command | Result |
|---------|--------|
| `npm run type-check` | Passed (0 errors) |
| `npm run lint:check` | Failed (59 pre-existing warnings in other files, 0 errors in changed file) |
| `npm test` | Passed (164 files, 1300 tests, 22 skipped) |

**Note on lint:** The 59 warnings are all pre-existing in other test files (unused vars, non-null assertions, `any` types, `<img>` elements) and are unrelated to this change. The changed file itself introduced no new lint issues.
