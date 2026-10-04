# Flow: exploration

```
Research -> Report -> Done
```

No worktree is created for this flow. The issue is still opened in Step 1 (label `question`): the research worker posts its findings there. Durable artifacts (research docs) go under `agent-output/artifacts/` and are referenced from the comment by path.

| Phase        | Subagent     | Skills     | What it does                                                                                                     |
| ------------ | ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **Research** | `analyst`    | `research` | Investigates against primary sources. Posts `### Phase: Research — Done` on the issue.                          |
| **Report**   | Orchestrator |            | Presents findings to the user.                                                                                   |
| **Done**     | Orchestrator |            | If actionable work surfaces, asks the user to start a new request.                                               |
