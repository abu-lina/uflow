---
ID: 057
Origin: 057
UUID: 5a8f3c2e
Status: OPEN
---

# Critique 057 — JoinHalal Visible Halal-Badges Fallback

- **Artifact**: `agent-output/planning/057-joinhalal-visible-halal-badges-fallback-plan.md`
- **Date**: 2026-03-24T07:18Z
- **Status**: Initial Review
- **Verdict**: APPROVED

## Changelog

| Date | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-24T07:18Z | User → Critic | Review the plan | Initial critique of Plan 057 (parser fallback + backfill) |

---

## Value Statement Assessment

**Rating: PASS**

The value statement is present in user-story format ("As an admin, I want..."), clearly scoped to two verifiable outcomes:

1. Improved detection of alcohol badges from visible HTML when JSON-LD is incomplete.
2. A safe backfill capability that flips `pending → rejected` for already-imported providers without touching human-reviewed rows.

Both outcomes directly advance provider supply quality and import moderation accuracy. The "So that" is implicit but clear — providers with `Alkoholverkauf` are reliably rejected, and `Kein Alkoholverkauf` providers are not falsely rejected. Aligns with the Master Product Objective (trustworthy, halal-verified provider discovery).

---

## Overview

Plan 057 is a well-scoped source-contract bugfix following the released Plan 051. It correctly identifies that Plan 051's JSON-LD-only assumption was incomplete — live JoinHalal pages can express alcohol status only in rendered HTML badges while JSON-LD provides no usable signal. The plan adds a fallback parser and, critically, addresses the real-world operational need: ~900 already-imported providers need retroactive evaluation.

The plan is clearly structured with 6 milestones, appropriate dependency sequencing, and a thorough risk section. The backfill scope is well-guarded with `pending`-only constraints and mandatory dry-run-first semantics.

---

## Architectural Alignment

**Rating: PASS**

- Stays within the existing import pipeline (`scripts/import-joinhalal.ts`, `src/lib/import/joinhalal.ts`, `src/utils/joinhalal-parser.ts`).
- Preserves the Postgres-first philosophy — no new services or external dependencies.
- Respects the established field classification in `joinhalal-fields.ts` (source-controlled vs admin-controlled) and explicitly explains why the backfill must bypass the standard upsert RPC.
- No UI changes, no new API routes, no new database columns.

---

## Scope Assessment

**Rating: PASS**

Scope is appropriately bounded:

- **In scope**: Parser extension, both import paths, backfill mode, regression coverage, operator docs.
- **Out of scope**: Override/denylist tooling (deferred), scheduled re-evaluation, external site scraping.
- The backfill is correctly scoped as a one-time operator command, not an ongoing automated process.

---

## Technical Debt Risks

**Rating: LOW**

- The fallback HTML parsing does add a second data-source dependency (rendered badge DOM), creating a maintenance surface. This is acknowledged in the risks section (HTML structure drift). The mitigation (anchor on semantic heading text, not element IDs) is appropriate.
- The backfill direct-update path creates a second write path alongside the established upsert RPC. This is acceptable for a one-time corrective operation but should not become an ongoing pattern.
- No new abstractions or services introduced — keeps complexity minimal.

---

## Findings

### MEDIUM-001: Backfill direct-update path doesn't address RLS/trigger implications

| Field | Value |
|---|---|
| **Status** | RESOLVED |
| **Severity** | MEDIUM |
| **Issue** | The plan says backfill writes should "use a direct targeted update rather than the standard upsert RPC, to avoid re-triggering the `ADMIN_CONTROLLED_FIELDS` preservation logic." However, the plan does not address: (a) whether the direct update needs to run with `service_role` to bypass RLS; (b) whether existing triggers (e.g., `trigger_providers_updated_at` from migration 062) should fire on the backfill update; (c) whether the backfill should run as SQL, Supabase client call, or RPC. |
| **Impact** | If the implementer uses the anon/authenticated role for the direct update, RLS may deny the writes. If they bypass RLS but forget about triggers, `updated_at` timestamps may not reflect the change. |
| **Recommendation** | Add a note in Milestone 4 or Handoff Notes clarifying that the backfill update should run with `service_role` (consistent with the existing CLI import path) and should allow triggers to fire normally. This is a one-liner clarification, not a scope change. |

### MEDIUM-002: Backfill URL reconstruction — `import_source_id` alone is insufficient

| Field | Value |
|---|---|
| **Status** | RESOLVED |
| **Severity** | MEDIUM |
| **Issue** | Milestone 4 says the backfill fetches source URLs "using the stored `import_source_id` / `social_website` slug." Code inspection reveals: `import_source_id` stores only the numeric post ID (e.g., `5990`), while the full URL includes a slug (e.g., `triple-b-burger-brothers-stuttgart-mitte-5990`). `import_source_url` is stripped before the upsert and is not a DB column. However, `social_website` stores `schema.url` — which is the full JoinHalal listing URL — and is persisted as a source-controlled field. |
| **Impact** | If the implementer attempts URL reconstruction from `import_source_id`, it will fail. The plan's phrasing "`import_source_id` / `social_website`" as alternatives is misleading — only `social_website` provides a usable URL. |
| **Recommendation** | Clarify in Milestone 4 and Handoff Notes that the backfill must use `social_website` (which stores the full JoinHalal listing URL) as the source for page re-fetching. Remove the `import_source_id` suggestion for URL reconstruction, or note it is only usable as a filter (`WHERE import_source = 'joinhalal'`), not for URL construction. |

### LOW-001: No detection/logging when badge fallback finds zero badges

| Field | Value |
|---|---|
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue** | If JoinHalal silently changes their badge HTML structure, the fallback parser would find zero badges and silently fall through to the "no signal" path. Future imports or backfill runs would produce no rejections with no warning. |
| **Impact** | Silent regression — no hotfix, but missed detections that are only noticed ad hoc. |
| **Recommendation** | Consider adding a log-level note or counter in the operator output when the fallback parser is invoked but extracts zero badge items from a page that has a `Halal Merkmale` heading. This aids debugging without adding complexity. |

### LOW-002 (Process): Missing planner chatmode file

| Field | Value |
|---|---|
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue** | `.github/chatmodes/planner.chatmode.md` does not exist. Per Critic instructions this should be read at review start. |
| **Impact** | None — no planner-specific constraints were missed. |
| **Recommendation** | No action required for this plan. |

---

## Unresolved Open Questions

None found. The plan contains no items marked `OPEN QUESTION`.

---

## Decision Record Assessment

All decisions are `[RESOLVED]` except one `[DEFERRED]` item (manual override/denylist tooling), which is correctly gated by "Product/Operations + needs explicit moderation-policy approval + follow-up plan/version." This deferral is appropriate — it's a policy question, not a technical one.

---

## Duration Estimates Assessment

Present and reasonable. Implementation bumped to 2–3h to account for backfill mode. QA at 1–1.5h is appropriate for the added backfill test surface. Uncertainty drivers are well-identified.

---

## Hotfix Risk Assessment

**"How will this plan result in a hotfix after deployment?"**

The primary hotfix vector would be false positives — the new badge parser incorrectly matching `Kein Alkoholverkauf` as a positive signal, causing wrongful rejections of non-alcohol providers. This is explicitly addressed by:

- Decision Record: exact label handling, not substring matching.
- Milestone 5: regression test for `Kein Alkoholverkauf` as non-rejection.
- Risk section: false-positive substring matching called out.

The backfill is a one-time operator command with dry-run by default, so operator review precedes any writes. This significantly reduces hotfix risk compared to an automated process.

**Residual risk**: Low. The testing strategy and dry-run-first semantics provide adequate protection.

---

## Questions

1. **For the plan author**: Can you confirm that `social_website` reliably stores the full JoinHalal listing URL for all ~900 imported providers? If any rows have `NULL` or a non-JoinHalal URL in that column, the backfill would need a fallback strategy.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Quality |
|---|---|---|---|
| HTML structure drift | Medium | Medium | Good (semantic anchoring) |
| False positives (substring) | Low | High | Strong (exact label + regression tests) |
| Backfill touches reviewed rows | Low | High | Strong (hard `pending`-only guard) |
| Backfill page fetch failures | Medium | Low | Good (skip + log + continue) |
| Rate limiting | Medium | Low | Adequate (delay mentioned, not specified) |
| URL reconstruction failure | Low | Medium | Mitigated once MEDIUM-002 is addressed |

---

## Recommendations

1. Address MEDIUM-001 and MEDIUM-002 with brief clarifications in the plan before handing off to the implementer. These are one-liner fixes, not scope changes.
2. Consider LOW-001 (zero-badge logging) as a nice-to-have for the implementer, not a gate.
3. No other changes needed — the plan is well-structured and ready for implementation after the MEDIUM findings are addressed.

---

## Revision History

| Revision | Date | Findings Addressed | New Findings | Status |
|---|---|---|---|---|
| Initial | 2026-03-24T07:18Z | — | MEDIUM-001, MEDIUM-002, LOW-001, LOW-002 | OPEN |
| Rev 1 | 2026-03-24T07:30Z | MEDIUM-001, MEDIUM-002 | — | RESOLVED — plan updated with service_role + social_website clarifications |
| Rev 2 | 2026-03-24T09:30Z | — | LOW-001, LOW-002 remain open and non-blocking at Stage 1 | OPEN |
