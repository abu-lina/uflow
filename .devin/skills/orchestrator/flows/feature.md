# Flow: feature

```
Grill -> Spec -> [Tickets] -> Implement -> Code Review -> QA -> Done
```

| Phase           | Subagent      | Skills                                                 | What it does                                                                                                                                                   |
| --------------- | ------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Grill**       | `analyst`     | `grilling`, `domain-modeling`, `prototype` (if needed) | Interviews the user, sharpens the idea. Posts `### Phase: Grill — Done` with decisions, open questions and the acceptance criteria.                            |
| **Spec**        | `analyst`     | `to-spec`                                              | Posts `### Phase: Spec — Done` with the spec. Gate: user confirms the spec.                                                                                    |
| **Tickets**     | `analyst`     | `to-tickets`                                           | Multi-session work only. Breaks the spec into vertical slices as GitHub issues via `gh`, with native blocking links between them. Gate: user confirms tickets. |
| **Implement**   | `implementer` | `tdd`, `codebase-design`                               | Red-green-refactor in the worktree. Commits, does not push. Posts `### Phase: Implement — Done`.                                                               |
| **Code Review** | `analyst`     | `code-review-standards`, `code-review-checklist`       | Two-axis review (Standards + Spec) pinned to the branch's divergence from main. Posts `### Phase: Code Review — Done`.                                         |
| **QA**          | `implementer` |                                                        | Runs the full test suite, verifies acceptance criteria. Posts `### Phase: QA — Done`.                                                                          |
| **Done**        | Orchestrator  |                                                        | Presents the summary.                                                                                                                                          |

Multi-ticket: each ticket gets its own worktree, fetched from main before creation. Work the frontier (tickets whose blockers are done). Independent tickets can run as parallel background subagents.
