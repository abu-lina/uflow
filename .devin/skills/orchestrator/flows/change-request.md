# Flow: change-request

```
Grill -> Implement -> Code Review -> Done
```

| Phase           | Subagent      | Skills        | What it does                                                     |
| --------------- | ------------- | ------------- | ---------------------------------------------------------------- |
| **Grill**       | `analyst`     | `grilling`    | Pins down what changes, what stays, and the acceptance criteria. |
| **Implement**   | `implementer` | `tdd`         | Updates existing tests, adds edge-case tests.                    |
| **Code Review** | `analyst`     | `code-review` | Two-axis review (Standards + Spec).                              |
| **Done**        | Orchestrator  |               | Presents the summary.                                            |
