# Flow: refactor

```
Grill -> Implement -> Code Review -> Done
```

| Phase           | Subagent      | Skills                                           | What it does                                                                                               |
| --------------- | ------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Grill**       | `analyst`     | `grilling`, `codebase-design`                    | Clarifies scope, constraints, and what must NOT change. Posts `### Phase: Grill — Done`.                   |
| **Implement**   | `implementer` | `tdd`                                            | Characterization tests first, then refactor, verify tests still pass. Posts `### Phase: Implement — Done`. |
| **Code Review** | `analyst`     | `code-review-standards`, `code-review-checklist` | Reviews for behavior preservation and no scope creep. Posts `### Phase: Code Review — Done`.               |
| **Done**        | Orchestrator  |                                                  | Presents the summary.                                                                                      |
