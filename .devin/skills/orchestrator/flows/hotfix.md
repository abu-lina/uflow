# Flow: hotfix

```
Fix -> Done
```

| Phase    | Subagent      | Skills                              | What it does                                                                                           |
| -------- | ------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Fix**  | `implementer` | `diagnosing-bugs`, `tdd`, `ponytail` | Reproduces, writes the regression test first, applies the minimal fix, runs the suite. Posts `### Phase: Fix — Done`. |
| **Done** | Orchestrator  |                                     | Presents the summary. Push and deploy are the user's call.                                             |
