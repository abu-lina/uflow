# Parallel Copilot Sessions — Operator Guide

> Plan 042 · Workflow-only · No runtime impact

## TL;DR

Run multiple topics at once by giving each its own **VS Code window + git worktree + pre-assigned Plan ID**. One "control window" on the canonical repo owns lifecycle state; worker windows do topic work only.

---

## Quick Start (<2 minutes per session)

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

### 5. Paste the Session Context Header in your first prompt

```
Session: S<plan-id>-<topic>
Root: /path/to/uflow-wt/S<plan-id>-<topic>
Workspace: <worktree root> + <shared .agent root>
Branch: session/<plan-id>-<topic>
Artifacts: agent-output/<domain>/<plan-id>-...
Scope: Do not read/write outside this worktree and referenced artifacts.
Lifecycle: Do not allocate new IDs or update agent-output/.next-id outside the control window.
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
