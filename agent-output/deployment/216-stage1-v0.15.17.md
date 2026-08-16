---
ID: 216
Origin: 216
UUID: c91f3a2e
Status: Active
---

# Deployment Record: v0.15.17 — Stage 1 (Plan 216)

**Plan Reference**: `agent-output/planning/216-filter-button-redirect-plan.md`
**Target Version**: v0.15.17
**Type**: Bugfix patch
**Environment**: production (https://ummahflow.com) — via PR, then Stage 2/3
**Agent**: devops
**Date**: 2026-08-17

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-08-17 | devops | Stage 1: version pre-flight, v0.15.17 bump committed, branch pushed, PR #325 raised; awaiting user approval for merge/tag/PROD deploy |

---

## Release Context

| Field | Value |
| --- | --- |
| Plan ID | 216 |
| Epic | Search funnel — mobile filter access (regression of Plan 208) |
| Classification | Bugfix (filter button redirects to map instead of filter page) |
| GitHub Issue | #307 (Plan 208 commit `4c10e903` introduced the regression) |
| Plan doc | `agent-output/planning/216-filter-button-redirect-plan.md` |
| QA doc | `agent-output/qa/216-filter-button-redirect-qa.md` |
| QA Status | QA COMPLETE — 1910/1910 full suite, 12/12 real-browser checks, type-check + build exit 0, delta lint 0 errors |
| Code Review | APPROVED (no findings; `433cc04b`) |
| UAT Status | Checklist included in QA doc (real-device tap-check recommended); no release approval yet — **awaiting user confirmation** |

**Plans included in this release**: Plan 216 (single-plan patch, v0.15.17)

---

## Version Pre-Flight (Confirmed — v0.15.17 is FREE)

| Check | Command | Result |
| --- | --- | --- |
| Latest tags on origin | `git fetch origin --tags && git tag --list "v*" \| sort -V \| tail -6` | `v0.15.11 … v0.15.16` — **v0.15.17 does NOT exist** → next free patch |
| `package.json` version (pre-bump) | `jq -r .version package.json` | `0.15.16` |
| `package-lock.json` version (pre-bump) | `jq -r .version package-lock.json` | `0.15.16` |
| `CHANGELOG.md` heading (pre-bump) | `head -5 CHANGELOG.md` | `## [0.15.16] - 2026-08-16` |
| origin/main HEAD | `git log --oneline -1 origin/main` | `e22a4aa7` (chore(devops): Plan 215 Released — v0.15.16) |

**Conclusion**: `0.15.17` is the next available patch after `v0.15.16`. Bump applied to `package.json`, `package-lock.json` (root + `packages[""]`), and a new `## [0.15.17] - 2026-08-17` CHANGELOG entry added (release-procedures skill).

---

## Stage 1: Pre-Release Verification

### Branch & Sync

| Check | Result |
| --- | --- |
| Branch | `fix/216-filter-button-redirect` (checked out) |
| Divergence | `git rev-list --left-right --count main...HEAD` → `0 2` (0 behind, 2 ahead) — no rebase needed |
| Plan 216 commits (pre-bump) | `752469f1` (implementation), `433cc04b` (review docs) — exactly the intended commits, no unrelated changes |

### Packaging Integrity (QA evidence + this session)

| Gate | Result | Evidence |
| --- | --- | --- |
| Full test suite (1910) | ✅ PASS | QA doc — `1910 passed \| 24 skipped (1934)` |
| Real-browser checks (12) | ✅ PASS | QA doc — C1-C3, M1-M6, D1-D2, C7, S1-S2 all pass |
| Type-check | ✅ PASS | QA doc — exit 0 |
| Build | ✅ PASS | QA doc — exit 0 (full route table) |
| Delta lint (3 changed files) | ✅ PASS | QA doc — 0 errors, 1 pre-existing warning (`search/page.tsx:428`) |
| Full-repo lint | ⚠️ Pre-existing errors (unrelated chat/dashboard/API files) | QA doc — not introduced by this plan |
| Version consistency (post-bump) | ✅ PASS | package.json `0.15.17` = package-lock `0.15.17` = CHANGELOG `## [0.15.17]` |
| Debug artifacts | No `console.log` / `debugger` / `TODO: remove` in changed files | Implementation doc |
| Migrations | None — no schema/data migration in Plan 216 | Plan doc |

---

## PR & CI

| Item | Value |
| --- | --- |
| PR | https://github.com/abu-lina/uflow/pull/325 |
| Title | `fix(search): filter button lands on filters, map is opt-in via view=map (Plan 216)` |
| Base / Head | `main` ← `fix/216-filter-button-redirect` |
| Mergeable | Pending CI (reported after push) |

### CI Status

To be reported after `gh pr checks 325` completes on the pushed branch HEAD (Build Verification, Lint & Type Check, Run Tests, Security Audit).

---

## Deferred Gates (block Stage 2/3, NOT Stage 1)

| Gate | Owner | What must happen |
| --- | --- | --- |
| **User release approval** | User | Explicit approval to release v0.15.17 (merge PR #325, tag `v0.15.17`, PROD deploy). Per release-procedures skill: never push/merge/tag without explicit approval. |
| **UAT tap-check (optional per QA)** | UAT operator | One manual home filter-button tap on a real device (<768px) confirming filters render (QA environmental finding: headless client navigation from home page could not be committed; URL contract pinned by `HomeSearchBar.test.tsx`). |

---

## Stage 2/3 (NOT executed — awaiting approval)

| Step | Status |
| --- | --- |
| PR squash-merge | ⏸ Pending user approval |
| Annotated tag `v0.15.17` + push | ⏸ Pending user approval |
| PROD deploy (`deploy-hetzner.yml`) | ⏸ Pending user approval |
| PROD health check | ⏸ Pending |
| Lifecycle docs → Committed → `closed/` | ⏸ Pending merge/release (kept Active per session instruction) |
| Roadmap sync | ⏸ Pending release |

**Constraints honored**: PR #325 NOT merged; `v0.15.17` tag NOT created; PROD (ummahflow.com) remains at v0.15.16. No push of lifecycle-doc commits beyond the release record + version bump.

---

## Known Limitations (Pre-Stage 2)

| Item | Detail |
| --- | --- |
| User release approval | Mandatory before merge/tag/PROD deploy (Stage 2/3) — deferred |
| Full-repo lint debt | Pre-existing, unrelated to Plan 216; tracked separately |
| QA environmental finding | Home-page client navigation in headless dev; covered by unit contract + recommended manual tap-check |
| G1/G2 desktop repro | Explained / non-blocking (QA disposition; narrow-viewport repro fixed, no desktop code path) |
