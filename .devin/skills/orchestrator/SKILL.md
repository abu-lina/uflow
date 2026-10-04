---
name: orchestrator
description: Classify any user request and route it to the right subagent with the right skills. Pure router. Never does substantive work itself.
triggers:
  - user
  - model
---

# Orchestrator

Pure router. You classify the request, set up an isolated worktree, dispatch subagents, and gate between phases. All investigation, code and test work is dispatched; none is done here.

## Entry

```
/orchestrator <request>
/orchestrator resume <ID>
```

For resume: read `agent-output/requests/<ID>-*.md`, check `git worktree list`, and pick up at the last recorded phase. If the worktree is gone, recreate it from the branch. Re-run the tab rename (Step 1.3) so the tab matches the resumed request.

## Step 1: Setup

1. Read `agent-output/.next-id`, increment, write back via `exec` (see rule 6).
2. Classify (Step 2).
3. Rename the terminal tab to `<ID>-<slug>` so parallel sessions are distinguishable:

```bash
printf '\033]0;%s\007' "<ID>-<slug>" > "/dev/$(ps -o tty= -p $PPID | tr -d ' ')" 2>/dev/null || true
```

This writes an OSC 0 title to the terminal the CLI is attached to. Without it every tab shows the static `devin: <repo>` title. In terminals that ignore OSC 0 it is silently ignored.

The tab label is separate from the session title shown by `devin ls` and `/resume`, which the orchestrator cannot set. Include this line in the Step 1 gate message so the user can paste it:

```
/title <ID>-<slug>
```

4. Fetch latest main:

```bash
git fetch origin main
git branch -f main origin/main
```

If that fails because main is checked out:

```bash
git checkout main && git pull origin main --ff-only
```

5. Create worktree (all flows except exploration):

```bash
mkdir -p ../uflow-wt
SESSION_SLUG="<ID>-<slug>"
BRANCH_PREFIX="<type>"   # feature | fix | refactor | cr | hotfix
git worktree add "../uflow-wt/${SESSION_SLUG}" -b "${BRANCH_PREFIX}/${SESSION_SLUG}" main
```

6. Call `request_scope` with `scope: write` on the absolute worktree path before any dispatch, so workers can edit code. Skip it for exploration, which has no worktree.

   The canonical repo needs no grant. It is the workspace root, so writes beneath it, including the tracking file under `agent-output/`, are allowed by default; the denial boundary sits one level up at `/Users/NARAFIQ/Projects/`. Request 284 probed this with the skill both inactive and active and got the same result each time.

   Reading a denial: every worker's first action is a tracking-file write, and both profiles instruct it to stop if that write is denied. A background worker missing a scope reports `... was denied because this agent is running in the background, where tools that would require approval are automatically denied` and stays alive to tell you. That is the signature that means check the scope grants. It is NOT `Tool was rejected`, which means a deny rule blocked the tool: that kills the worker outright with no report, and no scope grant will fix it.

   Two gotchas:
   - Request one recursive grant for the `uflow-wt` parent, not a narrow per-run path. Narrow grants re-requested every run pile up as dead entries in the user's permission config; that pattern left ~63 stale `Write(~/Projects/uflow-wt/<slug>)` entries.
   - A mid-session `request_scope` does take effect, grants recursively, and reaches workers dispatched after the call. Permission config edits also take effect mid-session. If a grant reports "Scope granted" and the write is still refused, stop looking for a scope gap: a deny rule is blocking the tool, and a deny always beats an allow.

7. Seed the tracking file via `exec` (see rule 6): `cp .devin/skills/orchestrator/request-template.md agent-output/requests/<ID>-<slug>.md`. Workers fill its sections during the run, per their briefs. The file lives in the canonical repo; all code changes happen in the worktree.

## Step 2: Classify

| Type               | Signal                                    | Branch prefix | Flow file                                            |
| ------------------ | ----------------------------------------- | ------------- | ---------------------------------------------------- |
| **feature**        | New capability, "I want...", "add..."     | `feature/`    | `.devin/skills/orchestrator/flows/feature.md`        |
| **bug**            | Something broken, error, regression       | `fix/`        | `.devin/skills/orchestrator/flows/bug.md`            |
| **refactor**       | Code quality, "clean up", restructure     | `refactor/`   | `.devin/skills/orchestrator/flows/refactor.md`       |
| **change-request** | Modify existing behavior, "change X to Y" | `cr/`         | `.devin/skills/orchestrator/flows/change-request.md` |
| **hotfix**         | Urgent production issue, "prod is down"   | `hotfix/`     | `.devin/skills/orchestrator/flows/hotfix.md`         |
| **exploration**    | "How does X work?", investigate, research | (no worktree) | `.devin/skills/orchestrator/flows/exploration.md`    |

Classify from the user's words alone; if that is not enough, ask with `ask_user_question`. Do not read code to classify. Once classified, read that one flow file and follow its phase table; the other five do not apply to this run.

## Step 3: Dispatch

Run the phases in the flow file in order. Between phases, gate with `ask_user_question`: what was done, what is next.

These hold for every flow:

- The first dispatched worker writes `## Original request` and `## Classification` into the tracking file before anything else; both profiles enforce this.
- Tracking-file updates belong to the worker that ran the phase. The orchestrator only reads it.
- Judgment phases (Grill, Diagnose, Spec, Tickets, Code Review) run foreground (`is_background: false`); execution phases (Implement, Fix, QA, Research) run background (`is_background: true`). The model is pinned in the worker profile, so there is no cheaper tier to pick.
- Except in exploration, the last dispatched worker appends a learning entry to `docs/ai/LEARNINGS.md` as part of its brief.
- Name skills in a brief by their bare name only (`tdd`, `to-spec`). Workers resolve them, by the `skill` tool when reachable and by reading the SKILL.md off disk when not. Never put a plugin cache path in a brief.
- Except in exploration, the last dispatched worker also drafts the PR body into `## PR body` in the tracking file, following the `pr` skill.

Every dispatch brief MUST include:

- Worktree absolute path (omit for exploration)
- Branch name
- The user's verbatim request
- The classification (type, route, confidence)
- Task description
- Relevant context from the tracking file (spec, decisions, diagnosis)
- Which skills to invoke
- Commit when done, do not push
- Which tracking-file section to update before reporting

Example:

```
run_subagent(
  title: "Worker: 221-food-404-regression",
  profile: "implementer",
  is_background: true,
  task: """
    Worktree: /absolute/path/to/uflow-wt/221-food-404-regression/
    Branch: fix/221-food-404-regression

    All file edits, test runs, and builds MUST use the worktree path above.
    Do NOT edit files in the canonical repo, except the tracking file
    agent-output/requests/221-food-404-regression.md.

    Original request: <user's verbatim request>
    Classification: bug / Diagnose->Fix->Code Review / high confidence

    Task: <description>
    Context: <from tracking file>

    Invoke the `tdd` skill. Commit when done, do not push.

    Before reporting, update `## Implementation notes` in the tracking file
    with branch, commit SHA, files changed, tests added, test output.

    Report back: files changed, tests added, test results, decisions made.
  """
)
```

After a subagent completes: read its report, verify it updated the tracking file, proceed to the next phase.

If a background worker reports a denied tool, resume it in the foreground; resumed subagents can prompt for permissions. Do not do the work yourself.

## Push and PR

After all phases pass, push and create the PR. The PR body was drafted by the last worker into `## PR body` in the tracking file; read that section and pass it through. Do not write the body yourself.

```bash
cd ../uflow-wt/<ID>-<slug> && git push -u origin <branch>
```

```bash
gh pr create --title "<title>" --body "<the ## PR body section, verbatim>"
git worktree remove "../uflow-wt/<ID>-<slug>"
```

## Rules

1. **Fetch before branching.** `git fetch origin main && git branch -f main origin/main` before creating any worktree.
2. **Worktree-first.** Worktree and branch exist before any code changes.
3. **Name the tab.** Set the terminal tab to `<ID>-<slug>` in Step 1 and again on resume.
4. **Grant the worktree write scope before dispatch.** The worktree path only. The canonical repo is the workspace root and needs no grant; see Step 1.6.
5. **Skill work runs inside subagents.** Name the skills in the dispatch brief; the orchestrator invokes none itself.
6. **Orchestrator writes are a fixed whitelist.** This fence is prose-only and lives here by necessity, not by preference. It cannot go in frontmatter: a skill-level `permissions.deny` propagates into every dispatched subagent and kills it instantly with `Tool was rejected` and no report. Via `exec` the allowed writes are `git` commands, `gh pr create --body`, the `.next-id` increment, the tracking-file `cp`, and the tab-rename `printf`. Nothing else: no `sed -i`, `tee`, or `cat >` heredocs into repo files.
7. **Investigation is dispatched.** Root-causing and locating code belong to subagents. The orchestrator reads under `agent-output/` (that is how it picks up state on resume) and nothing else: no `read`, `grep`, `glob`, or `exec` (`cat`, `rg`, `ls`) on source files in the worktree or the canonical repo. In one session the router told the user the root cause itself ("`PageTransition` is keyed by `pathname`, line 152 of `RootClientLayout.tsx`, forcing full unmount/remount") and then dispatched a subagent to find what it had already found.
8. **Every implementation brief invokes `tdd`.**
9. **Gate between phases.** `ask_user_question` with what was done and what is next.
10. **Tracking tells the truth.** Mark a phase Done only if a subagent ran it, and only phases that exist in the flow. `agent-output/requests/268-remove-create-chat-hint.md` logged "Implement, Done, commit dc1bf61f" and "Code review, Done" with zero dispatches and an invented "Locate the hint" phase. Ask the user before skipping a phase.
11. **One request at a time.** New work goes under `## Follow-up requests` in the tracking file.

Resolved (2026-10-03, request 284): a skill-level `permissions.deny` DOES propagate into dispatched subagents and is fatal to them. Five dispatches before invoking this skill all survived; both `subagent_general` dispatches after invoking it died with `Tool was rejected` and no report; a read-only `subagent_explore` dispatch still succeeded, ruling out a broken harness. The frontmatter block is therefore deleted and rule 6 carries the fence in prose. The same probes showed `request_scope` works, recursively, including for workers dispatched after the call. See `docs/ai/LEARNINGS.md` entry 284b. Verified 2026-10-04 by re-running the discriminating probe with the block removed: a background `subagent_general` dispatched after invoking this skill survived and wrote successfully, and the router kept its own `edit` and `write` tools.

Resolved (2026-10-04): worker profiles' `allowed-tools` is a true restriction, so until `skill` was added to it, dispatched workers had exactly `edit, exec, find_file_by_name, grep, read, write` and no `skill` tool: every "invoke the X skill" line in every brief was a silent no-op. Subagent profiles are frozen at session start; removing `write`/`edit`/`exec` from `analyst.md` mid-session left a freshly dispatched analyst still holding all three, so profile edits need a CLI restart before they can be tested. Whether `skill` is a grantable `allowed-tools` name is still UNVERIFIED and needs a post-restart probe; if it turns out not to be grantable, the fallback is to drop `allowed-tools` from the profiles entirely (it defaults to all tools) and keep the analyst's read-only-source constraint in prose. 16 of 27 mattpocock skills are `disable-model-invocation: true` and can never be reached by the `skill` tool; the on-disk read path in each profile's "Following a skill" section is the only route to those.
