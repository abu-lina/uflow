---
ID: 111
Origin: 111
UUID: d7e4a1b3
Status: Committed
---

# 111 — i18n Coverage Implementation

## Plan Reference

- Plan: `agent-output/planning/111-i18n-coverage-plan.md`
- Scope in this increment: M1 (locale key parity + checker) and M2 (legacy ternary migration)

## Date

- 2026-04-28

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-04-28 | Planner -> Implementer | Begin with M1 and proceed | Started implementation, set plan status In Progress |
| 2026-04-28 | Implementer | M1 execution | Added `scripts/check-i18n.mjs`, wired npm script, achieved 0 missing keys vs EN |
| 2026-04-28 | Implementer | M2 execution | Migrated forgot/reset pages to `LanguageProvider` + `t()` keys; removed `@/hooks/useLanguage` imports |
| 2026-04-28 | Code Review -> Implementer | Address findings before QA | Added localized auth error-code mapping, reset→forgot email prefill, removed de/en toast fallback, and cleaned checker dead code |
| 2026-04-28 | Implementer | Pre-QA gate completion | Fixed lint console-global issue in checker script and expanded Vitest include scope so checker test is discovered and executable |

## Implementation Summary

Implemented the i18n foundation and the first migration milestone to deliver direct user value for non-DE users:

1. Established deterministic locale key parity checking with a committed checker script and npm command.
2. Added missing locale keys required by active UI callsites (including new auth-page namespaces).
3. Removed legacy 2-language hook usage from the M2 target files and converted hardcoded DE/EN ternary UI strings in forgot/reset password pages to translation keys.
4. Aligned password reset language typing with full app language union.
5. Addressed pre-QA code-review findings by removing raw backend error message rendering, wiring reset-email query param consumption, and making bookmark toasts locale-aware via `LanguageProvider`.

This advances the value statement by preventing raw key leakage and removing DE/EN-only rendering in high-traffic auth recovery flows.

## Baseline & Measurements

- Baseline captured (key completeness):
  - Command: `npm run i18n:check`
  - Result: `de/ar/tr/ur/ps missing keys: 0` (vs `en` canonical)
  - Environment: local shell

## Milestones Completed

- [x] M1 — Fill Missing Locale Keys (F1 + F8)
- [x] M2 — Migrate Legacy Ternary Pages (F2)
- [ ] M3 — i18n for Untranslated Pages (F3 + F7)
- [ ] M4 — Hardcoded Placeholders and Toast Messages (F5 + F6)
- [ ] M5 — Hardcoded `aria-label` and `title` Strings (F4)
- [ ] M6 — Verification and Cleanup
- [ ] M7 — Update Version and Release Artifacts

## Files Modified

| Path | Change Summary | Approx. Lines |
|------|----------------|---------------|
| `src/translations/en.ts` | Added `forgotPassword.*` + `resetPassword.*` namespaces; later added `emailNotFound` keys for auth error-code mapping | +~102 |
| `src/translations/de.ts` | Added localized `forgotPassword.*` + `resetPassword.*`; later added localized `emailNotFound` keys | +~102 |
| `src/translations/ar.ts` | Added `forgotPassword.*` + `resetPassword.*`; later added `emailNotFound` parity keys | +~102 |
| `src/translations/tr.ts` | Added `forgotPassword.*` + `resetPassword.*`; later added `emailNotFound` parity keys | +~102 |
| `src/translations/ur.ts` | Added `forgotPassword.*` + `resetPassword.*`; later added `emailNotFound` parity keys | +~102 |
| `src/translations/ps.ts` | Added `forgotPassword.*` + `resetPassword.*`; later added `emailNotFound` parity keys | +~102 |
| `src/app/(public)/forgot-password/ForgotPasswordPageContent.tsx` | Replaced ternaries with `t()` keys; switched to `LanguageProvider`; mapped backend error codes to localized keys; added `?email=` prefill | ~55 modified |
| `src/app/(public)/reset-password/ResetPasswordPageContent.tsx` | Replaced ternaries with `t()` keys; switched to `LanguageProvider`; mapped backend error codes to localized keys | ~55 modified |
| `src/hooks/useBookmarkWithAuth.ts` | Migrated to `LanguageProvider`; replaced de/en-only toast util mapping with locale-aware `t()` toast messages | ~10 modified |
| `src/lib/auth.ts` | `resetPasswordWithLanguage` now accepts `Language` union | 1 modified |
| `package.json` | Added `i18n:check` script | 1 modified |
| `scripts/check-i18n.mjs` | Removed unused `setDeep` helper/export flagged in code review | ~15 modified |
| `vitest.config.ts` | Expanded test discovery include globs to cover `tests/**/*.test.*` in addition to `src/**` | ~4 modified |

## Files Created

| Path | Purpose |
|------|---------|
| `scripts/check-i18n.mjs` | Automated locale key-diff checker against EN canonical keys |
| `tests/scripts/check-i18n.test.ts` | Initial checker utility regression test scaffold |

## Deployment Path Audit

- N/A — no deployment pipeline/config changes in this increment.

## Code Quality Validation

- [x] Locale parity check: `npm run i18n:check` (pass)
- [x] Legacy ternary check for M2 target files (`grep`): no `language === 'de'` matches
- [x] Legacy hook import check (`grep`): no `@/hooks/useLanguage` imports remaining in `src/`
- [x] Raw auth payload rendering check (`grep`): no `setError(error.message || ...)` / `setError(data.error || ...)` in M2 auth pages
- [x] Reset->Forgot cross-trace check (`grep`): forgot-password now consumes `searchParams.get('email')`
- [x] Bookmark toast fallback check (`grep`): no de/en-only `toastLanguage` mapping in `useBookmarkWithAuth`
- [x] `npm run lint` (pass with warnings only; 0 errors)
- [x] `npm run type-check` (pass)
- [x] `npx vitest run tests/scripts/check-i18n.test.ts` (pass)
- [x] `npm run build` (pass with injected valid public Supabase env placeholders for local shell)

## Value Statement Validation

Original value statement: multilingual users should not see raw keys, German-only strings, or English-only auth recovery pages.

Validation in this increment:
- Key parity now reports complete coverage across all 6 locales.
- Forgot/reset password pages no longer rely on DE/EN ternary rendering.
- UI copy on these pages is now key-driven and language-provider based.
- Auth pages no longer render raw backend error payloads; error codes are mapped to localized user-facing messages.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|----------------|-----------|---------------------|-------------------|----------------|------------------|
| `collectMissingKeys()` | `tests/scripts/check-i18n.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Pre-fix behavior: test was not discovered because `vitest.config.ts` only included `src/**` | ✅ Yes |
| `flattenKeys()` | `tests/scripts/check-i18n.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Pre-fix behavior: test was not discovered because `vitest.config.ts` only included `src/**` | ✅ Yes |

## Test Coverage

- Added targeted regression coverage for checker utility behavior (`collectMissingKeys` canonical parity logic).
- Added test-discovery coverage path by updating Vitest include config to execute tests under `tests/`.

## Test Execution Results

| Command | Result | Notes |
|---------|--------|-------|
| `npm run i18n:check` | ✅ Pass | All locales key-complete vs EN |
| `npm run lint` | ✅ Pass | 0 errors, warnings present in unrelated test files |
| `npm run type-check` | ✅ Pass | `tsc --noEmit` completed successfully |
| `npx vitest run tests/scripts/check-i18n.test.ts` | ✅ Pass | 1 file, 1 test passed |
| `npm run i18n:check` | ✅ Pass | Re-run after fixes; still 0 missing keys |
| `npm run build` | ✅ Pass* | Pass in local shell when public Supabase env placeholders are provided |

\* Build note: `next build` initially failed due missing local `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`; with syntactically valid placeholder values injected for local validation, build completed successfully (exit code 0).

## Multi-Plan State Audit

- N/A — no prior-plan state hydration/derived-state mutation touched in this increment.

## Search/Filter Client-Interaction Trace

- N/A — no search submit URL param lifecycle or mixed-entity inline action behavior changed.

## Local Verification

- ⚠️ Blocked — browser-level manual smoke was not executed in this increment. CLI gates passed, but interactive UI verification remains for QA/UAT.

## Outstanding Items

1. Complete M3-M5 remediation (untranslated pages, placeholders/toasts, aria/title hardcoded strings).
2. Perform M6 verification and legacy hook deletion assessment (`src/hooks/useLanguage.ts`).

## Next Steps

1. Continue implementation with M3 (create-quick and signup untranslated/hardcoded segments).
2. Proceed with M4/M5 and then full M6 verification.
