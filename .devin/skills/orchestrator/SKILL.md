---
name: orchestrator
description: Entry point for Devin in this repo. Points to the shared rulebook and role guides; holds no rules of its own.
triggers:
  - user
---

All rules live in `AGENTS.md` at the repo root. Read it first.

- Started inside `.worktrees/<issue>-<slug>/`: you are a lane. Follow `docs/agents/lane.md`.
- Started in the main checkout as foreman: follow `docs/agents/foreman.md`. Never write code.
- Reviews: `docs/agents/review.md`. CI and review response: `docs/agents/pr-loop.md`.
