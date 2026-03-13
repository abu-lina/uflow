---
ID: 040
Origin: 040
UUID: a4c19f2e
Status: Committed
---

# UAT Report: Plan 040 — Replace Hardcoded WhatsApp Number with WHATSAPP_CONTACT_NUMBER

**Plan Reference**: `agent-output/planning/040-whatsapp-contact-number-config-v0.8.1.md`
**Date**: 2026-03-13T09:00Z
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-03-13T09:00Z | QA | All gates passing — ready for value validation | UAT Complete — implementation delivers stated value; WhatsApp contact now fully configurable across all affected surfaces |

## Value Statement Under Test

> As a provider owner contacting UFlow from an outreach email or owner-decision page, I want the WhatsApp link to use the real configured UFlow contact number, so that I reach the correct team and UFlow can change contact operations without code changes.

## Value-Evidence Preflight

Comparing plan deliverables to implementation milestone checklist:

| Deliverable | Status in Impl Doc | Evidence |
|---|---|---|
| Replace hardcoded outreach email WhatsApp links (DE + EN) | ✅ M2 complete | `outreachEmail.ts` templates use `${params.whatsappUrl ? '...' : ''}` conditional |
| Replace hardcoded owner-decision page WhatsApp link | ✅ M3 complete | `OwnerDecisionContent.tsx` uses `{whatsappUrl && ...}` conditional |
| Single server-side config source (`getWhatsAppContactUrl()`) | ✅ M1 complete | Exported from `outreachEmail.ts`, used by both email and page |
| Graceful CTA suppression when number absent | ✅ M1+M2+M3 complete | Returns `null`, both surfaces handle null correctly |
| Env templates updated (3 files) | ✅ M4/M7 complete | `env.template`, `env.uat.template`, `env.production.template` all updated |
| CHANGELOG v0.8.1 entry | ✅ M7 complete | "Changed" section documents the WhatsApp configurable change |

No user-visible milestone is missing. Preflight passed.

## UAT Scenarios

### Scenario 1: Provider owner receives outreach email — WhatsApp configured

- **Given**: `WHATSAPP_CONTACT_NUMBER=4915199999999` is set in the server environment
- **When**: The outreach dispatcher renders the German outreach email for a provider
- **Then**: The email body contains a WhatsApp CTA linking to `https://wa.me/4915199999999`; the old placeholder `4915123456789` does not appear anywhere in the rendered HTML
- **Result**: PASS
- **Evidence**: `outreachEmailWhatsApp.test.ts` tests 6/7/8 — rendered DE and EN templates both contain the configured number and explicitly assert `not.toContain('4915123456789')`. QA verified 244/244 tests passing.

### Scenario 2: Provider owner receives outreach email — WhatsApp not configured

- **Given**: `WHATSAPP_CONTACT_NUMBER` is absent or empty
- **When**: The outreach dispatcher renders either the German or English outreach email
- **Then**: The email contains no WhatsApp contact section; the email still renders and sends without error; the main "Optionen ansehen" CTA is unaffected
- **Result**: PASS
- **Evidence**: `outreachEmailWhatsApp.test.ts` test 8 — `html` asserts `not.toContain('wa.me')` and `not.toContain('WhatsApp')`. The `sendProviderOutreachEmail()` function does not throw when WhatsApp URL is null (by design: CTA suppressed, not errored).

### Scenario 3: Provider owner visits owner-decision page — WhatsApp configured

- **Given**: `WHATSAPP_CONTACT_NUMBER` is set; token is valid; page loads
- **When**: Owner views their decision options
- **Then**: A "WhatsApp öffnen" link appears in the footer, pointing to the configured `wa.me` URL derived server-side
- **Result**: PASS
- **Evidence**: `OwnerDecisionContent.tsx` line 317: `{whatsappUrl && (...)}` renders the footer with `href={whatsappUrl}`. Server component `page.tsx` reads env and passes the URL as a prop — no `NEXT_PUBLIC_` exposure. QA regression suite (9/9 owner-decision tests passing) includes valid-token state with `whatsappUrl` prop.

### Scenario 4: Provider owner visits owner-decision page — WhatsApp not configured

- **Given**: `WHATSAPP_CONTACT_NUMBER` is absent or empty; token is valid
- **When**: Owner views their decision options
- **Then**: The WhatsApp footer section is completely absent; the three action buttons (stay/claim/remove) render normally; no broken or placeholder link appears
- **Result**: PASS
- **Evidence**: QA added regression test `hides WhatsApp footer when whatsappUrl is null` in `owner-decision.test.tsx` — asserts `queryByText(/WhatsApp öffnen/i)` is not in document. Test passes.

### Scenario 5: Operators can change the contact number without code changes

- **Given**: `WHATSAPP_CONTACT_NUMBER` is changed in the deployment environment
- **When**: The application is restarted (Next.js server restart)
- **Then**: All outreach email CTAs and the owner-decision page CTA reflect the new number without a code deployment
- **Result**: PASS (architectural validation)
- **Evidence**: The entire config path is `process.env.WHATSAPP_CONTACT_NUMBER` → `getWhatsAppContactUrl()` → passed as prop or embedded in email HTML at call time. No hardcoded value exists in production code (confirmed by QA grep: zero matches in `src/` excluding `__tests__`). Changing the env var and restarting the server is sufficient.

### Scenario 6: Non-digit characters in configured number are normalized

- **Given**: `WHATSAPP_CONTACT_NUMBER=+49 151 2345 6789` (with spaces and plus sign)
- **When**: The WhatsApp URL is derived
- **Then**: The URL becomes `https://wa.me/4915123456789` — all non-digit characters stripped
- **Result**: PASS
- **Evidence**: `outreachEmailWhatsApp.test.ts` test 5 — `expect(getWhatsAppContactUrl()).toBe('https://wa.me/4915123456789')` with input `'+49 151 2345 6789'`. Passes.

## Value Delivery Assessment

The implementation **directly delivers** the value statement. All three surfaces that contained a permanent placeholder (`wa.me/4915123456789`) — DE email template, EN email template, owner-decision UI — now derive the contact link from `WHATSAPP_CONTACT_NUMBER` exclusively.

**Operator benefit achieved**: UFlow team can update the contact number via environment variable change + server restart, with no code change or deployment required.

**User benefit achieved**: Provider owners who click through from an outreach email or visit the owner-decision page will reach the actual UFlow contact channel, not the defunct placeholder.

**Risk eliminated**: The Plan 038 code review MEDIUM finding (hardcoded operational number) is fully resolved. No new technical debt introduced.

**Core value deferred**: None. No part of the stated value is missing or deferred.

## QA Integration

**QA Report Reference**: `agent-output/qa/040-whatsapp-contact-number-config-v0.8.1.md`
**QA Status**: QA Complete ✅

**QA Findings Alignment**: QA identified and addressed one coverage gap (owner-decision null-path UI test) flagged by Code Review. The test was added as part of QA execution and is now passing. No outstanding QA findings.

**QA Execution Summary**:
- Targeted test run: 17/17 passed (8 WhatsApp config tests + 9 owner-decision tests)
- Full suite: 244 passed / 18 skipped
- Type-check: clean
- Delta lint: clean
- Build: exit 0
- Placeholder grep (`4915123456789` in `src/` excl. `__tests__`): 0 matches

**Remediation Review**: QA addressed the code review LOW finding (FIND-CR-040-2: null-path coverage) inline during QA execution. UAT reviewed the added test directly — YES, the test is present and passing.

## Technical Compliance

| Deliverable | Status |
|---|---|
| Hardcoded `4915123456789` removed from all production code | ✅ PASS |
| Single server-side config source (`getWhatsAppContactUrl()`) | ✅ PASS |
| No `NEXT_PUBLIC_` exposure of env var | ✅ PASS — server prop pattern used |
| DE email template conditional WhatsApp CTA | ✅ PASS |
| EN email template conditional WhatsApp CTA | ✅ PASS |
| Owner-decision UI conditional WhatsApp footer | ✅ PASS |
| Graceful null-state (CTA hidden when unconfigured) | ✅ PASS |
| `env.template` updated | ✅ PASS |
| `env.uat.template` updated | ✅ PASS |
| `env.production.template` updated | ✅ PASS |
| CHANGELOG v0.8.1 entry | ✅ PASS |
| TDD: 8+ tests written test-first | ✅ PASS |
| All automated gates (tests / type-check / lint / build) | ✅ PASS |

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES

**Evidence**: The plan's objective was "Eliminate the hardcoded WhatsApp placeholder number from outreach-related surfaces by introducing `WHATSAPP_CONTACT_NUMBER` as the canonical configuration source." The implementation eliminates the placeholder from all three occurrences, introduces a single helper (`getWhatsAppContactUrl()`), and documents the variable in all three environment templates. The verification grep confirms zero production-code occurrences of the old number.

**Drift Detected**: None. The implementation is tightly scoped to the plan. No out-of-scope changes were introduced. Both Code Review and QA confirm zero scope drift.

## Residual Risks

| Risk | Severity | Notes |
|---|---|---|
| Manual visual rendering of outreach email in real email client not validated | LOW | Deferred by QA; owned by operator at deployment time. Automated HTML assertion tests confirm CTA presence/absence; visual presentation may vary by client. |
| No operational logging for unconfigured WhatsApp number | LOW | Code Review FIND-CR-040-1 noted this; not blocking; operator can detect via missing CTA in staging. Deferred to future improvement. |

Both risks are LOW severity. Neither affects correctness of value delivery.

## UAT Status

**Status**: UAT Complete
**Rationale**: The implementation demonstrably delivers the value statement. All predecessor phases passed (Implementation complete, Code Review APPROVED, QA Complete). All plan deliverables verified. No user-visible milestone deferred. No blocking findings. Residual risks are LOW and documented.

## Release Decision

**Final Status**: APPROVED FOR RELEASE
**Rationale**: Plan 040 has successfully cleared all lifecycle gates on 2026-03-13. The core fix — replacing a hardcoded operational phone number with a configurable environment variable — is correct, tested, architecturally consistent, and fully documented. The change bundles cleanly with Plan 039 into v0.8.1 as intended.

**Recommended Version**: v0.8.1 patch (already targeted — no version bump needed; both Plans 039 and 040 are bundled into this release)

**Key Changes for Changelog** (already in `CHANGELOG.md`):
- Plan 039 (Fixed): Outreach emails now include real provider name
- Plan 040 (Changed): WhatsApp contact number is now configurable via `WHATSAPP_CONTACT_NUMBER`

## Next Actions

None required from implementation perspective. DevOps Stage 1 (local git commit for Plan 040) is the immediate next step, followed by DevOps Stage 2 (push + tag v0.8.1) once the user approves, which will release both Plans 039 and 040 together.
