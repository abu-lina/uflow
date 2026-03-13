---
ID: 039
Origin: 039
UUID: d480d9b0
Status: Active
---

# Implementation: Plan 039 — Replace Provider Name Placeholder in Outreach Emails

**Plan Reference**: [agent-output/planning/039-outreach-email-provider-name-v0.8.1.md](../planning/039-outreach-email-provider-name-v0.8.1.md)  
**Date**: 2026-03-13T07:35Z  
**Target Release**: v0.8.1  

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-03-13T07:35Z | Critic → Implementer | Plan 039 APPROVED | Initial implementation |

---

## Implementation Summary

Eliminated the two hardcoded placeholder values in the outreach email dispatch path by:

1. Adding `getProviderName(providerId)` to `src/services/outreach.ts` — a focused function that reads `providers.provider_name` via the existing Supabase anon client and returns `null` on any error.
2. Calling it in `dispatchEmail()` within `src/services/outreachDispatcher.ts` before token creation, with fallback to `'Ihr Unternehmen'` (DE) or `'Your business'` (EN) when the DB returns no result.
3. Passing the resolved name to both `createOutreachToken()` (token snapshot) and `sendProviderOutreachEmail()` (email template), ensuring consistency.

The change is fully backwards-compatible with a zero-migration footprint.

### Value Statement Delivered

> "As a provider owner receiving an UFlow outreach email, I want the email to include my actual business name, so that I trust the message is legitimate."

Provider owners now receive emails addressed with their real business name from the database instead of a generic placeholder. The token snapshot also stores the real name, surfacing it correctly on the owner-decision landing page.

---

## Milestones Completed

- [x] M1 — Confirm data source: `providers.provider_name` confirmed as canonical field (used in search, listing pages, provider cards). Supabase anon client already reads this table in production (public-facing search). Dispatcher inherits the same client.
- [x] M2 — Implement provider name retrieval: `getProviderName()` added; `dispatchEmail()` updated with fallback.
- [x] M3 — Update/extend tests: 2 new tests added; all 14 dispatcher tests pass.
- [x] M4 — Verification gates: `npx vitest run` ✅ · `npm run type-check` ✅ · `npm run build` ✅
- [x] M5 — Version + CHANGELOG: `0.8.0 → 0.8.1`; CHANGELOG entry dated 2026-03-13.

---

## Files Modified

| Path | Change | Lines |
|------|--------|-------|
| [src/services/outreach.ts](../../src/services/outreach.ts) | Added `getProviderName()` exported function | +20 |
| [src/services/outreachDispatcher.ts](../../src/services/outreachDispatcher.ts) | Imported `getProviderName`; replaced two placeholders with DB lookup + fallback | +10, -4 |
| [src/__tests__/services/outreachDispatcher.test.ts](../../src/__tests__/services/outreachDispatcher.test.ts) | Added `getProviderName` to mock; added 2 new tests | +67 |
| [package.json](../../package.json) | Version bump `0.8.0 → 0.8.1` | 1 |
| [CHANGELOG.md](../../CHANGELOG.md) | Added v0.8.1 entry | +9 |

## Files Created

None.

---

## Code Quality Validation

| Check | Command | Result |
|-------|---------|--------|
| Tests | `npx vitest run` | ✅ 235 passed, 18 skipped |
| Type-check | `npm run type-check` | ✅ Exit 0, no errors |
| Build | `npm run build` | ✅ Compiled successfully |
| Lint (changed files) | `npm run lint` filtered to changed files | ✅ 0 errors in changed files |

> Note: `npm run lint` reports 80 pre-existing errors in `tools/uflow-memory-extension` (separate tooling package with its own tsconfig scope). None are in the files changed by this plan.

---

## Value Statement Validation

| Original | Delivered |
|----------|-----------|
| Email includes actual business name, not placeholder | ✅ `providers.provider_name` fetched and used in both email body and token snapshot |
| Provider trusts the message is legitimate | ✅ Personalised name increases perceived legitimacy |
| Fallback if name unavailable | ✅ Language-appropriate fallback; dispatch never blocked |

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `getProviderName()` | outreachDispatcher.test.ts | ✅ Yes | ✅ Yes | AssertionError: `createOutreachToken` called with `'Provider'` not `'Bilal Moschee'` | ✅ Yes |
| `dispatchEmail` fallback | outreachDispatcher.test.ts | ✅ Yes | ✅ Yes | AssertionError: `createOutreachToken` called with `'Provider'` (old placeholder) | ✅ Yes |

---

## Test Coverage

### New Tests Added

1. **`uses real provider name from DB in email and token`** — mocks `getProviderName` returning `'Bilal Moschee'`; asserts both `createOutreachToken` and `sendProviderOutreachEmail` receive `providerName: 'Bilal Moschee'`.

2. **`falls back gracefully when provider name is unavailable`** — mocks `getProviderName` returning `null`; asserts dispatch returns `success: true` and neither old placeholder (`'Provider'`, `'Your business'`) is used.

### Test Execution Results

```
Test Files  29 passed | 1 skipped (30)
     Tests  235 passed | 18 skipped (253)
  Duration  4.13s
```

Baseline was 233 tests at v0.8.0 — 2 new tests added as expected.

---

## Cross-Layer Integration Self-Check

`getProviderName` is an internal service function only called by `dispatchEmail`. No new API routes or query params were introduced. No caller-exists check required.

---

## Assumption Documentation

| Assumption | Rationale | Risk | Status |
|---|---|---|---|
| Anon client can read `providers.provider_name` in production | `providers` table is publicly readable (used by search); anon key already queries it | Low — search has worked since v0.3.0 | Accepted |
| `providers.provider_name` is non-empty for all production listings | Onboarding requires a name; empty names would be caught by form validation | Very low | Accepted |
| Dispatcher runs in a context where `NEXT_PUBLIC_SUPABASE_*` env vars are available | API routes and cron jobs use the same env var set | Low | Accepted |

---

## Outstanding Items

None. All milestones complete, all gates pass.

---

## Next Steps

➡️ **NEXT: Code Reviewer** — verify implementation quality and security  
➡️ **Then: QA** — validate acceptance criteria and test coverage  
➡️ **Then: UAT** — functional sign-off with a real dispatch in a safe environment  
➡️ **Then: DevOps** — tag v0.8.1, deploy to production
