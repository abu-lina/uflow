# Flow: change-request

```
Grill -> Implement -> Code Review -> Done
```

| Phase           | Subagent      | Skills        | What it does                                                                     |
| --------------- | ------------- | ------------- | -------------------------------------------------------------------------------- |
| **Grill**       | `analyst`     | `grilling`    | Pins down what changes, what stays, and the acceptance criteria. Posts `### Phase: Grill — Done`. |
| **Implement**   | `implementer` | `tdd`         | Updates existing tests, adds edge-case tests. Posts `### Phase: Implement — Done`.              |
| **Code Review** | `analyst`     | `code-review` | Two-axis review (Standards + Spec). Posts `### Phase: Code Review — Done`.                      |
| **Done**        | Orchestrator  |               | Presents the summary.                                                            |
