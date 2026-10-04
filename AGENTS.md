# AGENTS.md

Tool-neutral agent context for this repo. Read by Devin, Cursor and Claude Code.

## Workflow routing

Route every user request (feature, bug, refactor, change-request, hotfix, exploration) through the `orchestrator` skill in `.devin/skills/orchestrator/`. It classifies the request, creates a worktree and branch, seeds a tracking file under `agent-output/requests/`, dispatches worker subagents, and gates between phases. Do not skip it.

If the user explicitly names a skill, invoke that skill directly instead.

Dispatched workers cannot invoke skills: subagents have no `skill` tool, whatever their profile grants. A brief names a skill by its bare name and the worker reads the SKILL.md off disk. See "Following a skill" in `.devin/agents/analyst.md`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `abu-lina/uflow`, managed with the `gh` CLI. Every bug fix or feature gets an issue, and the PR links back to it with `Fixes #N`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. Only `wontfix` exists so far. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. Neither exists yet; `domain-modeling` creates them lazily. See `docs/agents/domain.md`.

## Project conventions

- Always-on rules live in `.cursor/rules/*.mdc`, covering workflow checkpoints, the branch-first rule, and non-code writing style.
- Verified engineering learnings are appended to `docs/ai/LEARNINGS.md`, one entry per build/review/test loop.
- The orchestrator skill and its worker profiles live in `.devin/`.
