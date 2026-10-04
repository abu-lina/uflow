# AGENTS.md

Tool-neutral agent context for this repo. Read by Devin, Cursor and Claude Code.

## Workflow routing

Route every user request (feature, bug, refactor, change-request, hotfix, exploration) through the `orchestrator` skill in `.devin/skills/orchestrator/`. It classifies the request, opens a GitHub issue that becomes the only request ID and state store, creates a worktree and branch, dispatches worker subagents, and gates between phases. Do not skip it.

If the user explicitly names a skill, invoke that skill directly instead.

Dispatched workers cannot invoke skills: subagents have no `skill` tool, whatever their profile grants. A brief names a skill by its bare name and the worker reads the SKILL.md off disk. See "Following a skill" in `.devin/agents/analyst.md`.

## Workflow checkpoint

After each build chunk: review, then test, then capture one learning.

- Derive the learning from recent context (diffs, test results, review feedback); no paste required.
- Persist it: append the entry to `docs/ai/LEARNINGS.md` and apply any proposed diff to the right place (rule, command, or agent) after review.
- A chunk is not done until at least one learning is captured and persisted (or explicitly "nothing to capture this time").

## Branch-first rule

Create a feature branch before any code changes, at the Implementer handoff, not at DevOps time. The orchestrator creates `<prefix>/<N>-<slug>` from the latest `main` during Step 1 setup, all code commits go onto it, and the DevOps phase only pushes remaining commits and creates the PR. This gives CI visibility during implementation and surfaces pre-existing failures early.

## Verify DB schema from Supabase, not local files

When an investigation or fix depends on database schema — enum values, column types, constraints, RPC signatures — verify against the actual Supabase database, not local type definitions or migration files.

```bash
# Dump public schema
supabase db dump --schema public --local > /tmp/schema.sql

# Check enums
psql "$SUPABASE_DB_URL" -c "SELECT typname, enumlabels FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname LIKE '%listing%';"

# Check table columns
psql "$SUPABASE_DB_URL" -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'providers';"
```

Add this step to the Analyst phase when the bug touches data validation, enums, or column constraints. The analysis should cite actual DB state as ground truth.

## Writing style (non-code)

Applies to chat replies, docs, issues, PR descriptions, Notion notes. If it conflicts with a task requirement, follow the task requirement.

- Write like a human. Skip marketing fluff and corporate jargon.
- Be direct. Don't soften with "I think," "maybe," or "could."
- Prefer active voice and "you" over "we" when giving instructions.
- Use contractions when they read naturally.
- Replace vague claims with specifics (examples, numbers, edge cases, file names).
- Prefer short bullets. Use numbered steps only when sequence matters.
- Don't open with canned intros or close with essay summaries. No self-referential disclaimers.
- Avoid em dashes; use commas, semicolons, or separate sentences.
- Avoid fillers: "very," "really," "pretty," "quite," "arguably," "innovative," "robust," "seamless." Prefer: "do/build" over "implement," "use" over "utilize," "help" over "assistance," "start" over "commence," "proven approaches" over "best practices."
- Titles make a promise ("How to ___ without ___"), not "My thoughts on ___."

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `abu-lina/uflow`, managed with the `gh` CLI. Every bug fix or feature gets an issue, and the PR links back to it with `Fixes #N`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. Only `wontfix` exists so far. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. Neither exists yet; `domain-modeling` creates them lazily. See `docs/agents/domain.md`.

## Project conventions

- The always-on rules that used to live in `.cursor/rules/workflow.mdc` and `.cursor/rules/writing.mdc` are now the "Workflow checkpoint", "Branch-first rule", "Verify DB schema" and "Writing style" sections above.
- The seven `.cursor/rules/*-expert.mdc` files are Cursor-only, description-triggered helpers. `AGENTS.md` cannot express conditional activation, and they are intentionally invisible to Devin once `read_config_from.cursor` is set to false (Stage B of issue #517). That is deliberate, not an omission.
- Verified engineering learnings are appended to `docs/ai/LEARNINGS.md`, one entry per build/review/test loop.
- The orchestrator skill and its worker profiles live in `.devin/`.
- Historical pipeline output is archived under `agent-output/_archive/`; new durable artifacts (test logs, screenshots, research docs) go to `agent-output/artifacts/`.
