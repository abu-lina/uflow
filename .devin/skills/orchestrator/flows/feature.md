# Flow: feature

```
Grill -> Spec -> [Tickets] -> Implement -> Code Review -> QA -> Done
```

| Phase           | Subagent      | Skills                                                 | What it does                                                                                                                |
| --------------- | ------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Grill**       | `analyst`     | `grilling`, `domain-modeling`, `prototype` (if needed) | Interviews the user, sharpens the idea. Returns structured decisions and a spec draft in `## Decisions`.                    |
| **Spec**        | `analyst`     |                                                        | Writes the grilling output to `## Spec`. Gate: user confirms spec.                                                          |
| **Tickets**     | `analyst`     |                                                        | Multi-session work only. Breaks the spec into vertical slices under `.scratch/<slug>/issues/`. Gate: user confirms tickets. |
| **Implement**   | `implementer` | `tdd`, `codebase-design`                               | Red-green-refactor in the worktree. Commits, does not push. Updates `## Implementation notes`.                              |
| **Code Review** | `analyst`     | `code-review`                                          | Two-axis review (Standards + Spec) pinned to the branch's divergence from main. Updates `## Review findings`.               |
| **QA**          | `implementer` |                                                        | Runs the full test suite, verifies acceptance criteria. Updates `## QA results`.                                            |
| **Done**        | Orchestrator  |                                                        | Presents the summary.                                                                                                       |

Multi-ticket: each ticket gets its own worktree, fetched from main before creation. Work the frontier (tickets whose blockers are done). Independent tickets can run as parallel background subagents.
