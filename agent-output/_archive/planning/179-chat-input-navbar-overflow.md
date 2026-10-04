---
ID: 179
Origin: 179
UUID: a3f7c2b1
Status: Active
---

# Plan: Fix Chat Input Overlapped by Mobile Bottom Navbar

## 1. Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-06-17 | Planner | Initial plan from analysis 179 |

## 2. Objective

Prevent the MobileFooterBar (and CityEarlyAccessNavbar for Stage 1/2) from appearing on `/chat`, so the chat input and send button are fully accessible on mobile.

## 3. Scope

### In scope
- `src/utils/navigationUtils.ts` — add `/chat` to two exclusion lists
- `src/__tests__/utils/navigationUtils-179.test.ts` — new test file verifying exclusions
- `agent-output/planning/179-chat-input-navbar-overflow.md` — this plan

### Not in scope
- ChatInput padding changes (Option B from analysis — rejected)
- CSS changes (the `mobile-bottom-ui-slot` already handles `data-mobile-ui='none'` correctly)
- Changes to MobileFooterBar, CityEarlyAccessNavbar, or ChatInput rendering
- Any `/chat` page restructuring
- i18n or PWA changes

## 4. Implementation Steps

### Step 1: Add `/chat` to `footerExcludedPages` (both instances)

File: `src/utils/navigationUtils.ts`

There are **two** identical `footerExcludedPages` arrays — one for Stage 3 (line 205) and one for Stage 1/2 (line 249). Both must be updated.

**Line 205** (Stage 3 path):
```
const footerExcludedPages = ['/signup/check-email', '/waitlist'];
```
→
```
const footerExcludedPages = ['/signup/check-email', '/waitlist', '/chat'];
```

**Line 249** (Stage 1/2 path):
```
const footerExcludedPages = ['/signup/check-email', '/waitlist'];
```
→
```
const footerExcludedPages = ['/signup/check-email', '/waitlist', '/chat'];
```

### Step 2: Add `/chat` to `shouldShowCityEarlyAccessNavbar`'s `excludedPages`

File: `src/utils/navigationUtils.ts`

**Lines 380-386**:
```
  const excludedPages = [
    '/about',
    '/city-selection',
    '/signup/check-email',
    '/waitlist',
    '/welcome',
  ];
```
→
```
  const excludedPages = [
    '/about',
    '/city-selection',
    '/signup/check-email',
    '/waitlist',
    '/welcome',
    '/chat',
  ];
```

**Rationale**: When `shouldShowMobileFooter` returns `false` for `/chat`, `mobileUiMode` falls through to `showCityEarlyAccessNavbar`. Without this change, Stage 1/2 users would see the CityEarlyAccessNavbar (top bar) on `/chat`, which is still unnecessary chrome on a full-screen interaction page.

### Step 3: Create test file `src/__tests__/utils/navigationUtils-179.test.ts`

Follow existing patterns from `navigationUtils-062.test.ts` and `navigationUtils-063.test.ts`.

Two test groups:
1. **`shouldShowMobileFooter` excludes `/chat`** — Test Stage 3 (isAppLaunched=true), Stage 1/2 authenticated, and unauthenticated cases. Both should return `false` for `/chat` post-fix.
2. **`shouldShowCityEarlyAccessNavbar` excludes `/chat`** — Test Stage 1/2 cases where it currently returns `true` but should return `false` post-fix.

## 5. Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/utils/navigationUtils.ts` | 205 | Add `/chat` to `footerExcludedPages` (Stage 3) |
| `src/utils/navigationUtils.ts` | 249 | Add `/chat` to `footerExcludedPages` (Stage 1/2) |
| `src/utils/navigationUtils.ts` | 380-386 | Add `/chat` to `excludedPages` in `shouldShowCityEarlyAccessNavbar` |
| `src/__tests__/utils/navigationUtils-179.test.ts` | New file | Unit tests for both exclusion lists |

## 6. Open Questions — Recommendations

### Q1: Should `/chat` be excluded from `shouldShowCityEarlyAccessNavbar()`?

**Yes.** As described in Step 2. Without this, Stage 1/2 users see the CityEarlyAccessNavbar (top bar) on `/chat`. It's less disruptive than a bottom bar overlap, but still unnecessary UI on a full-screen chat. Adding the exclusion keeps all stages consistent.

### Q2: Should a test be added?

**Yes.** A focused unit test in a new file (`navigationUtils-179.test.ts`) ensures these exclusions are not accidentally removed in future refactors. The test follows the established pattern of Plan-specific test files (e.g., `-062`, `-063`).

## 7. Testing Approach

- **Unit tests** (primary): Test `shouldShowMobileFooter` and `shouldShowCityEarlyAccessNavbar` utilities directly with `/chat` as the pathname. Cover Stage 3, Stage 1/2 authenticated, and Stage 1/2 unauthenticated scenarios.
- **Integration/e2e test** (deferred): Verifying the DOM on a real `/chat` page render would require mounting `RootClientLayout` with mocked route/mobile context — brittle and high-effort. Not recommended for this fix.

## 8. Edge Cases & Risks

1. **Locale-prefixed routes (`/de/chat`, `/ar/chat`)**: The current exclusion uses exact match (`footerExcludedPages.includes(pathname)`), not a prefix or suffix pattern. If i18n adds locale prefixes in the future, `/de/chat` would not be excluded. **Mitigation**: The same limitation applies to `/signup/check-email` and `/waitlist`, so this is an existing pattern, not a new risk. If locale-prefixing happens, all exact-match exclusions will need updating.

2. **CityEarlyAccessNavbar exclusion for Stage 1/2**: This is a **breaking change** for any code that relied on the navbar being present on `/chat`. No such code exists today — `/chat` is a new page.

3. **Splash screen interaction**: Both functions check `isSplashVisible` before reaching the exclusion lists, so splash visibility correctly takes priority regardless of pathname.

4. **No backfill needed**: The `mobile-bottom-ui-slot` container always exists in the DOM. Setting `data-mobile-ui='none'` via the `mobileUiMode` chain already makes both navs invisible. No CSS layout reflow occurs.
