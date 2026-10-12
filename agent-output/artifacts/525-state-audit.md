# 525 — Repo and pipeline state audit

Audit only. Nothing was merged, closed, rebased, bumped or committed. All claims below are backed by a command that was actually run; where a claim is inference it is labelled **hypothesis**.

- Audit date: 2026-10-04
- `origin/main` at audit time: `1d028936` ("docs: make clearing at gates the context mechanism, not compaction (#524)")
- Repo version: `package.json` `version: 0.15.21`

---

## Dimension 1 — Dependabot PR backlog

13 open Dependabot PRs, **all opened 2026-10-04 between 05:56 and 05:59 UTC** (one weekly Monday batch, ~10 hours old at audit time). Nothing is stale.

Source: `gh pr list --author "app/dependabot" --state open --limit 200 --json number,title,createdAt,mergeable,mergeStateStatus,headRefName`, then `gh pr view <n>` per PR for `mergeable`/`files`, then `gh pr checks <n>` per PR for real conclusions.

Every PR: `mergeable: MERGEABLE`, `mergeStateStatus: BEHIND`, base `main`, and touches only its manifest + lockfile. **Zero conflicted. Zero superseded** (no two PRs bump the same package).

### Per-PR table

| PR  | Package                                                                                                                       | From → To        | Semver            | Dep type       | Files      | CI (GitHub Actions)            | Bucket                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------- | -------------- | ---------- | ------------------------------ | -------------------------------------------- |
| 501 | `@types/better-sqlite3` (/tools/uflow-memory-extension)                                                                       | 7.6.13 → 9.6.0   | major             | dev (types)    | pkg + lock | all 7 pass                     | needs review                                 |
| 502 | `vitest` (/tools/memory-backend, `all-minor-patch` group)                                                                     | 5.0.2 → 5.0.3    | patch             | dev            | pkg + lock | all 7 pass                     | **safe to merge**                            |
| 503 | `@types/better-sqlite3` (/tools/memory-backend)                                                                               | 7.6.13 → 9.6.0   | major             | dev (types)    | pkg + lock | all 7 pass                     | needs review                                 |
| 504 | `development-minor-patch` group: `@next/bundle-analyzer` 16.3.7→16.3.8, `@vitest/coverage-v8` 5.0.2→5.0.3, `dotenv`, `vitest` | minor/patch      | dev               | pkg + lock     | all 8 pass | **safe to merge**              |
| 505 | `@eslint/js`                                                                                                                  | 9.39.5 → 10.0.1  | major             | dev            | pkg + lock | **6 fail** (install)           | **failing**                                  |
| 506 | `zod`                                                                                                                         | 3.25.76 → 4.6.5  | major             | **production** | pkg + lock | **5 fail** (typecheck + tests) | **failing**                                  |
| 507 | `@testing-library/react`                                                                                                      | 14.3.1 → 16.3.3  | major             | dev            | pkg + lock | all 8 pass                     | needs review                                 |
| 508 | `react-leaflet`                                                                                                               | 4.2.1 → 5.0.0    | major             | **production** | pkg + lock | **7 fail** (install)           | **failing**                                  |
| 509 | `vite-tsconfig-paths`                                                                                                         | 5.1.4 → 6.1.1    | major             | dev            | pkg + lock | all 8 pass                     | needs review                                 |
| 510 | `eslint`                                                                                                                      | 9.39.5 → 10.11.0 | major             | dev            | pkg + lock | **7 fail** (install)           | **failing**                                  |
| 511 | `lucide-react`                                                                                                                | 0.577.0 → 1.49.0 | major (0.x → 1.x) | **production** | pkg + lock | all 8 pass                     | needs review (highest risk of the green set) |
| 512 | `eslint-plugin-react-hooks`                                                                                                   | 5.2.0 → 7.1.1    | major             | dev            | pkg + lock | all 8 pass                     | needs review                                 |
| 513 | `lint-staged`                                                                                                                 | 15.5.2 → 17.6.0  | major             | dev            | pkg + lock | all 8 pass                     | needs review                                 |

Dep-type classification read from `package.json` `dependencies` / `devDependencies`.

**Bucket totals: safe to merge 2 · needs review 7 · failing 4 · superseded 0 · conflicted 0.**

### (a) Red CI — the four failures, with the actual errors

All four were confirmed by pulling the failing job logs via `gh api repos/abu-lina/uflow/actions/jobs/<id>/logs`.

**PR 505 — `@eslint/js` 10.0.1.** Fails at `npm ci` in _Lint & Type Check_, _Build Verification_, _Run Tests_, _Security Audit_, _Playwright smoke suite_, _CI Summary_ (job 111374578914):

```
npm error code ERESOLVE
npm error While resolving: @eslint/js@10.0.1
npm error Found: eslint@9.39.5
npm error Could not resolve dependency:
npm error peerOptional eslint@"^10.0.0" from @eslint/js@10.0.1
npm error Conflicting peer dependency: eslint@10.12.0
```

**PR 510 — `eslint` 10.11.0.** Same install-stage failure (job 111374805215), different blocker:

```
npm error code ERESOLVE
npm error While resolving: eslint-plugin-jsx-a11y@6.10.2
npm error Found: eslint@10.11.0
npm error Could not resolve dependency:
npm error peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9" from eslint-plugin-jsx-a11y@6.10.2
```

`eslint-plugin-jsx-a11y@^6.10.2` is pinned in `devDependencies` and is also pulled in by `eslint-config-next@16.3.8`. **Verified**: ESLint 10 cannot land until jsx-a11y ships eslint 10 peer support, or the plugin is dropped.

**PR 508 — `react-leaflet` 5.0.0.** Install-stage ERESOLVE (job 111374628262):

```
npm error While resolving: react-leaflet@5.0.0
npm error Found: react@18.3.1
npm error peer react@"^19.0.0" from react-leaflet@5.0.0
```

**Verified**: react-leaflet 5 requires React 19; repo is on `react@^18.3.1`. Blocked until a React 19 migration.

**PR 506 — `zod` 4.6.5.** The only failure that is _not_ an install failure; it installs and then breaks the code. _Lint & Type Check_ job 111374610831:

```
src/app/api/admin/badges/unverify/route.ts(60,37): error TS2339: Property 'errors' does not exist on type 'ZodError<...>'
src/app/api/admin/badges/verify/route.ts(61,37): error TS2339: ...
src/app/api/waitlist/join/route.ts(55,69): error TS2339: ...
src/app/api/waitlist/subscribe-city/route.ts(63,75) and (64,43): error TS2339: ...
src/app/api/waitlist/update/route.ts(71,76), (72,43), (77,69): error TS2339: ...
src/lib/validations/adminSchemas.ts(16,21) and (167,21): error TS2769: No overload matches this call
```

_Run Tests_ job 111374610842 also fails: `src/__tests__/lib/validations/adminSchemas-cs.test.ts (18 tests | 1 failed)` and `src/__tests__/services/community-service-schemas.test.ts (12 tests | 6 failed)`.

Zod 4 renamed `ZodError.errors` to `.issues` and changed the `z.string().refine(...)`-style overloads. **Verified**: this needs a code migration across 6 API route files plus `adminSchemas.ts`, not a lockfile change. `zod` is a production dependency, so this one is both runtime-critical and a real breaking change. This is the single most important red signal in the backlog.

### Snyk fails on all 13 PRs — quota, not code

`security/snyk (abu-lina)` reports `fail` on every one of the 13 PRs with the identical message:

```
You have used your limit of private tests
```

The in-repo `Verify Snyk PR` GitHub Actions job reports `skipping` on each. **Verified** this is a Snyk account quota exhaustion, not a vulnerability finding. It is the reason a casual glance at the PR list looks uniformly red even for the 9 PRs whose actual CI is fully green. Recommendation: either top up / switch the Snyk plan, or stop the Snyk commit status from running on Dependabot PRs, so that red means something again.

### (b) Clusters that must be handled as a group

1. **ESLint 10 cluster: 505 + 510 (+ 512 adjacent).** 505 (`@eslint/js` 10) and 510 (`eslint` 10) are mutually blocking: each fails because the _other_ package is still on 9. Merging either alone cannot pass. They also need `eslint-plugin-jsx-a11y` to support eslint 10 first. Recommendation: close or hold 505 and 510 as a pair and revisit as one "ESLint 10 migration" task; do not merge individually. 512 (`eslint-plugin-react-hooks` 7) is green on eslint 9 and can land independently, but belongs in the same review conversation.
2. **React-19-gated: 508.** Isolated for now, but it is the first of a family (react-leaflet, and eventually testing-library/types) that will all require the React 19 jump. Recommendation: close 508 and track React 19 as its own request.
3. **`@types/better-sqlite3` 9.6.0 in two directories: 501 and 503.** Same package, same version, two separate tool workspaces. Not superseded, not conflicting; merge together so the two tools stay in step.
4. **vitest 5.0.3 appears twice: 502 (`/tools/memory-backend`) and inside 504's group (root).** Merge both so vitest is uniform across workspaces.

### (c) Staleness

None. All 13 are from the same Monday batch, <12h old. The backlog is wide, not old.

### Grouping config observation

`.github/dependabot.yml` already groups minor/patch (`production-minor-patch`, `development-minor-patch` at root; `all-minor-patch` in both tool dirs), which is why only 2 of 13 PRs are grouped. **All 11 ungrouped PRs are majors** — by design, since Dependabot does not group majors unless you say so. If 11 individual major PRs per batch is the problem, add an explicit major group (e.g. an `eslint` pattern group covering `eslint`, `@eslint/js`, `eslint-plugin-*`) so the ESLint cluster arrives as one PR that can actually pass CI. **Recommendation only.**

### Dependabot labels are not being applied

`.github/dependabot.yml` asks for labels `dependencies` + `npm` (and `ci` for the actions ecosystem). `gh pr view` returns `labels: []` on all 13 PRs, and `gh label list` shows the repo has no `dependencies`, `npm` or `ci` label. **Verified**: the labels do not exist, so Dependabot silently drops them. Fix is to create the three labels (or remove them from the config). Recommendation only.

---

## Dimension 2 — main branch health

**Verdict: main is green, with a caveat about what "green" covers here.**

Check runs on `origin/main` head `1d028936` (`gh api repos/abu-lina/uflow/commits/1d028936/check-runs`):

| Check                  | Status    | Conclusion  |
| ---------------------- | --------- | ----------- |
| Playwright smoke suite | completed | **success** |
| Build & Deploy to UAT  | completed | **success** |

The previous four main commits are also clean:

| SHA               | Checks                                                          | Result       |
| ----------------- | --------------------------------------------------------------- | ------------ |
| `a3c294c2` (#523) | Build & Deploy to UAT, Playwright smoke suite                   | both success |
| `654e6c99` (#522) | Playwright smoke suite, Performance Test, Build & Deploy to UAT | all success  |
| `14a5ecb1` (#520) | Playwright smoke suite, Build & Deploy to UAT                   | both success |
| `b0192a20` (#518) | Playwright smoke suite, Build & Deploy to UAT                   | both success |

No red run on main. There is no "first commit where it went red" to find.

### Caveat 1 — the CI Pipeline does not run on pushes to main

`.github/workflows/ci.yml` triggers are:

```yaml
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]
  workflow_dispatch:
```

`push: [develop]`, not `main`. So _Lint & Type Check_, _Run Tests_, _Build Verification_, _Security Audit_ and _Supply Chain IOC Scan_ only ever run on the PR, never on the merge commit that lands on main. The post-merge signal on main is just _E2E Smoke_ (`e2e.yml`, which does trigger on `push: [main]`) and _Build & Deploy to UAT_. **Verified from the workflow files and corroborated by the check-run lists above** — none of the five CI-Pipeline jobs appear on any main commit.

Practical effect: "main is green" means the smoke suite passes and UAT builds. It does not mean typecheck and unit tests pass on main's actual tree. Those were last proven on each PR's head before merge. With squash-merge plus a `BEHIND` base, a semantic conflict between two PRs would land on main unnoticed. **Hypothesis needing a discriminating check**: run `npm run lint`, typecheck and `npm test` against `origin/main` (or dispatch `ci.yml` via `workflow_dispatch` on main) to confirm main's tree actually passes the full gate. I did not run the suite locally in this audit.

### Caveat 2 — no required checks at all

```
$ gh api repos/abu-lina/uflow/branches/main/protection
{"message":"Branch not protected","status":"404"}
```

**Verified**: `main` has no branch protection, so there are no required checks, nothing is enforced, and any of the four failing Dependabot PRs could be merged by mistake. `gh api .../commits/1d028936/status` returns `state: pending` with an empty `statuses` array, which is the legacy commit-status API reporting nothing rather than a real pending check — do not read that as a hung job.

Recommendation: protect `main` and require _Lint & Type Check_, _Run Tests_, _Build Verification_, _Supply Chain IOC Scan_ and _Playwright smoke suite_. Consider adding `push: [main]` to `ci.yml`.

---

## Dimension 3 — local repo and worktrees

```
$ git status --porcelain=v1 --branch
## cr/orchestrator-context-budget...origin/cr/orchestrator-context-budget
```

- **Working tree is clean.** No modified, staged or untracked files.
- **The canonical repo is not on `main`.** It sits on `cr/orchestrator-context-budget` at `1d31136a`, in sync with its own upstream. That commit is the unsquashed source of main's `1d028936`, so no work is lost, but any agent that assumes `pwd` is on main will be wrong.

```
$ git worktree list
/Users/NARAFIQ/Projects/uflow  1d31136a [cr/orchestrator-context-budget]
```

- **No stray worktrees.** Only the canonical checkout is registered.
- `/Users/NARAFIQ/Projects/uflow-wt` exists but is an **empty directory** (`ls -la` shows only `.` and `..`). Harmless leftover; safe to delete. No uncommitted work anywhere.

### Local branches (`git branch -vv`) — 33 branches, the flags that matter

| Flag               | Branch                                                                                                                                                                                                                                                                                       | Detail                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wrong upstream** | `fix/265-create-desktop-layout`                                                                                                                                                                                                                                                              | tracks `origin/main`, `ahead 4, behind 58`. A feature branch pointed at main's upstream. If anyone runs `git push` from it, it targets `main`. Highest-risk item in this dimension. |
| Local `main` stale | `main`                                                                                                                                                                                                                                                                                       | `654e6c99`, `[origin/main: behind 2]`. Not equal to `origin/main` (`1d028936`). Any agent branching from local `main` without fetching starts two commits in the past.              |
| Behind upstream    | `chore/orchestrator-session-tab-naming` (behind 1), `cr/229-desktop-search-chips-unify` (behind 1), `docs/270-request-backlog` (behind 3), `fix/283-api-docs-jsyaml` (behind 6), `feature/255-create-recommend-menu` (ahead 1, behind 4), `fix/pipeline-hardening` (ahead 1, behind 3)       | ordinary drift                                                                                                                                                                      |
| Unpushed commits   | `fix/orchestrator-router-enforcement` (**ahead 8**), `feature/255-create-recommend-menu` (ahead 1), `fix/pipeline-hardening` (ahead 1), `fix/265-create-desktop-layout` (ahead 4 vs origin/main)                                                                                             | 8 commits on `fix/orchestrator-router-enforcement` exist only locally. Worth confirming they are intended as abandoned before any cleanup.                                          |
| No upstream at all | `backup/wip-requests-and-learnings`, `cr/283-food-multi-category`, `feature/225-halal-discovery-pipeline`, `feature/readable-urls`, `fix/245-category-pages-broken`, `fix/267-food-search-scope-mismatch`, `fix/secret-redaction-key-migration`, `refactor/consolidate-provider-data-access` | 8 local-only branches, nothing pushed                                                                                                                                               |

No branch showed a `gone` upstream marker, so nothing tracks a deleted remote ref.

**Nothing here will silently break the next agent run** beyond the two named risks: a stale local `main`, and `fix/265-create-desktop-layout` tracking `origin/main`. Recommendations only: fast-forward local `main`, repoint or delete `fix/265-create-desktop-layout`, remove the empty `uflow-wt` directory.

---

## Dimension 4 — infra/service bump consistency

Package manager: **npm**. No `packageManager` field in `package.json`; `package-lock.json` present at the root and in both tool workspaces; CI uses `npm ci`. No yarn/pnpm lockfile anywhere.

### Node 22 runtime — consistent everywhere it is declared

The relevant bump is `ba9c7f73 fix(ci): upgrade Node.js 20 to 22 across all workflows and Dockerfile (#387)`. Every declaration site, actual values read from the files:

| Declaration site                                                                                                                                                                                                                  | Value                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `.nvmrc`                                                                                                                                                                                                                          | `22`                                                             |
| `package.json` `engines`                                                                                                                                                                                                          | `{"node": ">=22.12.0", "npm": ">=9.0.0"}`                        |
| `Dockerfile:4` (builder)                                                                                                                                                                                                          | `FROM node:22-alpine`                                            |
| `Dockerfile:65` (runner)                                                                                                                                                                                                          | `FROM node:22-alpine`                                            |
| `.github/workflows/ci.yml:11`                                                                                                                                                                                                     | `NODE_VERSION: '22'` (used at lines 41, 70, 99, 151)             |
| `.github/workflows/e2e.yml:11`                                                                                                                                                                                                    | `NODE_VERSION: '22'` (used at line 26)                           |
| `.github/workflows/deploy-uat.yml:9`                                                                                                                                                                                              | `NODE_VERSION: '22'`; line 97 uses `node-version-file: '.nvmrc'` |
| `.github/workflows/deploy-hetzner.yml:12`                                                                                                                                                                                         | `NODE_VERSION: '22'`                                             |
| `.github/workflows/weekly-quality-gates.yml:10`                                                                                                                                                                                   | `NODE_VERSION: '22'`                                             |
| `.github/workflows/snyk-pr-verification.yml:11`                                                                                                                                                                                   | `NODE_VERSION: '22'`                                             |
| Data/enrichment workflows (`backfill-enrichment` 74, `import-joinhalal` 77, `enrich-one-provider` 24, `enrich-food-providers` 43, `discover-halal` 73 + 165, `enrich-providers` 75, `import-muslimbusiness` 61, `enrich-wolt` 32) | hardcoded `22` / `'22'`                                          |
| `.node-version`                                                                                                                                                                                                                   | does not exist                                                   |

**Verified: no Node version drift.** The only nit is style, not correctness: `engines` pins the minor floor at `>=22.12.0` while `.nvmrc` and the workflows say bare `22`, which resolves to whatever the newest 22.x is. That satisfies the floor today. The data workflows hardcode `22` instead of reading `env.NODE_VERSION` or `.nvmrc`, so the next major bump has 10 extra sites to remember — worth consolidating, not currently broken. Minor inconsistency: `deploy-uat.yml` declares `NODE_VERSION: '22'` _and_ uses `node-version-file: '.nvmrc'`; two mechanisms that happen to agree.

### Lockfiles are in sync with their manifests

Checked non-mutatively by copying manifest + lockfile into a temp dir and running `npm ci --dry-run --ignore-scripts` (nothing written back to the repo):

| Workspace                                      | Result                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| root (`/tmp/lockcheck-root`)                   | resolved, `added 1018 packages`, no `EUSAGE` / "lock file does not satisfy" error |
| `tools/memory-backend` (`/tmp/lc-mb`)          | resolved, `added 114 packages`                                                    |
| `tools/uflow-memory-extension` (`/tmp/lc-ext`) | resolved, `added 61 packages`                                                     |

**Verified: all three lockfiles satisfy their `package.json`.** (The first attempt without `--ignore-scripts` exited 127 on `husky: command not found` from the `prepare` script — that is the temp dir lacking husky, not a lockfile problem; resolution had already completed by then.)

### Other infra bumps on main, all consistent

- `58b1136b ci(deps): pin actions/checkout to v7.0.1 across all workflows (#456)` — spot-checked `ci.yml:34` and `e2e.yml:20`: both `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`. SHA-pinned, consistent.
- `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0` in `ci.yml` and `e2e.yml` — SHA-pinned, consistent.
- `supabase/setup-cli@45a513f8c64c0bc8e0e3dfe572b5c95be85f6359 # v3.0.1` in `e2e.yml:33` — the only Supabase CLI pin in the workflows. No CLI version pinned elsewhere, and no `supabase` dev dependency in `package.json`.
- `59a446e3 chore(277): upgrade Next.js to 16.3.8 with an explicit webpack opt-out (#476)` plus `5d199d08 fix(278): repair the UAT image build broken by the Next 16 merge (#478)` — the Next 16 jump needed a follow-up UAT build fix, already landed. PR 504 carries `@next/bundle-analyzer` 16.3.7 → 16.3.8, which is a **security** release (SSRF in Image Optimization, plus cache-poisoning advisories). Worth merging promptly; note it only bumps the analyzer, so confirm `next` itself is already on 16.3.8.
- `b66181cb refactor(282): replace @ducanh2912/next-pwa with Serwist (#486)` — the most recent commit to have run the full pre-`ci.yml`-era pipeline on main (see the `gh run list --branch main` output: `Deploy to Production`, `Deploy to UAT`, `E2E Smoke` all success at `b66181cb`, 2026-10-02). Note `Deploy to Production` has not run since 2026-10-02 (`workflow_dispatch`, run 37070533530, success), so main's last 5 commits are UAT-deployed but not production-deployed. That is expected for docs-only commits; flagging it so nobody assumes prod is at main.
- `supabase/config.toml:31` declares `major_version = 17` (Postgres) and line 286 `deno_version = 1`.
- `supabase/migrations/` holds 63 entries, latest `136_add_food_category_american.sql`.

### Needs orchestrator MCP verification

Repo-side facts whose deployed counterpart I cannot see. Each is a specific thing to confirm:

1. **Latest migration applied.** Repo's newest migration is `136_add_food_category_american.sql` (63 files in `supabase/migrations/`, numbered to 136). Confirm both the dev and UAT Supabase projects have `136` applied and that no project has a migration the repo lacks.
2. **Postgres major version.** `supabase/config.toml` declares `major_version = 17`. Confirm dev and UAT both actually run Postgres 17.
3. **Deno runtime for Edge Functions.** `config.toml` declares `deno_version = 1`. Confirm the deployed functions in `supabase/functions/` match.
4. **Food category enum.** Migration 136 adds an `american` food category. Confirm the enum/lookup in dev and UAT contains it, since this is exactly the enum-drift case AGENTS.md warns about.
5. **Supabase CLI version.** Only pin in the repo is `supabase/setup-cli@v3.0.1` in `e2e.yml`. Confirm the CLI version used for actual dev/UAT deploys matches, so local/CI migration behaviour is identical.
6. **UAT vs main.** Main's head `1d028936` reports `Build & Deploy to UAT: success`. Confirm the UAT environment is actually serving `0.15.21` from `1d028936` and not an older image.
7. **Production vs main.** `Deploy to Production` last ran 2026-10-02 against `b66181cb`. Confirm what production is currently serving and whether the five commits since then are meant to be unreleased.

---

## Summary of recommendations (nothing was executed)

1. Close or hold PRs **505 + 510** as one ESLint 10 item; blocked on `eslint-plugin-jsx-a11y` eslint-10 peer support.
2. Close **508** (react-leaflet 5); blocked on a React 19 migration.
3. **506** (zod 4) needs a real code migration: `ZodError.errors` → `.issues` across 6 API routes plus the `adminSchemas.ts` overloads, and 7 failing tests. Open it as its own request, don't treat it as a dep bump.
4. Merge **502** and **504** first (green, patch/minor); 504 carries Next 16.3.8 security fixes.
5. Review the 7 green majors individually; **511** (`lucide-react` 0.x → 1.x, production dep) deserves the closest look since 0.x → 1.x can move icon exports.
6. Fix the Snyk quota (or stop Snyk from gating Dependabot PRs) so red means something.
7. Create the `dependencies` / `npm` / `ci` labels, or drop them from `.github/dependabot.yml`.
8. Add `push: [main]` to `ci.yml`, and protect `main` with required checks.
9. Fast-forward local `main`, repoint or delete `fix/265-create-desktop-layout` (tracks `origin/main`), remove the empty `/Users/NARAFIQ/Projects/uflow-wt`.
10. Consider consolidating the 10 hardcoded `node-version: 22` sites onto `.nvmrc` / `env.NODE_VERSION`.
