# ADR 0004 — Solo PO development workflow

**Status**: accepted  
**Date**: 2026-11-01

## Context

One person owns the product and does all agent-orchestrated development. They can only validate quality visually in the browser. Previous workflow had no upstream issue-shaping step, causing wrong builds and slow throughput. The goal is to move as fast as possible through issues while maintaining production quality.

## Decision

Four-phase workflow:

### Phase 1 — Issue Maturation (before any lane starts)

Trigger: a rough idea, a bug report, or a request.

1. Start a `/grill-with-docs` session in the main checkout.
2. Grill the idea until it produces a GitHub issue with:
   - User-visible acceptance criteria in "when I do X, I see Y" form
   - Explicit out-of-scope items
   - Figma reference or screenshot if the feature is visual
3. Label the issue `ready` + appropriate `area:*` + priority.

No lane starts until the issue is `ready`.

### Phase 2 — Lane execution

Trigger: issue labeled `ready`.

Start a lane manually:

```
lane <issue> <slug> copilot [low|medium]
```

Use the foreman only when running three or more parallel lanes across different areas.

The lane runs TDD (red → green → refactor → verify), opens a draft PR, and runs all four checks (`type-check`, `lint`, `vitest`, `build`) before pushing.

### Phase 3 — Pre-merge validation

Trigger: Herdr notifies that the lane is `done` or `blocked`.

When Herdr notifies `done`, the lane has already:

- Passed all four checks (type-check, lint, vitest, build)
- Run `/code-review --comment` on the PR diff and addressed all blocking findings

Your job is visual validation only:

- Open `localhost:<port>` in the browser (port = 3000 + issue % 1000).
- Walk through every acceptance criterion from the issue.
- If it passes: merge the PR (or add it to the merge queue if enabled — see below).
- If it doesn't: comment on the Herdr workspace with what's wrong; lane continues.

Notification channel: Herdr workspace status change. Not GitHub issue comments.

#### Multi-lane: use the merge queue

When running more than one lane, enable the GitHub merge queue on `main` (repository Settings → Branches → branch protection rule → Require merge queue). After visual validation passes, add each approved PR to the queue instead of merging directly. GitHub tests each PR against the updated `main` in sequence and merges automatically on green — no manual `gh pr update-branch` or CI babysitting.

### Phase 4 — UAT confirmation and production

- UAT (`uat.ummahflow.com`) auto-deploys on merge to main.
- Validate on UAT after merge.
- Production deploy (`ummahflow.com`) is manual, triggered after UAT validation passes.

## Trade-offs considered

**Foreman always on vs foreman optional**: foreman adds overhead (Herdr tab, agent startup, approval round-trip) that's unnecessary for serial single-lane work. Bring it back when parallelism genuinely speeds things up.

**GitHub comments vs Herdr for "ready" signal**: GitHub notifications arrive async and require switching context to the browser. Herdr is the active workspace; status changes surface inline.

**Grill every issue vs just small ones**: grill everything. The cost of a short grill session (5–10 min) is lower than the cost of a wrong build (1–2 hours of lane time).

**Lane self-review vs independent review**: the lane runs `/code-review --comment` on its own diff before marking done. This is slightly biased (same agent, same context) but fully automated — the owner never reviews code. The foreman path uses independent subagents on top of the lane's self-review for stronger isolation. In the solo path, the trade-off is accepted to keep the owner out of code decisions; for structural and security issues, self-review is effective regardless of who wrote the code.

**Merge queue vs manual update-branch**: manually updating each lane after a merge requires CI babysitting across multiple rounds. The GitHub merge queue (repository Settings → Branches → branch protection → Require merge queue) eliminates the loop: the owner validates visually, adds the PR to the queue, and GitHub handles sequential CI and merge automatically. Enable it once; leave it on whenever running more than one lane.

## Consequences

- `docs/agents/lane.md` prompt: remove "comment on the issue" as the owner notification mechanism; Herdr status change is sufficient.
- Every issue that reaches `ready` has gone through a grill session; issues created directly (e.g. by external tools) need a grill pass before a lane picks them up.
- Production is deliberately behind UAT by at least one validation cycle.
