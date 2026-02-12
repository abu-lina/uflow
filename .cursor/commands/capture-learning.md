# Capture Learning

Run after review/test to turn one iteration into a persisted learning and optional rule/command/agent updates. **Derive the learning automatically from context; do not ask the user to paste.**

## Usage

```
@capture-learning.md
```

Run this command after each chunk (plan → build → review → test). **Do not ask for pasted input.** Use the current conversation context to derive the learning:

- **What changed**: Infer from recent file edits, diffs, or described changes in chat.
- **What went wrong or was missed**: Infer from test failures, review feedback, bugs fixed, or edge cases discussed.
- **The fix**: Infer from the code or conversation (what was added, corrected, or decided).

If the conversation has no clear iteration (no recent changes, tests, or review), output: **No learning this iteration** with one sentence why, and stop. Otherwise produce the three outputs below.

## What you must produce

### 1. Learning entry (for docs/ai/LEARNINGS.md)

Output a single entry in this format. Keep it short.

```markdown
### YYYY-MM-DD — [short context, e.g. "Provider modal empty state"]
- **Context**: [1 sentence]
- **Learning**: [what we learned]
- **Change to prevent repeat**: [1–3 bullets: rule/command/acceptance criteria]
- **Task/PR**: [Notion link or PR number if applicable]
```

### 2. Classification (where to persist)

Pick exactly one primary destination:

| Type | Destination | When to use |
|------|-------------|-------------|
| **Task-specific** | Notion task (acceptance criteria / description) | Learning applies only to this feature/bug. |
| **Guardrail / expert** | `.cursor/rules/*.mdc` (add 1 bullet) | Repeated checklist miss (e.g. empty states, RLS, a11y). |
| **Workflow / command** | `.cursor/commands/*.md` (add step or checklist) | Review/refine/test workflow should always check X. |
| **Coaching habit** | `.cursor/agents/ai-ide-workflow-coach.md` | Pacing, tool choice, or "when to slow down." |

If the learning also deserves a test or code change, say so; prefer code over rules when the fix is in tests/types.

### 3. Proposed diff(s)

For the chosen destination, output a **small, reviewable diff** (unified diff or clear before/after). Rules:

- Add at most 1–3 bullets or 1 short paragraph per file.
- Do not auto-apply; the user reviews and applies.
- Prefer one targeted edit over multiple files.

If the destination is "Notion task," output the exact text to paste into the task (acceptance criteria or description section).

## Classification rules (consistent choices)

- **Feature/bug-specific** (e.g. "this modal needs offline handling") → Task-specific → Notion.
- **Repeated checklist miss** (e.g. "we keep forgetting empty state") → Guardrail → relevant expert rule (e.g. `frontend-expert.mdc`, `qa-expert.mdc`).
- **Review or refine missed something** (e.g. "review should always check migrations") → Workflow → update `code-review.md` or `refine-task.md`.
- **Pacing or tool choice** (e.g. "plan before editing when >3 files") → Coaching → `ai-ide-workflow-coach.md`.

## Output format (concise)

1. **Learning entry** — ready to append to `docs/ai/LEARNINGS.md`.
2. **Classification** — one line: e.g. "Guardrail → frontend-expert.mdc".
3. **Proposed diff** — patch or before/after for that file (or paste-ready text for Notion).

User reviews and applies; do not edit `.cursor/*` or Notion automatically.
