---
ID: 31
Origin: 31
UUID: 5f2c9d8a
Status: Active
---

# Plan 031 — Orchestrator Dynamic Skill Selection (Catalog + Evidence)

## Plan Header

- **Target Release**: N/A (workflow-only change; no product/runtime release version)
- **Epic Alignment**: Developer productivity / workflow correctness
- **Status**: UAT Approved
- **Related Issues**: None

## Release Strategy

Release Strategy: **Standalone** (workflow-only; not bundled into a product release).

## Value Statement and Business Objective

As a **developer/workflow operator**, I want the **Orchestrator to reliably select and instruct dynamic skills from the attached skill catalog**, so that **downstream agents receive task-specific guidance instead of repeatedly relying on the same baseline skill set**.

## Objective

1. Make Orchestrator “Layer 3” (catalog) skill selection **reliably functional** in this multi-root workspace.
2. Ensure the Orchestrator provides **visible evidence** of dynamic selection in each Workflow Card (what catalog it used, what it picked, and why).
3. Reduce ambiguity when the catalog is missing by **failing loudly** (clear warning + fallback behavior).

## Scope

### In Scope

- Updates to Orchestrator workflow instructions so it can:
  - locate the general skill catalog (`catalog.json`) in a multi-root workspace,
  - map catalog entries to real skill docs (e.g., `.agent/skills/skills/.../SKILL.md`),
  - emit explicit `Load skill ... from ...` directives in handoffs.
- Small documentation updates describing how to validate that dynamic skills are being used.

### Out of Scope

- Adding new agents, changing the pipeline, or altering product/runtime behavior.
- Reworking the entire `.agent` skills system or reformatting the catalog.
- Persisting Workflow Cards to `agent-output/` (the spec currently states they live in chat only).

## Key Constraints

- Keep behavior portable: Orchestrator should not assume a single repo root; it must work when `.agent/` is present (multi-root) and degrade gracefully when it’s not.
- Favor KISS/YAGNI: fix catalog discovery + evidence first; avoid adding new infrastructure.

## Assumptions

- The workspace is typically opened as a multi-root workspace containing both `uflow/` and `.agent/` (as in the current setup).
- The general catalog contains stable `skills[].path` fields that point to skill docs under `.agent/skills/`.

## Open Questions

- **OPEN QUESTION [CLOSED]**: When catalog skill `path` points to `.../SKILL.md`, but a skill folder also contains `AGENTS.md`, should Orchestrator load one or both? Decision: **Load SKILL.md only by default** (the catalog `path`). Agents may consult `AGENTS.md` only if deeper execution guidance is needed.
- **OPEN QUESTION [DEFERRED]**: Should we add an *optional* small "local catalog stub" under `uflow/` for single-root usage, or rely entirely on `.agent/` presence + Orchestrator search-based discovery? Deferred: Not needed until single-root workspace usage is common.

## Plan (Milestones)

1. **Catalog discovery + path resolution**
   - Objective: Orchestrator can reliably find the catalog file in this workspace.
   - Work:
     - Update Orchestrator instructions to use an explicit discovery step (prefer tool-based search over hard-coded relative paths).
     - Define clear fallback behavior when catalog is not found (e.g., proceed with Layer 1 only, but print a warning).
   - Acceptance Criteria:
     - For a representative task prompt, Workflow Card shows the resolved catalog location (or an explicit “catalog not found” warning).

2. **Deterministic Layer 3 selection + explicit handoff directives**
   - Objective: Orchestrator consistently emits the chosen catalog skills in a structured way.
   - Work:
     - Require the Workflow Card to list:
       - `UFlow:` skills (Layer 1)
       - `Native:` skills (Layer 2)
       - `Catalog:` top matches (Layer 3) with a short reason
     - Require the handoff prompt to include concrete `Load skill '...' from '...'` lines for Layer 3 selections.
   - Acceptance Criteria:
     - For prompts that clearly match known domains (UI/DB/Auth/Performance), the Workflow Card includes ≥1 catalog skill and at least one `Load skill ...` directive.

3. **Heuristic tuning for common UFlow task types**
   - Objective: Common task classes (DB, auth, UI, performance, testing) yield visibly different catalog skills.
   - Work:
     - Adjust Orchestrator heuristics wording so typical UFlow prompts reliably include relevant catalog matches (without forcing irrelevant skills).
   - Acceptance Criteria:
     - “UI prompt” includes at least one React/Tailwind/front-end best-practices type catalog skill.
     - “DB prompt” includes at least one Postgres best-practices / database design type catalog skill.
     - “Auth prompt” includes at least one auth/security implementation type catalog skill.

4. **Documentation: ‘How to tell dynamic skills are working’**
   - Objective: Make it easy for maintainers to confirm dynamic skills are being used.
   - Work:
     - Add a short guide (or a small section in the Orchestrator doc) describing what to look for in the Workflow Card and what indicates fallback mode.
   - Acceptance Criteria:
     - Maintainers can verify dynamic behavior in under 2 minutes by running 2–3 prompts and visually confirming the Workflow Card fields.

5. **Update Version and Release Artifacts**
   - Objective: Align release metadata with the Roadmap and bundle strategy.
   - Work:
     - Document this as workflow-only; no product version bump.
     - Update `CHANGELOG.md` only if the repo policy requires tracking workflow changes there; otherwise add a short note in the plan’s changelog and/or a workflow-specific changelog.
   - Acceptance Criteria:
     - No product version bump performed; any required workflow change log entry is present.

## Validation (Non-QA)

- Manual verification via Orchestrator runs:
  - Confirm the Workflow Card includes a non-empty `Catalog:` section for domain-specific prompts.
  - Confirm the handoff prompt includes `Load skill ... from ...` lines that point to existing files.

## Risks

- Catalog discovery may still be brittle if multiple catalogs exist or the workspace layout changes.
- Over-eager heuristics could spam irrelevant skills; mitigate by limiting to top 1–3 catalog skills and requiring a one-line justification.

## Duration Estimates

- Analysis: 0.5–1h
- Planning: 0.5h
- Implementation: 1–3h (doc changes + light iteration)
- Verification: 0.5–1h
- UAT: N/A (workflow-only)
- DevOps: 0.5h (versioning + changelog + bundle coordination)

**Uncertainty drivers**: workspace layout variance (single-root vs multi-root), and catalog path/skill-doc conventions (`SKILL.md` vs `AGENTS.md`).

## Changelog

| Date | Agent | Change |
|---|---|---|
| 2026-03-01 | Planner | Created plan from Analysis 031; pending Roadmap release assignment confirmation |
| 2026-03-01 | Planner | Resolved open questions: workflow-only (no version bump); load SKILL.md (catalog path) by default |
| 2026-03-01 | Implementer | Implementation started; milestones 1–4 applied to orchestrator.agent.md; F1 addressed (open question DEFERRED); no product version bump per plan |
| 2026-03-01 | Code Reviewer | Code review complete: APPROVED WITH COMMENTS; 1 MEDIUM + 1 LOW finding documented (non-blocking); all 5 milestones verified |
| 2026-03-01 | QA | QA complete: static spec compliance verified; `.agent` catalog presence verified; type-check/tests/build PASS (manual Orchestrator prompt validation deferred to user) |
| 2026-03-01 | UAT | APPROVED FOR RELEASE: all 3 plan objectives met; static evidence verified; 2 interactive scenarios DEFERRED (LOW severity) with owner + fallback path; no product version bump |
