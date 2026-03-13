---
ID: 040
Origin: 040
UUID: a4c19f2e
Status: Committed
---

# Implementation: Plan 040 — Replace Hardcoded WhatsApp Number with WHATSAPP_CONTACT_NUMBER

**Plan Reference**: `agent-output/planning/040-whatsapp-contact-number-config-v0.8.1.md`
**Date**: 2026-03-13
**Target Release**: v0.8.1

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-03-13T09:00Z | Implementer | Plan 040 (Critic Approved) | Initial implementation — all milestones complete, all gates pass |

## Implementation Summary

Replaced all three hardcoded `4915123456789` WhatsApp placeholder occurrences with a server-side `WHATSAPP_CONTACT_NUMBER` environment variable. A new `getWhatsAppContactUrl()` utility strips non-digit characters and returns a `wa.me` link (or `null` when unconfigured). Both outreach email templates (DE/EN) and the owner-decision landing page conditionally render the WhatsApp CTA only when a number is configured. The client component receives the derived URL via a server-side prop — no `NEXT_PUBLIC_` exposure.

**Value delivery**: Operators can now change the UFlow WhatsApp contact number through environment configuration alone, without code changes. Missing or empty configuration gracefully omits the WhatsApp CTA rather than showing a broken link.

## Milestones Completed

- [x] **M1**: Implement `getWhatsAppContactUrl()` in `outreachEmail.ts`
- [x] **M2**: Parameterise email templates with conditional WhatsApp CTA
- [x] **M3**: Update owner-decision server→client prop flow (page.tsx reads env, passes `whatsappUrl` prop)
- [x] **M4**: TDD — 8 tests written first (RED verified), implementation passes all (GREEN verified)
- [x] **M5**: Verification gates — 243 tests ✅, type-check ✅, build ✅, delta-lint ✅
- [x] **M6**: Deployment path audit — `grep -rnl '4915123456789|WHATSAPP_CONTACT_NUMBER' .github/workflows/ Dockerfile deploy/ scripts/` → NO MATCHES (clean)
- [x] **M7**: Environment templates (all 3) and CHANGELOG updated

## Files Modified

| File | Changes | +/− |
|------|---------|-----|
| `src/services/email/outreachEmail.ts` | Added `getWhatsAppContactUrl()`, `getOutreachEmailHtml()`, parameterised templates with conditional WhatsApp CTA, removed hardcoded number | +44/−9 |
| `src/app/(public)/owner-decision/page.tsx` | Imports `getWhatsAppContactUrl`, passes `whatsappUrl` prop to client component | +3/−1 |
| `src/app/(public)/owner-decision/OwnerDecisionContent.tsx` | Added `whatsappUrl` prop interface, conditional CTA rendering, removed hardcoded link | +8/−2 |
| `src/__tests__/app/owner-decision.test.tsx` | Updated 8 render calls to pass `whatsappUrl` prop | +8/−8 |
| `env.template` | Added `WHATSAPP_CONTACT_NUMBER` with documentation comment | +5 |
| `env.uat.template` | Added `WHATSAPP_CONTACT_NUMBER` with documentation comment | +5 |
| `env.production.template` | Added `WHATSAPP_CONTACT_NUMBER` with documentation comment | +5 |
| `CHANGELOG.md` | Added Plan 040 entry under v0.8.1 Changed section | +4 |

## Files Created

| File | Purpose |
|------|---------|
| `src/__tests__/services/outreachEmailWhatsApp.test.ts` | 8 TDD tests for WhatsApp contact URL generation and email template rendering (105 lines) |

## Deployment Path Audit

**Scope**: CI/CD workflows, Dockerfile, deploy/ scripts, scripts/ directory.

**Search commands**:
```bash
grep -rnl '4915123456789' .github/workflows/ Dockerfile deploy/ scripts/
grep -rnl 'WHATSAPP_CONTACT_NUMBER' .github/workflows/ Dockerfile deploy/ scripts/
```

**Result**: No matches. The deployment surface does not reference the old placeholder number or the new env var directly. The variable is read at runtime via `process.env` — no Dockerfile `ARG`/`ENV` or workflow changes are needed.

**Conclusion**: CLEAN — no deployment path changes required.

## Code Quality Validation

- [x] **Compilation**: `npm run type-check` — zero errors
- [x] **Linter**: `npx eslint` on 5 changed source files — zero errors
- [x] **Tests**: `npx vitest run` — 243 passed, 18 skipped (30 passed + 1 skipped test files)
- [x] **Build**: `npm run build` — successful production build, all routes rendered
- [x] **Compatibility**: No new dependencies, no lockfile changes

## Value Statement Validation

**Original**: "As a provider owner contacting UFlow from an outreach email or owner-decision page, I want the WhatsApp link to use the real configured UFlow contact number, so that I reach the correct team and UFlow can change contact operations without code changes."

**Implementation delivers**: The hardcoded `4915123456789` is fully removed from all three occurrences. `WHATSAPP_CONTACT_NUMBER` is the single source of truth. When set, the number is normalised and used in `wa.me` links across email templates and the owner-decision page. When missing/empty, the WhatsApp CTA is gracefully omitted. Operators change configuration without code changes.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|----------------|-----------|--------------------|--------------------|----------------|------------------|
| `getWhatsAppContactUrl()` | `outreachEmailWhatsApp.test.ts` | ✅ Yes | ✅ Yes | TypeError: not a function (not exported yet) | ✅ Yes |
| `getWhatsAppContactUrl()` null cases | `outreachEmailWhatsApp.test.ts` | ✅ Yes | ✅ Yes | TypeError: not a function | ✅ Yes |
| `getWhatsAppContactUrl()` strip non-digits | `outreachEmailWhatsApp.test.ts` | ✅ Yes | ✅ Yes | TypeError: not a function | ✅ Yes |
| `getOutreachEmailHtml()` DE template | `outreachEmailWhatsApp.test.ts` | ✅ Yes | ✅ Yes | TypeError: not a function (not exported yet) | ✅ Yes |
| `getOutreachEmailHtml()` EN template | `outreachEmailWhatsApp.test.ts` | ✅ Yes | ✅ Yes | TypeError: not a function | ✅ Yes |
| `getOutreachEmailHtml()` omit CTA | `outreachEmailWhatsApp.test.ts` | ✅ Yes | ✅ Yes | TypeError: not a function | ✅ Yes |

All 8 tests written before implementation. RED state confirmed, GREEN state achieved after minimal implementation.

## Test Coverage

### Unit Tests (8 new)

| Test | Description | Status |
|------|-------------|--------|
| `getWhatsAppContactUrl → returns wa.me URL when configured` | Configured env var → correct `wa.me` link | ✅ Pass |
| `getWhatsAppContactUrl → returns null when not set` | Undefined env var → `null` | ✅ Pass |
| `getWhatsAppContactUrl → returns null when empty string` | Empty string → `null` | ✅ Pass |
| `getWhatsAppContactUrl → returns null when whitespace only` | Whitespace → `null` | ✅ Pass |
| `getWhatsAppContactUrl → strips non-digit characters` | `+49 151 2345-6789` → `wa.me/4915123456789` | ✅ Pass |
| `getOutreachEmailHtml → DE template includes WhatsApp CTA` | Configured → HTML contains `wa.me` link | ✅ Pass |
| `getOutreachEmailHtml → EN template includes WhatsApp CTA` | Configured → HTML contains `wa.me` link | ✅ Pass |
| `getOutreachEmailHtml → omits WhatsApp CTA when not configured` | `null` → HTML does not contain `wa.me` | ✅ Pass |

### Regression Tests

- Existing 8 owner-decision tests updated to pass `whatsappUrl` prop — all passing
- Full suite: 243 passed, 18 skipped (baseline was 235 before Plan 040)

## Test Execution Results

```
Command: npx vitest run
Result: Test Files  30 passed | 1 skipped (31)
        Tests       243 passed | 18 skipped (261)
Issues: None
Coverage: 8 new tests added (Plan 040), 235 existing tests unaffected
```

## Outstanding Items

None. All milestones complete, all gates pass, no deferred work.

## Next Steps

1. **Code Review (⑥)**: Review implementation quality, security, and plan adherence
2. **QA (⑦)**: Validate acceptance criteria and test coverage
3. **UAT (⑧)**: Functional sign-off
4. **DevOps Stage 1**: Local commit for Plan 040 (bundled with Plan 039 in v0.8.1)
