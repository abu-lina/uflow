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

- Open `localhost:<port>` in the browser (port = 3000 + issue % 1000).
- Walk through every acceptance criterion from the issue.
- If it passes: merge the PR (owner merges, one at a time).
- If it doesn't: comment on the Herdr workspace with what's wrong; lane continues.

Notification channel: Herdr workspace status change. Not GitHub issue comments.

### Phase 4 — UAT confirmation and production

- UAT (`uat.ummahflow.com`) auto-deploys on merge to main.
- Validate on UAT after merge.
- Production deploy (`ummahflow.com`) is manual, triggered after UAT validation passes.

## Trade-offs considered

**Foreman always on vs foreman optional**: foreman adds overhead (Herdr tab, agent startup, approval round-trip) that's unnecessary for serial single-lane work. Bring it back when parallelism genuinely speeds things up.

**GitHub comments vs Herdr for "ready" signal**: GitHub notifications arrive async and require switching context to the browser. Herdr is the active workspace; status changes surface inline.

**Grill every issue vs just small ones**: grill everything. The cost of a short grill session (5–10 min) is lower than the cost of a wrong build (1–2 hours of lane time).

## Consequences

- `docs/agents/lane.md` prompt: remove "comment on the issue" as the owner notification mechanism; Herdr status change is sufficient.
- Every issue that reaches `ready` has gone through a grill session; issues created directly (e.g. by external tools) need a grill pass before a lane picks them up.
- Production is deliberately behind UAT by at least one validation cycle.
