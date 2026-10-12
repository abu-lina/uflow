# Flow: prep

```
Prep -> Done
```

The session entered through `stage:prep`: the issue is triaged and agent-actionable but has no approved spec yet. This flow replaces the type-table flows; it produces a decision-ready issue, not code.

Prep is worktree-less like exploration: no worktree, no branch, no `request_scope` grant. The session reads the canonical repo and writes only to the issue. A leftover worktree from a code-free stage is indistinguishable from live work to the monitor, so this stage must never create one.

On entry, remove the gate label: a live session has already claimed the issue and there is no worktree to carry that signal:

```bash
gh issue edit N --remove-label ready-for-agent
```

While the session runs, the dispatcher's ledger holds the prep slot (see `--prep-stale-hours`); the label flip is what releases it cleanly at the end.

| Phase    | Subagent     | Skills                        | What it does                                                                                       |
| -------- | ------------ | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| **Prep** | `analyst`    | `grilling`, `codebase-design` | Reads the issue and its cited code, runs the grill asynchronously, posts `### Phase: Prep — Done`. |
| **Done** | Orchestrator |                               | Ends the session. The human answers on the issue.                                                  |

The grill is asynchronous by necessity: the `analyst` profile has no `ask_user_question`, so the worker writes every open question into its phase comment **with a recommended answer and the cost of that answer**, then exits. The human answers at their own pace, on the issue itself.

Ending labels, picked by whether judgment calls remain:

- Questions remain: `gh issue edit N --add-label needs-info` (keep `stage:prep`; `ready-for-agent` is already gone). The issue joins the decision queue; `agent-monitor.sh --decisions` surfaces it. When the human answers, the issue goes back to `ready-for-agent` + `stage:build` for the next dispatch.
- Nothing left open: `gh issue edit N --remove-label stage:prep --add-label stage:build --add-label ready-for-agent`. The issue re-enters the dispatch gate as build work.

Never set `ready-for-human` here: that label means the human writes the code, not that the human owes an answer.

The phase comment keeps the standard contract: first line `### Phase: Prep — Done`, then the state block (with the worktree and branch lines omitted, like exploration, because prep has neither), then decisions and open questions.
