# Flow: exploration

```
Research -> Report -> Done
```

No worktree is created for this flow. The canonical-repo write scope (Step 1.6) is still required: the research worker writes findings under `agent-output/`.

| Phase        | Subagent     | Skills     | What it does                                                                             |
| ------------ | ------------ | ---------- | ---------------------------------------------------------------------------------------- |
| **Research** | `analyst`    | `research` | Investigates against primary sources, writes findings to Markdown under `agent-output/`. |
| **Report**   | Orchestrator |            | Presents findings to the user.                                                           |
| **Done**     | Orchestrator |            | If actionable work surfaces, asks the user to start a new request.                       |
