# Triage Labels

Two orthogonal label axes drive the agent pipeline: a **triage state** axis (the five canonical roles, widened slightly) and a **stage** axis that tells a dispatched session which flow to run.

## Triage state

| Label in mattpocock/skills | Label in our tracker | Meaning                                                   |
| -------------------------- | -------------------- | --------------------------------------------------------- |
| `needs-triage`             | `needs-triage`       | Not yet evaluated; swept in batch, human-initiated        |
| `needs-info`               | `needs-info`         | Waiting on the owner for information **or a decision**    |
| `ready-for-agent`          | `ready-for-agent`    | An agent may touch this unattended. The gate, not a stage |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation                             |
| `wontfix`                  | `wontfix`            | Will not be actioned                                      |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Stage axis

| Label         | Meaning                                                           |
| ------------- | ----------------------------------------------------------------- |
| `stage:prep`  | Triaged and agent-actionable, but no approved spec yet            |
| `stage:build` | Spec approved; a dispatch opens an implementation session         |
| `no-parallel` | Repo-wide work; dispatches only into an empty queue (serial slot) |

`ready-for-agent` is the envelope the dispatcher gates on; the stage label selects which flow the session opens (`flows/prep.md` vs the type-table flows).

## Transitions

```
opened live by orchestrator -> ready-for-agent + stage:build     (spec came from the user in-session)
swept / imported            -> needs-triage
needs-triage -> wontfix | ready-for-human | ready-for-agent+stage:prep | ready-for-agent+stage:build
stage:prep   -> needs-info   (questions posted, ready-for-agent dropped on entry, stage:prep kept)
             -> stage:build  (no judgment calls were left; ready-for-agent re-added)
needs-info   -> ready-for-agent + stage:build   (human answered)
stage:build  -> in-flight -> awaiting-review -> merged -> closed   (monitor-derived, no labels)
```

`stage:prep` is a worktree-less stage: the session creates no worktree or branch, and while it runs the dispatcher's launch ledger marks its slot (`--prep-stale-hours`, default 6h, is the self-healing expiry for a crashed session).

Illegal combinations worth flagging in review: `ready-for-agent` together with `needs-info`, together with `ready-for-human`, or with neither `stage:*` label.

`ready-for-agent` is cleared by the dispatched session itself as soon as its worktree and branch exist (orchestrator Step 1.7), so a PR that closes unmerged does not silently re-dispatch. A `stage:prep` session has no worktree, so its flow clears the label on entry instead, and re-adds it only when handing the issue straight to `stage:build`.

## Relationship to the `type:*` labels

Both axes are orthogonal to the repo's `type:*` labels (`type:bugfix`, `type:feature`, `type:hotfix`, `type:refactor`, `type:security`, `type:verification`), so they do not duplicate them.

Confirm the labels exist before relying on them, rather than trusting this file:

```bash
gh label list --limit 100 --json name --jq '.[].name'
```

If one is missing, create it with the meaning from the table above: `gh label create <name> --description "<meaning>"`.
