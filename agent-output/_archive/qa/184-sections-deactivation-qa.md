---
ID: 184
Origin: 184
UUID: f273f642
Status: Active
---

# QA Validation: Deactivate ummah and stores sections

## 1. Changelog

| Date | Agent | Summary |
|---|---|---|
| 2026-06-17 | QA | Validated implementation against plan, architect conditions, and code review findings |

## 2. Test Results Summary

| Check | Result |
|---|---|
| `src/__tests__/components/SectionSelector.test.tsx` | 7/7 PASS (122ms) |
| `src/__tests__/components/Header.test.tsx` | 4/4 PASS (113ms) |
| Full test suite | 1758 passed, 22 skipped (214 test files) |
| `tsc --noEmit` (type-check) | PASS |

## 3. Requirements Verification

| Req # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | SECTION_META config with correct active flags | PASS | `src/config/sectionFilters.ts:24-28` — food active=true, ummah active=false, store active=false |
| 2 | SectionSelector renders disabled tabs with "Soon" badge | PASS | `src/features/search/components/SectionSelector.tsx:54` — `disabled={isDisabled}`, lines 67-71 badge rendering. food tab NOT disabled. `aria-selected` present on all tabs (line 53). Native `disabled` prevents onClick. |
| 3 | Route pages redirect to /food | PASS | `ummah/page.tsx:12-14` — checks `SECTION_META.ummah.active`, calls `redirect('/food')`. `stores/page.tsx:12-14` — same pattern for `SECTION_META.store.active`. |
| 4 | providers/page.tsx guards inactive sections | PASS | `providers/page.tsx:46` — `SECTION_META[rawSection].active ? rawSection : 'food'`. Architect Condition 1 satisfied. |
| 5 | Header handleSectionChange guards inactive sections | PASS | `Header.tsx:52` — `if (!SECTION_META[section].active) return;` |
| 6 | Search page guards | PASS | `search/page.tsx:427` — handleSectionChange guard. `search/page.tsx:49-55` — resolveSection falls back to 'food' for inactive sections. |
| 7 | Translations exist for all 6 locales | PASS | en.ts ("Soon"), de.ts ("Demnächst"), ar.ts ("قريباً"), ps.ts ("ژر"), ur.ts ("جلد"), tr.ts ("Yakında") — all at line 145 under `sections.soon` |
| 8 | Tests cover new behavior | PASS | `SectionSelector.test.tsx`: disabled tabs test (line 68), Soon badge test (line 75), no-op click tests (lines 59, 83), food tab still clickable (line 52). `Header.test.tsx`: ummah/store click no-op (4 tests). |

## 4. Code Review Issue Remediation

| Issue | Status | Evidence |
|---|---|---|
| `.orig` artifact file committed | RESOLVED | `src/components/shared/SelectableCard.tsx.orig` no longer exists (confirmed via `ls`) |
| Missing `sections.soon` in ps, ur, tr locales | RESOLVED | All 6 locales confirmed present with translations |
| Architect Condition 2 (resolveSection duplication) | NOT ADDRESSED (accepted as tech debt) | Search page still has inline resolver, not refactored to use `resolveSectionFromSearchParams`. Non-blocking. |

## 5. Verdict

**PASS**

## 6. Notes for UAT

The UAT team should manually verify:

1. **Tabs visible with badges** — Navigate to `/food` on desktop and mobile. Confirm Food tab is active/clickable. Confirm Ummah and Stores tabs are visible with "Soon" badge and have reduced opacity.
2. **Disabled tab clicks** — Click Ummah or Stores tab anywhere it renders (Header, search page). Confirm nothing happens (no navigation, no error).
3. **Route redirects** — Navigate directly to `/ummah` and `/stores` in the browser. Confirm both redirect (307) to `/food`.
4. **Manual URL bypass** — Visit `/providers?section=ummah` and `/search?section=ummah`. Confirm both resolve to food section (not ummah).
5. **Existing flows unaffected** — Search for food, browse categories, click through to provider pages. Confirm food section functions as before.
6. **Mobile** — Verify tab layout + badges render correctly at 320px width (no overflow/truncation issues).
7. **Locales** — Switch to DE, AR, PS, UR, TR and verify the "Soon" badge shows the translated string.
