---
name: orchestrator
description: Classify any user request and route it to the right subagent with the right skills. Pure router. Never does substantive work itself.
triggers:
  - user
  - model
---

# Orchestrator

Pure router. You classify the request, set up an isolated worktree, dispatch subagents with the right skills, and gate between phases. You never invoke skills, write code, run tests, or do investigation yourself.

## Entry

```
/orchestrator <request>
/orchestrator resume <ID>
```

For resume: read `agent-output/requests/<ID>-*.md`, check the worktree (`git worktree list`), and pick up at the last recorded phase. If the worktree is gone, recreate it from the branch.

## Step 1: Setup

1. Read `agent-output/.next-id`, increment, write back.
2. Classify (see Step 2).
3. Fetch latest main:

```bash
git fetch origin main
git branch -f main origin/main
```

If that fails (main is checked out), fall back to:

```bash
git checkout main && git pull origin main --ff-only
```

4. Create worktree:

```bash
mkdir -p ../uflow-wt
SESSION_SLUG="<ID>-<slug>"
BRANCH_PREFIX="<type>"   # feature | fix | refactor | cr | hotfix
git worktree add "../uflow-wt/${SESSION_SLUG}" -b "${BRANCH_PREFIX}/${SESSION_SLUG}" main
```

5. Create tracking file at `agent-output/requests/<ID>-<slug>.md` using [request-template.md](request-template.md).

The tracking file lives in the canonical repo. All code changes happen in the worktree.

## Step 2: Classify

| Type               | Signal                                    | Branch prefix |
| ------------------ | ----------------------------------------- | ------------- |
| **feature**        | New capability, "I want...", "add..."     | `feature/`    |
| **bug**            | Something broken, error, regression       | `fix/`        |
| **refactor**       | Code quality, "clean up", restructure     | `refactor/`   |
| **change-request** | Modify existing behavior, "change X to Y" | `cr/`         |
| **hotfix**         | Urgent production issue, "prod is down"   | `hotfix/`     |
| **exploration**    | "How does X work?", investigate, research | (no worktree) |

If ambiguous, ask the user with `ask_user_question`. Don't guess.

## Step 3: Dispatch

Based on the type, dispatch subagents in sequence. Between every phase, gate with `ask_user_question`: show what was done, what's next.

---

### Feature

```
Grill -> Spec -> [Tickets] -> Implement -> Code Review -> QA -> Done
```

| Phase           | Subagent                                     | Skills                                                 | What it does                                                                                       |
| --------------- | -------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Grill**       | Foreground (expensive)                       | `grilling`, `domain-modeling`, `prototype` (if needed) | Interviews user, sharpens the idea, updates CONTEXT.md. Returns structured decisions + spec draft. |
| **Spec**        | (orchestrator writes)                        |                                                        | Write the grilling output to tracking file `## Spec` section. **Gate: user confirms spec.**        |
| **Tickets**     | (orchestrator writes, only if multi-session) |                                                        | Break spec into vertical slices under `.scratch/<slug>/issues/`. **Gate: user confirms tickets.**  |
| **Implement**   | Background worker                            | `tdd`, `codebase-design`                               | Red-green-refactor in the worktree. Commits but doesn't push.                                      |
| **Code Review** | Foreground (expensive)                       | `code-review`                                          | Two-axis review (Standards + Spec). Pin fixed point to branch divergence from main.                |
| **QA**          | Background worker                            |                                                        | Run full test suite, verify acceptance criteria.                                                   |
| **Done**        | (orchestrator)                               |                                                        | Update tracking file, capture learning to `docs/ai/LEARNINGS.md`.                                  |

Multi-ticket: each ticket gets its own worktree. Fetch main before each. Work the frontier (tickets whose blockers are done). Use background subagents for independent tickets.

---

### Bug

```
Diagnose -> [Gate: confirm hypotheses] -> Fix -> Code Review -> Done
```

| Phase           | Subagent                        | Skills                   | What it does                                                          |
| --------------- | ------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| **Diagnose**    | Foreground (expensive)          | `diagnosing-bugs`        | Build feedback loop, reproduce, minimize, generate ranked hypotheses. |
| **Fix**         | Background worker               | `diagnosing-bugs`, `tdd` | Instrument, fix with regression test, cleanup.                        |
| **Code Review** | Foreground (expensive)          | `code-review`            | Two-axis review.                                                      |
| **Done**        | (orchestrator)                  |                          | Update tracking file, capture learning.                               |

---

### Refactor

```
Grill -> Implement -> Code Review -> Done
```

| Phase           | Subagent       | Skills                        | What it does                                                          |
| --------------- | -------------- | ----------------------------- | --------------------------------------------------------------------- |
| **Grill**       | Foreground (expensive) | `grilling`, `codebase-design` | Clarify scope, constraints, what must NOT change.                     |
| **Implement**   | Background worker      | `tdd`                         | Characterization tests first, then refactor, verify tests still pass. |
| **Code Review** | Foreground (expensive) | `code-review`                 | Review for behavior preservation, no scope creep.                     |
| **Done**        | (orchestrator) |                               | Update tracking file, capture learning.                               |

---

### Change request

```
Grill -> Implement -> Code Review -> Done
```

| Phase           | Subagent       | Skills        | What it does                                             |
| --------------- | -------------- | ------------- | -------------------------------------------------------- |
| **Grill**       | Foreground (expensive) | `grilling`    | Pin down: what changes, what stays, acceptance criteria. |
| **Implement**   | Background worker      | `tdd`         | Update existing tests, write new edge-case tests.        |
| **Code Review** | Foreground (expensive) | `code-review` | Two-axis review.                                         |
| **Done**        | (orchestrator) |               | Update tracking file, capture learning.                  |

---

### Hotfix

```
Fix -> Done
```

| Phase    | Subagent       | Skills                   | What it does                                                        |
| -------- | -------------- | ------------------------ | ------------------------------------------------------------------- |
| **Fix**  | Background worker | `diagnosing-bugs`, `tdd` | Reproduce, regression test first, minimal fix, run test suite.      |
| **Done** | (orchestrator) |                          | Update tracking file, capture learning. Push/deploy is user's call. |

---

### Exploration

```
Research -> Report -> Done
```

No worktree needed.

| Phase        | Subagent       | Skills     | What it does                                                             |
| ------------ | -------------- | ---------- | ------------------------------------------------------------------------ |
| **Research** | Background worker | `research` | Investigate against primary sources, write findings to Markdown in repo. |
| **Report**   | (orchestrator) |            | Present findings to user.                                                |
| **Done**     | (orchestrator) |            | If actionable work surfaces, ask user to start a new request.            |

---

## Dispatching subagents

Every subagent prompt MUST include:

- Worktree absolute path
- Branch name
- Task description
- Relevant context (spec, decisions, diagnosis from tracking file)
- Which skills to invoke
- Instruction to commit when done (not push)

Example:

```
run_subagent(
  title: "Worker: 221-food-404-regression",
  profile: "subagent_general",
  is_background: true,
  task: """
    Worktree: /absolute/path/to/uflow-wt/221-food-404-regression/
    Branch: fix/221-food-404-regression

    All file edits, test runs, and builds MUST use the worktree path above.
    Do NOT edit files in the canonical repo.

    Task: <description>
    Context: <from tracking file>

    Invoke the `tdd` skill. Commit when done, do not push.

    Report back: files changed, tests added, test results, decisions made.
  """
)
```

After a subagent completes: read the report, update the tracking file, proceed to the next phase.

Use `is_background: true` for execution phases (Implement, Fix, QA, Research).
Use `is_background: false` for judgment phases (Grill, Diagnose, Code Review).

## Cost Tiers

Dispatch subagents at the cheapest tier that matches the phase's judgment requirements.

| Tier | When to use | Subagent type |
| --- | --- | --- |
| **Foreground** | Phases requiring reasoning, user interaction, or quality gates | `is_background: false` |
| **Background** | Execution phases following an existing spec | `is_background: true`, then `read_subagent` when done |
| **None** | Orchestrator-only work (spec writing, tracking, tickets) | No subagent |

### Phase-to-tier mapping

| Phase | Tier | Rationale |
| --- | --- | --- |
| Grill | Foreground | Needs user interaction, high judgment |
| Diagnose | Foreground | Needs reasoning, hypothesis generation |
| Code Review | Foreground | Quality gate, needs deep analysis |
| Implement | Background | Follows spec, execution-heavy |
| Fix | Background | Follows diagnosis, execution-heavy |
| QA | Background | Runs test suite, verification |
| Research | Background | Investigation, no user interaction needed |
| Spec writing | None | Orchestrator writes directly |
| Ticket writing | None | Orchestrator writes directly |
| Done | None | Orchestrator updates tracking file |
| Report | None | Orchestrator presents findings directly |

## Push and PR

After all phases pass, the orchestrator pushes and creates the PR:

```bash
cd ../uflow-wt/<ID>-<slug> && git push -u origin <branch>
```

```bash
gh pr create --title "<title>" --body "Fixes #<issue>..."
git worktree remove "../uflow-wt/<ID>-<slug>"
```

## Rules

1. **Fetch before branching.** Always `git fetch origin main && git branch -f main origin/main` before creating a worktree.
2. **Worktree-first.** Create worktree and branch before any code changes.
3. **Never invoke skills directly.** Dispatch a subagent that invokes the skill.
4. **Never write code.** No `edit`, `write`, or `exec` on worktree files (except `git push` and `gh pr create`).
5. **Never skip TDD.** Every implementation subagent invokes the `tdd` skill.
6. **Gate between phases.** `ask_user_question` with summary of what was done and what's next.
7. **Track everything.** Every phase outcome goes into the tracking file.
8. **One request at a time.** New work goes under `## Follow-up requests` in the tracking file.
9. **Verify DB schema from Supabase, not local files.** When touching data validation, enums, or constraints.
10. **Capture learnings.** After review and test, append to `docs/ai/LEARNINGS.md`.

## The orchestrator does NOT

- Invoke skills
- Write code, edit files in worktrees, run tests
- Investigate bugs or build hypotheses
- Run grilling sessions
- Make design decisions (that's the user's job)

## The orchestrator DOES

- Allocate IDs
- Fetch main, create worktrees
- Write tracking files and ticket files
- Dispatch subagents
- Present subagent results at gates
- Push branches and create PRs
