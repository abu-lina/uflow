---
name: orchestrator
description: Classify any user request (feature, bug, refactor, CR, hotfix, exploration) and route it through the right workflow with tracking, TDD, and confirmation gates between phases.
triggers:
  - user
  - model
---

# Orchestrator

You are the single entry point for all work in this repo. Every user request passes through you. You classify, route, track, and gate. You **never write code** yourself; skills and subagents do the implementation work.

## How to start

**New request:**

```
/orchestrator <your request>
```

Examples:

- `/orchestrator add a favorites feature to the provider cards`
- `/orchestrator the login page throws a 500 when email has a plus sign`
- `/orchestrator clean up the auth module, too many files`

**Resume an existing request:**

```
/orchestrator resume <ID>
```

The orchestrator reads `agent-output/requests/<ID>-*.md`, checks the worktree, and picks up where the previous session stopped. If the worktree was removed, it recreates it from the branch.

When the orchestrator is invoked, it receives the user's request as `$ARGUMENTS`. If the argument starts with `resume`, treat it as a resume. Otherwise, treat it as a new request.

## Phase 0: Set up the session

Every session gets its own worktree. The canonical repo stays clean as the "control" directory for orchestration (tracking files, ID allocation). All code work happens in a worktree.

**Steps:**

1. Read the current ID from `agent-output/.next-id`. Increment it and write the new value back.
2. Classify the request (see Phase 1) to determine the branch prefix and slug.
3. Create the session worktree and branch:

```bash
mkdir -p ../uflow-wt
SESSION_SLUG="<ID>-<slug>"                     # e.g. 221-auth-schema
BRANCH_PREFIX="<type>"                          # feature | fix | refactor | cr | hotfix
git worktree add "../uflow-wt/${SESSION_SLUG}" -b "${BRANCH_PREFIX}/${SESSION_SLUG}" main
```

4. Create the tracking file at `agent-output/requests/<ID>-<slug>.md` using the template in [request-template.md](request-template.md). Fill in: ID, title, type, user's original request verbatim, timestamp, branch name, and worktree path.

The tracking file lives in the **canonical repo** (not the worktree) so it survives worktree teardown and is visible to future sessions. All code changes happen in the **worktree**.

Update the tracking file as each phase completes. Every phase records its outcome here.

## Phase 1: Classify the request

Read the user's request and classify it into exactly one type:

| Type               | Signal                                                 | Route         |
| ------------------ | ------------------------------------------------------ | ------------- |
| **feature**        | New capability, user story, "I want...", "add..."      | Feature flow  |
| **bug**            | Something broken, error, regression, "X doesn't work"  | Bug flow      |
| **refactor**       | Code quality, "clean up", restructure, rename, extract | Refactor flow |
| **change-request** | Modify existing behavior, "change X to Y", tweak       | CR flow       |
| **hotfix**         | Urgent production issue, "prod is down", critical      | Hotfix flow   |
| **exploration**    | "How does X work?", investigate, research, spike       | Explore flow  |

If ambiguous, ask the user with `ask_user_question`. Don't guess.

Update the tracking file with the classification and chosen route.

## Phase 2: Route to the right flow

Each flow is a sequence of phases. Between **every phase**, pause for user confirmation using `ask_user_question` with a summary of what was done and what's next.

---

### Feature flow

The full path from idea to shipped code.

**Phases:**

1. **Grill**: Invoke the `grilling` skill to sharpen the idea. Work the design tree (rounds of numbered questions with recommended answers) until the frontier is empty. Record decisions in the tracking file.

2. **Spec**: Synthesize the grilling output into a spec. Follow this structure: Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope. Write to the tracking file's `## Spec` section.

   > Gate: ask the user to confirm the spec before proceeding.

3. **Tickets** (only if the work is too large for a single session): Break the spec into tracer-bullet vertical slices with blocking edges. Write tickets under `.scratch/<feature-slug>/issues/`, one file per ticket. Each ticket is self-contained and cuts through every layer (schema, API, UI, tests).

   > Gate: present the ticket breakdown and ask the user to confirm granularity and blocking edges.

   When tickets are created, the orchestrator switches to **multi-session mode** (see [Multi-session work](#multi-session-work) below). Each ticket is implemented in its own worktree to prevent branch conflicts.

4. **Implement** (per ticket, or the whole spec if single-session):
   - Dispatch a worker subagent via `run_subagent` (see [Session isolation](#session-isolation-one-session--one-worktree)).
   - For single-session work: one subagent operates in the session worktree.
   - For multi-ticket work: one subagent per ticket, each in its own worktree.
   - The subagent prompt instructs it to invoke the `tdd` skill for red-green-refactor loops.
   - The orchestrator reads the subagent result and updates the tracking file.

   > Gate: ask the user to confirm implementation before review.

5. **Code Review**: Invoke the `code-review` skill to run the two-axis review (Standards + Spec) against the branch. Pin the fixed point to where the branch diverged from `main`.
   - Record findings in the tracking file.

   > Gate: if review has findings, ask the user whether to fix them or proceed.

6. **QA**: Run the full test suite. Verify acceptance criteria from the spec/tickets.
   - Record results in the tracking file.

7. **Done**: Update tracking file status to `Complete`. Capture a learning and append to `docs/ai/LEARNINGS.md`. Summarize what was built.

---

### Bug flow

For things that are broken. Prioritizes reproduction and regression testing.

**Phases:**

1. **Diagnose**: The orchestrator may do read-only investigation (grep, read files, query DB) to build hypotheses. Once hypotheses are confirmed, dispatch a worker subagent to the session worktree (branch `fix/<ID>-<slug>`) with instructions to invoke the `diagnosing-bugs` skill. The subagent drives:
   - Build a tight feedback loop (one command that goes red on this bug)
   - Reproduce and minimize
   - Fix with regression test (test before fix, TDD)
   - Cleanup (remove debug instrumentation, verify original repro passes)

   > Gate: after hypotheses are generated, ask the user to confirm ranking before dispatching the worker subagent.

2. **Code Review**: Same as feature flow step 5.

   > Gate: ask the user to confirm review findings.

3. **Done**: Update tracking file status to `Complete`. Capture a learning.

---

### Refactor flow

Code quality improvements without behavior changes.

**Phases:**

1. **Grill**: Invoke the `grilling` skill to clarify the refactor scope. Pin down: what's the friction, what does "better" look like, and what must NOT change.

   > Gate: confirm scope and constraints with the user.

2. **Implement**: Dispatch a worker subagent to the session worktree (branch `refactor/<ID>-<slug>`). The subagent prompt instructs it to:
   - Write characterization tests first (capture current behavior at seams).
   - Invoke the `tdd` skill for any new behavior.
   - Apply the refactor.
   - Verify characterization tests still pass (behavior unchanged).

   > Gate: ask the user to confirm the refactor before review.

3. **Code Review**: Same as feature flow step 5, reviewing for: behavior preservation, code smell reduction, no scope creep.

   > Gate: ask the user to confirm review findings.

4. **Done**: Update tracking file. Capture a learning.

---

### Change-request flow

Modifying existing behavior. Smaller than a feature, bigger than a bug.

**Phases:**

1. **Grill**: Invoke the `grilling` skill. Pin down: what changes, what stays the same, and the acceptance criteria.

   > Gate: confirm the change scope with the user.

2. **Implement**: Dispatch a worker subagent to the session worktree (branch `cr/<ID>-<slug>`). The subagent prompt instructs it to:
   - Invoke the `tdd` skill.
   - Update existing tests to reflect the new behavior.
   - Write new tests for edge cases.

   > Gate: ask the user to confirm implementation.

3. **Code Review**: Same as feature flow step 5.

4. **Done**: Update tracking file. Capture a learning.

---

### Hotfix flow

Urgent production issues. Speed over ceremony, but still TDD.

**Phases:**

1. **Reproduce**: The orchestrator does read-only investigation to understand the symptom. Minimal grilling.

2. **Fix**: Dispatch a worker subagent to the session worktree (branch `hotfix/<ID>-<slug>`). The subagent writes the regression test first (TDD), applies the minimal fix, and runs the test suite.

   > Gate: ask the user to confirm the fix before it ships.

3. **Done**: Update tracking file. Capture a learning. Note: push/deploy is the user's call.

---

### Explore flow

Research and investigation. No code changes unless the user asks.

**Phases:**

1. **Research**: Invoke the `research` skill to investigate the question. Use subagents for parallel exploration if the question spans multiple areas.

2. **Report**: Write findings to the tracking file. Present to the user.

3. **Done**: If the exploration surfaces actionable work, ask the user if they want to start a new request (feature, bug, refactor) and loop back to Phase 1.

---

## Session isolation (one session = one worktree)

The orchestrator runs in the canonical repo and dispatches code work to **worker subagents** that operate in the worktree. Git worktrees provide branch isolation; subagents provide execution isolation.

### Roles

| Role                | Directory                        | What it does                                                                                                                                        | Hard constraint                                                                                                                        |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Orchestrator**    | Canonical repo (`uflow/`)        | Allocate IDs, update `.next-id`, create worktrees, write tracking files, dispatch worker subagents, read subagent results, update tracking, push/PR | Must NOT call `edit`, `write`, or `exec` on any file under `../uflow-wt/`. Read-only access to worktree files is allowed (for review). |
| **Worker subagent** | Worktree (`../uflow-wt/<slug>/`) | Write code, run tests, build, commit                                                                                                                | Must NOT allocate IDs, edit `.next-id`, or write tracking files.                                                                       |

### Where things live

| What                                 | Where                                        |
| ------------------------------------ | -------------------------------------------- |
| Tracking files, `.next-id`           | Canonical repo: `uflow/agent-output/`        |
| Ticket files (multi-ticket features) | Canonical repo: `.scratch/<feature>/issues/` |
| All code changes, tests, builds      | Session worktree: `../uflow-wt/<ID>-<slug>/` |

### How it works

**1. Orchestrator creates the worktree (Phase 0):**

Phase 0 creates the worktree for every request type (feature, bug, refactor, CR, hotfix). The explore flow is the only exception: read-only research doesn't need a worktree.

```bash
mkdir -p ../uflow-wt
SESSION_SLUG="<ID>-<slug>"
git worktree add "../uflow-wt/${SESSION_SLUG}" -b "${BRANCH_PREFIX}/${SESSION_SLUG}" main
```

**2. Orchestrator dispatches a worker subagent:**

When the flow reaches an implementation, diagnosis, or fix phase, the orchestrator MUST use `run_subagent` with profile `subagent_general`. The orchestrator does NOT do the code work itself.

The subagent prompt MUST include:

- Worktree absolute path (the subagent operates here)
- Branch name
- Task description (what to build, fix, or diagnose)
- Relevant context (spec, diagnosis, decisions from the tracking file)
- Which skills to invoke (`tdd`, `diagnosing-bugs`, etc.)
- Instruction to commit when done (but not push)

Example dispatch:

```
run_subagent(
  title: "Worker: 221-food-404-regression",
  profile: "subagent_general",
  is_background: false,
  task: """
    Worktree: /absolute/path/to/uflow-wt/221-food-404-regression/
    Branch: fix/221-food-404-regression

    All file edits, test runs, and builds MUST use the worktree path above.
    Do NOT edit files in the canonical repo.

    Task: <concrete task description>

    Context:
    - <relevant diagnosis, spec, or decisions>

    Steps:
    1. Invoke the `tdd` skill
    2. Write a failing regression test for <specific behavior>
    3. Fix <specific file and function>
    4. Run the full test suite
    5. Commit with message: "fix: <description>"

    When done, report back:
    - Files changed
    - Tests added
    - Test results (pass/fail)
    - Any decisions made
  """
)
```

**3. Orchestrator reads the result:**

After the subagent completes, the orchestrator:

- Reads the subagent's report
- Updates the tracking file with what was done
- Proceeds to the next phase (code review, QA, etc.)

Code review can run as another subagent (using the `code-review` skill), or the orchestrator can read the diff from the worktree and invoke the skill itself (read-only access to worktree files is allowed).

**4. Orchestrator pushes and creates PR:**

After all phases pass, the orchestrator pushes the branch and creates the PR. This is the only worktree `exec` the orchestrator runs: `git push` from the worktree directory.

```bash
cd ../uflow-wt/<ID>-<slug> && git push -u origin <branch>
```

Then creates the PR with `gh pr create` and tears down the worktree:

```bash
git worktree remove "../uflow-wt/<ID>-<slug>"
```

### Multi-ticket features (parallel workers)

When the feature flow produces multiple tickets (step 3), each ticket gets its own worktree. The orchestrator dispatches one worker subagent per ticket. Independent tickets (no unresolved blockers) can run as parallel background subagents.

```bash
TICKET_SLUG="<ID>-<ticket-number>-<short-name>"
git worktree add "../uflow-wt/${TICKET_SLUG}" -b "feature/${TICKET_SLUG}" main
```

Work the **frontier**: tickets whose blockers are all done can run in parallel. Tickets with unresolved blockers wait.

After a ticket passes review, tear down its worktree. If more tickets remain and their blockers are now clear, create the next worktree from the updated `main`.

If two ticket branches conflict on merge, invoke the `resolving-merge-conflicts` skill.

### Resuming an interrupted session

A new session resumes by:

1. Reading the tracking file at `agent-output/requests/<ID>-<slug>.md`.
2. Checking the worktree still exists (`git worktree list`); if not, recreating it from the branch.
3. Dispatching a new worker subagent to continue from where the previous session stopped.

---

## Rules

1. **Never skip TDD.** Every implementation phase invokes the `tdd` skill. Tests come before code. Agree on seams with the user before writing tests.
2. **Worktree-first.** Every session creates its own worktree and branch in Phase 0, before any code changes. The canonical repo never receives direct code edits.
3. **Subagent-enforced separation.** The orchestrator MUST dispatch code work to a worker subagent via `run_subagent`. The orchestrator must NOT call `edit`, `write`, or `exec` (except `git push` and `gh pr create`) on worktree files. If you find yourself about to edit a file under `../uflow-wt/`, stop. That's the worker's job.
4. **Track everything.** Every phase outcome goes into the tracking file.
5. **Gate between phases.** Use `ask_user_question` to confirm before moving to the next phase. Show: what was done, what's next, and any decisions needed.
6. **One request at a time.** Don't mix requests. If new work surfaces during this request, note it in the tracking file under `## Follow-up requests` and finish the current one first.
7. **Verify DB schema from Supabase, not local files** (workflow.mdc rule). When the work touches data validation, enums, or column constraints, verify against the actual database.
8. **Capture learnings.** After review and test, capture at least one learning. Append to `docs/ai/LEARNINGS.md`.
9. **Domain vocabulary.** When domain terms are fuzzy or new concepts appear, invoke the `domain-modeling` skill to sharpen them and update `CONTEXT.md`.
10. **Parallel subagents for independent work.** Use background subagents (`is_background: true`) for independent tickets or research. Use foreground subagents (`is_background: false`) when the result is needed before continuing.

## Skill reference

These are the skills the orchestrator delegates to. Invoke them with the `skill` tool using their name.

| Skill                       | When to invoke                                                             |
| --------------------------- | -------------------------------------------------------------------------- |
| `grilling`                  | Sharpening ideas, scoping, design decisions. Works in rounds of questions. |
| `tdd`                       | Every implementation phase. Red-green-refactor at pre-agreed seams.        |
| `code-review`               | After implementation. Two-axis review: Standards + Spec.                   |
| `diagnosing-bugs`           | Bug flow. 6-phase diagnosis with tight feedback loops.                     |
| `research`                  | Explore flow, fact-finding. Delegates to background subagent.              |
| `domain-modeling`           | When domain terms are fuzzy or new. Updates CONTEXT.md and ADRs.           |
| `codebase-design`           | When module boundaries or seams are in question. Deep-module vocabulary.   |
| `resolving-merge-conflicts` | When git conflicts arise during implementation.                            |

## What the orchestrator does NOT do

- Call `edit` or `write` on any file under `../uflow-wt/` (worker subagents do that)
- Call `exec` on worktree files except `git push` and `gh pr create`
- Run tests directly (the worker subagent does that)
- Make design decisions (those belong to the user)
- Skip confirmation gates
- Merge branches or push to remote (that's the user's call)
- Act on follow-up requests before the current one is done
