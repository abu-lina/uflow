---
ID: 038
Origin: 038
UUID: a8d0f3c1
Status: Released
---

# Implementation 038 — Provider Owner Outreach & Claim System

## Plan Reference

- **Plan**: [agent-output/planning/038-provider-owner-outreach-claim-system.md](../planning/038-provider-owner-outreach-claim-system.md)
- **Analysis**: [agent-output/analysis/closed/038-provider-owner-outreach-claim-system-analysis.md](../analysis/closed/038-provider-owner-outreach-claim-system-analysis.md)
- **Critique**: [agent-output/critiques/closed/038-provider-owner-outreach-claim-system-critique.md](../critiques/closed/038-provider-owner-outreach-claim-system-critique.md)

## Date

- **Started**: 2026-03-09T00:00Z
- **Completed**: 2026-06-08T08:05Z

## Changelog

| Date (UTC)        | Agent       | Handoff     | Request                 | Summary                                    |
| ----------------- | ----------- | ----------- | ----------------------- | ------------------------------------------ |
| 2026-03-09T00:00Z | Implementer | From Critic | Plan approved           | Started implementation of Feature 038      |
| 2026-06-08T08:05Z | Implementer | —           | Implementation complete | All milestones completed with 34 TDD tests |
| 2026-03-12T23:57Z | Implementer | From QA     | QA Failed — claim handoff broken | Fixed `SignupPageContent.tsx` to call `/api/outreach/claim` when claim token present; regression test now passing |

## Implementation Summary

This implementation delivers the "recommendation → outreach → owner decision" loop:

1. **Database model** (M1): Three new tables for outreach queue, action tokens, and manual tasks
2. **Auto-enqueue trigger** (M2): Postgres function/trigger to queue outreach on unclaimed provider INSERT
3. **Dispatcher** (M3): Server-side function to send email via Resend + create manual task records
4. **Localized templates** (M4): German email and landing page copy with WhatsApp contact option
5. **Decision landing page** (M5): Public page for stay/claim/remove actions
6. **Claim flow** (M6): API endpoint to set provider_owner_id for authenticated users
7. **Remove flow** (M7): Mark provider as removed-by-owner via new enum value
8. **Observability** (M8): SQL queries for outreach metrics and dashboard
9. **Deployment audit** (M9): Verified RESEND_API_KEY + NEXT_PUBLIC_SITE_URL in all workflows
10. **Release artifacts** (M10): Bumped to v0.8.0 with CHANGELOG

### How This Delivers Value

The Value Statement: "As an external provider owner whose business is listed on UFlow but not yet active, I want UFlow to reach out to me primarily via email (and offer other channels when the owner initiates) in German (MVP), so that I can decide to keep the listing, claim ownership to edit it by registering, or request removal."

This implementation satisfies the value by:

- Automatically detecting unclaimed providers with contact info and queuing outreach
- Sending professional German emails with secure token links
- Providing a simple landing page with three clear actions (keep/claim/remove)
- Enabling ownership claim via auth flow with token validation
- Respecting owner removal requests with new `removed_by_owner` status

## Milestones Completed

- [x] M0: Analysis (channel feasibility) — RESOLVED in planning phase
- [x] M1: Database model for outreach + claim tokens + manual tasks
- [x] M2: Automatic enqueue on new unclaimed provider
- [x] M3: Dispatcher (email) + manual task records
- [x] M4: Localized message templates (German MVP)
- [x] M5: Owner decision landing page
- [x] M6: Claim provider flow
- [x] M7: Remove provider flow
- [x] M8: Observability + metrics
- [x] M9: Deployment path audit
- [x] M10: Version + release artifacts

## Files Modified

| Path                              | Changes                                        | Lines |
| --------------------------------- | ---------------------------------------------- | ----- |
| src/services/providers.ts         | Added `removed_by_owner` to review_status type | 1     |
| src/services/communityServices.ts | Added `removed_by_owner` to review_status type | 1     |
| package.json                      | Version bump 0.7.2 → 0.8.0                     | 1     |
| CHANGELOG.md                      | Added v0.8.0 release notes                     | 25    |

## Files Created

| Path                                                         | Purpose                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| supabase/migrations/058_create_provider_owner_outreach.sql   | Core tables, ENUMs, indexes, RLS policies, validate_outreach_token RPC |
| supabase/migrations/059_create_provider_outreach_trigger.sql | Auto-enqueue trigger on provider INSERT                                |
| supabase/migrations/060_add_removed_by_owner_status.sql      | Add `removed_by_owner` to review_status enum                           |
| src/services/outreach.ts                                     | Token validation, outreach CRUD, task management service               |
| src/services/outreachDispatcher.ts                           | Queue processing, email dispatch, manual task creation                 |
| src/services/email/outreachEmail.ts                          | Resend email templates (German + English)                              |
| src/app/(public)/owner-decision/page.tsx                     | Landing page entry point                                               |
| src/app/(public)/owner-decision/OwnerDecisionContent.tsx     | Decision UI component with states                                      |
| src/app/api/outreach/action/route.ts                         | API for keep/remove actions                                            |
| src/app/api/outreach/claim/route.ts                          | API for authenticated provider claim                                   |
| src/**tests**/services/outreach.test.ts                      | 14 unit tests for outreach service                                     |
| src/**tests**/services/outreachDispatcher.test.ts            | 12 unit tests for dispatcher                                           |
| src/**tests**/app/owner-decision.test.tsx                    | 8 component tests for landing page                                     |
| sql/outreach_observability.sql                               | SQL queries for metrics and monitoring                                 |

## Deployment Path Audit

**RESEND_API_KEY** and **NEXT_PUBLIC_SITE_URL** verified in:

- `.github/workflows/deploy-uat.yml` — UAT deploy (build args + container env)
- `.github/workflows/deploy-hetzner.yml` — Production deploy (build args + container env)
- `scripts/deploy-uat.sh` — Local UAT deploy script
- `scripts/deploy-hetzner.sh` — Local production deploy script

All deployment paths already configure these environment variables. No changes required.

## Code Quality Validation

- [x] `npm run type-check` passes
- [x] `npm run lint` passes (new files clean; pre-existing issues in tools/ folder)
- [x] `npm test` passes (232 tests, 0 failures)
- [x] `npm run build` passes

## Value Statement Validation

- **Original**: "As an external provider owner whose business is listed on UFlow but not yet active, I want UFlow to reach out to me primarily via email (and offer other channels when the owner initiates) in German (MVP), so that I can decide to keep the listing, claim ownership to edit it by registering, or request removal."
- **Implementation Delivers**: ✅ Yes
  - ✅ Email outreach via Resend with German templates
  - ✅ Manual task queue for phone/Instagram (owner-initiated channels)
  - ✅ German landing page with three decision options
  - ✅ Secure token-based actions with 7-day expiry
  - ✅ Claim flow via authenticated API endpoint
  - ✅ Remove flow with new review_status value

## TDD Compliance

| Function/Class             | Test File                  | Test Written First? | Failure Verified? | Failure Reason      | Pass After Impl? |
| -------------------------- | -------------------------- | ------------------- | ----------------- | ------------------- | ---------------- |
| `validateOutreachToken()`  | outreach.test.ts           | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
| `createOutreachToken()`    | outreach.test.ts           | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
| `getOutreachByProvider()`  | outreach.test.ts           | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
| `updateOutreachStatus()`   | outreach.test.ts           | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
| `getPendingOutreach()`     | outreach.test.ts           | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
| `processOutreachQueue()`   | outreachDispatcher.test.ts | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
| `dispatchSingleOutreach()` | outreachDispatcher.test.ts | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
| `buildOutreachTokenUrl()`  | outreachDispatcher.test.ts | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
| `OwnerDecisionContent`     | owner-decision.test.tsx    | ✅ Yes              | ✅ Yes            | ModuleNotFoundError | ✅ Yes           |
| `SignupPageContent` claim  | signup-claim-flow.test.tsx | ⚠️ Post-fix (QA regression) | ✅ Yes | fetch not called (0 calls) | ✅ Yes |

## Test Coverage

### Unit Tests

- **outreach.test.ts**: 14 tests covering token validation, creation, consumption, outreach CRUD
- **outreachDispatcher.test.ts**: 12 tests covering queue processing, email dispatch, manual tasks
- **owner-decision.test.tsx**: 8 tests covering loading, error, decision, and success states

### Integration Tests

- Landing page renders correctly with mocked token validation
- Decision actions (keep/remove) update state appropriately
- Claim redirect includes token parameter

## Test Execution Results

| Command                    | Result                    | Issues                                        | Coverage     |
| -------------------------- | ------------------------- | --------------------------------------------- | ------------ |
| `npx vitest run`           | ✅ 233 passed, 18 skipped | None (skipped are existing integration tests) | 35 new tests |
| `npm run type-check`       | ✅ Passed                 | None                                          | N/A          |
| `npm run lint` (new files) | ✅ Passed                 | Pre-existing issues in tools/ folder          | N/A          |
| `npm run build`            | ✅ Passed                 | None                                          | N/A          |

## Outstanding Items

- **pg_cron job creation**: The dispatcher function is implemented but the cron job to call it periodically must be created in each Supabase project (UAT + Production) via the Dashboard or direct SQL. Suggested: `SELECT cron.schedule('outreach-dispatcher', '*/15 * * * *', $$ SELECT ... $$);`
- **WhatsApp Business API**: The email template includes a WhatsApp contact link, but actual WhatsApp integration is deferred to future release as per plan.
- ~~**Signup page claim integration**~~: ✅ **FIXED** (2026-03-12) — `SignupPageContent.tsx` updated to read `claim` URL param and POST to `/api/outreach/claim` after authentication; regression test `signup-claim-flow.test.tsx` added and passing.

## Next Steps

1. ⑥ Code Review
2. ⑦ QA
3. ⑧ UAT
