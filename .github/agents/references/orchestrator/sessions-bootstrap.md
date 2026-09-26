## Session Start Protocol

1. **Sync main (MANDATORY)**: Run `git pull origin main` in the control window to ensure the local main branch is up-to-date before any work begins or worktrees are created. If there are uncommitted local changes, warn the user and halt until resolved.
2. Load `document-lifecycle` skill and `memory-contract` skill (MANDATORY)
3. Retrieve uflow memory for prior workflow context
4. Read `agent-output/.next-id` to understand current document state
5. Scan `agent-output/` subdirectories for in-progress work
6. **Release-ready stall detection (MANDATORY)**: Identify any plans with Status `UAT Approved` that are not yet `Committed`/`Released`. Surface them explicitly as "Ready for DevOps" and suggest handoff to `⑨ DevOps`. Note: long delays increase version drift and coordination cost.
7. If resuming an existing workflow, display the current Workflow Card with updated status
8. If starting fresh, proceed to Task Classification

---

## Parallel Session Awareness (Plan 042)

When operating inside a **parallel worker session** (a git worktree opened in a separate VS Code window), the following guardrails apply:

### Detecting a Worker Session

- If the user provides a **Session Context Header** (begins with `Session: S<id>-<topic>`), you are in a worker session.
- If the workspace root differs from the canonical `uflow/` checkout, you are likely in a worktree.

### Worker Session Constraints

- **Do NOT allocate new Plan IDs** — the control window owns `agent-output/.next-id`.
- **Do NOT create or transition lifecycle documents** under `agent-output/` unless the Session Context Header explicitly authorizes it and provides the pre-assigned Plan ID.
- **Do NOT read/write outside the declared worktree root** and the shared `.agent` root.
- **Include the Session Context Header** in every handoff prompt to downstream agents so they inherit the same constraints.

### Session Context Header Format

When present, relay this header verbatim in every handoff:

```
Session: S<plan-id>-<topic>
Root: <absolute path to worktree>
Workspace: <worktree root> + <shared .agent root>
Branch: session/<plan-id>-<topic>
Artifacts: agent-output/<domain>/<plan-id>-...
Scope: Do not read/write outside this worktree and referenced artifacts.
Lifecycle: Do not allocate new IDs or update agent-output/.next-id outside the control window.
```

### Control Window Behavior

If no Session Context Header is present and the workspace is the canonical `uflow/` checkout, you are in the **control window**. Normal lifecycle operations (ID allocation, artifact creation, status transitions) proceed as usual.

See `docs/ai/parallel-sessions.md` for the full operator guide.

---

## Session Bootstrap (Control Window Only)

If (and only if) you are in the **control window** and the task would benefit from **parallel workstreams**, you SHOULD propose creating one or more **worker sessions**.

### When to Propose a Worker Session

- The user explicitly asks for parallel work (multiple topics at once).
- The task naturally splits into independent streams (e.g., “bugfix + docs”, “refactor + tests”, “investigate + implement”).

### Bootstrap Modes

The Orchestrator supports two modes:

- **Preview mode**: Output a **Session Bootstrap block** the operator can run.
- **Explicit auto-bootstrap mode**: If the user explicitly asks Orchestrator to create or set up the parallel workstream, execute the bootstrap steps in the control window and return the results.

Do **NOT** auto-execute bootstrap unless the user clearly asks for creation or setup.

In either mode, the bootstrap result MUST:

- Allocate a Plan ID (control window owns `agent-output/.next-id`).
- Create a **git worktree + branch** for the session.
- Create a **multi-root** `.code-workspace` file (worktree + shared `.agent` root).
- Provide the `code ...` command to open a **new VS Code window**.
- Provide the **Session Context Header** to paste as the first prompt in the worker window.
- Provide an **Initial Worker Prompt** that includes a compact task summary and any relevant attachment digest because attachments from the control-window conversation do not carry into the new worker conversation automatically.

### Explicit Auto-Bootstrap Triggers

Treat the request as authorization to execute bootstrap if the user says things like:

- "create the parallel workstream"
- "set up the session"
- "do the bootstrap"
- "open a parallel worker for this"

If the user only asks to plan or preview, stay in preview mode.

**Template (operator-run):**

```bash
# Control window only

# Step 1: Sync main to ensure the worktree branches from the latest code
git pull origin main

NEXT_ID=$(cat agent-output/.next-id)
while find agent-output/ -name "${NEXT_ID}-*" -type f 2>/dev/null | grep -q .; do
  NEXT_ID=$((NEXT_ID + 1))
done
echo $((NEXT_ID + 1)) > agent-output/.next-id

SESSION="S${NEXT_ID}-<short-topic>"   # e.g. S044-auth-fix
AGENT_ROOT="/Users/NARAFIQ/01 Personal/Projects/.agent"  # adjust if needed

mkdir -p ../uflow-wt
git worktree add "../uflow-wt/${SESSION}" -b "session/${NEXT_ID}-<short-topic>"

cat > "../uflow-wt/${SESSION}/${SESSION}.code-workspace" << EOF
{
  "folders": [
    { "path": "." },
    { "path": "${AGENT_ROOT}" }
  ],
  "settings": {
    "window.title": "${SESSION} — \\${activeEditorShort}"
  }
}
EOF

code "../uflow-wt/${SESSION}/${SESSION}.code-workspace"
```

Then output the Session Context Header:

```
Session: S<plan-id>-<topic>
Root: <absolute path to worktree>
Workspace: <worktree root> + <shared .agent root>
Branch: session/<plan-id>-<topic>
Artifacts: agent-output/<domain>/<plan-id>-...
Scope: Do not read/write outside this worktree and referenced artifacts.
Lifecycle: Do not allocate new IDs or update agent-output/.next-id outside the control window.
```

Then output an Initial Worker Prompt of this form:

```text
Session: S<plan-id>-<topic>
Root: <absolute path to worktree>
Workspace: <worktree root> + <shared .agent root>
Branch: session/<plan-id>-<topic>
Artifacts: agent-output/<domain>/<plan-id>-...
Scope: Do not read/write outside this worktree and referenced artifacts.
Lifecycle: Do not allocate new IDs or update agent-output/.next-id outside the control window.

Use Orchestrator to continue this stream.
Task Summary: <short problem statement>
Attachment Digest:
- <attachment 1 summary>
- <attachment 2 summary>
Requested Outcome: <what this stream should accomplish>
```

### Execution Safeguards For Auto-Bootstrap

When running explicit auto-bootstrap in the control window:

- Echo exactly what was created: Plan ID, session label, branch, worktree path, workspace file path.
- Stop after setup. Do not continue into analysis or implementation in the control-window thread unless the user asks.
- If bootstrap command execution fails, report the failing step and fall back to preview mode with a runnable block.

---
