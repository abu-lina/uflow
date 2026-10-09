# Flow: bug

```
Diagnose -> [Gate: confirm hypotheses] -> Fix -> Code Review -> Done
```

| Phase           | Subagent      | Skills                                           | What it does                                                                                    |
| --------------- | ------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Diagnose**    | `analyst`     | `diagnosing-bugs`                                | Builds a feedback loop, reproduces, minimizes. Posts `### Phase: Diagnose — Done` on the issue. |
| **Fix**         | `implementer` | `diagnosing-bugs`, `tdd`                         | Instruments, fixes with a regression test, cleans up. Posts `### Phase: Fix — Done`.            |
| **Code Review** | `analyst`     | `code-review-standards`, `code-review-checklist` | Two-axis review (Standards + Spec). Posts `### Phase: Code Review — Done`.                      |
| **Done**        | Orchestrator  |                                                  | Presents the summary.                                                                           |
