---
ID: 31
Origin: 31
UUID: 5f2c9d8a
Status: Resolved
---

# Process Improvement Analysis 031 — From Retrospective 031 (Orchestrator Dynamic Skill Selection)

## Changelog

| Date       | Action           | Summary                                                                                                                              |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-01 | Analysis created | Extracted 7 recommendations from Retro 031 and validated against current agent instructions (NO-MEMORY MODE: Flowbaby daemon locked) |
| 2026-03-01 | Updates applied  | Applied user-approved Wave A (R1/R2/R3/R5). See `agent-output/process-improvement/closed/031-agent-instruction-updates.md`           |
| 2026-03-01 | Drift repair     | Re-synced root agent instruction files to match export mirrors for Wave A; fixed `.next-id` drift to prevent ID collisions           |

## Executive Summary

- **Source retrospective**: `agent-output/retrospectives/closed/031-orchestrator-dynamic-skills-retrospective.md`
- **Recommendations extracted**: 7 (2 HIGH, 3 MEDIUM, 2 LOW)
- **Overall risk**: **LOW–MEDIUM**
  - LOW: additive instruction clarifications
  - MEDIUM: new “deferred UAT follow-up” tracking adds workflow friction but reduces silent risk
- **Recommendation**: Implement in 2 waves:
  - **Wave A (recommended now)**: R1, R2, R3, R5 (systemic, low-risk)
  - **Wave B (optional follow-up)**: R4 (tracking mechanism) + R6/R7 (format clarity)

**Memory mode**: NO-MEMORY MODE — `flowbabyRetrieveMemory` failed due to daemon lock (another VS Code window).

---

## Changelog Pattern Analysis

### Documents reviewed

- Retrospective: `agent-output/retrospectives/closed/031-orchestrator-dynamic-skills-retrospective.md`
- Plan chain (for context only):
  - `agent-output/analysis/closed/031-orchestrator-dynamic-skills-analysis.md`
  - `agent-output/planning/closed/031-orchestrator-dynamic-skills-plan.md`
  - `agent-output/code-review/closed/031-orchestrator-dynamic-skills-code-review.md`
  - `agent-output/uat/closed/031-orchestrator-dynamic-skills-uat.md`
  - `agent-output/deployment/031-stage1-commit-workflow-only.md`
- Current agent instructions (affected):
  - `.github/agents/orchestrator.agent.md`
  - `.github/agents/code-reviewer.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/uat.agent.md`
  - `.github/agents/devops.agent.md`
  - `.github/agents/roadmap.agent.md` (for feasibility/constraints only)
  - Export mirrors (keep in sync): `exports/generic-workflow/.github/agents/*`

### Observed handoff / delay patterns

| Pattern                                                    |           Frequency | Root cause                                                          | Impact                                               | Recommendation                                                    |
| ---------------------------------------------------------- | ------------------: | ------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| Flowbaby daemon lock persists entire cycle                 | High (this session) | Multi-window VS Code daemon ownership                               | Forced artifact-only context; no durable memory      | R1: mandatory memory health-check + early NO-MEMORY MODE          |
| DEFERRED interactive validations become “forever deferred” |              Medium | No lifecycle hook or tracking artifact                              | Residual risk not closed; operator forgets           | R4: add a follow-up mechanism and DevOps→Roadmap propagation      |
| Cross-workspace path assumptions shipped silently          |              Medium | No review checklist item for path resolution across workspace roots | Runtime behavior surprises (“always same skills”)    | R2: Code Review checklist for cross-root/path references          |
| Operational guidance exists but is “RECOMMENDED”           |              Medium | Optional guidance gets skipped under time pressure                  | Repeated avoidable failures (commit message quoting) | R5: standardize commit message method (MANDATORY when multi-line) |
| Evidence format ambiguity survives review                  |                 Low | Example formatting not canonical                                    | Confuses readers; undermines evidence value          | R6/R7: specify one canonical format + score range guidance        |

### Efficiency metrics

| Metric           | Observation                                                |
| ---------------- | ---------------------------------------------------------- |
| Rework loops     | Near-zero (no re-run of phases)                            |
| Blockers         | One systemic blocker (Flowbaby lock)                       |
| Scope creep      | None (single-file orchestrator change; deferred stub idea) |
| Release friction | Small (shell quoting during commit message)                |

---

## Recommendation Analysis

### R1 (HIGH) — Add a Memory Health Check at session start

- **Source (retro)**: “Flowbaby daemon conflict pattern must be detected at session start… announce NO-MEMORY MODE immediately.”
- **Current state**:
  - Many agent specs include “If tools fail, announce no-memory mode immediately”, but typically only after the first failed attempt.
  - Example: `.github/agents/orchestrator.agent.md` instructs retrieval, and later has a generic failure note; it does not explicitly require an early health-check step.
- **Proposed change (additive, minimal)**:
  - Add a consistent **“Memory health check (MANDATORY)”** step near the top of each agent workflow:
    - Run one retrieval query immediately.
    - If tool errors, declare NO-MEMORY MODE and switch to artifact-first practices.
- **Alignment**: Strengthens `memory-contract` behavior (“Fail loudly”).
- **Affected agents/files (Wave A)**:
  - Minimal viable: `.github/agents/orchestrator.agent.md`, `.github/agents/pi.agent.md`, `.github/agents/retrospective.agent.md` + export mirrors
  - Full rollout (later): all `.github/agents/*.agent.md` + export mirrors

**Implementation template** (insert near the top under “Process” / “Self-check on start”):

```md
**Memory health check (MANDATORY)**:

- Run `flowbabyRetrieveMemory` once at the start (1 short query).
- If it errors (e.g., daemon lock), immediately write: "NO-MEMORY MODE" and proceed artifact-first.
- Do not wait until mid-task to discover memory is unavailable.
```

- **Risk**: LOW (behavioral clarity)

---

### R2 (HIGH) — Add cross-workspace path audit to Code Reviewer

- **Source (retro)**: “Agent spec cross-workspace path audit is missing… would have caught `skills/data/catalog.json` assumption.”
- **Current state**:
  - Code Reviewer has a `Path Refactor / File-Move Checklist`, but it targets moved/renamed files and stale references in scripts/docs.
  - It does not cover **agent spec path assumptions** (multi-root workspaces, external catalogs, `.agent` root).
- **Proposed change (additive)**:
  - Add a new checklist item:
    - When `.github/agents/*.agent.md` is modified OR when specs mention file paths, verify paths resolve in the expected workspace(s).
    - Require explicit fallback behavior in spec when external paths may not exist.
- **Alignment**: Improves correctness and reduces “silent failure” class.
- **Affected files**:
  - `.github/agents/code-reviewer.agent.md`
  - `exports/generic-workflow/.github/agents/code-reviewer.agent.md`

**Implementation template** (add under Core Responsibilities near 6b):

```md
6c. **Agent Spec / Cross-Workspace Path Checklist (MANDATORY when applicable)**:

- If any modified file is `.github/agents/*.agent.md` OR the change references file paths (catalogs, skills, env templates):
  - Verify each referenced path exists in the intended workspace root(s).
  - If the path is cross-root (e.g., `.agent/...`), verify the spec includes a fallback when the other root is not open.
  - Record what you checked (paths + method) in the Code Review doc.
```

- **Risk**: LOW (review time increases slightly)

---

### R3 (MEDIUM) — Formalize QA strategy for workflow-only / instruction-only changes

- **Source (retro)**: “QA adapted correctly, but ad-hoc; needs a formalized template for instruction-only changes.”
- **Current state**:
  - QA already has a strong CSS/layout-only exception template.
  - There is no explicit QA path for “agent spec changes” or “workflow-only docs changes”.
- **Proposed change (additive)**:
  - Add a section: **Workflow-only / agent instruction changes**.
  - Define minimum QA evidence:
    - verify doc-lifecycle + status updates
    - verify exports mirror updates when `.github/agents/*` are changed
    - verify any referenced paths exist / have fallbacks
    - run automated gates only when the plan includes runtime changes; otherwise document “not applicable”.
- **Affected files**:
  - `.github/agents/qa.agent.md`
  - `exports/generic-workflow/.github/agents/qa.agent.md`

**Implementation template** (add near other “WHEN APPLICABLE” checklists):

```md
### Workflow-Only / Agent Instruction Changes (WHEN APPLICABLE)

If the plan is workflow-only (agent specs, docs in `agent-output/`, no runtime code changes), QA SHOULD:

- Treat this as a **document/spec QA** rather than writing unit tests.
- Minimum checks:
  - Validate the changed spec is internally consistent (examples match rules).
  - Validate any referenced paths/tools exist or the spec provides a clear fallback.
  - If `.github/agents/*` changed: confirm `exports/generic-workflow/.github/agents/*` mirrors are updated.
  - Confirm plan/implementation/QA docs’ Status fields are correct for the phase.
- If interactive validation is required but not automatable, record it explicitly as `DEFERRED` with owner + deadline window.
```

- **Risk**: MEDIUM (could be misused to skip tests on real code changes; mitigated by “workflow-only” condition)

---

### R4 (MEDIUM) — Add a tracking mechanism for DEFERRED UAT items

- **Source (retro)**: “No mechanism to close deferred interactive UAT items.”
- **Current state**:
  - UAT requires deferred scenarios to include owner/rationale/severity/fallback path.
  - There is no downstream system that ensures a deferred validation is later completed.
- **Proposed change**:
  - Add a simple “deferred follow-up” handoff rule:
    - If any scenario is DEFERRED, UAT MUST include a “Deferred Items” list in the handoff to DevOps.
    - DevOps Stage 2D MUST pass those deferred items to Roadmap as “Known outstanding validations” in the release tracker notes.
  - This respects Roadmap constraints: UAT/DevOps do not edit the roadmap directly; they provide the handoff payload.
- **Affected files**:
  - `.github/agents/uat.agent.md` + export mirror
  - `.github/agents/devops.agent.md` + export mirror (Stage 2D wording)
  - (Optional) `.github/agents/roadmap.agent.md`: add a note that deferred validation items belong in release status notes

**Implementation template (UAT)** — add under deferral rules:

```md
If ANY scenario is `DEFERRED`:

- Add a **Deferred Items** list to the DevOps handoff:
  - Scenario name
  - Owner
  - Deadline window
  - Fallback execution path
- Explicitly label: "Release approved with deferred validations" (residual risk).
```

**Implementation template (DevOps)** — add to Stage 2D Roadmap handoff payload:

```md
Include any UAT `DEFERRED` validation items as "Outstanding validations" in the Roadmap handoff payload (owner + deadline window).
```

- **Risk**: MEDIUM (adds coordination overhead; improves risk closure)

---

### R5 (MEDIUM) — Standardize DevOps multi-line commit messages (avoid heredocs)

- **Source (retro)**: “DevOps shell commit message approach failed multiple times… standardize.”
- **Current state**:
  - DevOps already recommends `git commit -F <path>` and avoiding `git commit -m` for multi-line messages.
  - This guidance is marked **RECOMMENDED**, which is easy to ignore under time pressure.
- **Proposed change (tighten)**:
  - Promote guidance to **MANDATORY when the commit message is multi-line**.
  - Provide a single canonical approach that avoids heredocs entirely:
    - use `create_file` tool to write the commit message file
    - use `git commit -F <file>`
    - optionally delete the temp file
- **Affected files**:
  - `.github/agents/devops.agent.md` + export mirror

**Implementation template** (replace the “Commit message reliability note (RECOMMENDED)” block):

```md
**Commit message reliability (MANDATORY when multi-line)**:

- Use the editor tools to create a temporary commit message file, then run `git commit -F <path>`.
- Do NOT use heredocs or multi-paragraph `git commit -m ...` (shell quoting is fragile).
```

- **Risk**: LOW–MEDIUM (slightly slower; much more reliable)

---

### R6 (LOW) — Resolve Workflow Card evidence format ambiguity (Catalog score placement)

- **Source (retro)**: Code Review MEDIUM finding remained open: `Catalog: {skill} (score: N)` vs `Load skill...` ambiguity.
- **Current state**:
  - Orchestrator contains an example where the `Catalog:` line includes `(score: N)`.
  - Orchestrator also mandates `Load skill '{name}' from '{path}' — {reason}` directives.
  - Readers may not know where the score belongs if they deviate from the example.
- **Proposed change**:
  - Pick one canonical convention and state it explicitly.

**Suggested convention (minimal change)**:

- `Catalog:` line contains the skill names and their scores.
- `Load skill ...` line contains path + reason (no score).

**Implementation template (Orchestrator)**:

```md
**Canonical scoring convention**:

- Put scores on the `Catalog:` line only.
- Do not add scores to `Load skill ...` lines.
```

- **Risk**: LOW

---

### R7 (LOW) — Add score range guidance to Orchestrator verification section

- **Source (retro)**: Code Review LOW finding: verification section mentions scores but doesn’t define typical range.
- **Current state**:
  - Orchestrator scoring rules: exact trigger +10, partial +3, UFlow stack bonus +15.
  - There is no “what good looks like” guidance.
- **Proposed change (additive)**:
  - Add a short note:
    - rough typical values (e.g., 18–30 for strong matches given +15 stack bonus + at least one exact match)
    - remind that higher is possible when multiple triggers match.
- **Affected files**:
  - `.github/agents/orchestrator.agent.md` + export mirror
- **Risk**: LOW

---

## Conflict Analysis

| Recommendation                  | Conflicting / overlapping instruction                             | Nature of conflict                                           | Proposed resolution                                                                    | Resolved?       |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------- |
| R1 (Memory health check)        | Many agents: “If tools fail, announce no-memory mode immediately” | Overlap; lacks “start-of-session” trigger                    | Add a 1-step health check early; keep existing failure note                            | ✅ (refinement) |
| R2 (Cross-workspace path audit) | Existing 6b checklist focuses on file moves                       | Coverage gap, not contradiction                              | Add 6c checklist; only triggers when agent specs/path refs change                      | ✅              |
| R3 (Workflow-only QA)           | QA enforces TDD strongly                                          | Potential misinterpretation: “workflow-only” could be abused | Explicit condition: only when no runtime code changed; otherwise normal QA rules apply | ✅              |
| R4 (Deferred UAT tracking)      | Roadmap agent is only owner of roadmap file                       | Ownership boundary                                           | UAT/DevOps provide handoff payload; Roadmap agent updates tracker                      | ✅              |
| R5 (Commit message standard)    | DevOps already “RECOMMENDS” `-F`                                  | Tightening may add friction                                  | Make mandatory only when multi-line; keep single-line `-m` fine                        | ✅              |
| R6/R7 (Orchestrator format)     | Existing examples already include score                           | Clarification only                                           | Choose canonical convention and update example accordingly                             | ✅              |

---

## Logical Challenges

1. **How to detect Flowbaby daemon lock deterministically?**
   - Clarification: There is no separate “health check” tool; the check is a single retrieval attempt.
   - Proposed solution: standardize on one short retrieval query at session start; if it errors, declare NO-MEMORY MODE.

2. **How to track deferred validations without adding a new system?**
   - Constraint: avoid inventing a full ticketing system.
   - Proposed solution: use existing artifact flow: UAT → DevOps → Roadmap handoff payload. Roadmap records outstanding validations as release notes/status notes.

3. **Preventing “workflow-only” QA from skipping real tests**
   - Proposed solution: define “workflow-only” narrowly: no runtime code changes; if any code touched, apply normal QA gates.

---

## Risk Assessment

| Rec | Risk       | Rationale                              | Mitigation                                                             |
| --- | ---------- | -------------------------------------- | ---------------------------------------------------------------------- |
| R1  | LOW        | Adds an early check + clearer behavior | Keep it 1 retrieval attempt; do not block work                         |
| R2  | LOW        | Adds a targeted checklist              | Limit trigger to agent specs / path-referencing changes                |
| R3  | MEDIUM     | Could be misapplied to code changes    | Define “workflow-only” precisely; require explicit statement in QA doc |
| R4  | MEDIUM     | Adds coordination overhead             | Only trigger when DEFERRED exists; keep payload minimal                |
| R5  | LOW–MEDIUM | Slightly slower commit flow            | Conditional (multi-line only)                                          |
| R6  | LOW        | Documentation clarity                  | None                                                                   |
| R7  | LOW        | Documentation clarity                  | None                                                                   |

---

## Implementation Recommendations (Priority)

### High-Impact, Low-Risk (implement first)

- R1 — Memory health check (start with Orchestrator + PI + Retrospective agents; expand later)
- R2 — Code Reviewer cross-workspace path checklist
- R5 — DevOps multi-line commit message standard (make mandatory when multi-line)

### Medium-Impact or Medium-Risk

- R3 — QA workflow-only / instruction-only strategy template
- R4 — Deferred UAT tracking mechanism via handoff payload + roadmap notes

### Low-Impact or High-Risk (defer)

- R6/R7 — Orchestrator format/score guidance (small but not urgent)

---

## Suggested Agent Instruction Updates

### Files to update (source of truth + export mirror)

- `.github/agents/orchestrator.agent.md`
- `.github/agents/pi.agent.md`
- `.github/agents/retrospective.agent.md`
- `.github/agents/code-reviewer.agent.md`
- `.github/agents/qa.agent.md`
- `.github/agents/uat.agent.md`
- `.github/agents/devops.agent.md`

And keep in sync:

- `exports/generic-workflow/.github/agents/orchestrator.agent.md`
- `exports/generic-workflow/.github/agents/pi.agent.md`
- `exports/generic-workflow/.github/agents/retrospective.agent.md`
- `exports/generic-workflow/.github/agents/code-reviewer.agent.md`
- `exports/generic-workflow/.github/agents/qa.agent.md`
- `exports/generic-workflow/.github/agents/uat.agent.md`
- `exports/generic-workflow/.github/agents/devops.agent.md`

### Implementation approach options

- Option A: apply Wave A now (R1/R2/R3/R5) and revisit Wave B after one more cycle
- Option B: apply all 7 in one batch (bigger diff, but fastest to converge)

### Validation plan

- Search for inserted headings/phrases in both `.github/agents/` and `exports/generic-workflow/.github/agents/` to ensure mirrors updated.
- Ensure no agent constraints are violated (e.g., Roadmap remains the only editor of `agent-output/roadmap/product-roadmap.md`).

---

## User Decision Required

Choose one:

1. **Update now (recommended)**: Apply Wave A patches immediately.
2. **Review first**: I’ll prepare exact diffs for each file, then you approve.
3. **Phased rollout**: Apply R2/R5 first, then R1/R3, then R4/R6/R7 later.
4. **Defer**: Keep learnings in Retro 031 only; no instruction edits.

---

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/031-orchestrator-dynamic-skills-retrospective.md`
- Plan: `agent-output/planning/closed/031-orchestrator-dynamic-skills-plan.md`
- Orchestrator spec: `.github/agents/orchestrator.agent.md`
- Code reviewer spec: `.github/agents/code-reviewer.agent.md`
- QA spec: `.github/agents/qa.agent.md`
- UAT spec: `.github/agents/uat.agent.md`
- DevOps spec: `.github/agents/devops.agent.md`
- Roadmap spec (constraints reference): `.github/agents/roadmap.agent.md`
