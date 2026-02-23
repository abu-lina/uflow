---
ID: 010
Origin: 010
UUID: c7d91e2a
Status: Resolved
---

# Process Improvement Analysis 010 — From Retro 010 (Next.js App Router Refactor v0.5.0)

**Source Retrospective**: `agent-output/retrospectives/closed/010-nextjs-app-router-refactor-retrospective.md`
**Related Plan**: `agent-output/planning/closed/010-nextjs-app-router-refactor-v0.5.0.md`
**Date**: 2026-02-23
**Mode**: ProcessImprovement (no source code changes)

## Changelog

| Date | Action | Summary |
| --- | --- | --- |
| 2026-02-23 | Analysis created | Extracted 5 recommendations from Retro 010; validated vs current agent instructions; identified minimal deltas requiring approval |
| 2026-02-23 | Updates implemented | Applied approved instruction updates to DevOps + QA agent instructions |

---

## Executive Summary

- **Recommendations extracted (from Retro 010)**: 5
- **Already aligned in current agent instructions**: 3
  - Planner already requires reading roadmap/architecture before planning and includes a required **Duration Estimates** section.
  - UAT is already explicitly document-based.
  - QA already defaults to delta-lint and includes domain-folder lifecycle self-check.
- **Net-new instruction deltas proposed**: 2 (plus 1 optional clarification)
  1. DevOps: prefer `git commit -F <msgfile>` for complex/multi-line messages (avoid shell quoting failures).
  2. DevOps + QA: always quote file paths in shell commands (App Router segment parentheses can break zsh globbing).
  - Optional: Critic checklist addition to explicitly require caching semantics when plans touch caching/perf.
- **Conflicts found**: 0 hard conflicts; 1 scope-risk item (making “Architecture audit” mandatory could slow small changes)
- **Overall risk**: LOW (instruction-only, additive, and mostly clarifications)

**Recommendation**: Approve the **two net-new deltas** (DevOps commit message file + quoting paths) first; optionally approve the Critic caching-semantics checklist as a second, small change.

---

## Changelog Pattern Analysis

### Documents reviewed

- Retrospective: `agent-output/retrospectives/closed/010-nextjs-app-router-refactor-retrospective.md`
- Plan: `agent-output/planning/closed/010-nextjs-app-router-refactor-v0.5.0.md`
- Critique: `agent-output/critiques/closed/010-nextjs-app-router-refactor-critique.md`
- Implementation: `agent-output/implementation/closed/010-nextjs-app-router-refactor-v0.5.0.md`
- QA: `agent-output/qa/closed/010-nextjs-app-router-refactor-v0.5.0-qa.md`
- UAT: `agent-output/uat/closed/010-nextjs-app-router-refactor-v0.5.0-uat.md`
- Deployment: `agent-output/deployment/v0.5.0.md`

### Handoff patterns observed

| Pattern | Frequency | Root cause | Impact | Recommendation |
| --- | ---:| --- | --- | --- |
| Critique caught planning gaps before implementation | 1 | Critic checklist / PI-004 enforcement | Prevented implementer ambiguity and downstream rework | Keep Critique gate; optionally strengthen caching-semantics check |
| Shell quoting fragility during DevOps commit | 1 | Multi-line commit messages via `git commit -m` | Minor delay, recoverable but recurring risk | Add DevOps guidance: prefer `git commit -F` with a message file |
| zsh globbing failure on App Router segment paths | 1 | Parentheses in `(public)` treated as glob patterns | Minor delay; confusing for contributors | Add QA/DevOps guidance: quote file paths in shell commands |

### Efficiency metrics (from artifacts)

| Metric | Value | Evidence |
| --- | ---:| --- |
| QA automated gates | PASS | QA report (vitest/type-check/lint/build all PASS) |
| UAT outcome | APPROVED FOR RELEASE | UAT report |
| Release outcome | Released | Deployment report |

---

## Recommendation Analysis

Retro 010 lists 5 “Immediate Process Improvements”. Below is each item validated against current instructions, plus the smallest safe delta (if any).

### R1 — Codify “Architecture-first for refactors” in Planner instructions

- **Source**: Retro 010 “Recommendations” #1
- **Current state (already aligned)**:
  - Planner already requires: **“Read roadmap/architecture BEFORE planning.”** (Planner Core Responsibilities #1)
  - Planner already has an Architect handoff configured.
- **Gap**: Planner instructions don’t explicitly say when an architecture doc is required vs when an Architect handoff is sufficient.

**Proposed change**: Optional clarification only (no workflow hardening).

**Implementation template (optional)** — add under Planner Core Responsibilities (near #1/#4):

```markdown
- For refactors/performance/caching boundary changes, you MUST do one of:
  - (A) reference an existing architecture findings/ADR doc in the plan, OR
  - (B) explicitly request Architect review via handoff before Critic.
```

- **Risk**: LOW (optional clarification)

---

### R2 — DevOps: Always use commit message files for programmatic commits

- **Source**: Retro 010 “Recommendations” #2
- **Current state**:
  - DevOps Stage 1 requires local commit with detailed message, but does not specify a robust method.
  - Observed failure mode in Retro 010: `git commit -m` with multi-line quotes can break shell state.

**Proposed change**: Add a preferred pattern (file-based commit messages) to Stage 1.

**Implementation template (copy/paste)** — add to DevOps Stage 1 step 6 (commit locally):

```markdown
**Commit message reliability note (RECOMMENDED)**:

- Prefer creating a temporary commit message file and using `git commit -F <path>` for multi-line messages.
- Avoid `git commit -m` when the message contains multiple paragraphs or quotes (shell quoting is fragile).
```

- **Affected agents**: DevOps
- **Risk**: LOW (guidance only; doesn’t change gates)

---

### R3 — QA/DevOps: Always quote file paths in shell commands

- **Source**: Retro 010 “Recommendations” #3
- **Current state**:
  - QA has strong delta-lint guidance, but does not explicitly warn about zsh globbing with App Router route group parentheses.
  - DevOps likewise lacks this guardrail.

**Proposed change**: Add a small shell-safety note.

**Implementation template (copy/paste)**

1) QA — add under “Lint guidance” or near “run commands” sections:

```markdown
**Shell safety (MANDATORY)**: Quote file paths in commands.

- Always quote file paths passed to shell commands (especially paths containing parentheses like `src/app/(public)/...`).
- Reason: zsh treats parentheses as glob patterns and may error with `zsh: no matches found`.
```

2) DevOps — add near Stage 1/Stage 2 command sections:

```markdown
**Shell safety (MANDATORY)**: Quote file paths in commands, especially App Router route group paths like `src/app/(public)/...`.
```

- **Affected agents**: QA, DevOps
- **Risk**: LOW

---

### R4 — UAT: Add explicit “Document-based UAT” decision criteria

- **Source**: Retro 010 “Recommendations” #4
- **Current state (already aligned)**:
  - UAT already states: **“This is a document-based review, not a code inspection.”**
- **Gap**: No explicit rubric for when manual testing is required.

**Proposed change**: Optional rubric; keep doc-based as default.

**Implementation template (optional)** — add under UAT “Purpose” or “Workflow”:

```markdown
**Manual testing triggers (WHEN APPLICABLE)**:

Document-based UAT is the default. Add a brief manual spot-check only when:
- The plan changes UX/visual behavior, OR
- The change is highly environment-dependent (mobile Safari, offline/PWA, caching headers in DevTools), OR
- QA explicitly documents residual risk requiring runtime confirmation.
```

- **Affected agents**: UAT
- **Risk**: LOW (clarifies; doesn’t add hard gates)

---

### R5 — Critic: Add caching/performance semantics checklist item

- **Source**: Retro 010 “Recommendations” #5
- **Current state**:
  - Critic reviews architectural alignment but does not have an explicit “caching semantics required when applicable” checklist item.
  - This gap was surfaced by Critique 010 finding **F3 (MEDIUM)** and fixed quickly by Planner revisions.

**Proposed change**: Add one explicit check to reduce recurrence.

**Implementation template (copy/paste)** — add under Critic “Review Method” → Plan checklist:

```markdown
- If a plan touches caching/rendering mode/performance boundaries, require explicit semantics:
  - what is cacheable vs not,
  - proposed TTL/revalidation guidance,
  - and a note about avoiding caching user-specific HTML.
```

- **Affected agents**: Critic
- **Risk**: LOW

---

## Conflict Analysis

| # | Recommendation | Conflicting instruction | Nature | Impact | Proposed resolution | Resolved? |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | R1 (Architecture-first) if made mandatory for all work | Planner “Prefer small scope” could be slowed by forcing architecture every time | Scope creep / workflow friction risk | Could slow trivial plans | Keep R1 as **conditional** (refactors/perf/caching only), or optional clarification | ✅ |

No direct contradictions detected for R2–R5; all are additive.

---

## Logical Challenges

| Challenge | Affected recommendations | Clarification needed | Proposed solution |
| --- | --- | --- | --- |
| “Already aligned” vs “new improvement” ambiguity | R1, R4 | Are we changing behavior or documenting existing practice? | Mark R1/R4 as already aligned; propose only optional rubric text |
| Avoiding over-hardening | R2–R5 | How strict should new guidance be? | Make R2/R4 “RECOMMENDED/optional”, keep R3 mandatory (harmless) |

---

## Risk Assessment

| Recommendation | Risk level | Rationale | Mitigation |
| --- | --- | --- | --- |
| R1 (Planner architecture-first clarification) | LOW | Clarifies existing expectation | Keep conditional; don’t require new docs for small changes |
| R2 (DevOps commit message file guidance) | LOW | Guidance only; prevents common shell failure mode | Mark as recommended; no new gates |
| R3 (Quote file paths) | LOW | Pure ergonomics; reduces avoidable command failures | Keep short and explicit |
| R4 (UAT manual testing triggers) | LOW | Clarifies when to do runtime checks | Make optional and tied to QA residual risk |
| R5 (Critic caching semantics checklist) | LOW | Prevents recurring “missing caching semantics” critique | Make conditional (“when applicable”) |

---

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

1. **R2** DevOps commit message file guidance
2. **R3** Quote file paths in QA + DevOps

### Medium-Impact or Medium-Risk

3. **R5** Critic caching/perf semantics checklist item

### Low-Impact or High-Risk (defer)

4. **R1** Planner clarification (optional)
5. **R4** UAT manual testing triggers (optional)

---

## Suggested Agent Instruction Updates

**Files (if approved):**
- `.github/agents/devops.agent.md` (R2, R3)
- `.github/agents/qa.agent.md` (R3)
- `.github/agents/critic.agent.md` (R5)
- Optional: `.github/agents/planner.agent.md` (R1)
- Optional: `.github/agents/uat.agent.md` (R4)

**Implementation approach:**
- Use minimal additive blocks near the relevant sections (Stage 1 commit; lint guidance; plan review checklist).

**Validation plan:**
- After applying edits, run a quick grep to confirm:
  - DevOps includes `git commit -F` guidance.
  - QA/DevOps include “Quote file paths” guidance.
  - Critic includes caching/perf semantics conditional check.

---

## User Decision Required

Choose one:

1. **Update now (recommended)**: Apply only R2 + R3 (DevOps + QA) — minimal deltas.
2. **Review first**: I provide exact patch previews for each `.agent.md` file change before applying.
3. **Phase rollout**: Apply R2 + R3 now; revisit R5 (Critic) next.
4. **Defer**: No instruction changes; record that current instructions are “good enough.”

---

## Related Artifacts

- Retrospective: `agent-output/retrospectives/010-nextjs-app-router-refactor-retrospective.md`
- Plan: `agent-output/planning/closed/010-nextjs-app-router-refactor-v0.5.0.md`
- DevOps instructions: `.github/agents/devops.agent.md`
- QA instructions: `.github/agents/qa.agent.md`
- UAT instructions: `.github/agents/uat.agent.md`
- Critic instructions: `.github/agents/critic.agent.md`
- Prior PI example: `agent-output/process-improvement/closed/009-process-improvement-analysis.md`
