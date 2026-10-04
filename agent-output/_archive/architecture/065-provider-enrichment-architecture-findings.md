---
ID: 065
Origin: 065
UUID: a7b3c941
Status: OPEN
---

# Architecture Findings 065 — Automated Provider Enrichment Pipeline

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-03-29T12:25Z | Critic (APPROVED) → Architect | Pre-implementation architectural review | 2 REQUIRED changes, 3 advisories. 2 new ADRs recorded (ADR-007, ADR-008). Verdict: APPROVED_WITH_CHANGES |

## Related Artifacts

| Artifact | Path |
| --- | --- |
| Plan | [agent-output/planning/065-provider-enrichment-pipeline.md](../planning/065-provider-enrichment-pipeline.md) |
| Analysis | [agent-output/analysis/065-enrichment-source-analysis.md](../analysis/065-enrichment-source-analysis.md) |
| Critique | [agent-output/critiques/065-provider-enrichment-pipeline-critique.md](../critiques/065-provider-enrichment-pipeline-critique.md) |

---

## 1. Context

Plan 065 introduces UFlow's first **automated background enrichment pipeline** — a qualitatively different operational class from everything built so far. Every previous Supabase interaction has been **request-driven**: a user action or developer command triggers a transaction. Plan 065 adds the system's first **time-driven** actor.

This architectural shift warrants deliberate review because it touches:

1. **Scheduling infrastructure**: pg_cron + pg_net, new to this project instance
2. **An autonomous actor** (`IMPORT_BOT_UUID`) operating outside user request context
3. **Outbound HTTP from the database tier** (pg_net fetching external source URLs)
4. **A new staging table pattern** (`enrichment_candidates`) between external data and `providers`
5. **Deno/Node module sharing** between the CLI enricher and the Edge Function

The plan is well-designed and conceptually sound. Architectural concerns are focused on **how** M4 is implemented, not on whether the plan's approach is correct.

---

## 2. Architectural Alignment Assessment

**Overall: ALIGNED** — the plan correctly applies UFlow's core principles.

| Principle | Assessment |
| --- | --- |
| **Postgres-first** | ✅ Staging in Postgres, scheduling via pg_cron, writes via service-role client. No Redis, no external queue. Fully aligned. |
| **Admin-field preservation** | ✅ Plan 052 protected fields explicitly excluded from enrichment proposals. Server-side enforcement specified, not UI-only. |
| **Service-role for privileged writes** | ✅ Plan specifies service-role client for the apply Route Handler and the Edge Function writes. Consistent with Plans 058/061 pattern. |
| **Incremental source rollout** | ✅ JoinHalal-only Phase 1. Each new source proven before adding the next. |
| **Inline admin moderation** | ✅ M3 extends Plans 058/061 admin surface, not a new orphaned panel. |

---

## 3. Critical Architectural Finding — A-1

### A-1: Edge Function CANNOT import Node.js modules from `src/lib/`

**Severity: REQUIRED CHANGE — must be resolved before M4 begins**

**Issue**:

The plan states M4's Edge Function should contain "the enrichment logic (or calling the existing enrichment module as a library)." The M2 deliverable is `src/lib/enrichment/joinhalal-enricher.ts` — a Node.js TypeScript module.

Supabase Edge Functions run on **Deno**, not Node.js. Deno and Node have fundamentally different module resolution:

- Node resolves `@/lib/enrichment/...` via `tsconfig.json` path aliases and bundler
- Deno resolves modules via **URL imports** or `npm:` specifiers
- A Deno Edge Function cannot `import` from `src/lib/` using Node path aliases

This is not a configuration fix — it is a runtime boundary.

**Architectural consequence**:

The enrichment logic (field parsing, conflict detection, candidate writing) will exist in two runtimes. The plan must be explicit about this: there is no "shared library" between the CLI enricher and the Edge Function in the naive sense.

**Required resolution**: The Implementer MUST choose one of two architecturally sound approaches:

**Option A (Preferred): Design `src/lib/enrichment/` as Deno/ESM-compatible from the start.**

Write enrichment modules using ESM-only syntax and standard Web APIs (no Node-specific packages). The Edge Function imports the same files using Deno's `npm:` specifier to handle any npm dependencies:

```
// At the top of the edge function:
import { buildEnrichmentCandidates } from '../../src/lib/enrichment/joinhalal-enricher.ts';
// Works if joinhalal-enricher.ts uses no Node-only APIs
```

This requires: no use of `fs`, `path`, `process`, or Node-only npm packages in the enricher core logic. HTTP fetching must use the Web-standard `fetch()` API, which both Deno and Node 18+ support natively.

**Option B: Accept intentional duplication.** Keep `src/lib/enrichment/` as the Node CLI library. Write a parallel Deno-compatible enricher inside `supabase/functions/enrich-providers/lib/`. Document this as deliberate separation, not an accident. Use shared fixtures/test data to keep parity.

Option A is strongly preferred — duplication carries a long-term maintenance risk where CLI and Edge Function diverge silently. It is achievable because the enricher core (parse HTML, compare fields, compose candidate records) needs no Node-only APIs.

**Decision required before M4**: Planner should clarify which option is chosen. This architectural constraint must be recorded in the implementation notes.

---

## 4. Critical Architectural Finding — A-2

### A-2: pg_cron schedule definition must be in a migration file, not dashboard-only

**Severity: REQUIRED CHANGE — must be specified in implementation**

**Issue**:

The plan correctly identifies pg_cron as the scheduling mechanism. However, it does not specify **where** the cron job is defined. Supabase offers two paths:

1. **Dashboard-only native schedule** (Supabase UI → schedule a function): simple but not captured in any file, not version-controlled, not reproducible across environments (local dev, staging, production)
2. **pg_cron migration** (`INSERT INTO cron.job ...` in a Supabase migration file): version-controlled, reproducible, infrastructure-as-code

**Architectural consequence**:

If the schedule is defined only in the Supabase dashboard, it:
- Is invisible in the repo
- Cannot be reviewed, diffed, or rolled back
- Will not exist in local `supabase db reset` environments
- Creates an invisible dependency between the codebase and a specific Supabase project's dashboard state

This would be a **stealth configuration** — a class of infrastructure that lives outside the repo and breaks the principle of reproducible environments.

**Required implementation pattern**:

```sql
-- In a new migration file: supabase/migrations/YYYYMMDD_enrichment_schedule.sql
SELECT cron.schedule(
  'weekly-enrichment-run',            -- job name
  '0 3 * * 1',                        -- every Monday at 03:00 UTC
  $$
    SELECT net.http_post(
      url := vault.get('enrichment_function_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || vault.get('enrichment_anon_key')
      ),
      body := jsonb_build_object('source', 'joinhalal')
    );
  $$
);
```

The function URL and key must be stored in Vault (following the documented Supabase scheduling pattern). The Vault setup is an operators' task at deployment time, but the cron registration itself belongs in the migration.

---

## 5. Architectural Advisory — A-3

### A-3: Outbound HTTP origin transitions from developer machine to Supabase shared infrastructure

**Severity: ADVISORY**

In Phase 1, JoinHalal fetches come from the developer's machine (scripts). After M4, they will originate from **Supabase's shared Edge Function infrastructure** — IPs that are Supabase-managed and shared across tenants.

**Consequences**:

- Rate limit exposure changes: JoinHalal cannot distinguish "our dedicated IP" from "a generic cloud function fleet IP"
- If JoinHalal implements per-IP rate limiting, a shared function fleet IP may already be rate-limited by other Supabase tenants
- This is standard for any cloud function approach; it is not unique to Supabase

**Mitigation already in plan**: The 200ms inter-request delay and the 20% circuit-breaker are the right mitigations. The Implementer should additionally:
- Set a meaningful `User-Agent` header in Edge Function requests (e.g., `UFlow-Enrichment/1.0`)
- Log all non-2xx responses with the full status code (not just as generic "failures")

**No plan change required.** Document in implementation notes.

---

## 6. Architectural Advisory — A-4

### A-4: `enrichment_candidates` table requires a defined row lifecycle

**Severity: ADVISORY** (aligns with Critic Finding C-2)

The architecture must specify that `enrichment_candidates` is a **staging table with a defined lifecycle**, not a permanent append-only log. Architecturally, the distinction matters:

- A staging table is operational state — it holds rows until they are acted upon, then rows are archived or purged
- A permanent log holds rows forever for audit

The plan correctly designs the table for staging (status column, timestamps) but does not commit to a lifecycle policy.

**Architectural guidance**:

- Rows with status `applied` or `rejected` older than 90 days should be eligible for archival or deletion
- This policy belongs in the migration comment and in M4's Edge Function (purge at start of each run)
- Alternatively: a separate pg_cron cleanup job can sweep terminal-status rows weekly

This does not block M1–M3. Record as a technical debt item for the first operational review post-launch.

---

## 7. Architectural Advisory — A-5

### A-5: The IMPORT_BOT_UUID sentinel is now a first-class autonomous system actor

**Severity: ADVISORY**

The existing `IMPORT_BOT_UUID` sentinel was used for developer-triggered imports. After M4, it becomes the **actor for autonomously-generated enrichment writes** that occur without any human request context.

This changes the semantics of `IMPORT_BOT_UUID` rows in audit logs from "an operator ran an import script" to "the system itself made a change."

**Architectural guidance**:

- The run log entry for an automated enrichment run should clearly mark itself as `actor_type = 'system'` (not `actor_type = 'operator'`) if the audit log schema supports it
- If it does not, a separate column or naming convention should distinguish system-originated writes
- This prevents operators from confusing automated candidates with operator-initiated import candidates in admin review

No schema change is required at this phase, but the distinction should be documented in M2/M4 implementation notes.

---

## 8. New ADRs

### ADR-007: Staging-first pattern for external data ingestion (Enrichment Inbox)

**Status**: Accepted

**Context**:
UFlow's import pipeline previously wrote external data directly to `providers` via upsert RPC (JoinHalal import, v0.8.13–v0.8.15). As enrichment becomes automated and recurring, direct upsert without operator visibility creates conflict risk and makes admin-field preservation enforcement harder. The admin moderation surface (Plans 058/061) established the pattern of admin visibility before action; enrichment should follow the same principle.

**Decision**:
All automated enrichment proposals stage in an `enrichment_candidates` table as `pending` records before any write to `providers`. Admin review is required for conflicts. Auto-apply is permitted only for additive, non-conflicting updates from the provider's own known import source.

**Alternatives considered**:
- Direct upsert into `providers` on enrichment (rejected: no conflict tracking, no admin oversight, risks admin-field overwrite)
- External queue/inbox service (rejected: violates Postgres-first principle; unnecessary complexity at current DAU)
- Append-only event log + CQRS read model (rejected: overengineered for current scale)

**Consequences**:
- Adds latency to enrichment propagation (enriched data is not live until admin approves)
- Creates a growing staging table that needs lifecycle management
- Unlocks auditability and conflict visibility that would be impossible with direct upsert
- Consistent with admin review patterns already established in moderation

**Related**: ADR-008, Plans 058/061

---

### ADR-008: pg_cron schedule definitions belong in migration files

**Status**: Accepted

**Context**:
Supabase supports both dashboard-defined native schedules and pg_cron-defined schedules. Dashboard-only schedule definitions are not captured in the repository, are not reproducible across environments, and cannot be reviewed or rolled back via the standard migration workflow.

**Decision**:
All persistent automated job schedules MUST be defined in Supabase migration files as `cron.schedule(...)` calls, with connection secrets stored in Vault. The dashboard may be used to inspect or temporarily pause jobs, but it is NOT the source of truth. The migration file is.

**Alternatives considered**:
- Dashboard-only native schedule (rejected: invisible in repo, not reproducible in local/staging environments, breaks infrastructure-as-code principle)
- External cron (GitHub Actions scheduled workflow, system cron on Hetzner) (rejected: introduces operational surface outside Supabase stack; adds auth complexity for invoking Edge Functions; Postgres-first preference)

**Consequences**:
- Requires Operator to populate Vault with function URL + anon key at deployment time (documented in runbook)
- Local dev `supabase db reset` will register the cron job (this is harmless in local context; job will fire net.http_post to the function URL, which may not be running locally — acceptable)
- Cron job changes (cadence, source targeting) are diff-able and code-reviewed

**Related**: ADR-007, Finding A-2

---

## 9. Observability Requirements (Architecture Standard)

The plan proposes an `enrichment_run_log` table (or reuse of `admin_audit_logs`). The architecture requires minimum viable incident telemetry as normal-mode fields:

### Normal (always-on, structured, low-volume)

Every enrichment run MUST write:

| Field | Type | Purpose |
| --- | --- | --- |
| `run_id` | UUID | Correlation ID for the run |
| `source` | text | Source identifier (e.g., `joinhalal`) |
| `triggered_by` | text | `pg_cron`, `admin_manual`, `cli_dry_run` |
| `started_at` | timestamptz | Run start |
| `finished_at` | timestamptz | Run end |
| `providers_selected` | int | Eligible providers queried |
| `providers_processed` | int | Pages actually fetched |
| `candidates_created` | int | New `pending` candidates written |
| `unchanged_count` | int | Providers with no field change |
| `failure_count` | int | Failed fetches |
| `circuit_breaker_triggered` | bool | Whether the 20% threshold was hit |

### Debug (opt-in, flag-controlled)

When `debug_mode = true` in the job payload:

| Field | Purpose |
| --- | --- |
| `sample_diff_payload` (jsonb) | One representative changed provider's before/after diff |
| `first_n_failures` (jsonb array) | First 10 failed URLs with status code and error category |
| `ineligibility_reasons` (jsonb) | Count by reason: `missing_source_url`, `source_not_supported`, `rate_limited` |

**Recommendation**: Create a dedicated `enrichment_run_logs` table (not append to `admin_audit_logs`) because the schema is materially different — it has numeric counters and a circuit-breaker flag that don't map onto the audit log's generic action/entity pattern.

---

## 10. Phase 2 Source Architecture Posture

The following records the architectural posture on Phase 2 sources, for reference when M5 proceeds:

| Source | Architectural Status | Required Before M5 Implementation |
| --- | --- | --- |
| **Lieferando** | Unproven. Not globally bot-blocked. Extractability requires a representative restaurant-page probe. | Gap 2 resolution + ToS legal review |
| **TripAdvisor** | Dependency-gated. Direct fetch blocked (DataDome). Structured extraction evidenced via third-party actors. Requires external dependency approval. | Gap 7 (field mapping) + ADR for external extractor dependency |
| **Instagram** | API-only. Business Discovery API exists. Requires Meta app setup and permission. | API access provisioned + Gap 3 (field mapping) |
| **Google Maps** | Not in current plan scope. Apify actors available if external dependency is later approved. Strongest Apify candidate per Analysis Finding 10. | Product decision + ADR |

**Architectural position on external enrichment vendors (Apify)**:
If the product approves an external vendor for Phase 2 enrichment, this MUST be captured as an ADR before implementation of any source using that vendor. Key constraints: token management in Vault, rate/cost governance, vendor reliability SLA, privacy compliance (no PII sent to vendor). This is not a blocker for M1–M4.

---

## 11. Verdict

**APPROVED_WITH_CHANGES**

Plan 065 is architecturally sound in its approach. The Postgres-first principle is upheld, the staging-first enrichment inbox is the correct pattern, and the admin-field preservation rules are appropriately enforced at the server layer.

**Two changes are REQUIRED before M4 implementation begins:**

1. **A-1 (Edge Function ↔ Node module boundary)**: The Implementer must choose Option A (ESM-compatible enricher core) or Option B (accepted duplication) and document the decision in implementation notes before writing M4.

2. **A-2 (pg_cron in migration files)**: The pg_cron schedule MUST be defined in a migration file — not dashboard-only. This is non-negotiable for infrastructure reproducibility.

**M1, M2, M3 are unblocked.** Both required changes apply specifically to M4.

The three advisories (A-3, A-4, A-5) are informational for the Implementer and do not require design changes.

Two new ADRs (ADR-007, ADR-008) have been recorded in `system-architecture.md`.
