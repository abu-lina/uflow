# Flow: exploration

```
Research -> Report -> Done
```

No worktree is created for this flow. The issue is still opened in Step 1 (label `question`): the research worker posts its findings there. Durable artifacts (research docs) go under `agent-output/artifacts/` and are referenced from the comment by path.

Exploration has no branch, so its learning cannot ride a docs PR. The research comment carries it under a `## Learning` heading instead, and the issue gets the `learning-pending` label so a later docs sweep can find it and move the entry into `docs/ai/LEARNINGS.md`. Create the label on first use: `gh label create learning-pending --description "research comment holds a LEARNINGS entry not yet swept to docs"`.

| Phase        | Subagent     | Skills     | What it does                                                                           |
| ------------ | ------------ | ---------- | -------------------------------------------------------------------------------------- |
| **Research** | `analyst`    | `research` | Investigates against primary sources. Posts `### Phase: Research — Done` on the issue. |
| **Report**   | Orchestrator |            | Presents findings to the user.                                                         |
| **Done**     | Orchestrator |            | If actionable work surfaces, asks the user to start a new request.                     |
