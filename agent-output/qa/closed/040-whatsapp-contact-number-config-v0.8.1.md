---
ID: 040
Origin: 040
UUID: a4c19f2e
Status: Committed
---

# QA Report: Plan 040 — Replace Hardcoded WhatsApp Number with WHATSAPP_CONTACT_NUMBER

**Plan Reference**: `agent-output/planning/040-whatsapp-contact-number-config-v0.8.1.md`
**Implementation Reference**: `agent-output/implementation/040-whatsapp-contact-number-config-v0.8.1.md`
**Code Review Reference**: `agent-output/code-review/040-whatsapp-contact-number-config-v0.8.1.md`
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date | Agent Handoff | Request | Summary |
| ---------- | ---------------- | -------------------- | ----------------------------------- |
| 2026-03-13 | Code Reviewer | Validate Plan 040 acceptance criteria and execute test scenarios | Created QA strategy, added missing UI null-path regression test, executed gates, QA passed |

## Timeline

- **Test Strategy Started**: 2026-03-13T08:31Z
- **Test Strategy Completed**: 2026-03-13T08:33Z
- **Implementation Received**: 2026-03-13T08:31Z
- **Testing Started**: 2026-03-13T08:33Z
- **Testing Completed**: 2026-03-13T08:37Z
- **Final Status**: QA Complete

## Test Strategy (Pre-Implementation)

Validate the fix from the provider-owner perspective, not just from the helper-function perspective. The highest-risk user-facing failures were: showing the wrong WhatsApp number, rendering a dead CTA when the variable is missing, leaking env access into the client bundle, and leaving deployment docs inconsistent so production differs from test environments.

### Testing Infrastructure Requirements

**Test Frameworks Needed**:

- Existing `vitest` workspace setup only

**Testing Libraries Needed**:

- Existing `@testing-library/react` setup only

**Configuration Files Needed**:

- None beyond existing workspace configuration

**Build Tooling Changes Needed**:

- None

**Dependencies to Install**:

```bash
# None
```

### Required Unit Tests

- Validate `getWhatsAppContactUrl()` returns a normalized `wa.me` link for configured numbers
- Validate `getWhatsAppContactUrl()` returns `null` for missing, empty, and whitespace-only config
- Validate outreach email HTML includes the configured WhatsApp CTA and omits it when config is absent

### Required Integration Tests

- Validate the owner-decision UI renders normally with a valid token and configured WhatsApp URL
- Validate the owner-decision UI hides the WhatsApp footer when `whatsappUrl` is `null`
- Validate no production code path still contains the placeholder `4915123456789`

### Acceptance Criteria

- Both outreach email templates and the owner-decision page use the configured WhatsApp number when present
- Both surfaces omit the CTA safely when the number is absent
- The owner-decision client component receives only a derived prop, not direct env access
- Environment templates document the new variable consistently
- Full QA gates pass: targeted tests, full suite, type-check, lint, build

## Implementation Review (Post-Implementation)

### TDD Compliance Gate

Reviewed the implementation doc first. The required TDD Compliance table exists and is complete. All new functions introduced by the plan have documented test-first evidence with verified RED and GREEN states. Gate passed.

### Code Changes Summary

- Runtime code updated in `src/services/email/outreachEmail.ts`, `src/app/(public)/owner-decision/page.tsx`, and `src/app/(public)/owner-decision/OwnerDecisionContent.tsx`
- Environment documentation updated in `env.template`, `env.uat.template`, and `env.production.template`
- Release note added in `CHANGELOG.md`
- QA added one regression test to `src/__tests__/app/owner-decision.test.tsx` for the `whatsappUrl={null}` branch that code review identified as lightly covered

## Test Coverage Analysis

### New/Modified Code

| File | Function/Class | Test File | Test Case | Coverage Status |
| --------------- | -------------- | ------------ | ------------------ | ----------------- |
| src/services/email/outreachEmail.ts | getWhatsAppContactUrl | src/__tests__/services/outreachEmailWhatsApp.test.ts | configured, missing, empty, whitespace, digit-normalization | COVERED |
| src/services/email/outreachEmail.ts | getOutreachEmailHtml | src/__tests__/services/outreachEmailWhatsApp.test.ts | DE CTA shown, EN CTA shown, CTA omitted when missing | COVERED |
| src/app/(public)/owner-decision/page.tsx | OwnerDecisionPage | build + component tests | server-to-client prop boundary validated indirectly by build and component render path | COVERED |
| src/app/(public)/owner-decision/OwnerDecisionContent.tsx | OwnerDecisionContent | src/__tests__/app/owner-decision.test.tsx | loading, invalid token, valid token, keep/claim/remove, success, WhatsApp footer hidden when null | COVERED |
| env.template / env.uat.template / env.production.template | configuration docs | manual file review | variable documented consistently | COVERED |

### Coverage Gaps

- No automated assertion inspects the server component prop value in isolation; this is adequately covered by the combination of build success, runtime helper tests, and client-component rendering behavior.
- Manual visual rendering of a real email client and browser page was not executed in this QA environment and is deferred to UAT.

### Comparison to Test Plan

- **Tests Planned**: 5 high-value scenario groups
- **Tests Implemented**: 5 scenario groups covered; 1 additional UI null-path regression test added during QA
- **Tests Missing**: None blocking
- **Tests Added Beyond Plan**: Explicit owner-decision UI null-path regression coverage

## Test Execution Results

### Unit Tests

- **Command**: `npx vitest run "src/__tests__/app/owner-decision.test.tsx" "src/__tests__/services/outreachEmailWhatsApp.test.ts"`
- **Status**: PASS
- **Output**: 2 test files passed, 17 tests passed
- **Coverage Percentage**: Not collected; scenario coverage reviewed directly

### Integration Tests

- **Command**: `npx vitest run`
- **Status**: PASS
- **Output**: 30 test files passed, 1 skipped; 244 tests passed, 18 skipped

### Type Checking

- **Command**: `npm run type-check`
- **Status**: PASS
- **Output**: clean `tsc --noEmit`

### Delta Lint

- **Command**: `npx eslint "src/__tests__/app/owner-decision.test.tsx" "src/__tests__/services/outreachEmailWhatsApp.test.ts" "src/services/email/outreachEmail.ts" "src/app/(public)/owner-decision/page.tsx" "src/app/(public)/owner-decision/OwnerDecisionContent.tsx"`
- **Status**: PASS
- **Output**: no lint errors

### Build

- **Command**: `npm run build`
- **Status**: PASS
- **Output**: exit code 0; owner-decision route built successfully
- **Notes**: Next.js emitted existing dynamic-server-usage messages for unrelated routes that already depend on `headers`/`cookies`; these were non-fatal and outside Plan 040 scope.

### Root-Cause Regression Search

- **Command**: `grep -RIn "4915123456789" src --exclude-dir="__tests__"`
- **Status**: PASS
- **Output**: no matches in production code

## Manual Validation Status

- **Status**: DEFERRED
- **Owner**: UAT agent / release approver
- **Rationale**: This QA environment does not include an interactive browser or real email-client rendering harness; automated evidence was sufficient for technical correctness, but end-user presentation should still be checked once before release.
- **Severity**: Low
- **Fallback Execution Path**: During UAT, validate one configured-number path and one missing-number path on the owner-decision page and by rendering the outreach email HTML.

## Verdict

QA PASSED. The implementation meets all plan acceptance criteria. The fix removes the hardcoded placeholder from runtime code, preserves the correct server/client boundary, documents the new env var consistently, and degrades safely when configuration is absent. The only additional action taken by QA was strengthening regression coverage for the `whatsappUrl={null}` UI branch.

Handing off to uat agent for value delivery validation.
