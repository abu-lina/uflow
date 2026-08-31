---
ID: 184
Origin: 184
UUID: a3b9f1e7
Status: Active
---

# UAT Validation: Deactivate ummah and stores sections

## 1. Changelog

| Date | Agent | Summary |
|---|---|---|
| 2026-06-17 | UAT (opencode) | Source-code validation of all 5 acceptance criteria against production branch |

## 2. Acceptance Criteria Verification

| AC # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Ummah/Stores tabs visible with "Soon" badge; Food tab has no badge | PASS | `SectionSelector.tsx:43-74` — all 3 sections rendered from `SECTION_ORDER`. Badge renders at line 67-71 when `isDisabled && meta.badgeKey`. Food has `active: true` → no badge. Ummah/Store have `active: false` + `badgeKey: 'sections.soon'` → badge renders. |
| 2 | Clicking disabled tabs is a no-op | PASS | `SectionSelector.tsx:54` — `disabled={isDisabled}` (native HTML prevents onClick). `Header.tsx:52` — `if (!SECTION_META[section].active) return;` defensive guard. `search/page.tsx:427` — same defensive guard. |
| 3 | /ummah and /stores route pages redirect to /food | PASS | `ummah/page.tsx:12-14` — `if (!SECTION_META.ummah.active) redirect('/food')`. `stores/page.tsx:12-14` — same pattern for `SECTION_META.store.active`. |
| 4 | `sections.soon` translation key exists in all 6 locales | PASS | en.ts (Soon), de.ts (Demnächst), ar.ts (قريباً), ps.ts (ژر), ur.ts (جلد), tr.ts (Yakında) — all at `sections.soon` key, line 145 in each file. |
| 5 | Food section continues working normally | PASS | `food/page.tsx:1-12` — no changes, passes through to `ProvidersPage`. `sectionFilters.ts:25` — `food: { active: true }`. |

## 3. Value Statement Validation

Does the implementation deliver the business value described in the analysis?

**PASS.** The original value statement: "Making [ummah/store] visible with 'Soon' badges preserves the UX vision while protecting the release quality bar for the food-only launch."

- Tabs remain visible with disabled styling (`opacity-50 cursor-not-allowed`) + "Soon" badge → UX vision preserved
- Clicks are no-ops + direct URLs redirect to /food → users cannot reach unfinished sections
- Food section is untouched → release quality bar for food-only launch is protected

## 4. Verdict

**APPROVED FOR RELEASE**

## 5. Notes for DevOps

- Branch: `feature/184-deactivate-ummah-stores`
- The implementation is config-driven via `SECTION_META` in `src/config/sectionFilters.ts`. To re-activate a section post-release, flip `active: true` for the relevant entry — no code changes needed.
- QA test results: 1758/1758 tests pass, `tsc --noEmit` passes.
- Manual smoke-test checklist from QA:
  1. Navigate to `/food` — Food tab active, Ummah/Store tabs visible with "Soon" badge and reduced opacity
  2. Click Ummah/Store tab — no navigation occurs
  3. Direct URL `/ummah` and `/stores` — both redirect (307) to `/food`
  4. `/providers?section=ummah` and `/search?section=ummah` — both resolve to food
  5. Food search, browse, provider pages — all function as before
  6. Mobile 320px width — no layout overflow
  7. All 6 locales — badge shows translated string
