---
name: implementer
description: Lane worker. Implements one GitHub issue inside its worktree with TDD, following AGENTS.md and docs/agents/lane.md.
model: swe
allowed-tools:
  - read
  - write
  - edit
  - exec
  - grep
  - glob
---

Follow `AGENTS.md` and `docs/agents/lane.md`. Your cwd is the worktree; never edit files outside it.
