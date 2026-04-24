# Parallel Copilot Sessions — Operator Guide

> Plan 042 · Workflow-only · No runtime impact

## TL;DR

Run multiple topics at once by giving each its own **VS Code window + git worktree + pre-assigned Plan ID**. Start in the **Orchestrator** from the canonical repo's control window, let it emit a **Session Bootstrap** block, then open each worker session in its own worktree.

---

## Default Workflow (Orchestrator-First)

Use this as the standard entry path.

### 1. In the control window, ask Orchestrator to preview or create the session

Single stream:

```text
I want to work on this in a parallel session from the control window.
Topic: <short-topic>
Please output a Session Bootstrap block only.
Do not execute commands.
```

Single stream with explicit setup:

```text
I want to work on this in a parallel session from the control window.
Topic: <short-topic>
Please create the parallel workstream for me now.
Set up the worktree, branch, and multi-root workspace.
Then give me the Initial Worker Prompt to paste into the new window.
```

Multiple streams:

```text
I want to split this into parallel workstreams from the control window.
Streams:
1. <stream-one>
2. <stream-two>
Please output one Session Bootstrap block per stream.
Do not execute commands.
```

### 2. Run the emitted bootstrap block in the control window

The block should allocate the Plan ID, create the worktree and branch, write the multi-root workspace file, print the `code ...` command, and include the Session Context Header.

If you explicitly asked Orchestrator to create the session, it should execute those setup steps in the control window and return the created paths plus the Initial Worker Prompt.

### 3. Open the new VS Code window and paste the Session Context Header first

Start the worker session by pasting the emitted Initial Worker Prompt as the first prompt. Then continue with Orchestrator or the specific downstream agent for that stream.

### 4. Repeat for the next topic

Once the first worker session is created, you can stay in the control window and ask Orchestrator to create the next parallel workstream. Each stream gets its own worktree, branch, and worker prompt.

---

## Manual Bootstrap Reference (<2 minutes per session)

Use this if you want to run the bootstrap steps yourself instead of having Orchestrator print them for you.

### 1. Allocate a Plan ID (control window only)

```bash
# In the canonical uflow checkout (control window)
NEXT_ID=$(cat agent-output/.next-id)
echo $((NEXT_ID + 1)) > agent-output/.next-id
echo "Allocated Plan ID: $NEXT_ID"
```

### 2. Create a worktree + branch

```bash
SESSION="S${NEXT_ID}-<short-topic>"   # e.g. S043-auth-fix
mkdir -p ../uflow-wt
git worktree add "../uflow-wt/${SESSION}" -b "session/${NEXT_ID}-<short-topic>"
```

### 3. Create the multi-root workspace file

```bash
cat > "../uflow-wt/${SESSION}/${SESSION}.code-workspace" << EOF
{
  "folders": [
    { "path": "." },
    { "path": "/Users/NARAFIQ/01 Personal/Projects/.agent" }
  ],
  "settings": {
    "window.title": "${SESSION} — \${activeEditorShort}"
  }
}
EOF
```

> Adjust the `.agent` path if your clone lives elsewhere.

### 4. Open the workspace in a new window

```bash
code "../uflow-wt/${SESSION}/${SESSION}.code-workspace"
```

### 5. Paste the Session Context Header in your first worker prompt

```
Session: S<plan-id>-<topic>
Root: /path/to/uflow-wt/S<plan-id>-<topic>
Workspace: <worktree root> + <shared .agent root>
Branch: session/<plan-id>-<topic>
Artifacts: agent-output/<domain>/<plan-id>-...
Scope: Do not read/write outside this worktree and referenced artifacts.
Lifecycle: Do not allocate new IDs or update agent-output/.next-id outside the control window.
```

Recommended first worker prompt:

```text
Session: S<plan-id>-<topic>
Root: /path/to/uflow-wt/S<plan-id>-<topic>
Workspace: <worktree root> + <shared .agent root>
Branch: session/<plan-id>-<topic>
Artifacts: agent-output/<domain>/<plan-id>-...
Scope: Do not read/write outside this worktree and referenced artifacts.
Lifecycle: Do not allocate new IDs or update agent-output/.next-id outside the control window.

Use Orchestrator to continue this stream.
Task: <what this session should do>
```

If the control-window request included screenshots, logs, or other attachments, add a short digest because those attachments do not automatically exist in the new worker conversation:

```text
Attachment Digest:
- Screenshot 1: <what it shows>
- Screenshot 2: <what it highlights>
```

---

## Roles

| Window                                  | Responsibilities                                                                             | Must NOT do                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Control window** (canonical `uflow/`) | Allocate Plan IDs, update `.next-id`, create/transition lifecycle docs under `agent-output/` | Run topic-specific code changes that could conflict with other sessions                              |
| **Worker window** (worktree)            | Topic-specific coding, investigation, tool execution                                         | Allocate new Plan IDs, edit `.next-id`, create lifecycle docs without handing back to control window |

---

## Naming Conventions

| Item            | Pattern                           | Example                        |
| --------------- | --------------------------------- | ------------------------------ |
| Session label   | `S<plan-id>-<short-topic>`        | `S043-auth-fix`                |
| Worktree folder | `../uflow-wt/<session-label>/`    | `../uflow-wt/S043-auth-fix/`   |
| Branch          | `session/<plan-id>-<short-topic>` | `session/043-auth-fix`         |
| Workspace file  | `<session-label>.code-workspace`  | `S043-auth-fix.code-workspace` |

---

## Why Multi-Root?

Each worker session must include the shared `.agent` root so the Orchestrator's Layer 3 dynamic skill catalog remains available. Without it, catalog skills are silently unavailable.

**Fallback (single-folder) mode**: Allowed but the Workflow Card should show `Catalog: (none)` or a warning so the limitation is visible.

---

## Common Failure Modes

| Problem                     | Symptom                                                                     | Recovery                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Duplicate Plan ID**       | Two sessions create artifacts with the same ID                              | Delete the erroneous artifact from the worker worktree. Re-create it in the control window under the correct Plan ID. Verify `.next-id` in control window. |
| **Worker allocates new ID** | `.next-id` in the worktree diverges from the canonical repo                 | Discard the worktree's `.next-id` change. Use the control window to allocate the next ID.                                                                  |
| **Missing catalog skills**  | Workflow Card shows `Catalog: (none)`                                       | Ensure the `.agent` root is included in the session's `.code-workspace` file.                                                                              |
| **Wrong-root file edits**   | Agent edits a file in `.agent/` instead of `uflow` worktree (or vice versa) | The Session Context Header's scope guardrail should prevent this. If it happens, undo the edit and re-prompt with an explicit path.                        |
| **Session branch CONFLICTING at Stage 2 PR** | `gh pr view <n> --json mergeable` returns `CONFLICTING` even though no real code conflict exists | The session branch contains original commits for a previous plan that was already squash-merged into `origin/main`. Use the **Fresh-Branch Release Strategy** below. |

---

## Squash-Merge Worktree Conflict — Fresh-Branch Release Strategy

> Documented in Retrospective 098 (2026-04-24). **This pattern recurs in every worktree session that spans a previous squash-merge PR.**

### Root Cause

When a session branch (`session/<N>-<topic>`) is active across a squash-merge PR for a prior plan (e.g., PR #155 squash-merges Plans 096+097 as a single commit on `origin/main`), the session branch still contains the original commits for those plans as distinct history. This makes the session branch appear to diverge from `main` at the squash point:

```
bca5937e (origin/main) ← squash commit of Plans 096+097
 \
  <original Plan 096 commit>    ← still in session branch history
  <original Plan 097 commit>    ← still in session branch history
  <new Plan 098 commit>         ← actual new work
```

A PR from `session/96-...` → `main` asks GitHub to merge all three commits, including the two that are already on main — GitHub reports `CONFLICTING`.

### Detection

At Stage 2, after pushing the session branch and opening a PR:

```bash
gh pr view <pr-number> --json mergeable,mergeStateStatus
# "mergeable": "CONFLICTING"  ← apply this remedy
# "mergeable": "MERGEABLE"    ← normal path, proceed
```

### Remedy: Fresh-Branch Release Strategy

```bash
# 1. Fetch latest origin/main
git fetch origin

# 2. Create a clean release branch from origin/main (no ghost history)
git checkout -b release/vX.Y.Z origin/main

# 3. Copy final file state from session branch (no commit history imported)
git checkout <session-branch> -- <file1> <file2> <file3> ...

# 4. Untrack any build-generated files that are now gitignored
git rm <build-generated-file>        # only if applicable

# 5. Single release commit — all plans in one squashable unit
git commit -m "feat(release): vX.Y.Z — <plan summaries>"

# 6. Push the release branch (not the session branch)
git push origin release/vX.Y.Z

# 7. Close the conflicting PR, open a new one from the clean branch
gh pr close <old-pr-number> --comment "Superseded by #<new-pr-number> (release/vX.Y.Z — conflict-free)"
gh pr create --base main --head release/vX.Y.Z --title "..."

# 8. Verify mergeability, then merge + tag
gh pr view <new-pr-number> --json mergeable    # expect MERGEABLE
gh pr merge <new-pr-number> --squash
git fetch origin --tags
git tag -a vX.Y.Z origin/main -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### Why not cherry-pick or rebase?

- `git rebase origin/main` replays all session commits (including the ghost Plan 096/097 commits) and hits conflicts in `CHANGELOG.md`, version files, and translation files.
- `git cherry-pick` of individual commits is fragile when many files changed across multiple plans.
- The `git checkout <session-branch> -- <files>` approach copies only the **final file state** — no history import, no conflict surface.

### Evidence from Session S96

| Attempt | Result |
|---------|--------|
| PR #158 from `session/96-meal-search-was` | `CONFLICTING` |
| PR #160 from `release/v0.10.25` (fresh branch) | `MERGEABLE` |

**Overhead**: ~15 minutes to apply. Worthwhile at every release; do not attempt to fight the rebase.

---

## Teardown

When a session's work is complete and merged:

```bash
# From any directory
git worktree remove "../uflow-wt/S043-auth-fix"
git branch -d session/043-auth-fix
```

---

## Open Items (Pending Operator Validation)

These are documented in Analysis 042 and will be confirmed during first real parallel usage:

1. Can two VS Code windows run Copilot tool actions concurrently, or are they serialized?
2. Do any Copilot features leak state across windows (memory, indexing, prompt history)?
3. What are realistic account-level rate limits during multi-window usage?

Record findings in the Plan 042 changelog after testing.
