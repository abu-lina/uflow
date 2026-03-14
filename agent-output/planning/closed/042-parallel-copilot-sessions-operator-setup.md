---
ID: 42
Origin: 42
UUID: 9b6a3d1c
Status: Committed
---

# Plan 042 — Parallel Copilot Sessions (Operator Setup)

## Changelog

| Date       | Author        | Change                                                                                                                  |
| ---------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-03-13 | Planner       | Initial plan created                                                                                                    |
| 2026-03-13 | Planner       | Revised after Analysis 042: centralized lifecycle policy, multi-root session requirement, and updated validation gates  |
| 2026-03-13 | Planner       | Revised after Critique 042: investigation items clarified, duplicate-ID recovery added, deferred references normalized  |
| 2026-03-13 | Implementer   | Status → In Progress; implementation started                                                                            |
| 2026-03-13 | Code Reviewer | Status → Code Review Approved; one fix-in-review applied (heredoc expansion bug in docs/ai/parallel-sessions.md Step 3) |
| 2026-03-14 | QA            | Status → QA Complete; automated gates pass; fixed Analysis 042 UUID to match plan chain                                 |
| 2026-03-14 | UAT           | Status → UAT Approved; APPROVED FOR RELEASE; Milestone 5 (manual two-window validation) deferred to operator            |
| 2026-03-14 | DevOps        | Status → Committed (workflow-only); lifecycle docs moved to closed/; Stage 1 deployment doc created                      |

## Plan Header

- **Target Release**: N/A (workflow/operator setup; no runtime/product release)
- **Epic Alignment**: Developer productivity / workflow throughput
- **Status**: Committed (workflow-only)
- **Related Issues**: None

## Release Strategy

Standalone (workflow-only; not bundled into a product release).

## Value Statement and Business Objective

As a developer/workflow operator, I want to run multiple Copilot sessions in parallel with clear isolation (context + changes + artifacts), so that I can efficiently address multiple topics/issues concurrently without cross-contamination.

## Objective

1. Enable 2–5 parallel workstreams at once (each a separate “session”) across agents/skills.
2. Prevent cross-contamination:
   - chat context bleeding across topics,
   - code changes mixing across issues,
   - outputs being written to the wrong chain.
3. Establish a lightweight operator protocol:
   - session naming and mapping to worktrees/branches,
   - handoff rules for Orchestrator → downstream agents,
   - consistent artifact placement under `agent-output/`.
4. Keep the setup minimal (KISS/YAGNI): prefer VS Code-native primitives + git worktrees over new tooling.

## Scope

### In Scope

- A recommended **operating model** for parallel sessions in this multi-root workspace (`uflow/` + `.agent/`).
- A minimal set of **repo-local docs** explaining the workflow.
- Small adjustments to agent instruction docs (Orchestrator + downstream agents) to:
  - include a mandatory **Session Context Header** in every handoff,
  - constrain tool usage to the intended worktree/root,
  - require explicit artifact targets (Plan ID / path).

### Out of Scope

- Building a VS Code extension or custom UI for multi-session management.
- Changing product/runtime behavior.
- Introducing new services (queues, external orchestration, etc.).

## Key Constraints

- Must work on macOS in VS Code with GitHub Copilot Chat.
- Must be compatible with multi-root workspaces (both `uflow/` and `.agent/`).
- Document lifecycle must remain intact: each workstream is its own chain with its own Plan ID.
- `agent-output/.next-id` is a global lifecycle counter and is not safe to allocate independently across multiple git worktrees.
- Avoid heavy process overhead; the workflow must remain fast to start/stop.

## Assumptions

- You can open multiple VS Code windows concurrently.
- You use git and can create additional worktrees.
- Copilot rate limits may apply; parallelism is primarily about reducing human waiting/coordination overhead.

## Proposed Operating Model (High-Level)

### Session = “One Topic, One Chain, One Worktree, One VS Code Window”

- **One topic/issue per session** to avoid context mixing.
- Each session maps to:
  - one dedicated VS Code window,
  - one git worktree (recommended) or, minimally, one dedicated branch,
  - one pre-assigned agent-output chain (Plan ID + derived artifacts).

### Lifecycle Policy: Centralized Control Window + Isolated Worker Windows

- A single **control window** on the canonical workspace owns:
  - new Plan ID allocation,
  - edits to `agent-output/.next-id`,
  - creation and status transitions of lifecycle documents under `agent-output/`.
- Parallel **worker windows** in git worktrees are for topic-specific coding, investigation, and tool execution only.
- Worker windows must **inherit** an existing Plan ID from the control window; they must not originate new IDs or independently advance `agent-output/.next-id`.
- If a worker session needs to record implementation notes, the notes are handed back to the control window for canonical artifact updates under the assigned Plan ID.

This policy resolves the `.next-id`/worktree collision risk without introducing new infrastructure.

### Recommended Isolation Mechanisms (in priority order)

1. **Git worktrees** (strong isolation of working directory + uncommitted changes)
2. **Separate VS Code windows** (separate Copilot chat threads and UI state)
3. **Optional VS Code Profiles** (isolate settings + extension state when needed)

### Session Workspace Strategy

- Every active session window must be opened as a **multi-root workspace** containing:
  - the session-specific `uflow` worktree root,
  - the shared `.agent` root.
- This preserves Orchestrator Layer 3 catalog access under `.agent/skills/data/catalog.json`.
- Single-folder `uflow` sessions are allowed only as an explicit fallback mode; when used, the Workflow Card must show catalog fallback evidence (for example `Catalog: (none)` or warning) so the limitation is visible.

### Naming Convention

- Session label: `S<plan-id>-<short-topic>` (examples: `S042-auth`, `S043-ui-overlap`)
- Git worktree folder: `../uflow-wt/<session-label>/`
- Branch name: `session/<plan-id>-<short-topic>`
- All agent-output documents follow existing numeric ID convention (no change).

## Handoff Rules (Operator Protocol)

### Session Context Header (Mandatory in every agent handoff)

Every Orchestrator handoff (and downstream agent continuation) includes a short header:

- Session label: `S<plan-id>-<topic>`
- Workspace root: `<absolute path to worktree>`
- Workspace composition: `<worktree root> + <shared .agent root>`
- Branch: `session/<plan-id>-<topic>`
- Artifact targets: `agent-output/<domain>/<plan-id>-...` paths
- Scope guardrail: “Do not read/write outside this worktree and referenced artifacts.”
- Lifecycle guardrail: “Do not allocate new IDs or update `agent-output/.next-id` outside the control window.”

### Artifact Placement Rules

- Planning artifacts: `agent-output/planning/<ID>-...`
- Implementation artifacts: `agent-output/implementation/<ID>-...`
- QA/UAT/etc follow existing conventions.
- If multiple sessions run concurrently, the operator validates every write target includes the intended ID.
- Canonical lifecycle artifacts are updated only from the control window to avoid worktree divergence.

## Open Investigation Items (Analysis 042 Partial)

Analysis 042 is complete and its findings have already been incorporated into this plan. The items below distinguish what is already resolved from what still needs operator validation before the workflow can be considered fully verified.

1. **Copilot concurrency model** — **Pending operator test**
   - Unknown: Can multiple Copilot agent/tool runs execute concurrently across separate VS Code windows, or are they serialized per window, workspace, or account?
   - Required validation: Run the two-window overlap test from Analysis 042.

2. **Session isolation guarantees** — **Pending operator test**
   - Unknown: Are chat threads fully isolated per VS Code window/workspace, and do any Copilot features leak state across windows?
   - Required validation: Run the two-window overlap test from Analysis 042 and record any cross-window prompt/history leakage.

3. **Multi-root workspace interactions** — **Partially resolved**
   - Resolved: Multi-root is required to preserve `.agent` catalog access.
   - Pending operator test: Confirm the Workflow Card still shows correct catalog evidence and agents do not select the wrong root when both the session worktree and `.agent` root are present.

4. **Rate limits / throughput constraints** — **Pending operator observation**
   - Unknown: Real account-level request/throughput limits during multi-window usage.
   - Required validation: During the two-window overlap test, record whether the second window runs immediately, queues, or errors.

5. **Operational ergonomics** — **Pending operator choice**
   - Unknown: Best method to pin a session to a window (title conventions, saved workspaces, or profiles).
   - Required validation: Confirm which of these is simplest in daily use after two-session smoke testing.

## Decision Record

- [RESOLVED] Default to “one topic per session” to reduce context mixing (SRP; easiest operator model).
- [RESOLVED] Use git worktrees for isolation when writing code or modifying files (prevents change collision and simplifies rollback).
- [RESOLVED] Use separate VS Code windows per session (practical parallelism + clear UI separation).
- [RESOLVED] Enforce a Session Context Header in every Orchestrator handoff (cheap guardrail; improves correctness).
- [RESOLVED] Keep `agent-output/` lifecycle management centralized in one control window; worker sessions inherit Plan IDs and must not allocate new ones. Rationale: avoids `.next-id` divergence across worktrees while preserving document lifecycle integrity.
- [RESOLVED] Require each active session to open as a multi-root workspace including both the session worktree and shared `.agent` root. Rationale: preserves dynamic catalog skill selection and makes fallback mode explicit.
- [DEFERRED: operator + depends on validation results + target TBD next planning cycle] Whether to introduce a tmux-based “agent manager” CLI layer for starting/stopping sessions.
- [DEFERRED: operator + depends on validation results + target TBD next planning cycle] Whether to require VS Code Profiles per session by default (added overhead; only needed if state leakage exists).

## Plan (Milestones)

1. **Milestone 1 — Confirm capabilities (Analysis gate)**
   - Objective: Validate assumptions about Copilot session isolation and concurrency.
   - Acceptance Criteria:
     - Analysis 042 remains the canonical investigation artifact for this milestone.
     - Run and record the remaining operator validations from Analysis 042:
       - two-window overlap test for concurrency/isolation behavior,
       - multi-root session test for correct catalog evidence and correct root selection.
     - Record any hard limitations observed (for example, single active agent run per account or clear account-level queueing behavior).
     - Confirm the control-window lifecycle policy is acceptable for `.next-id` management.

2. **Milestone 2 — Define the operator protocol (Session blueprint)**
   - Objective: Produce a single-page “Session Blueprint” operators can follow to spin up a new session in <2 minutes.
   - Deliverables:
     - Session naming rules
     - Worktree/branch conventions
       - Control-window vs worker-window responsibilities
       - Multi-root session workspace requirement
     - Required Session Context Header format
   - Acceptance Criteria:
     - Operator can start 2 parallel sessions without mixing branch/worktree/artifacts.
     - No worker session allocates a new Plan ID or edits `agent-output/.next-id`.

3. **Milestone 3 — Minimal repo documentation**
   - Objective: Make the workflow discoverable and repeatable.
   - Proposed docs location:
     - `docs/ai/parallel-sessions.md` (or similar existing AI/workflow docs folder)
   - Acceptance Criteria:
     - Docs include: quickstart, common failure modes, recovery steps, and explicit single-folder fallback behavior.

4. **Milestone 4 — Agent instruction guardrails**
   - Objective: Reduce cross-contamination caused by ambiguous agent writes.
   - Work:
     - Update Orchestrator instructions to require the Session Context Header and explicit write targets.
       - Update downstream agent specs to restate “never operate outside provided root/path set” and “never allocate IDs outside the control window”.
   - Acceptance Criteria:
     - In 2-session smoke test, agents consistently reference correct worktree, correct `.agent` root, and correct `agent-output` chain.

5. **Milestone 5 — Validation (manual workflow validation)**
   - Objective: Verify parallel sessions are practically usable.
   - Acceptance Criteria:
     - Two VS Code windows can run two different issue threads with no artifact mixing.
     - Worktree changes remain isolated (no uncommitted-file overlap).
       - Dynamic catalog skills remain available in multi-root session windows.
       - If fallback single-folder mode is used, the Workflow Card visibly reports catalog fallback state.

6. **Milestone 6 — Version management and release artifacts (workflow-only)**
   - Objective: Keep lifecycle consistent while avoiding unnecessary product version bumps.
   - Acceptance Criteria:
     - No product semver bump.
     - If repo policy requires it, note workflow change in `CHANGELOG.md`; otherwise capture in this plan’s changelog.

## Validation (Non-QA)

- Manual operator verification only:
  - Create 2 sessions and complete short tasks in each (e.g., one documentation task, one code task) without mixing outputs.

## Risks

- Copilot or VS Code may not support true concurrent agent execution; parallel windows may still serialize tool calls.
- Operator overhead could become high if the protocol is too heavy; keep it minimal.
- Multi-root workspaces can increase “wrong root” mistakes; guardrails must be explicit.
- If the control-window policy is ignored, duplicate Plan IDs and conflicting lifecycle documents can be created across worktrees.

## Recovery: Duplicate Plan ID

If a worker window incorrectly allocates a new Plan ID or creates a lifecycle artifact outside the control window:

1. Identify the duplicate artifact and the correct canonical Plan ID.
2. Delete the erroneous lifecycle artifact from the worker worktree before it is merged or copied back.
3. Return to the control window and re-create the artifact under the correct Plan ID in the canonical `agent-output/` path.
4. Update the recreated artifact's changelog with a short note that the worker-window duplicate was discarded and canonicalized in the control window.
5. Verify `agent-output/.next-id` in the control window remains the only accepted lifecycle counter.

## Planner Resolution of Analysis 042

- `.next-id` / worktree policy: resolved by centralizing lifecycle management in a single control window and prohibiting worker windows from allocating IDs.
- Multi-root catalog constraint: resolved by requiring every active session to include both the session worktree and the shared `.agent` root; single-folder usage is explicitly fallback mode only.

## Duration Estimates

- Analysis: 0.5–2h (depends on tool/concurrency behavior)
- Planning: 1–2h
- Implementation: 1–4h (docs + instruction updates + optional helper scripts)
- QA: N/A (workflow-only)
- UAT: 0.5–1h (operator validation)
- DevOps: N/A (workflow-only)
