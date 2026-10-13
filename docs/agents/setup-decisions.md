# Agent setup decisions

Context for future sessions. Written 2026-10-13 when the plan-ID pipeline was replaced by foreman + lanes. Update this file when a decision changes; don't duplicate it elsewhere.

## Environment

- Solo developer, Next.js 15 marketplace (~115k lines), macOS.
- Agents: GitHub Copilot CLI (primary, `copilot --no-remote`) and Devin CLI. Local only. No `--cloud`, `/handoff` or `/delegate`.
- Terminal: Ghostty + tmux + zsh. One tmux session per project, one window per lane, named `#<issue>`.
- Goal: parallel work with strict TDD and ~100k tokens of context per session.

## Decisions

1. **Foreman + crew.** The foreman picks issues, proposes 2-3 lanes, waits for approval, reports status, triggers reviews and cleans up. It never writes code. Crew: 1 issue = 1 worktree = 1 agent = 1 PR. See `docs/agents/foreman.md`, `docs/agents/lane.md`.
2. **Parallelism from separate issues**, never from splitting one feature across agents. Parallel subagents exist for review only (security/authz, tests vs criteria, Next.js server/client and caching, code reuse). Findings are merged, deduplicated, ranked blocking / should-fix / nit. See `docs/agents/review.md`.
3. **TDD per lane**: failing tests from acceptance criteria in a separate first commit, then implement, refactor, verify (`type-check`, `lint`, `vitest run`, `build`).
4. **Issues**: labels `P0`-`P3`, `ready`, `area:*`, plus the existing `type:*`. Only `ready` issues with acceptance criteria get a lane. Parallel lanes never share an `area:*`. Large issues are split into sub-issues first.
5. **Git rules**: work only inside your worktree; stage by explicit path; never commit `.env*`; push only your branch; never merge, push to `main`, or rebase unless asked. The owner merges, one PR at a time.
6. **Shared rules live in `AGENTS.md`** (under 16 KiB, most important first). Tool files (`.github/copilot-instructions.md`, `.devin/*`) only point to it.
7. **Prove one lane end to end** before running lanes in parallel.
8. **PR loop**: open a draft at first push with `Closes #N`, fix CI, answer reviews, stop after 3 failed fix attempts. See `docs/agents/pr-loop.md`.
9. **Foreman status** reads `tmux capture-pane -p -t "#<issue>" | tail -40` per lane and reports working / waiting for me / done / stuck.
10. **Worktree per lane** in `.worktrees/<issue>-<slug>/`, `.env*` copied, `node_modules` cloned with `cp -c`, `PORT=3000 + issue % 1000`. Tests and dev server run inside the worktree.
11. **Cleanup**: `lane_done <issue>` after merge removes worktree and tmux window. GitHub auto-deletes merged branches. Leftover worktrees are reported in status.
12. **Merge order**: branches must be up to date (ruleset enforces it). After each merge only the next PR in line is updated, via `gh pr update-branch`. Lanes never rebase.
13. **Resume** a lane from inside its worktree (`lane <issue>` reopens it), never from `main`.
14. **Learnings** go into the PR body and the lane's final issue comment. The foreman copies them into `docs/ai/LEARNINGS.md` on `main` after merge. Lanes never edit that file (it conflicted by construction, issue #612).
15. **Auto-dispatch is off.** `scripts/agent-dispatch.sh` and `agent-monitor.sh` were removed; the foreman proposes and the owner approves.
16. **Ghostty + tmux is the only agent surface.** VS Code remains an editor for hand-edits, not an agent surface. The foreman runs inside the tmux session it supervises. The default foreman is Devin on `claude-opus-5-5-high`; lanes default to Copilot on Auto. Both accept a per-invocation model, and Copilot also accepts a reasoning-effort value.
17. **Permissions are scoped.** Copilot lanes auto-approve only the required write, npm/npx, git, and selected GitHub issue/PR tools, with explicit denies for merge, rebase, force-push, and PR merge. Devin lanes use `accept-edits` with `--sandbox`; Devin foremen use `auto`. Never use `--allow-all-paths`, `--allow-all`, or `--yolo`: they remove path checks or grant permissions beyond the lane's needs.
18. **Folder trust was checked against current CLI help.** Copilot has no per-launch trust flag; `trustedFolders` can grant a specific path persistently in settings, while `COPILOT_ALLOW_ALL=true` also suppresses the prompt but auto-approves every tool and is not used. Devin exposes `--respect-workspace-trust false`, which skips the trust check for that invocation; it is not used. No trust setting is changed automatically for a new worktree.

## Repo facts the decisions rest on (verified 2026-10-13)

- Tests: Vitest (`node` env, forks pool, ~340 files, Supabase mocked in `src/__tests__/setup.ts`), Playwright smoke (8 specs, needs local Supabase, CI only), React Testing Library. No coverage threshold. 19 skipped tests.
- CI (`.github/workflows/ci.yml`, ~4 min): `Supply Chain IOC Scan` -> `Lint & Type Check`, `Run Tests`, `Build Verification`, `Security Audit`, `CI Summary`. `e2e.yml` (~4 min): `Playwright smoke suite`. `deploy-uat.yml` deploys on push to `main`; production deploy is manual.
- Package manager: npm, Node >= 22.12, `node_modules` ~840 MB (APFS clone is seconds, `npm ci` is minutes). `prepare: husky`, pre-commit runs eslint --fix and prettier on staged files only.
- Database: unit tests need none. Dev server needs `NEXT_PUBLIC_SUPABASE_URL` at boot and currently points at the shared remote project (issue #607 proposes local/UAT/prod tiers). Local Supabase (`supabase/config.toml`, `project_id = "uflow"`, ports 54321/54322) can run once per machine, so e2e is CI-only for lanes. Per-lane DB, when needed: copy `supabase/config.toml` with `project_id = uflow-<issue>` and offset ports, write the URL into the lane's `.env.local`. The hook for that is a commented line in `.env.lane`.
- Ports: Next dev honours `PORT`. Playwright honours `PLAYWRIGHT_BASE_URL` but `webServer` defaults to 3000 with `reuseExistingServer` locally.
- `.worktrees/` is excluded from git, tsc, eslint, prettier and docker.

## GitHub settings (owner maintains)

- Ruleset "CI gates for main": blocks deletion and force-push; required checks `Lint & Type Check`, `Run Tests`, `Build Verification`, `Playwright smoke suite`; strict up-to-date policy on.
- "Automatically delete head branches": on.
- Default merge method: squash.
- Ruleset "rule1" (no target branches) deleted.

## Removed in this refactor

- `.github/agents/` (15 role profiles), `.github/prompts/`, five `.github/skills/` (document-lifecycle, memory-contract, release-procedures, cross-repo-contract, code-review-standards).
- `.devin/skills/orchestrator/` flows and `.devin/agents/` worker profiles (replaced by pointers).
- `.cursor/` and `.opencode/` (tools not in use).
- `docs/ai/parallel-sessions.md`, `agent-output/.next-id`, `START_HERE.md`, `docs/expert-roles.md`, `docs/guides/VSCODE_AGENTS_SETUP.md`.
- `scripts/agent-dispatch.sh`, `scripts/agent-monitor.sh` and `tests/scripts/agent-*.test.ts`.

Historical pipeline output stays under `agent-output/_archive/`.

## Devin notes kept from the old AGENTS.md

Context budget: sessions target 100k tokens by clearing at phase boundaries, not by compaction. If a session ever needs a hard cap, launch with `devin --compaction-thresholds 90000,90000,100000` (per launch, never exported globally). `DEVIN_COMPACTION_THRESHOLDS` is the env form. Both are undocumented; verified present in CLI 3000.11.3. Subagents are not capped; they're scoped by brief.

`gh` quirks seen on 2.67.0: `gh issue view --comments` and `gh pr edit` fail on a deprecated GraphQL field. Use `gh issue view N --json title,body,labels,comments` and `gh api -X PATCH repos/{owner}/{repo}/pulls/N`.
