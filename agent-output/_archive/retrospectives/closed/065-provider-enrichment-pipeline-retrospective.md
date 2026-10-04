---
ID: 065
Origin: 065
UUID: a7b3c941
Status: Processed
---

# Retrospective 065: Automated Provider Enrichment Pipeline

**Plan Reference**: `agent-output/planning/closed/065-provider-enrichment-pipeline.md`
**Date**: 2026-03-29
**Retrospective Facilitator**: retrospective

### Timestamp Discipline (MANDATORY)

- At phase start, capture the current UTC time and use it as the initial changelog or timeline timestamp.
- For each later status transition, record the actual event time in UTC ISO-8601 (`YYYY-MM-DDTHH:MMZ`).
- Do not use date-only entries for status changes, timeline milestones, or handoff log rows unless explicitly marked `approx.`.
- Before finalizing the retrospective, sanity-check that timestamps are chronologically consistent with the documented handoff order.

---

## Summary

**Value Statement**: As a product owner, I want UFlow to automatically enrich approved providers with `provider_owner_id IS NULL` using relevant data fetched from external sources, so that consumers see more helpful and up-to-date data for the operator-managed provider set — without requiring manual browsing of external sources every week.
**Value Delivered**: YES (M1–M3; M4/M5 explicitly gated on Analyst research confirmation)
**Implementation Duration**: ~7h from plan creation to tag push (`2026-03-29T10:00Z` → `2026-03-29T17:05Z`)
**Overall Assessment**: Strong greenfield delivery in a single session. The Analyst, Critic, Implementer, Code Reviewer, QA, UAT, and DevOps agents all contributed substantive work. The main process lessons are: scope revisions mid-flight force compounded rework (two critique passes, two QA passes, ownership-guard implementation as a post-QA delta); lint failures that block QA should be caught during implementation; the critique document lifecycle needs a formal Deferred finding state distinct from OPEN.
**Focus**: Emphasises repeatable process improvements over one-off technical details.

## Memory Health Check

**Status**: NO-MEMORY MODE

Flowbaby retrieval was unavailable (tool disabled) in this session. This retrospective was conducted artifact-first using the plan, analysis, critique, implementation, code review, QA, UAT, and deployment chain directly.

---

## Timeline Analysis

| Phase | Planned Duration | Actual Duration | Variance | Notes |
| --- | --- | --- | --- | --- |
| Planning | ~1h | ~1h 19m | +~20m | Includes two passes: initial plan at T+0, scope revision at 13:19Z after Analyst findings surfaced ownership concern |
| Analysis | ~2h | ~1h (10:00Z→11:50Z approx.) | Faster | Analyst delivered 10 findings on scheduling + source viability; correctly resolved ANALYST-1–5; concise and well-structured |
| Critique | Not separately estimated | ~24m (12:14Z initial + 13:41Z re-critique) | Two passes | First critique at 12:14Z (7 findings); second at 13:41Z after scope revision (9 findings). Two passes not typical — see issues |
| Implementation | ~4–6h | ~1h (13:00Z→14:00Z initial) + delta pass (~2h, 14:00Z→16:30Z) | Two passes | First pass delivered M1–M3; second pass added ownership guards + lint fixes post-QA failure |
| Code Review | Not separately estimated | ~30m pass 1 (14:00Z) + ~15m pass 2 (16:30Z) | Two passes | Pass 1 found 2 MEDIUM functional bugs fixed in-review; pass 2 verified ownership guard delta cleanly |
| QA | ~1.5–2.5h | Pass 1 ~4m (13:00Z→13:04Z, FAILED) + Pass 2 ~15m (16:30Z) | Reset by failures | QA Pass 1 failed immediately at lint gate. Pass 2 clean: 755 tests, 0 lint errors, 0 type errors |
| UAT | ~0.5–1h | ~15m (16:45Z) | In range | Clean value-delivery validation; deferred DF-1, DF-2 as conditional gates |
| DevOps Stage 1 | ~0.5–1h | ~10m (16:45Z→16:55Z approx.) | In range | Version preflight discovered v0.9.10, not v0.9.8 — corrected to v0.10.0 |
| DevOps Stage 2 | ~0.5–1h | ~10m active (17:00Z→17:05Z) | In range | Rebase needed (branch 4 behind); single .next-id conflict; all gates passed; tag pushed |
| **Total** | **~10–14h estimated** | **~7h actual** | **Under estimate** | Delivered M1–M3 greenfield in one session. M4/M5 explicitly deferred with tracked gates. |

---

## What Went Well (Process Focus)

### Workflow and Communication

- **Analyst research was decisive**: The Analyst resolved 5 technical unknowns (pg_cron viability, Lieferando, TripAdvisor, Instagram, provider-site extraction) with clear confidence labelling (Proven / Observed / Inferred). The distinction between "platform proven" and "project-instance enablement needed" for pg_cron was precise and directly actionable for M4 scoping.
- **Ownership constraint was discovered early enough to remain correctable**: The scope revision to `provider_owner_id IS NULL` happened at the Planner level — before implementation merged to main — so the fix was additive rather than a rollback. The key sequence was: Analyst findings → Critic review → Planner revision. The Critic's structural check of Decision 5 created the pressure point that led to the revision.
- **Code Review added real functional value**: Two MEDIUM bugs were caught that no test gate would have found — missing rate limiting on the POST route (FIR-1) and `upsert` with `ignoreDuplicates: false` not applying correctly to partial unique indexes (FIR-2). These are security/correctness failures invisible to `tsc` and `vitest`. Code review was not a rubber stamp.
- **TDD ownership guard was clean**: After the scope revision, the Implementer wrote 3 targeted ownership-guard tests that went Red before the guard implementation and Green after (confirmed in Code Review Pass 2). This is the correct TDD pattern for a bug-prevention regression.
- **ESM-compatible enricher core (Arch A-1)**: By keeping `enrichment-fields.ts` and `joinhalal-enricher.ts` free of Node-only APIs, the enricher core is portable to Deno/Edge without refactoring. This was an explicit architectural decision that de-risks M4 (Edge Function scheduling).
- **Staging-first design (ADR-007) was a clean abstraction**: The `enrichment_candidates` table decouples the "propose enrichment" concern from "apply enrichment". Admins review the diff before any provider data changes. This was the right design for an unproven pipeline on production data.
- **No scope creep into M4/M5**: The implementation delivered exactly M1–M3, with M4/M5/M6 cleanly deferred to `065-open-actions.md`. The boundary was respected by all agents.
- **DevOps rebase was low-friction**: Despite the branch being 4 commits behind `origin/main`, only a single conflict occurred in `agent-output/.next-id`. The resolution rule was unambiguous (keep the higher origin value). This confirms that the project's doc-driven conflict surface is well-organised.

### Agent Collaboration Patterns

- **Analyst → Critic → Planner feedback loop for scope validation**: The triangular path of Analyst findings influencing Critic review, which then triggered a Planner scope revision, is a healthy pattern. The Critic is more likely to notice plan inconsistencies (e.g., Decision 5 not threading through all milestones) if the Analyst has already delivered factual findings to compare against.
- **Code Review Pass 2 was a delta review, not a full re-review**: Only changed files were re-verified in Pass 2 (4 files: enrichment.ts, EnrichmentReviewPanel.tsx, enrich-providers.ts, admin-enrichment.test.ts). This kept the second pass fast without missing coverage.
- **QA Pass 1 produced early signal, not wasted effort**: Although QA Pass 1 FAILED, the 4-minute failure on lint was valuable early signal. The 11-line file list of lint errors pinpointed exactly what needed fixing. The QA agent correctly did not rerun the full strategy — it delegated lint fixes back to Implementer and held the strategy for Pass 2.

### Quality Gates

- **755 tests / 74 files at QA Pass 2**: Strong coverage baseline for a greenfield feature. The enricher core (28 dedicated tests across `enrichment-fields.test.ts` and `joinhalal-enricher.test.ts`) gives confidence in the most complex business logic.
- **0 npm audit HIGH vulnerabilities**: Confirmed at DevOps Stage 2. Plan 065 added no new dependencies; the baseline remained clean.
- **`tsc --noEmit` clean throughout**: Type safety was maintained with no additions to TypeScript error suppression.
- **UAT conditional deferred gates (DF-1, DF-2) were explicit and bounded**: Rather than blocking the release on DF-2 (migration smoke, requires Docker), the UAT agent correctly modelled it as a conditional gate with a mandatory-before-production-deploy constraint. This allowed the release to proceed without leaving a permanent hole in the quality story.

---

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

1. **Mid-flight scope revision created compounded rework** — The ownership constraint (`provider_owner_id IS NULL`) was added as Plan Revision 1 at 13:19Z, after the initial Critique pass (12:14Z) and after implementation had begun. This caused: (a) a second Critic pass at 13:41Z, (b) a second implementation pass to add ownership guards to the CLI, service layer, and bulk-approve, (c) a second Code Review pass, and (d) a second QA pass. A conservative estimate is 1–2h of additional elapsed time. The underlying cause is that the ownership concern was likely discoverable at planning time — the owners/unclaimed distinction already existed in the schema — but was not surfaced until the Analyst and Critic examined it.

2. **QA Pass 1 failed instantly on lint** — The first QA run failed at 13:04Z, just 4 minutes after test strategy creation, on lint errors that the Implementer's own IDE would surface. The specific failures were: an unused import (`ADMIN_CONTROLLED_FIELDS` in `enrichment.ts`) and JSX `key` prop ordering in `EnrichmentReviewPanel.tsx`. Both are IDE-level lint warnings, not complex logic issues. This QA reset did not add value — the Implementer should have caught and fixed these before handoff.

3. **Implementation timestamp was corrupted** — The implementation doc shows `2025-07-14` as the creation date (a template artefact or editor system-clock issue, not actual). This was not caught by any agent during review. Incorrect timestamps in plan-chain docs undermine audit traceability.

4. **Version target in plan/UAT doc was stale** — The plan notes "next minor after v0.9.8" but by DevOps Stage 1, git tags showed `v0.9.10` as the latest, requiring a correction to `v0.10.0`. This is expected when parallel sessions advance git tags while a feature branch is in flight, but the UAT doc perpetuated the stale version. DevOps correctly ran the preflight and overrode it, but the error propagated through 3 documents (plan, UAT, Stage 1 deployment record) before being corrected.

5. **Rebase was required at Stage 2, not Stage 1** — The branch was 4 commits behind `origin/main` at Stage 2 (v0.9.9 and v0.9.10 hotfix merges while session was active). The Stage 1 commit was made without first fetching remote state. This is harmless when conflicts are minor, but adds a corrective step that could be avoided by running `git fetch origin --prune --tags` before Stage 1 commit prep.

### Agent Collaboration Gaps

1. **Planner did not cross-reference ownership field at plan creation** — `provider_owner_id` is a well-documented field (Plan 052, admin-field preservation rules). The planner should have surfaced the ownership constraint at initial plan creation rather than discovering it mid-stream via Analyst and Critic feedback. A simple planning checklist item — "does this plan touch providers? If so, is the ownership distinction in scope?" — would have prevented the revision.

2. **Critique document lifecycle is broken for deferred findings** — The critique doc (`Status: OPEN`, 9 findings all OPEN including 2 MEDIUM) will never reach its terminal status `Resolved` until all 9 findings are addressed. But findings C-6 and C-8 (non-atomic approve, stale claimed-provider candidates) are explicitly deferred to M4 — which may be weeks away. The lifecycle rule creates an indefinite block on critique closure. There is no `Deferred` state for findings that allows the critique to close with some findings marked as carried forward to a future plan.

3. **No Architect pass** — Plan 065 produced architecture findings (`ADR-007`, `ADR-008`, Arch A-1) but the architecture agent was not explicitly involved as a handoff step. The findings were surfaced during Analysis. This is consistent with prior plans but worth noting: architecture decisions made in-stream by the Analyst/Code Reviewer without an explicit Architect sign-off may not be as rigorously evaluated for long-term implications.

### Quality Gate Failures

1. **Local smoke test gap is a standing structural issue** — The worktree has no `.env.local`; smoke tests return 500 and are operator-delegated. This has been the same in multiple prior releases (Plan 050 retrospective noted it; Plan 044 retrospective noted it). The workaround (delegating to UAT env post-deploy) is documented but it means DevOps agents can never complete a local "green" smoke test independently of the operator. This is a structural gap in the agent environment, not a process failure for this release.

2. **DF-2 (migration reset + admin smoke) is still open** — Migration `066_enrichment_candidates.sql` has not been validated against a real Supabase instance. The migration applies the new `enrichment_candidates` table, RLS policies, and indexes. The risk is low (all changes are additive — no ALTER TABLE on existing tables), but it is a known gap before first production use of the enrichment UI.

### Misalignment Patterns

1. **"Scope first, then implement" is harder than "implement then scope"** — The root cause of the two-pass pattern is that scope decisions (who is eligible for enrichment) are easier to verify against implemented code than against a plan document. Both the Analyst and the Critic had to reason forward from the plan text. A "spike" phase — where the Implementer writes the eligibility query first, shows it to the Planner, and confirms the scope before building the rest — would have surfaced the ownership question in 15 minutes rather than triggering a full scope revision.

2. **Plan Revision 1 scope narrowing was correct but not anticipated in plan duration estimates** — The plan's duration estimates did not include a scope revision buffer. A feature that touches an existing entity with an ownership model (providers, in this case) should budget for one scope clarification pass.

---

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs**: 13 (Planner × 2, Analyst × 1, Critic × 2, Implementer × 2, Code Reviewer × 2, QA × 2, UAT × 1, DevOps × 1)
**Handoff Chain**: Planner → Analyst → Critic → Planner (scope revision) → Critic (re-critique) → Implementer → QA (P1, FAIL) → Code Reviewer (P1) → Implementer (delta) → Code Reviewer (P2) → QA (P2) → UAT → DevOps (S1) → DevOps (S2) → Retrospective

| From Agent | To Agent | Artifact | What Requested | Issues Identified |
| --- | --- | --- | --- | --- |
| Planner | Analyst | Plan 065 v1 | Scheduling mechanism + source viability research | Ownership scope not yet raised |
| Analyst | Critic | Analysis 065 | Validate plan against analysis findings | — |
| Critic | Planner | Critique 065 v1 | 7 findings — APPROVED with advisory | C-1 noted ownership filtering; feedback triggered scope revision |
| Planner | Critic | Plan 065 Rev 1 | Re-critique after ownerless scope narrowing | 9 findings (C-8, C-9 new) — APPROVED |
| Critic | Implementer | Critique 065 Rev 1 | Implement M1–M3 | — |
| Implementer | QA | Impl 065 v1 | Execute QA gates | QA FAILED — 3 lint failures |
| QA | Code Reviewer | QA 065 P1 fail | Code review proceed in parallel | Code Reviewer found FIR-1 (rate limiting) + FIR-2 (upsert dedup) |
| Code Reviewer | Implementer | Code Review P1 | Fix FIR-1, FIR-2 + lint failures + ownership guards | Merged lint + ownership guard into single delta pass |
| Implementer | Code Reviewer | Impl 065 Rev 1 | Re-review delta (ownership guard + lint fixes) | Pass 2 clean |
| Code Reviewer | QA | Code Review P2 | Re-execute QA | 755 tests, 0 lint, 0 type errors — QA COMPLETE |
| QA | UAT | QA 065 P2 | Validate value delivery | APPROVED FOR RELEASE (DF-1, DF-2 conditional) |
| UAT | DevOps | UAT 065 | Stage 1 commit preparation | Version target correction: v0.9.8 → v0.10.0 |
| DevOps (S1) | DevOps (S2) | Stage 1 doc | Rebase + version bump + push + tag | Single .next-id conflict resolved |

**Handoff Quality Assessment**:
- Were handoffs clear and complete? **Mostly yes.** The Analyst → Critic → Planner loop was unusually productive. The failure point was the Planner not identifying the ownership constraint at initial creation.
- Was context preserved across handoffs? **Yes.** All agents correctly inherited the Plan 065 ID and UUID. Architecture decisions (Arch A-1, ADR-007, ADR-008) appeared in both the implementation and code review documents.
- Were unnecessary handoffs made? **One near-miss.** QA Pass 1 (4 minutes to FAIL) could be avoided if the Implementer ran `npm run lint` before handoff. The handoff was technically correct (QA is the lint gate), but it consumed a full QA session to find 3 IDE-level warnings.

### Issues and Blockers Documented

**Total Issues Tracked**: 14 (9 critique findings + 2 Code Review MEDIUM fixed + 2 deferred items (DF-1, DF-2) + 1 analyst gap)

| Issue | Artifact | Resolution | Escalated? | Time to Resolve |
| --- | --- | --- | --- | --- |
| C-1: Plan Decision 5 not threaded through milestones | Critique P1 | Resolved — Plan Revision 1 re-threaded ownership through milestones 1–4 | No | ~1h |
| C-2–C-5: LOW findings | Critique P1/P2 | Accepted for M4 scope | No | N/A (deferred) |
| C-6: Non-atomic approve race | Critique P2 | Code Review documented as DF-3; deferred to M4 atomic RPC | No | Deferred M4 |
| C-7–C-9: LOW / ownership-related LOWs | Critique P2 | Accepted / deferred to M4 | No | N/A (deferred) |
| FIR-1: Missing rate limiting on POST route | Code Review P1 | Fixed in-review before QA Pass 2 | No | ~1h |
| FIR-2: `ignoreDuplicates: false` with partial unique index | Code Review P1 | Fixed in-review (`ignoreDuplicates: true`) | No | ~1h |
| QA-F1: Unused import | QA P1 | Fixed in Implementer delta pass | No | ~3h (between QA P1 fail and QA P2 pass) |
| QA-F2: JSX key prop ordering | QA P1 | Fixed in Implementer delta pass | No | ~3h |
| QA-F3: JSX key prop ordering (line 164) | QA P1 | Fixed in Implementer delta pass | No | ~3h |
| DF-1: CLI timing < 60s | Open actions | Open — within 24h of first production dry-run | No | Pending |
| DF-2: Migration smoke + admin GET/POST | Open actions | **Open — production gate** | No | Pending (Docker required) |
| ANALYST-1: pg_cron project-instance enablement | Analysis | Partially resolved — platform proven, instance probe outstanding | No | Pending (M4 gate) |
| Version target stale (v0.9.8 → v0.10.0) | Plan / UAT / Deployment | Corrected at DevOps Stage 1 | No | ~5m at DevOps preflight |
| .next-id rebase conflict | Deployment | Resolved — kept origin value 070 | No | ~2m |

**Issue Pattern Analysis**:
- Most common issue type: **Scope/design clarification at critique level** (5 of 9 findings relate to ownership scope enforcement or deferred design gaps for M4).
- Were issues escalated appropriately? **Yes.** No issues required escalation; all were resolved within the agent chain.
- Did early issues predict later problems? **Yes — in one important case.** Critique finding C-1 (Decision 5 not threading through milestones) directly predicted the need for the Plan Revision 1 and the post-QA ownership guard implementation. The Critic surfaced this before implementation; the Planner acknowledged it but the full threading into implementation code was only confirmed after QA failure.

---

## Process Improvement Recommendations

These are systemic recommendations targeting repeatable workflows across future plans, not workarounds for Plan 065 specifics.

### P1 — Add a "Deferred" finding state to the critique document lifecycle (HIGH PRIORITY)

**Problem**: Critique findings marked OPEN remain OPEN indefinitely if they are deliberately deferred to a future milestone. The critique document can never reach `Status: Resolved` without addressing all findings, even when deferred findings are explicitly tracked in a future plan (e.g., `065-open-actions.md`).

**Recommendation**: Define a `Deferred (PLAN-NNN)` state for individual findings. A finding in this state: (a) names the plan or open-action entry that owns it, (b) counts toward an "acknowledged" tally, not the "blocking" tally, and (c) allows the critique to close with `Status: Resolved` once all non-deferred findings are addressed and all deferred findings have a named downstream owner.

**Impact**: Critique cleanup will stop blocking document lifecycle closure. Deferred items remain traceable without keeping the critique in limbo.

---

### P2 — Add a "provider ownership check" to the Planner's entity ownership checklist (MEDIUM PRIORITY)

**Problem**: The `provider_owner_id IS NULL` scope was not identified at plan creation and required a mid-flight scope revision, generating compounded rework (two critique passes, two implementation passes, two QA passes).

**Recommendation**: When a plan creates or modifies data about existing `providers` rows, the Planner should explicitly answer: "Does this plan interact with both claimed (owner ≠ NULL) and unclaimed providers? Should its scope be differentiated by ownership?" This is a one-sentence check that prevents the most common scope-creep direction for provider-touching plans.

**Impact**: Catches ownership-scope ambiguity at plan time rather than after implementation is in progress.

---

### P3 — Implementer should run `npm run lint` before handing off to QA (MEDIUM PRIORITY)

**Problem**: QA Pass 1 failed in 4 minutes on 3 IDE-level lint errors (unused import, JSX key prop ordering ×2). The Implementer's editor would surface these as warnings. The handoff consumed a full QA pass to find errors recoverable in <30 seconds by the Implementer.

**Recommendation**: Add a pre-handoff local gate to the Implementer's completion checklist: `npm run lint` exit 0 AND `npm run type-check` exit 0. Only hand off to QA after both pass. QA remains the authoritative lint gate, but the Implementer self-check eliminates trivial failures.

**Impact**: Eliminates QA reset passes caused by IDE-level lint warnings. Estimated cycle time saving: 1–3h per occurrence.

---

### P4 — Treat version target as a DevOps-confirmed value, not a plan-authored value (LOW PRIORITY)

**Problem**: The plan says "next minor after v0.9.8", but git tags advanced to v0.9.10 while the session was in-flight. The stale version propagated into the UAT doc and Stage 1 deployment record before being corrected.

**Recommendation**: Plans should record the version target as "TBD — confirmed at DevOps Stage 1 via `git fetch origin --tags && git tag --list`". The UAT doc should copy the version from the plan but mark it `(provisional — DevOps to confirm)`. The deployment record is authoritative.

**Impact**: Eliminates version-target corrections at DevOps Stage 2. One source of truth: the deployment record.

---

### P5 — Run `git fetch origin --prune --tags` before Stage 1 commit (LOW PRIORITY)

**Problem**: The Stage 1 commit was created from a branch that was already 4 commits behind `origin/main` (v0.9.9 and v0.9.10 hotfix merges). The rebase was required at Stage 2, adding a conflict-resolution step that could have been avoided if Stage 1 had synced first.

**Recommendation**: DevOps Stage 1 should include a remote sync step immediately before selecting the version target: `git fetch origin --prune --tags`. This ensures the version target is based on current remote state, and the implicit rebase at Stage 2 has fewer accumulated commits to replay.

**Impact**: Reduces rebase surface area and risk of accumulating multiple conflicts when several sessions are in flight on the same repo.

---

### P6 — Capture corrected implementation timestamps at document creation time (LOW PRIORITY)

**Problem**: The implementation doc shows `2025-07-14` as its creation date — a template or system-clock artifact. This is incorrect by ~9 months. No agent caught the error during review.

**Recommendation**: Implementer should verify the date field matches today's date (UTC) before saving the implementation doc. Code Reviewer should flag placeholder/wrong dates in the header as a minor finding. A date more than 30 days from the current date (in either direction) in a plan-chain doc is a review flag.

**Impact**: Maintains audit trail integrity across the document chain.

---

## Technical Patterns Noted (Secondary)

These are architectural observations relevant to M4/M5 planning, not process improvements.

- **ESM-compatible enricher core (Arch A-1)** is the correct design for a pipeline that will eventually move to pg_cron + Edge Function. The Node-only APIs are confined to the CLI script, which will not run in Deno. No refactoring needed for M4.
- **Circuit breaker at 20% failure threshold** in the CLI is a good operational default for a new pipeline. Adjust in M4 based on observed failure rates from `enrichment_run_logs`.
- **Partial unique index `WHERE status = 'pending'`** for deduplication is correct. Approved/rejected/applied candidates intentionally do not block re-enqueueing from a fresh enrichment run.
- **Non-atomic approve (C-6)** is the most significant technical debt risk. The sequential fetch-check-update in `approveCandidate()` is safe at current admin concurrency (single admin), but will need an atomic RPC before any multi-admin or batch-automation scenario goes live (M4 DF-3).
- **Candidate table growth** has no retention policy. Plan M4 should include a `PARTITION BY RANGE(reviewed_at)` or a cleanup job via pg_cron when scheduling is enabled.
- **M4 pg_cron project-instance gate** (ANALYST-1 partially resolved): the Analyst confirmed the platform supports pg_cron but the specific UFlow Supabase project instance needs an operator probe (`SELECT * FROM cron.job LIMIT 1`) to confirm the extension is enabled. This must happen before M4 implementation begins.

---

## Overall Assessment

Plan 065 delivered a well-designed, test-covered, admin-gated enrichment pipeline in a single session. The workflow was more complex than typical — 13 handoffs, two scope revisions, two QA passes — but all complexity was either inherent to a new pipeline (Analyst research, architecture decisions) or correctable via process improvements (lint handoff gate, ownership planning checklist).

The most impactful lessons for future plans are P1 (critique lifecycle gap for deferred findings) and P2 (provider ownership check at plan time). Together they address the root cause of the two-pass pattern that added ~1–2h to this session.

The enrichment pipeline design itself — staging table, conflict detection, admin review gate, ownership fail-closed guard — is a strong foundation for M4 (scheduling) and M5 (additional sources). The deferred items are well-documented and bounded.

---

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-03-29T17:15Z | retrospective | Initial retrospective created; artifact-first (NO-MEMORY MODE) |
| 2026-03-29T17:25Z | process-improvement | Retrospective processed into Process Improvement Analysis 070; moved to `closed/` |