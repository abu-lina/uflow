---
ID: 270
Origin: 269
UUID: 4F1B2A93-77C5-4E8A-9D31-0B6E5C2A8E44
Status: Complete
Type: change-request
Branch: cr/270-checkout-v7-pin
Worktree: ../uflow-wt/270-checkout-v7-pin
Created: 2026-09-30T09:15:00Z
---

# Request 270: Normalize all actions/checkout refs to SHA-pinned v7.0.1

## Original request

Split out of request 269 ("I need the dependabot items from github to be addressed and fixed").
Dependabot PR #276 proposed `actions/checkout` 4 -> 7.

## Classification

- **Type:** change-request
- **Route:** CR flow
- **Confidence:** high

## Why #276 could not just be merged

PR #276 was opened when every workflow was on `@v4`. `main` has moved substantially since:

| Style on current main                                          | Count |
| -------------------------------------------------------------- | ----- |
| SHA-pinned `de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2` | 13    |
| floating `@v6`                                                 | 4     |
| floating `@v4`                                                 | 5     |

Total: 22 refs across 13 workflow files.

`#276` is `DIRTY` (conflicts) and its "Run Tests" job failed. Its original logs are expired
(`HTTP 410`), so the failure could not be diagnosed from the PR itself. It also predates
`discover-halal.yml`, which it therefore does not touch, so its 12-file diff no longer reflects
reality. Decision: close #276 and make a clean, complete change on current main.

## v7 breaking-change assessment

- v7.0.0's headline breaking change is "block checking out fork PR for `pull_request_target` and
  `workflow_run`". **No workflow in this repo uses either trigger**, so this does not apply. Verified
  by grep across `.github/workflows/`.
- v6.0.0 changed credential handling ("persist creds to a separate file"). 17 of 22 refs already run
  v6 in production, so that change is proven here. The open risk is the 5 refs jumping v4 -> v7
  directly, in workflows that may push commits back to the repo.

## Decisions

| #   | Decision         | Choice                                                                | Rationale                                                                                                           |
| --- | ---------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | #276 disposition | Close, replace with fresh change                                      | Stale diff, expired logs, missing a newer workflow file                                                             |
| 2   | Target version   | v7.0.1                                                                | Latest; satisfies Dependabot; no applicable breaking change for this repo                                           |
| 3   | Pinning style    | SHA-pin all 22 to `3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` | Repo already SHA-pins the majority (13 refs) and runs a "Supply Chain IOC Scan" job. Ends the three-way style split |

## Phases

| #   | Phase                       | Status | Outcome                                                       |
| --- | --------------------------- | ------ | ------------------------------------------------------------- |
| 0   | Tracking file created       | Done   | This file                                                     |
| 1   | Triage #276                 | Done   | Stale; close and replace                                      |
| 2   | Implement pin normalization | Done   | 22 refs across 14 files, commit 54ffb10a                      |
| 3   | Code review                 | Done   | No findings; diff is 22 one-line swaps, no collateral changes |
| 4   | CI verification             | Done   | All 6 checks green on PR #456                                 |
| 5   | PR, close #276, merge gate  | Done   | PR #456 merged as 58b1136b; #276 closed as superseded         |

## Implementation notes

- Branch: `cr/270-checkout-v7-pin`
- PR: #456, squash-merged as `58b1136b`
- Commit: `54ffb10a`
- Tests added: none applicable. Workflow files have no local test harness; verification was grep-completeness plus YAML lint plus a real CI run, which exercises 5 of the updated checkout steps via `ci.yml`.
- Files changed: 22 `actions/checkout` refs across 14 `.github/workflows/*.yml` files

## Review findings

### Standards axis

- No findings. Diff is 22 one-line swaps; both `- uses:` and `uses:` forms preserved, `with:` blocks (`fetch-depth`) untouched, no surrounding YAML reformatted.

### Spec axis

- All 22 refs confirmed at the new SHA with zero stragglers. SHA `3d3c42e5aac5ba805825da76410c181273ba90b1` independently confirmed to be the `v7.0.1` tag. v7 fork-PR breaking change confirmed not applicable (no `pull_request_target` or `workflow_run` triggers). None of the 5 ex-v4 jobs push back to git, so the v6 credential relocation is a no-op for them.

## QA results

- Suite: n/a (no application code changed). CI on PR #456: all 6 checks green.
- Regressions: none.

## Follow-up requests

_None yet._

## Learnings

Captured in docs/ai/LEARNINGS.md (1 entry for 270).
