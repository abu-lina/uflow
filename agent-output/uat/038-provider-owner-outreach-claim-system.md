---
ID: 038
Origin: 038
UUID: a8d0f3c1
Status: Active
---

# UAT Report: Provider Owner Outreach & Claim System

**Plan Reference**: `agent-output/planning/038-provider-owner-outreach-claim-system.md`
**Date**: 2026-03-13T00:05Z
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date                 | Agent Handoff | Request                                          | Summary                                                                                                          |
| -------------------- | ------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 2026-03-13T00:05Z    | QA            | QA Complete — validate value delivery for v0.8.0 | UAT Complete — all three owner actions deliver value; claim blocker resolved; APPROVED FOR RELEASE with two known pre-operation items |

---

## Value Statement Under Test

> "As an **external provider owner whose business is listed on UFlow but not yet active**, I want **UFlow to reach out to me primarily via email (and offer other channels when the owner initiates) in German (MVP)**, so that **I can decide to keep the listing, claim ownership to edit it by registering, or request removal**."

---

## Predecessor Doc Review Summary

| Document | Status | Gate |
| -------- | ------ | ---- |
| Implementation `038-provider-owner-outreach-claim-system.md` | Active — all 10 milestones complete | ✅ PASS |
| Code Review `038-provider-owner-outreach-claim-system.md` | Code Review Complete — APPROVED WITH COMMENTS | ✅ PASS |
| QA `038-provider-owner-outreach-claim-system.md` | QA Complete — 233/0 fail, regression passing | ✅ PASS |

All three predecessor gates are met. No missing or failed predecessor docs.

---

## UAT Scenarios

### Scenario 1: Provider owner receives German email and keeps the listing

- **Given**: An unclaimed provider with a `contact_email` exists; the outreach queue row has been approved by an operator and the dispatcher has run
- **When**: The owner opens the email, clicks the token link to `/owner-decision`, and selects "Weiterhin angezeigt bleiben" (keep)
- **Then**: Outreach status updates to `acknowledged`; listing remains publicly visible; no further outreach is sent for this provider
- **Result**: PASS
- **Evidence**: `src/__tests__/app/owner-decision.test.tsx` — "keep" action test: `owner-decision.test.tsx` 8/8 passing; `src/app/api/outreach/action/route.ts` handles `action: 'keep'`; outreach status update verified in `src/services/outreach.ts`

---

### Scenario 2: Provider owner claims the listing via email token

- **Given**: An unclaimed provider, outreach dispatched; owner does not yet have a UFlow account
- **When**: Owner clicks "Anbieter beanspruchen" in `/owner-decision`, is redirected to `/signup?claim=<token>&provider=<id>`, creates an account and is authenticated
- **Then**: `SignupPageContent` reads the `claim` param, POSTs `{ token }` to `/api/outreach/claim`, which sets `provider_owner_id = user.id` and updates outreach status to `claimed`; owner is redirected to `/profile`
- **Result**: PASS
- **Evidence**: `src/__tests__/app/signup-claim-flow.test.tsx` — 1/1 passing (was the QA-blocking regression, now resolved); `src/app/api/outreach/claim/route.ts` verifies auth, validates token, sets ownership; type-check and build both pass

---

### Scenario 3: Provider owner requests removal of the listing

- **Given**: An unclaimed provider, outreach dispatched
- **When**: Owner clicks "Anbieter aus der Liste entfernen" in `/owner-decision`
- **Then**: `review_status` on the provider record is set to `removed_by_owner`; listing is hidden from public search results; outreach status updated
- **Result**: PASS
- **Evidence**: `src/__tests__/app/owner-decision.test.tsx` — remove action test passing; `supabase/migrations/060_add_removed_by_owner_status.sql` adds the enum value; action API route sets `review_status = 'removed_by_owner'` on the provider

---

### Scenario 4: Invalid / expired / consumed token is rejected safely

- **Given**: A token URL with an expired or already-consumed token
- **When**: Owner visits `/owner-decision` with that link
- **Then**: The page shows an error state; no action is executed; no information about the provider is leaked
- **Result**: PASS
- **Evidence**: `src/__tests__/services/outreach.test.ts` — token validation tests (expired, consumed, not-found) all passing (14/14); `src/__tests__/app/owner-decision.test.tsx` — invalid token error state test passing; `validate_outreach_token()` RPC uses `SECURITY DEFINER` and returns minimal data

---

### Scenario 5: German language is the default on landing page and email

- **Given**: Outreach is dispatched with `language = 'de'`
- **When**: Owner opens the email and visits `/owner-decision`
- **Then**: Email body is in German; landing page copy is in German; all three action labels are in German
- **Result**: PASS
- **Evidence**: `src/services/email/outreachEmail.ts` — German template is the primary template; `src/app/(public)/owner-decision/OwnerDecisionContent.tsx` renders German labels; plan AC2 explicitly scoped MVP to German only

---

### Scenario 6: Deployment env vars wired for both UAT and production

- **Given**: The dispatcher requires `RESEND_API_KEY` (email delivery) and `NEXT_PUBLIC_SITE_URL` (token URL generation)
- **When**: CI/CD deploys to UAT (`uat.ummahflow.com`) or production (`ummahflow.com`)
- **Then**: Both env vars are injected as container environment variables in both workflows
- **Result**: PASS
- **Evidence**: QA static audit confirmed both vars in `.github/workflows/deploy-uat.yml` and `.github/workflows/deploy-hetzner.yml`

---

## Value Delivery Assessment

The implementation delivers the full "recommendation → outreach → owner decision" loop described in the Value Statement:

1. **Email outreach in German (MVP)**: Automated email dispatch via Resend with German templates — delivers AC1 + AC2.
2. **Auto-enqueue on new unclaimed providers**: Postgres trigger fires on INSERT, creating an outreach queue row — delivers AC3. Operator approval + delay gate prevents accidental mass outreach.
3. **All three owner decisions work end-to-end**: Keep (AC4), claim via authenticated signup (AC4 — remediated in implementation round), and remove with `removed_by_owner` status (AC4) are all functional and regression-tested.
4. **Owner-initiated channels**: WhatsApp click-to-chat and Instagram/phone manual task records provide the "other channels when the owner initiates" requirement from the Value Statement.

**Core value is not deferred.** All user-visible milestones are delivered.

---

## QA Integration

**QA Report Reference**: `agent-output/qa/038-provider-owner-outreach-claim-system.md`  
**QA Status**: QA Complete  
**QA Findings Alignment**:

- **Blocking finding (claim journey)**: Resolved. `SignupPageContent.tsx` now reads the `claim` URL param and calls `/api/outreach/claim` before redirecting authenticated users. Regression test `signup-claim-flow.test.tsx` passes.
- **Medium finding (hardcoded WhatsApp number)**: Open. Not a blocking concern for UAT — the WhatsApp feature is owner-initiated only and no outreach is sent until an operator explicitly approves queue rows. The hardcoded number must be replaced with a real UFlow number before approving the first outreach batch.
- **Medium finding (provider name placeholders)**: Open (see Technical Compliance below).

---

## Technical Compliance

| Plan Deliverable | Evidence | Status |
| ---------------- | -------- | ------ |
| M1: DB schema (3 tables, enums, indexes, RLS) | `058_create_provider_owner_outreach.sql` | ✅ PASS |
| M2: Auto-enqueue trigger | `059_create_provider_outreach_trigger.sql` | ✅ PASS |
| M3: Email + manual task dispatch | `outreachDispatcher.ts`, `outreachEmail.ts` | ✅ PASS |
| M4: German templates | German email template, German landing page copy | ✅ PASS |
| M5: Owner decision landing page (public, token-based) | `/owner-decision` page + 8 component tests | ✅ PASS |
| M6: Claim flow (auth + ownership transfer) | `/api/outreach/claim` + signup integration + regression | ✅ PASS |
| M7: Remove flow (`removed_by_owner`) | `/api/outreach/action` + migration 060 | ✅ PASS |
| M8: Observability SQL | `sql/outreach_observability.sql` | ✅ PASS |
| M9: Deployment env audit | grep confirms `RESEND_API_KEY` + `NEXT_PUBLIC_SITE_URL` in both workflows | ✅ PASS |
| M10: Version + release artifacts | `package.json` v0.8.0, `CHANGELOG.md` updated | ✅ PASS |
| Test coverage: 35 new tests | 233 passed, 0 failed, 18 skipped (full suite) | ✅ PASS |
| Type-check | `tsc --noEmit` — clean | ✅ PASS |
| Build | `npm run build` — clean | ✅ PASS |

### Known Limitations (Non-blocking for Release)

1. **Provider name not personalized in emails** (Code Review MEDIUM, still open): `outreachDispatcher.ts` uses placeholder `'Your business'` instead of the actual provider name when building email content. Emails will still be sent and links will work, but the copy is generic. **Must be fixed before starting the first real outreach batch.**

2. **WhatsApp contact number hardcoded** (Code Review MEDIUM, still open): `outreachEmail.ts` uses `4915123456789` (placeholder) in both German and English templates. Must be replaced with the real UFlow WhatsApp number and moved to a `WHATSAPP_CONTACT_NUMBER` env var before launching outreach.

3. **pg_cron job not yet created**: The dispatcher function is implemented but the scheduled job to run it every 15 minutes must be created manually in each Supabase project (UAT + Production) — DevOps gate.

Both MEDIUM items are operationally mitigated by the **built-in approval gate**: no outreach is sent until an operator manually approves each queue row in the DB. This gate is a natural checkpoint to also validate and fix names/contact numbers before the first real messages go out.

---

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES  
**Evidence**:  
- The full "recommendation → outreach → owner decision" loop described in the plan is implemented and functioning across all acceptance criteria.  
- AC1 (multi-channel with manual tasks for Instagram/phone, owner-initiated WhatsApp): ✅  
- AC2 (German MVP): ✅  
- AC3 (auto-enqueue with approval gate): ✅  
- AC4 (keep / claim / remove): ✅ — claim was broken and remediated; all three paths now pass automated tests  
- AC5 (Tailwind/design system, no new theme primitives): ✅  

**Drift Detected**: None. The implementation stays within the plan's defined scope. WhatsApp cold outreach is correctly excluded. Instagram is handled via manual task records as planned. The only scope delta is the signup claim handoff gap, which was a missing integration step discovered during QA and remediated before this UAT.

---

## UAT Status

**Status**: UAT Complete  
**Rationale**: All plan acceptance criteria are met and evidenced by passing tests, type-check, and build. The two open MEDIUM items (provider name enrichment, WhatsApp number configuration) do not block the release because the operational approval gate prevents actual outreach from being sent until an operator reviews each row — creating a natural checkpoint to resolve both issues before real emails go out.

---

## Release Decision

**Final Status**: APPROVED FOR RELEASE  
**Rationale**: The core value statement is delivered in full. Token security is strong (SHA-256, single-use, 7-day expiry). The claim journey is end-to-end and regression-tested after remediation. The outreach infrastructure is production-ready modulo two pre-operation configuration items that cannot accidentally cause harm because of the approval gate.

**Recommended Version**: `v0.8.0` (minor — new user-facing feature, no breaking changes) — already bumped in `package.json` and `CHANGELOG.md`. ✅

**Key Changes for Changelog**:
- New outreach queue system: automatically detects unclaimed providers and queues outreach
- German email templates with secure token links (7-day expiry, single-use)
- Public `/owner-decision` page: owners can keep, claim, or remove their listing  
- Authenticated claim flow: completing signup/login with a claim token now sets `provider_owner_id`  
- Remove flow: `review_status = 'removed_by_owner'` hides listings from public search  
- All workflows: `RESEND_API_KEY` + `NEXT_PUBLIC_SITE_URL` verified in UAT + production CI

---

## Next Actions (for DevOps)

1. **Run DB migrations** 058, 059, 060 via `supabase db push` against UAT and then production  
2. **Create pg_cron job** in each Supabase project:
   ```sql
   SELECT cron.schedule(
     'outreach-dispatcher',
     '*/15 * * * *',
     $$ SELECT net.http_post(...) $$  -- dispatcher invocation
   );
   ```
   Refer to implementation doc for exact invocation pattern.
3. **Set `RESEND_API_KEY`** in UAT and production GitHub secrets (already referenced in workflows)
4. **Before approving first outreach batch** (Sprint +1 or follow-up commit):
   - Fix `outreachDispatcher.ts` to fetch real provider name from DB
   - Replace hardcoded WhatsApp number `4915123456789` with actual UFlow number via `WHATSAPP_CONTACT_NUMBER` env var
5. **Tag and push** `v0.8.0` after successful UAT smoke test
