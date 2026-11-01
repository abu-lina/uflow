# AGENTS.md

Shared rules for every AI coding agent in this repo (GitHub Copilot CLI, Devin CLI, VS Code Copilot). Tool-specific files only point here. Most important rules first.

## How work happens here

Foreman + crew. One GitHub issue = one worktree = one agent = one PR. Parallel work comes from separate issues, never from splitting one issue across agents. Parallel subagents are for review only.

- You are a **lane** if your cwd is `.worktrees/<issue>-<slug>/`. Follow `docs/agents/lane.md`.
- You are the **foreman** if you were started as one in the main checkout. Follow `docs/agents/foreman.md`. The foreman never writes code.
- Review roles and ranking: `docs/agents/review.md`. CI and review response: `docs/agents/pr-loop.md`. Why things are this way: `docs/agents/setup-decisions.md`.

If none of these apply (an ad-hoc session in the main checkout), you still follow every rule below.

## Git rules

1. Work only inside your own worktree. Never touch `main` or another lane's branch.
2. Stage by explicit path: `git add <file>`. Never `git add -A`, `git add .` or `git commit -a`.
3. Never commit `.env*` files, keys, tokens or anything that looks like a secret. If one slips into a diff, stop and report.
4. Push only your own feature branch (`<type>/<issue>-<slug>`). Never push to `main`.
5. Never merge, never rebase, never `git pull --rebase`, never force-push, unless the owner asks in this session. The owner merges, one PR at a time.
6. Open the PR as a draft at first push with `Closes #<issue>` in the body.
7. Conventional commits: `fix:`, `feat:`, `refactor:`, `test:`, `chore:`, `docs:`, `ci:`. Scope is the `area:*` label without the prefix.
8. Don't delete files you didn't create unless the issue asks for it. Don't bypass hooks (`--no-verify`).

## TDD

1. **Red**: write failing tests from the issue's acceptance criteria, one per criterion, named after the criterion. Run only those tests; they must fail for the right reason. Commit them alone: `test(<area>): failing tests for #<issue>`.
2. **Green**: the smallest change that passes. Nothing the tests don't demand.
3. **Refactor**: only with green tests, only code you touched.
4. **Verify**, all four, inside the worktree, before pushing:

```bash
npm run type-check
npm run lint
npx vitest run
NEXT_PUBLIC_SUPABASE_URL=https://ci-build-test.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ci_build_placeholder_not_a_real_key \
npm run build
```

If `.env.local` already exists, it contains these CI placeholders. Don't edit, commit, or replace them with real values. If it doesn't exist, don't create it. Build with the inline placeholders above; never request or use real credentials.

Never make CI pass by skipping a test, loosening a type, raising lint limits or editing a workflow. Stop after 3 failed fix attempts on one check and report (`docs/agents/pr-loop.md`).

## Context budget

Target 100k tokens per session. Read the issue, then the files it names, then their direct imports. Don't read `docs/`, `agent-output/`, `CHANGELOG.md` or whole directories unless a failing test leads you there. Don't create plan documents; the issue and its comments are the only state. Summaries and reports are 25 lines or fewer.

## Stop and ask when

- the issue has no acceptance criteria, or they can't be turned into tests
- the fix needs a schema change, a new dependency, a secret, or a CI change the issue doesn't mention
- a lane never receives or requests real credentials; if a task needs them, stop and have the owner run that step
- a test outside your diff fails
- you'd need to touch another `area:*` than the issue's
- anything would be destructive (delete branch, remove worktree, reset)

Ask by commenting on the issue or PR, then end your turn. Don't guess.

## Project essentials

Next.js 15 (App Router, TypeScript strict, Tailwind, PWA via Serwist), Supabase (Auth, Postgres, Storage), `next-intl` (six locales), Vitest + React Testing Library, Playwright smoke. Hosted on Hetzner behind Cloudflare. Postgres-first: use native Postgres before adding services. The installed Next version may differ from your training data; read `node_modules/next/dist/docs/` before using an API you're unsure of.

### Server / client

- Server components are the default. Database access and secrets live there. No hooks, no browser APIs.
- `'use client'` only where interaction needs it, as low in the tree as possible.
- Server-only modules start with `import 'server-only'`. Importing server code into a client component breaks the build.
- Server Supabase client: `src/lib/supabase/server.ts`. Browser client: `src/lib/supabase/client.ts`.

### Database and search

- Search uses Postgres full-text search through RPC functions (`search_offers`, `search_needs`, German `tsvector`, GIN indexes). Never `ilike` on user input.
- Schema changes go in `supabase/migrations/` only. `sql/` is for reference queries.
- Verify schema facts (enums, columns, constraints, RPC signatures) against the live Supabase database, not against local types or migration files:

```bash
psql "$SUPABASE_DB_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'providers';"
```

- Don't add Redis, queues or search services. Measure with `EXPLAIN ANALYZE` first; scale Postgres before adding anything.

### Where code goes

```
src/app/            routes: (public), (dashboard), api/
src/features/<d>/   domain UI, hooks and services for one domain
src/components/     shared UI only: ui/ (atoms), shared/, common/, layout/
src/services/       Supabase API clients shared across features
src/hooks/ src/lib/ src/utils/ src/types/
supabase/migrations/  schema changes
scripts/            dev scripts, never imported by runtime code
```

Domain UI belongs in `src/features/<domain>/components/`, not `src/components/`. Check whether a file exists before creating one. Full decision table: `docs/guides/PLACEMENT_RUBRIC.md`.

### UI rules

- Every component handles loading, error and empty states.
- Accessible: semantic HTML, ARIA where needed, keyboard reachable.
- Mobile-first, 320px to 1920px.
- User-facing strings go through `next-intl`; add keys to all six locales (`npm run i18n:check`).
- Imports use the `@/` alias, never relative paths across `src/`.

### Environments

```bash
npm run dev          # uses .env.local; PORT from .env.lane inside a worktree
npm run dev:uat      # UAT env
npm test             # vitest watch; use `npx vitest run <path>` for one file
npx playwright test  # needs local Supabase; run in CI, not in a lane
```

Production: https://ummahflow.com. UAT: https://uat.ummahflow.com (auto-deploys on push to `main`). Health: `/api/health`.

## Issues and labels

GitHub Issues on `abu-lina/uflow` via `gh`. Labels: `P0`-`P3` priority, `ready` (went through Issue Maturation; AC in "when I do X, I see Y" form; may be picked by a lane), `area:*` (lanes never share one), `type:*`. Details: `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`. Use `gh issue view N --json title,body,labels,comments` (the `--comments` flag breaks on some `gh` versions).

## Learnings

Each lane adds `docs/ai/learnings/<issue>.md` in its PR with a short title, one-sentence **Learning**, and **Task/PR** issue number (PR number optional). Include the learning sentence in the PR body and final issue comment. Lanes never edit `docs/ai/LEARNINGS.md`.

## Writing style (non-code)

Applies to chat replies, docs, issues, PR descriptions.

- Write like a human. No marketing fluff, no corporate jargon.
- Be direct. Don't soften with "I think", "maybe", "could".
- Active voice; "you" over "we" in instructions. Contractions where natural.
- Specifics over vague claims: file names, numbers, edge cases.
- Short bullets. Numbered steps only when order matters.
- No canned intros, no closing summaries, no self-referential disclaimers.
- No em dashes; use commas, semicolons or separate sentences.
- Avoid fillers: "very", "really", "quite", "robust", "seamless". Prefer "use" over "utilize", "do" over "implement", "start" over "commence".

## Domain language

`GLOSSARY.md` at the repo root defines providers, listings, categories and applicability. Use those terms in code, tests and issues. Architecture decisions, when written, go in `docs/adr/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
