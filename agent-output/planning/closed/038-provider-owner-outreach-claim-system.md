---
ID: 038
Origin: 038
UUID: a8d0f3c1
Status: Committed
---

# Plan 038 — Provider Owner Outreach & Claim System

## Plan Header

- **Target Release**: v0.8.0 (minor)
- **Epic Alignment**: Provider acquisition + supply integrity (recommendation → claim/retain/remove loop)
- **Status**: UAT Approved
- **Related Issues**: None

### Changelog

| Date (UTC)        | Author        | Change                               | Rationale                                                                                                                                                                                         |
| ----------------- | ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-08T00:00Z | planner       | Created plan                         | Convert provider recommendations into claimed, maintained listings via automated multi-channel outreach and a secure claim/remove flow.                                                           |
| 2026-03-08T16:30Z | planner       | Revised scope after Critic + Analyst | Remove WhatsApp cold outreach (opt-in required), set MVP outreach language to German, and add manual approval + delay gate to mitigate abuse.                                                     |
| 2026-06-08T08:15Z | code-reviewer | Status → Code Review Approved        | Implementation passed code review with 2 medium findings (non-blocking): provider name placeholders and hardcoded WhatsApp number. Excellent TDD compliance, strong security, clean architecture. |
| 2026-03-12T23:59Z | qa            | Status → QA Complete                 | Re-validated the signup claim handoff fix; regression test, full suite, type-check, and build all passed.                                                                                        |
| 2026-03-13T00:05Z | uat           | Status → UAT Approved                | UAT Complete — all AC1–AC5 met, claim journey end-to-end, APPROVED FOR RELEASE. Two medium pre-operation items documented (provider name enrichment, WhatsApp number config).                  |
| 2026-03-13T00:10Z | devops        | Status → Committed                   | Stage 1 complete: locally committed as b384e5a for release v0.8.0. Document moved to closed/.                                                                                                 |

## Release Strategy

Release Strategy: **Standalone** (no other known non-closed plans targeting v0.8.0 in `agent-output/planning/`).

## Value Statement and Business Objective

As an **external provider owner whose business is listed on UFlow but not yet active**, I want **UFlow to reach out to me primarily via email (and offer other channels when the owner initiates) in German (MVP)**, so that **I can decide to keep the listing, claim ownership to edit it by registering, or request removal**.

## Objective

Deliver an end-to-end “recommendation → outreach → owner decision” loop that:

1. **Automatically detects** newly created, unclaimed providers (recommendation mode: `provider_owner_id IS NULL`).
2. **Queues outreach** and dispatches an initial email (with optional owner-initiated contact options).
3. **Presents a secure owner decision page** linked from the message (token-based, time-limited).
4. Allows the owner to:
   - **Stay listed** (acknowledge + stop outreach)
   - **Claim** (register/log in and become `provider_owner_id`, enabling edit access)
   - **Remove** (record removal request and hide from public listings)

## Requirements Coverage (Acceptance Criteria)

- **AC1 — Approach via available channel**: Implement automated dispatch for **email**. For Instagram + phone: create manual outreach task records. For WhatsApp: do **not** send cold outbound; provide a WhatsApp contact option (e.g., click-to-chat) that the owner can initiate.
- **AC2 — Language owner can understand**: **MVP language = German (`de`)** for outbound message + landing page copy. (Expansion to additional languages is deferred.)
- **AC3 — New recommendation triggers automation**: Provider INSERT in recommendation mode enqueues outreach automatically into a pending state; **sending is gated** by a delay + manual approval.
- **AC4 — Options: stay listed / claim & edit / remove**: Delivered via public landing page + authenticated claim step.
- **AC5 — Tailwind/design system**: Any UI changes use existing Tailwind tokens + existing UI components (no new theme primitives).

## Scope

### In Scope

- Database-backed **outreach outbox/queue** for unclaimed providers.
- Automated outreach dispatch for:
  - **Email** (Resend via existing email infrastructure)
- “Channel supported but not reliably automatable” handling:
  - **Instagram**: create an outreach task record that can be actioned manually using the UFlow Instagram account.
  - **Phone**: create an outreach task record (call script + tracking) for manual calling.
- WhatsApp is supported only as an **owner-initiated contact option** (e.g., show UFlow WhatsApp number / click-to-chat link on the landing page and in email copy). No cold outbound WhatsApp messaging in v0.8.0.
- Public “owner decision” landing page (token link in message).
- Claim flow: register/log in → claim provider → unlock edit capabilities.
- Remove flow: record request + hide listing from public results.

### Out of Scope (Explicit)

- Building a new admin dashboard. (Status is queryable via DB views/queries; if an admin UI is required, it should be a follow-on plan.)
- Multi-step drip campaigns (reminders, sequences) beyond a single initial outreach attempt per channel.
- Paid CRM integrations (ActiveCampaign/HubSpot/etc.).

## Key Constraints

- **Postgres-first**: Prefer DB outbox + indexes + RPC over external queues.
- **No client-side secrets**: WhatsApp tokens / service-role keys must never be exposed to the browser.
- **Cold outreach compliance**: Ensure messages are “utility/verification” style, include opt-out/removal option, and avoid collecting new PII.
- **Security**: Token links must be non-guessable, time-limited, single-use where appropriate.

## Assumptions

- Provider recommendations already persist contact fields (`contact_email`, `contact_phone`, `social_instagram`) in `providers`.
- Existing Resend integration is available for outbound email.
- WhatsApp cold outbound messaging is not allowed for recommended/unclaimed providers without explicit recipient opt-in; WhatsApp is treated as **owner-initiated** only in v0.8.0.
- Instagram API may not allow proactive DMs to arbitrary accounts; manual outreach is acceptable for that channel until proven otherwise.

## Decision Record

- [RESOLVED] **Target Release = v0.8.0 (minor)** — This feature introduces new automation + user flows; it is not a patch-level change.
- [RESOLVED] **Trigger definition** — Outreach is generated for `providers` rows where `provider_owner_id IS NULL` AND at least one owner contact channel exists.
- [RESOLVED] **Architecture = outbox table + dispatcher** — Use Postgres as the system of record; avoid ad-hoc client-triggered messaging.
- [RESOLVED] **Proof of control via channel link** — The claim/removal token delivered through email is considered sufficient proof the recipient controls that inbox.
- [RESOLVED] **WhatsApp scope (v0.8.0)** — No cold outbound WhatsApp outreach. WhatsApp is offered as an owner-initiated option (e.g., click-to-chat link + respond within the platform’s window if they message first).
- [DEFERRED: Implementer + feasibility risk + v0.8.1 follow-up plan] **Instagram automated DM** — Analysis indicates conversations must be initiated by the person; remain manual unless proven otherwise.
- [RESOLVED] **Scheduled execution mechanism** — Use Supabase `pg_cron` + `pg_net` + Vault to invoke the dispatcher on a schedule (with a documented fallback to external cron only if extensions are unavailable).

## Milestone Dependencies

```mermaid
graph LR
  M1[Milestone 1: Data model + RLS/RPC] --> M2[Milestone 2: Trigger/outbox enqueue]
  M2 --> M3[Milestone 3: Dispatcher (email) + task records]
  M3 --> M4[Milestone 4: Localized templates + language selection]
  M4 --> M5[Milestone 5: Owner decision landing page]
  M5 --> M6[Milestone 6: Claim provider (auth + ownership update)]
  M5 --> M7[Milestone 7: Remove provider (hide listing)]
  M3 --> M8[Milestone 8: Observability + metrics]
  M6 --> M9[Milestone 9: Deployment path audit]
  M7 --> M9
  M8 --> M10[Milestone 10: Version + release artifacts]
```

Sequencing rule: **UI milestones (M5–M7) begin after the queue + token contract is defined (M1–M4).**

## Plan (Milestones)

### Milestone 0 — REQUIRES ANALYSIS: Channel feasibility + compliance gates

Objective: Confirm what can be automated safely for WhatsApp/Instagram and what must be manual.

Work:

- Confirm WhatsApp remains owner-initiated only for v0.8.0 (no cold outbound messaging).
- Validate Instagram outbound automation feasibility (policy constraints; whether proactive DM is permitted).
- Confirm outreach copy posture (utility/verification) aligns with UFlow’s privacy/compliance expectations.

Acceptance Criteria:

- A short findings note (in the plan changelog or referenced analysis) confirms:
  - WhatsApp cold outbound is excluded from MVP scope due to opt-in requirements.
  - Instagram outbound automation is feasible OR explicitly declared “manual-only for now”.

### Milestone 1 — Database model for outreach + claim tokens

Objective: Represent outreach attempts, status, and secure claim/remove tokens in Postgres.

Work:

- Add an **outreach outbox table** (e.g., `provider_owner_outreach`) capturing:
  - `provider_id`, candidate channels (email/phone/instagram), selected channel, language, status, attempt count, timestamps.
- Add a **token table** (e.g., `provider_owner_action_tokens`) to support:
  - `token_hash`, `provider_id`, `action_scope` (decision/claim/remove), expiry, consumed_at.
- Add required indexes for:
  - Pending outreach selection, provider lookup, token lookup.
- Define RLS/RPC boundaries:
  - Public landing page reads via token should reveal only minimal provider details.
  - Claim/remove mutations should be performed via RPC or server-side routes with strong validation.

Acceptance Criteria:

- Schema supports:
  - exactly-once-ish dispatch (idempotent rows, unique constraints)
  - safe token lookup (no raw token stored)
  - minimal data exposure for public token routes

### Milestone 2 — Automatic enqueue on new unclaimed provider

Objective: When a provider is created via recommendation mode, outreach is automatically queued.

Work:

- Add a DB-level mechanism (trigger/function) that, on INSERT into `providers`, enqueues outreach when:
  - `provider_owner_id IS NULL` AND at least one contact channel is present.
- Ensure idempotency (avoid duplicate outreach rows if provider is updated/re-inserted).
- Add an approval + delay gate:
  - New rows enter a state like `pending_review` / `pending_approval`.
  - Dispatcher only sends when an authorized operator has marked the row approved (via DB update) and the row has aged past the configured delay.

Acceptance Criteria:

- Creating a recommendation provider results in exactly one pending outreach row.
- No outreach is sent until approval + delay conditions are satisfied.

### Milestone 3 — Dispatcher: send message (email) + create manual tasks

Objective: Process pending outreach rows and perform the correct channel action.

Work:

- Implement a dispatcher endpoint/function that:
  - selects pending outreach rows,
  - creates a token link,
  - sends via email (Resend),
  - records result + errors,
  - creates manual tasks for Instagram/phone when automated sending is not possible.
- Enforce approval + delay gate in selection logic (only approved + old-enough rows are eligible).
- Implement basic retry discipline:
  - small bounded retries for transient failures,
  - permanent failure states for invalid contacts.

Acceptance Criteria:

- At least one automated channel (email) can send successfully end-to-end in dev/UAT.
- Dispatch is idempotent (re-running does not duplicate messages for the same outreach row).

### Milestone 4 — Localized message templates + language selection

Objective: Outbound messages and the landing page use a language the owner can understand.

Work:

- Implement German (`de`) outreach templates and landing page copy (MVP).
- Ensure the landing page renders in German by default.
- Define how future expansion to additional languages will be integrated (deferred follow-up plan).

Acceptance Criteria:

- Dispatch sends outreach in German.
- Copy is clear and includes a straightforward opt-out/removal path.

### Milestone 5 — Owner decision landing page (public, token-based)

Objective: Provide a single page where the recipient can choose: stay listed / claim / remove.

Work:

- Add a new public route that accepts a token and displays:
  - provider name,
  - what this is (verification of listing),
  - 3 explicit actions.
- Actions:
  - **Stay listed**: mark outreach resolved and stop further attempts.
  - **Claim**: route to auth/register flow, then continue claim.
  - **Remove**: confirm removal request and hide listing.

Acceptance Criteria:

- User can complete one of the three actions from a single link.
- UI uses existing Tailwind + design system components.

### Milestone 6 — Claim provider (register/login → provider_owner_id)

Objective: After authenticating, the owner can claim the provider and gain edit permissions.

Work:

- Implement server-side claim operation that:
  - verifies token scope + expiry,
  - sets `provider_owner_id = auth.uid()`,
  - marks token consumed,
  - marks outreach status “claimed”.
- Ensure existing edit flows recognize `provider_owner_id` ownership.

Acceptance Criteria:

- A newly registered/logged-in user can claim and then edit the provider.

### Milestone 7 — Remove provider (owner request)

Objective: If the owner requests removal, the provider is removed from public browsing.

Work:

- Add a minimal “removed by owner request” representation:
  - either a dedicated status field or a constrained use of existing status fields.
- Update provider read paths to exclude removed providers from public results.

Acceptance Criteria:

- Removed providers do not appear in search/listing/detail routes for non-admin users.

### Milestone 8 — Observability + Measurements (non-QA)

Objective: Ensure the feature is operable and measurable.

Work:

- Record outreach lifecycle events in DB (queued/sent/failed/claimed/removed/kept).
- Define baseline metrics to capture at release time:
  - count of unclaimed providers,
  - outreach sent per channel,
  - decision rate (kept/claimed/removed).

Acceptance Criteria:

- A single SQL query (or lightweight internal report) can produce the above counts.

### Milestone 9 — Deployment Path Audit (required)

Objective: Ensure all env vars and deployment paths are consistent.

Work:

- Enumerate all deployment entrypoints verified (Docker standalone, GitHub Actions, deploy scripts) that must carry:
  - Resend keys (already present)
  - site URL/base URL used in tokens
- Confirm secrets are stored in the right place (no client exposure).

Acceptance Criteria:

- Deployment evidence lists each verified entrypoint and confirms env parity.

### Milestone 10 — Update Version and Release Artifacts

Objective: Align release artifacts to the target release.

Work:

- Bump version to **v0.8.0** according to repo conventions.
- Add a `CHANGELOG.md` entry describing the new outreach + claim/remove flow.
- Ensure any `agent-output` lifecycle status updates are complete.

Acceptance Criteria:

- Version artifacts are consistent and reflect Feature #038.

## Validation (Non-QA)

- Verify DB enqueue happens on provider recommendation creation.
- Verify one end-to-end automated channel works (email), including correct locale and working token link.
- Verify claim sets `provider_owner_id` and enables editing.
- Verify remove hides provider from public lists.

## Risks

- **Platform constraints**: WhatsApp/Instagram outbound initiation policies restrict cold outreach; keep WhatsApp owner-initiated and Instagram manual unless proven otherwise.
- **Abuse/spam**: Attackers could create providers with third-party contacts; require rate limiting and conservative dispatch.
- **Security**: Token link misuse if leaked; mitigate with expiry + one-time consumption + minimal data exposure.
- **Compliance**: Cold outreach must remain “verification/utility” and include a clear removal option.

## Duration Estimates

- Analysis (channel feasibility + compliance): 0.5–1.5 days (uncertainty: Meta approvals/API limits)
- Planning (this document): 1–2 hours
- Implementation: 2–5 days (uncertainty: scheduling mechanism availability, approval gate ergonomics)
- Code Review: 0.5 day
- QA: handled by QA agent (time depends on surface area)
- UAT: 0.5–1 day (needs real channel credentials in UAT)
- DevOps: 0.5–1 day (env vars, deploy audits, edge function/scheduler wiring)
