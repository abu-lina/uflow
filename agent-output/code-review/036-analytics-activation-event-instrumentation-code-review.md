---
ID: 036
Origin: Planner
UUID: plan-036-analytics-activation-event-instrumentation
Status: Review Complete
---

# Code Review: Plan 036 — Analytics Activation & Event Instrumentation (v0.7.1)

**Plan Reference**: `agent-output/planning/036-analytics-activation-event-instrumentation-v0.7.1.md`  
**Implementation Reference**: `agent-output/implementation/036-analytics-activation-event-instrumentation-implementation.md`  
**Date**: 2026-03-08  
**Reviewer**: Code Reviewer

---

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-03-08 | Implementer → Code Reviewer | Review Plan 036 implementation | Full code quality review completed — APPROVED WITH COMMENTS |

---

## Architecture Alignment

**System Architecture Reference**: `agent-output/architecture/system-architecture.md`  
**Architecture Findings Reference**: `agent-output/architecture/036-analytics-activation-architecture-findings.md`  
**Alignment Status**: **ALIGNED**

### Assessment

The implementation correctly follows ADR-006 (Analytics Governance):

1. **R1 — Non-fatal analytics**: ✅
   - `trackEvent()` utility guards against SSR (`typeof window === 'undefined'`)
   - Guards against script not loaded (`typeof window.plausible !== 'function'`)
   - Silently no-ops when analytics unavailable — never blocks user flows

2. **R2 — Separate stack**: ✅
   - `infra/plausible/docker-compose.yml` creates isolated network (`plausible_internal`)
   - No shared volumes or networks with Next.js app
   - Port binding `127.0.0.1:8000:8000` (localhost-only, Nginx proxies external traffic)

3. **R3 — Access controls**: ✅
   - README.md documents mandatory access controls (strong credentials + `DISABLE_REGISTRATION=true`)
   - Includes security checklist and operational runbook

4. **R4 — Privacy guardrails**: ✅
   - Event properties are non-PII: `contact_type` (enum), `city` (low-cardinality string), boolean flags
   - No provider IDs, emails, phone numbers, URLs, or free-text in event props

**Alignment with Postgres-first philosophy**: N/A (client-side analytics)

---

## TDD Compliance Check

**TDD Table Present**: Yes (in Implementation doc)  
**All Rows Complete**: Yes — 6 functions/6 tests, all showing test-first → RED → GREEN  
**Concerns**: None

### Summary

- 9 tests written before implementation (contact-intent-tracking: 6, provider-profile-completed: 3)
- RED phase confirmed: all tests failed with `AssertionError: expected "spy" to be called` before implementation
- GREEN phase confirmed: all 9 tests pass after implementation
- Full test suite: 198 pass, 0 fail (18 pre-existing skips)

**TDD compliance**: ✅ **EXEMPLARY**

---

## Findings

### Critical
None

### High
None

### Medium
None

### Low/Info

**[LOW] Documentation**: Event placement intentionality could be clearer with inline comments
- **Location**: 
  - `src/components/providers/ProviderCardModal.tsx:L448-L451` (handleCall)
  - `src/components/providers/ProviderCardModal.tsx:L461-L465` (handleWebsite)
  - `src/components/providers/ProviderDetailModal.tsx:L270-L273` (handleExpand 'call')
  - `src/components/providers/ProviderDetailModal.tsx:L310-L313` (handleExpand 'website')
- **Issue**: The `trackEvent` calls are intentionally placed BEFORE navigation actions (`window.open`, DOM link click) to ensure events aren't lost during page transitions. This pattern is correct but not documented inline — future maintainers might question the ordering.
- **Recommendation**: Add inline comment above each `trackEvent` call:
  ```typescript
  // Fire event BEFORE navigation to avoid losing the event if page unloads
  trackEvent('contact_intent_triggered', { ... });
  ```
- **Impact**: Low — pattern is correct; this is a documentation/maintainability enhancement only

---

**[INFO] Positive Observation**: Error-path safety in forms
- **Location**: 
  - `src/features/providers/StreamlinedRecommendForm.tsx:L1126-L1130`
  - `src/features/providers/StreamlinedImportForm.tsx:L932-L936`
- **Observation**: The `trackEvent('provider_profile_completed', ...)` calls are placed inside the `try` block, AFTER `await createProviderOrService(...)` resolves successfully, and BEFORE form reset. This ensures the event only fires on success — never on error paths or validation failures.
- **Outcome**: Correct implementation prevents false-positive metrics

---

**[INFO] Pre-existing Code Duplication**: StreamlinedRecommendForm vs StreamlinedImportForm
- **Location**: Both files have nearly identical tracking implementations (and indeed, the entire form logic is duplicated)
- **Observation**: This duplication is pre-existing (not introduced by Plan 036). The tracking code follows the established pattern in both files.
- **Recommendation**: Consider extracting shared form logic into a common hook in a future refactor (e.g., `useProviderFormSubmit`) to reduce duplication across these components. **Not blocking for this review.**

---

**[INFO] Docker Image Versions**: Pinned versions with no upgrade policy documented
- **Location**: `infra/plausible/docker-compose.yml`
- **Versions**: 
  - `clickhouse/clickhouse-server:24.3.3.102-alpine`
  - `postgres:16-alpine`
  - `ghcr.io/plausible/community-edition:v2.1.4`
- **Observation**: All images are pinned to specific versions (good for reproducibility), but no comment explains version choices or when/how to upgrade.
- **Recommendation**: Add comment block at top of compose file documenting upgrade policy (e.g., "Check Plausible CE release notes quarterly for security patches").

---

## Positive Observations

1. **Clean, focused changes**: All modified files show minimal, surgical edits — import + event call only. No scope creep.

2. **Correct event timing**: 
   - Contact CTAs: Event fires BEFORE navigation → ensures capture even if page unloads
   - Form submissions: Event fires AFTER success, BEFORE reset → guarantees success-only tracking

3. **Comprehensive testing**: 
   - Tests cover both positive cases (event fires) and negative cases (event does NOT fire for non-contact actions, error paths)
   - Tests use pragmatic strategies (localStorage pre-seeding for complex forms) without compromising test quality

4. **Production-ready infrastructure**: 
   - Docker Compose includes healthchecks, persistent volumes, restart policies
   - README.md provides clear setup guide, Nginx config snippet, operations runbook, and security checklist
   - Localhost-only port binding prevents accidental exposure

5. **Type safety**: All TypeScript compiles cleanly (0 errors). Pre-existing CSS linting warnings in ProviderCardModal are unrelated to this implementation.

6. **No security regressions**: No hardcoded credentials, no PII leakage, no injection risks introduced.

---

## Deployment Path Audit Verification

**Checklist 6d (Deployment Surface Changes)**: ✅ VERIFIED

The implementer documented deployment surface in the Implementation doc. I independently verified:

1. **Search for plausible/analytics references**:
   - `.github/workflows/`: ✅ No matches
   - `deploy/`: ✅ No matches
   - `scripts/`: ✅ Only unrelated epic rank update scripts (not deployment automation)

2. **New infra/plausible/ stack**:
   - ✅ Confirmed: separate stack, no CI/CD integration (manual one-time deploy by DevOps)
   - ✅ Confirmed: no new env vars in Next.js app (CSP already consumes `NEXT_PUBLIC_PLAUSIBLE_HOST` from Plan 035)

3. **Deployment ownership**:
   - ✅ Clearly documented in Implementation doc and infra/plausible/README.md
   - DevOps action items: copy env file, generate secrets, `docker compose up -d`, set production env vars, create dashboard goals

**Verdict**: Deployment path audit is complete and correct. No missed entrypoints.

---

## Verdict

**Status**: ✅ **APPROVED WITH COMMENTS**  
**Rationale**: 

The implementation is **production-ready**. Code quality is excellent:
- Architecture alignment is perfect (follows ADR-006)
- TDD compliance is exemplary (9/9 RED→GREEN)
- Event placement is correct (fires before navigation, success-only for forms)
- Infrastructure is robust (healthchecks, persistence, security)
- Tests are comprehensive (positive + negative cases)
- No security issues introduced
- Type-safe and compiles cleanly

The single LOW finding (missing inline comments explaining event placement intentionality) is a documentation enhancement, not a functional issue. The pattern is correct and works as designed. Fixing this is **optional** — the code can ship as-is.

---

## Required Actions

None (implementation is approved for QA).

---

## Optional Improvements

If time permits before QA handoff (implementer's discretion):

1. Add inline comments above each `trackEvent` call explaining the intentional placement:
   ```typescript
   // Fire event BEFORE navigation to avoid losing the event if page unloads
   trackEvent('contact_intent_triggered', { ... });
   ```

2. Add version upgrade policy comment to `infra/plausible/docker-compose.yml`:
   ```yaml
   # Image versions pinned for reproducibility
   # Check Plausible CE release notes quarterly: https://github.com/plausible/analytics/releases
   # Upgrade policy: minor patches can be applied directly; major versions require testing in UAT first
   ```

These are nice-to-haves, not blockers.

---

## Next Steps

**Handoff to QA** for test execution and validation.

**QA scope**:
1. Verify all 9 new tracking tests pass in CI
2. Verify full test suite passes (198 tests)
3. Verify production build succeeds
4. (After DevOps deploys Plausible CE) Validate events appear in dashboard:
   - Tap Call/Website on provider detail → `contact_intent_triggered` event with correct props
   - Submit recommendation form → `provider_profile_completed` event with correct props

**UAT owner**: QA (in coordination with DevOps for Plausible CE deployment)

---

✅ PHASE COMPLETE: ⑥ Code Reviewer — Verdict: **APPROVED WITH COMMENTS**  
📄 Output: agent-output/code-review/036-analytics-activation-event-instrumentation-code-review.md  
➡️ NEXT: Pick "⑦ QA" from the Orchestrator handoff suggestions  
   Gate: QA doc status must be "QA Complete"
