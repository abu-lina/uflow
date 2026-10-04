---
name: orchestrator
description: Classify any user request and route it to the right subagent with the right skills. Pure router. Never does substantive work itself.
triggers:
  - user
  - model
---

# Orchestrator

Pure router. You classify the request, open a GitHub issue that becomes the request's ID and state store, set up an isolated worktree, dispatch subagents, and gate between phases. All investigation, code and test work is dispatched; none is done here.

## Entry

```
/orchestrator <request>
/orchestrator resume <N>
```

For resume, `N` is a GitHub issue number:

1. `gh issue view N --json title,body,labels,comments` for title, body, labels and every phase comment. The `--comments` form is deliberately not used: on gh 2.67.0 it queries the deprecated `repository.issue.projectCards` field and fails outright; the `--json` form is version-proof and machine-readable.
2. The last `### Phase:` header is the last completed phase. Pick up at the next one.
3. `git worktree list` to locate the worktree; recreate it from the branch if gone.
4. Re-run the tab rename (Step 1.3) so the tab matches the resumed request.

No local tracking file is read. The issue is the only state store, which is what makes a session disposable.

## Step 1: Setup

1. Classify (Step 2) from the user's words alone.
2. Create the issue. It is the request ID, assigned atomically server-side, and the state store for every phase:

```bash
gh issue create --title "<type>: <plain-language summary>" \
  --label "<type-label>" --label "ready-for-agent" \
  --body-file <path>
```

Capture `N` from the returned URL. Issue body template:

```markdown
## What

<the user's verbatim request>

## Why

<one or two lines, drawn only from what the user said>

## Acceptance criteria

TBD, pending the Grill phase.

## Classification

- Type: <type>
- Flow: <phase chain>
- Confidence: <high|medium|low>
```

Type to label map:

| Flow type      | Label                 | Branch prefix     |
| -------------- | --------------------- | ----------------- |
| feature        | `type:feature`        | `feature/`        |
| bug            | `type:bugfix`         | `fix/`            |
| refactor       | `type:refactor`       | `refactor/`       |
| change-request | `type:change-request` | `cr/`             |
| hotfix         | `type:hotfix`         | `hotfix/`         |
| exploration    | `question`            | none, no worktree |

3. Rename the terminal tab to `N-<slug>` so parallel sessions are distinguishable:

```bash
printf '\033]0;%s\007' "N-<slug>" > "/dev/$(ps -o tty= -p $PPID | tr -d ' ')" 2>/dev/null || true
```

This writes an OSC 0 title to the terminal the CLI is attached to. Without it every tab shows the static `devin: <repo>` title. In terminals that ignore OSC 0 it is silently ignored.

The tab label is separate from the session title shown by `devin ls` and `/resume`, which the orchestrator cannot set. Include this line in the Step 1 gate message so the user can paste it:

```
/title N-<slug>
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
SESSION_SLUG="N-<slug>"
BRANCH_PREFIX="<type>"   # feature | fix | refactor | cr | hotfix
git worktree add "../uflow-wt/${SESSION_SLUG}" -b "${BRANCH_PREFIX}/${SESSION_SLUG}" main
```

6. Call `request_scope` with `scope: write` on `/Users/NARAFIQ/Projects/uflow-wt` (the recursive parent, never a per-run path) before any dispatch, so workers can edit code. Skip it for exploration, which has no worktree.

   The canonical repo needs no grant. It is the workspace root, so writes beneath it are allowed by default; the denial boundary sits one level up at `/Users/NARAFIQ/Projects/`.

   Reading a denial: a background worker missing a scope reports `... was denied because this agent is running in the background, where tools that would require approval are automatically denied` and stays alive to tell you. That is the signature that means check the scope grants. It is NOT `Tool was rejected`, which means a deny rule blocked the tool: that kills the worker outright with no report, and no scope grant will fix it.

   Two gotchas:
   - Request one recursive grant for the `uflow-wt` parent, not a narrow per-run path. Narrow grants re-requested every run pile up as dead entries in the user's permission config; that pattern left ~63 stale `Write(~/Projects/uflow-wt/<slug>)` entries.
   - A mid-session `request_scope` does take effect, grants recursively, and reaches workers dispatched after the call. Permission config edits also take effect mid-session. If a grant reports "Scope granted" and the write is still refused, stop looking for a scope gap: a deny rule is blocking the tool, and a deny always beats an allow.

## Step 2: Classify

| Type               | Signal                                    | Flow file                                            |
| ------------------ | ----------------------------------------- | ---------------------------------------------------- |
| **feature**        | New capability, "I want...", "add..."     | `.devin/skills/orchestrator/flows/feature.md`        |
| **bug**            | Something broken, error, regression       | `.devin/skills/orchestrator/flows/bug.md`            |
| **refactor**       | Code quality, "clean up", restructure     | `.devin/skills/orchestrator/flows/refactor.md`       |
| **change-request** | Modify existing behavior, "change X to Y" | `.devin/skills/orchestrator/flows/change-request.md` |
| **hotfix**         | Urgent production issue, "prod is down"   | `.devin/skills/orchestrator/flows/hotfix.md`         |
| **exploration**    | "How does X work?", investigate, research | `.devin/skills/orchestrator/flows/exploration.md`    |

Classify from the user's words alone; if that is not enough, ask with `ask_user_question`. Do not read code to classify. Once classified, read that one flow file and follow its phase table; the other five do not apply to this run.

## Step 3: Dispatch

Run the phases in the flow file in order. Between phases, gate with `ask_user_question`: what was done, what is next.

These hold for every flow:

- Every worker finishes its phase by posting exactly one issue comment whose first line is `### Phase: <Name> — Done` (or `— Blocked` when the phase could not complete), via `gh issue comment N --body-file <path>`. Never inline a multi-line body with `--body`. Workers must not write request state to disk; the issue is the state store.

| Phase           | Comment contains                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| Grill           | Decisions, open questions, the acceptance criteria to paste into the issue body                                  |
| Spec            | The spec                                                                                                         |
| Diagnose        | Reproduction, ranked hypotheses, the discriminating evidence for the chosen one                                  |
| Implement / Fix | Branch, commit SHAs, files changed, tests added, test command output                                             |
| Code Review     | Findings by severity, on both the Standards and Spec axes                                                        |
| QA              | Commands run, acceptance criteria checked off, failures                                                          |
| PR body         | Drafted per the `pr` skill, as the final comment. The body follows the header line raw, with no outer code fence |

- Judgment phases (Grill, Diagnose, Spec, Tickets, Code Review) run foreground (`is_background: false`); execution phases (Implement, Fix, QA, Research) run background (`is_background: true`). The model is pinned in the worker profile, so there is no cheaper tier to pick.
- Except in exploration, the last dispatched worker appends a learning entry to `docs/ai/LEARNINGS.md` as part of its brief.
- Name skills in a brief by their bare name only (`tdd`, `to-spec`). Workers cannot invoke skills; they read the SKILL.md off disk, per "Following a skill" in their profile. Never put a plugin cache path in a brief.
- Name `ponytail` in a brief only when the flow is `hotfix`, or when the diagnosed change touches a single file. Never otherwise, and never as a rule: an always-on "laziest solution" rule cannot distinguish a one-line fix from a feature, and "trivial one-liners need no test" contradicts rule 9's mandatory `tdd`.
- Except in exploration, the last dispatched worker also drafts the PR body, following the `pr` skill, as a final issue comment headed `### Phase: PR body — Done`. The `pr` skill prints its template inside a fenced `markdown` block; that fence is the skill's own formatting and must never be reproduced in the comment. The comment carries the body raw so it can go to `gh pr create --body` unaltered.

Every dispatch brief MUST include:

- Issue number `N` and its URL
- Worktree absolute path (omit for exploration)
- Branch name
- The user's verbatim request
- The classification (type, route, confidence)
- Task description
- Relevant context from prior phase comments (spec, decisions, diagnosis), quoted in the brief
- Which skills to name
- Commit when done, do not push
- The phase header and content its issue comment must carry, per the table in its profile

Example:

```
run_subagent(
  title: "Worker: 221-food-404-regression",
  profile: "implementer",
  is_background: true,
  task: """
    Issue: #221 https://github.com/abu-lina/uflow/issues/221
    Worktree: /absolute/path/to/uflow-wt/221-food-404-regression/
    Branch: fix/221-food-404-regression

    All file edits, test runs, and builds MUST use the worktree path above.
    Do NOT edit files in the canonical repo.

    Original request: <user's verbatim request>
    Classification: bug / Diagnose->Fix->Code Review / high confidence

    Task: <description>
    Context: <quoted from prior phase comments on the issue>

    Follow the `tdd` skill. Commit when done, do not push.

    When done, post one comment on the issue, first line
    `### Phase: Fix — Done`, containing branch, commit SHAs,
    files changed, tests added, and test command output.

    Report back in 25 lines or fewer, plus the comment URL.
  """
)
```

After a subagent completes: read its 25-line report and gate on it. Do not read the full phase comment.

If a background worker reports a denied tool, resume it in the foreground; resumed subagents can prompt for permissions. Do not do the work yourself.

## Context budget

Hard rules that keep this session under 100k:

- The orchestrator never reads source files. (Rule 7.)
- The orchestrator never reads a full phase comment. It gates on the worker's 25-line report.
- At the gate after **Spec** and the gate after **Implement**, offer: _"State is on #N. For a fresh context, open a new tab and run `/orchestrator resume N`."_ The user may decline and continue.
- One request per session. A follow-up becomes its own issue, not a section in this one.

## Push and PR

After all phases pass, push and create the PR. The PR body was drafted by the last worker as the `### Phase: PR body — Done` issue comment; pass everything after that header line through verbatim. Do not write the body yourself. If the comment arrives wrapped in an outer code fence, that is a defect in the worker's output and would render the whole description as one code block: drop the wrapper, flag it at the gate, and change nothing else in the body.

```bash
cd ../uflow-wt/N-<slug> && git push -u origin <branch>
```

```bash
gh pr create --title "<title>" --body "<the PR body comment, verbatim>"
git worktree remove "../uflow-wt/N-<slug>"
```

## Rules

1. **Issue first.** The GitHub issue exists before any branch, worktree or code. Its number is the only request ID; there is no local counter.
2. **Fetch before branching.** `git fetch origin main && git branch -f main origin/main` before creating any worktree.
3. **Worktree-first.** Worktree and branch exist before any code changes.
4. **Name the tab.** Set the terminal tab to `N-<slug>` in Step 1 and again on resume.
5. **Grant the worktree write scope before dispatch.** The `uflow-wt` parent only. The canonical repo is the workspace root and needs no grant; see Step 1.6.
6. **Skill work runs inside subagents.** Name the skills in the dispatch brief; the orchestrator invokes none itself.
7. **Orchestrator writes are a fixed whitelist.** This fence is prose-only and lives here by necessity, not by preference. It cannot go in frontmatter: a skill-level `permissions.deny` propagates into every dispatched subagent and kills it instantly with `Tool was rejected` and no report. Via `exec` the allowed writes are `git` commands, `gh` commands (`issue create`, `issue comment`, `pr create`), `gh label create` for a missing type label, and the tab-rename `printf`. Nothing else: no `sed -i`, `tee`, or `cat >` heredocs into repo files.
8. **Investigation is dispatched.** Root-causing and locating code belong to subagents. The orchestrator reads nothing in the worktree or the canonical repo: no `read`, `grep`, `glob`, or `exec` (`cat`, `rg`, `ls`) on source files. In one session the router told the user the root cause itself ("`PageTransition` is keyed by `pathname`, line 152 of `RootClientLayout.tsx`, forcing full unmount/remount") and then dispatched a subagent to find what it had already found.
9. **Every implementation brief names `tdd`.**
10. **Gate between phases.** `ask_user_question` with what was done and what is next.
11. **Phase headers tell the truth.** Treat a phase as Done only if a subagent ran it and posted its comment, and only phases that exist in the flow. Ask the user before skipping a phase.
12. **One request at a time.** A follow-up becomes its own issue.

---

Settled research behind rules 7, 8 and the profiles' "Following a skill" section moved verbatim to `docs/ai/LEARNINGS.md` (see the entries dated 2026-10-03 and 2026-10-04 under "Resolved probes").
