---
ID: 42
Origin: 42
UUID: 9b6a3d1c
Status: Committed
---

# Analysis 042 — Parallel Copilot Sessions (Concurrency + Isolation Limits)

## Changelog

| Date       | Handoff           | Outcome                                                                                                       |
| ---------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| 2026-03-13 | Planner → Analyst | Documented verified constraints, key risks, and the fastest disconfirming tests for Copilot parallel sessions |
| 2026-03-13 | Analyst → Planner | Findings incorporated into Plan 042; lifecycle policy and multi-root constraint resolved in planning          |

## Value Statement and Business Objective

As a developer/workflow operator, I want to understand Copilot’s real concurrency and isolation behavior so that the parallel-session operator setup (Plan 042) can be executed confidently without cross-contamination or workflow regressions.

## Objective

- Convert Plan 042 “REQUIRES ANALYSIS” items into **Verified** constraints where possible.
- Where verification is not possible in this environment, produce explicit **Hypotheses** with:
  - confidence level,
  - the fastest disconfirming test,
  - missing telemetry/observations needed.

## Context

- Workspace is **multi-root**: `uflow/` + `.agent/`.
- Plan 042 proposes: “1 topic = 1 session = 1 VS Code window = 1 git worktree”.
- Orchestrator dynamic catalog selection has prior workflow changes (Plan 031) relying on catalog discovery under `.agent/skills/data/catalog.json`.

## Methodology

- Document inspection: Plan 042 content and existing workflow conventions.
- Small local probe: validate whether the execution layer supports overlapping background processes while continuing other commands.
- Gap tracking with explicit tests to run in a real operator scenario (two VS Code windows).

## Findings (with Confidence Level)

### F1 — Worktrees introduce an **ID collision risk** for `agent-output/.next-id`

**Confidence: Inferred (Level 3)**

- In git worktrees, each worktree has its own checked-out files, including `agent-output/.next-id` and all `agent-output/*` artifacts.
- If two sessions increment `.next-id` independently in two different worktrees, they can both allocate the same next ID (or diverge), creating **duplicate plan IDs** when later merging artifacts back to main.

**Why this matters**: Plan 042’s “one worktree per session” is correct for code isolation but can unintentionally break the document lifecycle invariant (global monotonically increasing IDs).

**Fastest disconfirming test**:

1. Create two worktrees.
2. In each, read `cat agent-output/.next-id`.
3. Increment once in both worktrees (create a new plan artifact).
4. Compare IDs allocated.

**Missing telemetry**: none; this can be verified purely by local worktree behavior.

---

### F2 — Multi-root catalog dependency is a practical constraint

**Confidence: Inferred (Level 3)**

- Plan 031 notes the catalog is under `.agent/skills/data/catalog.json` in this workspace.
- A session that opens only a single-folder workspace (just a worktree checkout of `uflow/`) may cause Orchestrator “Layer 3” to find no catalog (or require additional discovery).

**Fastest disconfirming test**:

1. Open a session as a single-folder workspace (only `uflow` worktree).
2. Trigger an Orchestrator-run task that should pull a catalog skill.
3. Check Workflow Card evidence for `Catalog: (none)` vs populated matches.

**Missing telemetry**: none; operator can observe the Workflow Card evidence.

---

### F3 — Tool execution can overlap with background work (partial proxy)

**Confidence: Proven (Level 1)**

- Local probe: ran a background `sleep 20` while also running foreground work in the same terminal invocation; foreground work completed immediately while the background job continued.

**Limits**:

- This only proves the terminal layer supports background work; it does not prove Copilot Chat supports multiple concurrent agent runs across windows.

---

### F4 — True Copilot “parallel sessions” concurrency is **not provable** from this environment alone

**Confidence: Hypothesis (Low–Med)**

- Whether you can run multiple agent/tool sequences concurrently depends on Copilot Chat’s product constraints (per-window serialization, per-account limits, shared tool queues, etc.). This cannot be validated without the operator running two VS Code windows and initiating overlapping agent tasks.

**Fastest disconfirming test** (operator-run):

- Window A: start a long-running tool action (e.g., build/test or a deliberate `sleep 60` via tool call).
- Window B: immediately ask Copilot to run a different tool action.
- Observe whether Window B executes immediately, queues, or errors/rate-limits.

**Missing telemetry**:

- A clear indicator of “queued vs blocked” in Copilot UI, and timestamps of tool start/finish for both windows.

## System Weaknesses (Architecture / Process)

1. **Document lifecycle global counter is not worktree-safe** (risk mechanism: independent `.next-id` increments → duplicate IDs).
2. **Multi-root dependency for dynamic skills** (risk mechanism: per-session single-root workspace loses catalog signal → Orchestrator regressions to Layer 1/2 only).
3. **Operator ambiguity on write targets** (risk mechanism: without strict Session Context Header discipline, agents can write into the wrong chain or wrong worktree).

## Instrumentation Gaps

### Normal (always-on, low-volume)

- A consistent Workflow Card field for `Session label`, `Root path`, and `Artifact targets` (human-visible evidence) in Orchestrator.

### Debug (opt-in)

- A “tool execution timestamp log” for each window/session (start/end time) to confirm concurrency vs queueing.

## Remaining Gaps (must be resolved to close Plan 042 gate)

| #   | Unknown                                                       | Blocker                    | Required Action                                                                          | Owner              |
| --- | ------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- | ------------------ |
| 1   | Can two VS Code windows run tool actions concurrently?        | Needs operator test        | Run the two-window overlap test and record results                                       | Operator           |
| 2   | Does single-folder vs multi-root affect Orchestrator Layer 3? | Needs operator test        | Run single-folder workspace test and inspect Workflow Card evidence                      | Operator           |
| 3   | How to prevent `.next-id` divergence across worktrees?        | Requires a policy decision | Decide whether agent-output is centralized or per-session and how merges will be handled | Planner + Operator |

## Analysis Recommendations (next investigative steps, not solutions)

1. Run the two-window concurrency test (G1) and record: queued/blocked/parallel behavior.
2. Run the single-root vs multi-root Orchestrator evidence test (G2).
3. Run a two-worktree `.next-id` divergence experiment and decide on a lifecycle policy.

## Open Questions

- Should sessions treat `agent-output/` as a **single source of truth** (centralized), or accept per-session artifacts and never merge them back?
- Is your primary goal “parallel thinking + drafting” (low tool usage) or “parallel tool execution” (high tool usage)? The answer changes the expected benefit.
