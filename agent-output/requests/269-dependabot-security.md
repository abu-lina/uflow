---
ID: 269
Origin: 269
UUID: A67204B7-F1C0-4C66-AE77-CEB56B9A6CC4
Status: Complete
Type: fix
Branch: fix/269-dependabot-security
Worktree: ../uflow-wt/269-dependabot-security
Created: 2026-09-30T08:38:35Z
---

# Request 269: Clear Dependabot security alerts and land CI action bumps

## Original request

> I need the dependabot items from github to be addressed and fixed.

## Classification

- **Type:** fix
- **Route:** Bug flow (diagnosis already complete from Dependabot data; goes straight to Fix)
- **Confidence:** high

## Scope

Two buckets, confirmed with the user as "Everything".

### Bucket A: 12 open security alerts, collapsing to 4 dependency changes

Ground truth read from lockfiles (not `node_modules`, which is stale at root).

| Manifest | Package | Locked | Target | Alerts cleared |
| --- | --- | --- | --- | --- |
| `package-lock.json` | `brace-expansion` | 5.0.9 | `>=5.0.12` | 205 (high), 206 (high), 207 |
| `tools/uflow-memory-extension` | `ip-address` | 10.2.0 | `>=10.7.1` | 177, 178, 184 (high), 203, 208, 213 |
| `tools/uflow-memory-extension` | `brace-expansion` | 2.1.4 | `>=2.1.7` | 211 |
| `tools/memory-backend` | `vitest` / `@vitest/mocker` | 3.2.6 | `^5.0.1` (fallback `^4.1.11`) | 199, 200 |

No alert touches runtime application code. The two `high` alerts are the root `brace-expansion`
chain (reachable in prod via `@ducanh2912/next-pwa` -> `workbox-build` -> `glob` -> `minimatch`)
and the extension `ip-address` chain (dev-only, under `@electron/rebuild`).

### Bucket B: 4 open Dependabot PRs (GitHub Actions)

| PR | Bump | State |
| --- | --- | --- |
| #401 | `docker/build-push-action` 7.0.0 -> 7.4.0 | all checks green, BEHIND main |
| #400 | `codecov/codecov-action` 7.0.0 -> 7.1.1 | all checks green, BEHIND main |
| #399 | `docker/setup-buildx-action` 4.3.0 -> 4.4.1 | all checks green, BEHIND main |
| #276 | `actions/checkout` 4 -> 7 (12 workflows) | DIRTY (conflict) + "Run Tests" FAILURE |

`main` is **not** branch-protected, so BEHIND does not block merging #401/#400/#399.
#276 is split out to request 270 because it is a cross-cutting major CI bump with a real failure.

### Root cause of the alert backlog

`.github/dependabot.yml` configures only `package-ecosystem: github-actions` at `/`. No npm
ecosystem is registered, so Dependabot never opened PRs for any of the 12 npm alerts. Fixing the
config is in scope (user chose "all three manifests").

## Decisions

| # | Decision | Choice | Rationale |
| --- | --- | --- | --- |
| 1 | Scope | Everything: all 4 dep changes + all 4 Actions PRs | User choice |
| 2 | Fix mechanism for transitive deps | `overrides` in `package.json` | Already the established repo pattern; root has 19 override entries pinning exactly this class of transitive CVE |
| 3 | memory-backend vitest target | `^5.0.1`, fallback `^4.1.11` | Root already runs vitest 5.0.1 green in CI, so 5.x is proven against this toolchain. Aligning avoids a third vitest major in the repo. 4.1.11 is the documented minimum that clears alerts 199/200 |
| 4 | `actions/checkout` 4 -> 7 (#276) | Split to request 270 | Conflicted + failing tests across 12 workflows; own branch and review cycle |
| 5 | dependabot.yml | Add npm for all 3 manifests, with grouped minor/patch | Prevents recurrence. Grouping limits PR noise while still surfacing security updates individually |
| 6 | Merging to main | Gate with user before any merge | Authority action; not assumed from "Everything" |

## Phases

| # | Phase | Status | Outcome |
| --- | --- | --- | --- |
| 0 | Tracking file created | Done | This file |
| 1 | Triage Dependabot alerts + PRs | Done | 12 alerts -> 4 changes; 4 PRs triaged; config gap found |
| 2 | Fix (deps + dependabot.yml) | Done | 2 commits on `fix/269-dependabot-security` |
| 3 | Code review | Done | 1 finding raised and fixed (lockfile dev-flag churn) |
| 4 | Verify alerts cleared | Done | `npm audit --audit-level=high` = 0 in all 3 packages |
| 5 | PR opened | Done | PR #446 |
| 6 | Merge gate | Done | PR #446 squash-merged as 9f62ad04 |
| 7 | Merge companion Actions PRs | Done | #401, #400, #399 all squash-merged |

## Implementation notes

- Branch: `fix/269-dependabot-security`
- PR: #446
- Commits: `ba2ab244` (deps), `ced921eb` (dependabot.yml)
- Tests added: none. No application code changed; the fix is dependency resolution plus CI config.
  Existing `tools/memory-backend` suite (27 tests) is the regression gate for the vitest 3 -> 5 jump.
- Files changed: `.github/dependabot.yml`, `package.json` + lock, `tools/memory-backend/package.json` + lock,
  `tools/uflow-memory-extension/package.json` + lock

### Deviations from plan, both justified

1. Extension override uses `^2.1.7`, not `>=2.1.7`. The open-ended range let npm hoist
   `brace-expansion` 5.0.12 to top level, violating `minimatch@9`'s `^2.0.1`. Caret keeps it nested on 2.x.
2. `tools/memory-backend` `@types/node` `^20.11.0` -> `^22.12.0`, required by vitest 5's
   `peerOptional @types/node@^22.0.0`. Dev-only and consistent with `engines.node >=22.12.0`.

## Review findings

### Standards axis

- **Fixed (medium): unrelated lockfile churn in a security PR.** The first pass left 26 metadata-only
  `"dev": true` flips on `@rollup/rollup-*` platform binaries plus `@napi-rs/lzma-linux-x64-gnu`.
  This was internally inconsistent: `node_modules/rollup` stays `dev: false` (it is a production
  dependency via `@ducanh2912/next-pwa` -> `workbox-build` -> `@rollup/plugin-node-resolve` peerOptional),
  so marking only its native binaries dev-only would make any `npm ci --omit=dev` fail with
  `Cannot find module @rollup/rollup-linux-x64-gnu`. Latent rather than live, because `Dockerfile:29`
  and `deploy-uat.yml:100` both run plain `npm ci --no-audit`; notably `Dockerfile:27` already carries
  the comment "Using --omit=dev can cause build failures", suggesting this has bitten before.
  Reverted, root lockfile diff is now 6 lines touching only `brace-expansion`.
- Override pattern matches existing repo convention. Commit messages follow the `fix(deps)` / `ci(...)` prefix style.

### Spec axis

- All 12 alerts accounted for and mapped to a resolved lockfile version. Verified independently by
  reading all three lockfiles, not `npm ls` against stale `node_modules`.
- Config gap (missing npm ecosystems) addressed, which was the root cause of the backlog.

## QA results

- Root: `lint` 0 errors / 127 pre-existing warnings, `type-check` clean, `build` pass (incl. PWA/workbox
  step that consumes the patched `brace-expansion` chain), `npm ci --no-audit` resolves cleanly.
- `tools/memory-backend`: `type-check` clean, 27/27 tests pass on vitest 5.0.2.
- `tools/uflow-memory-extension`: `npm run compile` clean.
- `npm audit --audit-level=high`: 0 vulnerabilities in all three packages.
- Regressions: none. App test and e2e suites deliberately not re-gated; no application code changed.

## Follow-up requests

- **270**: `actions/checkout` pin normalization. Resolved in PR #456; #276 closed as superseded.
- `actions/setup-node` has the same three-way pin-style split (10 SHA-pinned to v7.0.0, 9 floating `@v7`). Not addressed here.

## Learnings

Captured in docs/ai/LEARNINGS.md (3 entries for 269).
