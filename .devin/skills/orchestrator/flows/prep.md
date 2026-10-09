# Flow: prep

```
Prep -> Done
```

The session entered through `stage:prep`: the issue is triaged and agent-actionable but has no approved spec yet. This flow replaces the type-table flows; it produces a decision-ready issue, not code.

| Phase    | Subagent     | Skills                        | What it does                                                                                       |
| -------- | ------------ | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| **Prep** | `analyst`    | `grilling`, `codebase-design` | Reads the issue and its cited code, runs the grill asynchronously, posts `### Phase: Prep — Done`. |
| **Done** | Orchestrator |                               | Ends the session. The human answers on the issue.                                                  |

The grill is asynchronous by necessity: the `analyst` profile has no `ask_user_question`, so the worker writes every open question into its phase comment **with a recommended answer and the cost of that answer**, then exits. The human answers at their own pace, on the issue itself.

Ending labels, picked by whether judgment calls remain:

- Questions remain: `gh issue edit N --remove-label ready-for-agent --add-label needs-info` (keep `stage:prep`). The issue joins the decision queue; `agent-monitor.sh --decisions` surfaces it. When the human answers, the issue goes back to `ready-for-agent` + `stage:build` for the next dispatch.
- Nothing left open: `gh issue edit N --remove-label stage:prep --add-label stage:build` (keep `ready-for-agent`). The next dispatch run takes it to implementation.

Never set `ready-for-human` here: that label means the human writes the code, not that the human owes an answer.

The phase comment keeps the standard contract: first line `### Phase: Prep — Done`, the four-line state block, then decisions and open questions.
