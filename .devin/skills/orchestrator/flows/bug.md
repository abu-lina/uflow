# Flow: bug

```
Diagnose -> [Gate: confirm hypotheses] -> Fix -> Code Review -> Done
```

| Phase           | Subagent      | Skills                   | What it does                                                                             |
| --------------- | ------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| **Diagnose**    | `analyst`     | `diagnosing-bugs`        | Builds a feedback loop, reproduces, minimizes. Ranked hypotheses go in `## Decisions`.   |
| **Fix**         | `implementer` | `diagnosing-bugs`, `tdd` | Instruments, fixes with a regression test, cleans up. Updates `## Implementation notes`. |
| **Code Review** | `analyst`     | `code-review`            | Two-axis review (Standards + Spec). Updates `## Review findings`.                        |
| **Done**        | Orchestrator  |                          | Presents the summary.                                                                    |
