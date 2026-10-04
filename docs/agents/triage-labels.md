# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Relationship to the `type:*` labels

These five are a triage _state_ axis, orthogonal to the repo's existing `type:*` labels (`type:bugfix`, `type:feature`, `type:hotfix`, `type:refactor`, `type:security`, `type:verification`), so they do not duplicate them.

All five exist on `abu-lina/uflow`. Confirm that before relying on it, rather than trusting this line:

```bash
gh label list --limit 100 --json name --jq '.[].name'
```

If one is missing, create it with the meaning from the table above: `gh label create <name> --description "<meaning>"`.
