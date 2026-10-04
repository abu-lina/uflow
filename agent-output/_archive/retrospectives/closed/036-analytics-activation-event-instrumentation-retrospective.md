---
ID: 036
Origin: 036
UUID: c2f1a9d4
Status: Processed
---

# Retrospective 036: Analytics Activation & Event Instrumentation (v0.7.1)

**Plan Reference**: `agent-output/planning/closed/036-analytics-activation-event-instrumentation-v0.7.1.md`  
**Date**: 2026-03-08T10:30Z  
**Retrospective Facilitator**: retrospective  
**Focus**: Repeatable process improvements over one-off technical details

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-08T10:30Z | retrospective | Created retrospective for Plan 036 after Stage 2 release |
| 2026-03-08 | pi | Marked Processed after process improvement analysis created |

---

## Summary

**Value Statement**: "Activate privacy-respecting analytics and instrument the north-star activation events, so that we can measure acquisition/activation and iterate confidently without adding user friction."  
**Value Delivered**: YES (code-level). M3 (dashboard validation) deferred — requires Plausible CE deployment by DevOps.  
**Implementation Duration**: ~10 hours 20 minutes (2026-03-08T00:00Z → 2026-03-08T10:20Z, single calendar day in session context)  
**Overall Assessment**: Highly efficient iteration. Clean scope, exemplary TDD, zero rework needed. Two process incidents (tool invocation and dev-artifact interference) are addressable via agent instruction updates.  
**Focus**: Emphasizes repeatable process improvements over one-off technical details.

---

## Timeline Analysis

| Phase | Planned Duration | Actual Duration | Variance | Notes |
|---|---|---|---|---|
| Planning + Critique | 1–2 hours | ~2 hours (00:00→08:10Z) | Neutral | One Critic re-pass needed for L-1 clarification |
| Architecture | 30 min | ~15 min | Positive | Arch findings confirmed existing ADR-006; no new decisions needed |
| Implementation | 2–3 hours | ~20 min (estimated) | Positive | Scope was tight; pre-existing `trackEvent()` wrapper did the heavy lifting |
| Code Review | 30–60 min | ~25 min (08:10→08:35Z) | Neutral | Single LOW finding; efficient review |
| QA | 30–60 min | ~70 min (08:35→09:45Z) | Slightly slower | Tool invocation incidents added friction |
| UAT | 30 min | ~15 min (09:45→10:00Z) | Positive | Pre-deploy validation with clear deferred criteria |
| DevOps Stages 1+2 | 30–45 min | ~20 min (10:00→10:20Z) | Positive | Smooth; one dev-artifact issue caught and fixed |
| **Total** | 5–7 hours | ~10.5 hours elapsed (includes gaps) | Active work ~3–4 hours | Single-session iteration |

---

## What Went Well (Process Focus)

### Workflow and Communication

- **Tight scope → fast execution**: The plan had a clear "minimum scope" — two event wires, one Docker Compose, one ADR. This prevented scope creep at every phase and let agents focus on implementation quality rather than scope negotiation.
- **Deliberate non-goals list**: Explicitly excluding the legacy `src/components/providers/` refactor prevented the implementer from being tempted to "fix it while here." The non-goals list in the plan directly protected timeline and focus.
- **Critique resolved in-session**: The single L-1 finding (email `contact_type` omission) was raised and resolved within the same session by the planner adding a documentation note. No phase blocking.

### Agent Collaboration Patterns

- **Planner → Critic re-approval required when scope changes**: The pattern where the planner updates the plan and gets re-approved by Critic before implementation proceeds was followed correctly. This ensures the implementation (and all downstream phases) work from an approved scope.
- **Code Reviewer didn't block on optional comments**: The single LOW finding (inline comments) was correctly flagged as non-blocking. The verdict was APPROVED WITH COMMENTS, not CONDITIONALLY APPROVED. This keeps the review actionable without slowing the pipeline.
- **DevOps caught workspace hygiene issues proactively**: The dev-artifact interference (`public/fallback-development.js`) was caught during git status review before commit, not after. This prevented a silent file deletion regression from being released.

### Quality Gates

- **9/9 TDD tests all RED→GREEN**: Exemplary TDD discipline. Tests written first, failure confirmed, then implementation. This gave the QA phase high confidence and kept the "testing" portion of QA to a confirmation rather than discovery.
- **All three QA gates passed first time**: type-check, vitest (198/198), and build all returned EXIT:0 without iteration. Zero rework loops in QA.
- **Architecture findings confirmed "no new decisions needed"**: The architect reduced uncertainty early by confirming ADR-006 already covered the plan's requirements. This let the implementer proceed with confidence.

---

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

**W1 — MCP Atlassian tool invoked twice despite being unconfigured**
- **Description**: The agent invoked `mcp_atlassian_atl_search` and `mcp_com_atlassian_search` during QA and again later. Both returned 401 Unauthorized. User had to explicitly request the behavior be stopped — twice.
- **Impact**: Added friction and noise. Required user intervention instead of silent failure handling. Second occurrence shows the first instruction was not persisted across phases.
- **Root cause**: Tool was available in the VS Code MCP environment but is not configured for this workspace. No workspace-level restrict list existed for unconfigured tools.
- **Fix**: (1) Add to `.github/agents/` instructions: "Never invoke Atlassian MCP tools (`mcp_atlassian_atl_search`, `mcp_com_atlassian_search`) — not configured for this project." (2) The preference has now been saved to `/memories/uflow-tool-restrictions.md` for persistence.

**W2 — Dev server PWA artifact interfered with git staging**
- **Description**: `npm run dev` was running during DevOps Phase. This caused Next.js PWA to (a) delete production fallback file `public/fallback-ce627215c0e4a9af.js` and (b) create `public/fallback-development.js`. Both appeared in `git status`. If DevOps had staged `git add -A`, the production fallback deletion would have been committed.
- **Impact**: Near-miss silent regression. Required: restore production file + add dev artifact to .gitignore.
- **Root cause**: `.gitignore` did not exclude development PWA fallback artifacts. The name pattern `fallback-development.js` was not previously seen.
- **Fix**: (1) Added `**/public/fallback-development.js` to `.gitignore` in this release. (2) Add a note to `devops.agent.md` Stage 1 checklist: "Review `git status` for unexpected PWA fallback file changes if dev server is running — restore from git if deleted."

### Agent Collaboration Gaps

**G1 — Memory tool unavailability went unreported**
- **Description**: During QA and UAT phases, `flowbaby_storeMemory` and `flowbaby_retrieveMemory` were intermittently unavailable (tool disabled). The agent silently fell back to a direct SQLite query rather than explicitly declaring **NO-MEMORY MODE** at the start.
- **Impact**: Per the memory contract, no-memory mode must be declared when tools fail. Proceeding without declaration makes the context gap invisible to reviewers of the session artifacts.
- **Root cause**: Agent did not check tool availability at session start and announce status; used fallback silently.
- **Fix**: At session start (or on first retrieval failure), explicitly state: "⚠️ NO-MEMORY MODE: flowbaby tools unavailable — proceeding artifact-first." Add this check to memory-contract compliance pattern in agent instructions.

**G2 — Implementation doc frontmatter not normalized at creation**
- **Description**: The implementation doc was created with `Origin: Planner` and `UUID: plan-036-analytics-activation-event-instrumentation` — non-standard values inconsistent with the plan's `Origin: 036` and `UUID: c2f1a9d4`. This was caught and corrected during DevOps lifecycle closure.
- **Impact**: Required extra work during DevOps. Would be harder to catch on larger releases with many docs.
- **Root cause**: Implementer agent did not inherit the plan's exact frontmatter values when creating the implementation doc.
- **Fix**: Add to `implementer.agent.md`: "Copy ID, Origin, and UUID from the plan document verbatim when creating implementation doc header."

**G3 — Code review doc frontmatter not normalized**
- **Description**: The code review doc was not normalized in DevOps (it retains `Origin: Planner` and a long UUID). Unlike the implementation doc, this was not caught during lifecycle closure.
- **Impact**: Inconsistent lifecycle metadata across the 036 chain.
- **Root cause**: Only the implementation doc was explicitly normalized — code review wasn't included in the normalization sweep.
- **Fix**: Add to `devops.agent.md` Stage 1 pre-commit checklist: "Verify all lifecycle docs in this chain (planning, implementation, code-review, qa, uat) share the same ID, Origin, UUID. Normalize any that don't match the plan's frontmatter."

### Quality Gate Failures

**None** — all required gates passed first time. No failures to report.

### Misalignment Patterns

**M1 — M3 validation may be forgotten post-release**
- **Description**: M3 (Plausible dashboard validation) was appropriately deferred to post-deployment. However, the deferral is captured in closed/ docs and a deployment doc. There's no active tracking of the pending M3 task in a visible location.
- **Impact**: Risk that M3 remains uncompleted until the next plan that touches analytics, leaving the measurement loop unclosed.
- **Root cause**: No mechanism exists to surface "deferred post-release tasks" after plan docs are closed.
- **Fix (systemic)**: When a plan has deferred post-deploy validation milestones, DevOps should create a brief open-action note in `agent-output/planning/` (NOT closed/) as a lightweight tracker. This gives the Roadmap agent visibility into pending validations. Document in `devops.agent.md`.

---

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs**: 7 substantive (planner → critic → architect → implementer → code-reviewer → qa → uat → devops)  
**Handoff Chain**: `planner → critic(×2) → architect → implementer → code-reviewer → qa → uat → devops(stage1+2) → retrospective`

| From Agent | To Agent | Artifact | What Requested | Issues Identified |
|---|---|---|---|---|
| planner | critic | plan v1 | Initial critique | L-1: email contact_type omission |
| critic | planner | critique (L-1) | Clarify or resolve L-1 | Scope gap vs Plan 035 baseline |
| planner | critic | plan v2 | Re-approval after L-1 fix | None — approved |
| planner | architect | plan | Architecture review | None new — ADR-006 confirmed sufficient |
| planner | implementer | plan + arch | Implement M1–M5 | None |
| implementer | code-reviewer | implementation | Code review | 1 LOW (optional inline comments) |
| code-reviewer | qa | implementation | QA gates | Tool invocation incidents during QA |
| qa | uat | QA report | UAT value validation | None — approved for release |
| uat | devops | UAT report | Stage 1 commit | Dev artifact PWA interference; frontmatter mismatch fixed |
| devops | retrospective | deployment doc | Retrospective | MCP tool restriction request |

**Handoff Quality Assessment**:
- Were handoffs clear and complete? **Yes** — each phase had a clear artifact output and explicit status update
- Was context preserved across handoffs? **Mostly** — memory tool gaps meant some context was retrieved via SQLite fallback rather than structured memory
- Were unnecessary handoffs made? **No** — the Critic 2-pass was required (scope clarification is a valid reason for re-approval)

### Issues and Blockers Documented

**Total Issues Tracked**: 3 substantive

| Issue | Artifact | Resolution | Escalated? | Time to Resolve |
|---|---|---|---|---|
| L-1: email contact_type omission | critique | Planner added documentation note; accepted as intentional | No | ~10 min |
| MCP Atlassian tool invocation | QA phase, DevOps phase | User requested stop; saved to persistent memory | User raised | Recurring (2×) |
| Dev-artifact PWA interference | DevOps staging review | Production fallback restored; .gitignore updated | No | ~5 min |

**Issue Pattern Analysis**:
- Most common issue type: **environmental/tooling** (MCP tool, dev server artifact) — not code quality
- Were issues escalated appropriately? One was user-escalated (MCP); one was self-diagnosed (PWA). Both appropriate.
- Did early issues predict later problems? The first MCP invocation predicted the second — pattern of implicit tool availability assumptions.

---

## Lessons Learned

### Successes

1. **Pre-existing `trackEvent()` wrapper enabled sub-hour implementation**: The measurement foundation (Plan 035) was well-designed — Plan 036 needed only to call it. This confirms the value of "build the foundation cleanly first, activate second" as a release strategy.

2. **TDD exemplary discipline produced zero-rework QA**: Writing tests first (9 tests), confirming RED, then implementing meant QA was confirmation not discovery. This is the target pattern for all instrumentation work.

3. **Tight non-goals list prevented scope creep**: Explicitly stating "do not refactor legacy placement" saved estimated 2–4 hours of out-of-scope work. The constraint was respected at every phase.

4. **Architecture review as "confirmation not blocker"**: When the architect confirms existing ADRs cover the work, the review naturally moves fast. ADR-006 was written in advance (in Plan 035 scope) which meant Plan 036 architecture review was a 15-minute confirmation pass.

### Failures / Lessons

1. **Tooling environment not validated at session start**: MCP tool availability, memory tool availability, and dev server state should be part of a "session start checklist" for DevOps. Catching these assumptions early prevents mid-phase surprises.

2. **Frontmatter inheritance is fragile**: Two agents (implementer, code-reviewer) created docs with non-standard frontmatter. This suggests the format instructions are present but not consistently applied. Making the check part of the DevOps Stage 1 pre-commit checklist creates a reliable catching net.

3. **Deferred milestones need active tracking**: M3 is a real measurement task that should appear somewhere visible after the plan closes. Closed docs are not visible to the daily workflow.

---

## Recommended Process Improvements

### P1 — Restrict unconfigured MCP tools in agent instructions (HIGH)

**Agent**: All agents (or `copilot-instructions.md`)  
**Change**: Add explicit "never use" list for tools not configured in this workspace. Specifically: `mcp_atlassian_atl_search`, `mcp_com_atlassian_search` and any Atlassian variant.  
**Rationale**: User had to intervene twice. A written constraint prevents recurrence without user action.  
**Owner**: PI agent

### P2 — Devops.agent.md: Add PWA artifact check to Stage 1 checklist (MEDIUM)

**Agent**: `devops.agent.md`  
**Change**: In Stage 1 pre-commit checklist, add: "If `npm run dev` was running, inspect `git status` for unexpected PWA fallback changes: (a) restore any deleted production fallback files from git; (b) add dev fallback patterns to `.gitignore` if not already present (`**/public/fallback-development.js`)."  
**Rationale**: This was a near-miss silent regression. The fix is now in `.gitignore` but the checklist prevents future variants.  
**Owner**: PI agent

### P3 — Implementer/code-reviewer frontmatter inheritance (MEDIUM)

**Agent**: `implementer.agent.md` and `code-reviewer.agent.md`  
**Change**: Add explicit instruction: "When creating implementation/review doc, copy `ID`, `Origin`, and `UUID` exactly from the plan document. Do not generate a new UUID or use 'Planner' as Origin."  
**Rationale**: Prevents lifecycle normalization debt accumulating across multiple plans.  
**Owner**: PI agent

### P4 — DevOps Stage 1 checklist: frontmatter consistency sweep (MEDIUM)

**Agent**: `devops.agent.md`  
**Change**: Add pre-commit step: "Verify all lifecycle docs in this chain share identical `ID`, `Origin`, `UUID`. Normalize any mismatches before committing. Document normalizations in the commit message."  
**Rationale**: DevOps already does a lifecycle move — adding a 60-second check prevents downstream confusion.  
**Owner**: PI agent

### P5 — Create open-action tracker for deferred post-deploy milestones (LOW)

**Agent**: `devops.agent.md`  
**Change**: When releasing a plan with deferred post-deploy validation milestones (e.g., M3), create a brief file in `agent-output/planning/` (active, not closed) named `{id}-open-actions.md` listing the deferred items, owners, and severity. This makes them visible to Roadmap sweep and human review.  
**Rationale**: M3 (Plausible dashboard validation) is a real measurement task that needs to be tracked to completion. Closed docs are not visible day-to-day.  
**Owner**: PI agent

### P6 — Declare NO-MEMORY MODE immediately when flowbaby fails (LOW)

**Agent**: All agents (memory-contract enforcement)  
**Change**: On first failed call to `flowbaby_retrieveMemory` or `flowbaby_storeMemory`, immediately output: "⚠️ NO-MEMORY MODE: flowbaby unavailable — proceeding artifact-first." Do not silently fall back.  
**Rationale**: Silent fallback makes the context gap invisible. Session reviewers and future agents deserve to know whether memory was available.  
**Owner**: PI agent

---

## Next Actions

| Action | Owner | Priority |
|---|---|---|
| Apply P1 (MCP restriction) to agent instructions | PI agent | HIGH |
| Apply P2–P4 (DevOps + Implementer + Code Reviewer) | PI agent | MEDIUM |
| Deploy Plausible CE (M3) — `infra/plausible/` | DevOps | MEDIUM |
| Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` + `NEXT_PUBLIC_PLAUSIBLE_HOST` in UAT + prod | DevOps | MEDIUM |
| M3 smoke test: verify events in Plausible dashboard after deployment | QA | MEDIUM |
| Schedule Dependabot sweep (11 pre-existing vulns: 8 high, 3 moderate) | DevOps | LOW |
| Apply P5 (deferred milestone tracker) | PI agent | LOW |
| Apply P6 (NO-MEMORY MODE declaration) | PI agent | LOW |

---

## Closure

**Status**: Active (awaiting PI agent processing)  
**Handing off to**: PI agent (`⑪ ProcessImprovement`)  
**Reason for PI**: 6 actionable process improvement recommendations (P1–P6) across agent instructions and workflow patterns.

---

✅ PHASE COMPLETE: ⑩ Retrospective  
📄 Output: agent-output/retrospectives/036-analytics-activation-event-instrumentation-retrospective.md  
➡️ NEXT: Pick "⑪ ProcessImprovement" from the Orchestrator handoff suggestions (P1–P6 systemic findings)
   Gate: PI agent applies recommendations to .github/agents/ instruction files
