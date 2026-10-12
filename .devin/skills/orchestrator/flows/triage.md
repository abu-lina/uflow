# Flow: triage

```
Triage -> Done
```

Human-initiated sweep over `needs-triage` issues (the #594 pattern). The dispatcher never launches this flow; `needs-triage` stays a label a human acts on by starting `/orchestrator` on the sweep, because a batch pass is one session's work and a poller launching it is overhead for nothing.

| Phase      | Subagent     | Skills     | What it does                                                      |
| ---------- | ------------ | ---------- | ----------------------------------------------------------------- |
| **Triage** | `analyst`    | `grilling` | Evaluates each `needs-triage` issue in the batch and relabels it. |
| **Done**   | Orchestrator |            | Presents the sweep summary.                                       |

For each issue in the batch the worker verifies every cited path, symbol and version against `main` first (a stale locator is itself a triage signal), then applies exactly one outcome:

- `wontfix` — with a line on the issue saying why.
- `ready-for-human` — requires human implementation.
- `ready-for-agent` + `stage:prep` — agent-actionable, needs a spec first.
- `ready-for-agent` + `stage:build` — already specified enough to implement.
- `needs-info` — parked on the owner; the blocker is a question only they can answer. Remove `needs-triage`.

When two issues collide on the same files, the Triage worker links them with GitHub issue dependencies (`gh api repos/{owner}/{repo}/issues/<blocked>/dependencies/blocked_by`, posting the blocker's issue id) rather than prose warnings; the dispatcher reads those links mechanically. That `gh api` write is the worker's own permission: rule 7's whitelist binds the orchestrator session, not dispatched workers, so the call is documented here where it happens.
