# Flow: refactor

```
Grill -> Implement -> Code Review -> Done
```

| Phase           | Subagent      | Skills                        | What it does                                                          |
| --------------- | ------------- | ----------------------------- | --------------------------------------------------------------------- |
| **Grill**       | `analyst`     | `grilling`, `codebase-design` | Clarifies scope, constraints, and what must NOT change.               |
| **Implement**   | `implementer` | `tdd`                         | Characterization tests first, then refactor, verify tests still pass. |
| **Code Review** | `analyst`     | `code-review`                 | Reviews for behavior preservation and no scope creep.                 |
| **Done**        | Orchestrator  |                               | Presents the summary.                                                 |
