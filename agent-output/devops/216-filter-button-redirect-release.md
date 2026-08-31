---
ID: 216
Origin: 216
UUID: c91f3a2e
Status: Active
---

# DevOps Release Execution Record: Plan 216 — Filter Button Redirects to Map Instead of Filter Page

## 1. Changelog

| Date | Agent | Summary |
|------|-------|---------|
| 2026-08-17 | DevOps | Stage 1 complete: version bumped to v0.15.17, branch pushed, PR raised; production release awaiting user approval |
| 2026-08-17 | DevOps | CI verified — all PR #325 checks green; records updated with CI results |
| 2026-08-17 | DevOps | Stage 2 released: PR #325 squash-merged (212f9668), annotated tag v0.15.17 pushed, PROD deploy run 31978780554 SUCCESS, health check healthy; chain docs closed → Committed |

## 2. Plan Reference

- **Plan**: `agent-output/planning/216-filter-button-redirect-plan.md` (Target Release v0.15.17)
- **Implementation**: `agent-output/implementation/216-filter-button-redirect.md` (commit `752469f1`)
- **Code Review**: `agent-output/code-review/216-filter-button-redirect-review.md` (verdict: APPROVED, commit `433cc04b`)
- **QA**: `agent-output/qa/216-filter-button-redirect-qa.md` (verdict: **QA COMPLETE — APPROVED FOR RELEASE**)
- **Branch**: `fix/216-filter-button-redirect`

## 3. Release Summary

| Field | Value |
|-------|-------|
| Version | **v0.15.17** (patch — bugfix, backward compatible) |
| Type | PATCH (semver) |
| Environment | Production (https://ummahflow.com) — via PR, then Stage 2/3 |
| Epic | Search funnel — mobile filter access (regression of Plan 208) |
| GitHub Issue | #307 (Plan 208 commit `4c10e903` introduced the regression) |

**Fix**: Mobile filter-button taps (home searchbar sliders, results edit button) landed on a full-screen map instead of the filter page. `/search` now renders filter accordions by default; the mobile map is an explicit opt-in via `?view=map`. Single predicate change in `src/app/(public)/search/page.tsx` plus regression tests.

## 4. Stage 1 — Branch State Verification

| Check | Command | Result |
|-------|---------|--------|
| Current branch | `git branch --show-current` | `fix/216-filter-button-redirect` |
| Divergence vs main | `git rev-list --left-right --count main...HEAD` | `0 2` — 0 behind, 2 ahead; no rebase needed |
| Commits on branch vs main | `git log --oneline main..HEAD` | `433cc04b` docs(review): Plan 216 code review approved; `752469f1` fix(search): filter button lands on filters, map is opt-in via view=map — exactly the intended commits |
| Diff vs main | `git diff main...HEAD --stat` | 5 files: 3 code/test files + plan + code-review doc — no unrelated changes |
| Working tree | `git status --short` | Pre-existing uncommitted chat widget/dashboard/agent-doc changes and untracked lifecycle docs present — **excluded from all commits** (staged only intended files) |

**Conclusion**: branch carries only intended Plan 216 commits. Pre-existing working-tree changes (chat widget, dashboard, agent instruction docs, QA status row on the plan doc, untracked analysis/implementation/qa docs) left untouched.

## 5. Version Pre-Flight & Bump

### Pre-flight (v0.15.17 confirmed FREE)

| Check | Command | Result |
|-------|---------|--------|
| Latest origin tags | `git fetch origin --tags && git tag --list "v*" \| sort -V \| tail -6` | `v0.15.11 … v0.15.16` — **v0.15.17 does not exist** → next free patch |
| origin/main HEAD | `git log --oneline -1 origin/main` | `e22a4aa7` (chore(devops): Plan 215 Released — v0.15.16) |
| Pre-bump package.json | `jq -r .version package.json` | `0.15.16` (matches plan expectation) |

### Bump applied (commit `chore(release): v0.15.17`)

| File | Before | After |
|------|--------|-------|
| `package.json` | 0.15.16 | **0.15.17** |
| `package-lock.json` (root + `packages[""]`) | 0.15.16 | **0.15.17** |
| `CHANGELOG.md` | latest heading `## [0.15.16] - 2026-08-16` | **`## [0.15.17] - 2026-08-17`** added with Fixed entry for Plan 216 |

No other version-locked files found (README carries no version reference; grep of `0.15.16` across tracked sources outside node_modules/.next/agent-output matched only package.json, package-lock.json, CHANGELOG.md).

## 6. PR

- **URL**: https://github.com/abu-lina/uflow/pull/325
- **Title**: `fix(search): filter button lands on filters, map is opt-in via view=map (Plan 216)`
- **Base / Head**: `main` ← `fix/216-filter-button-redirect`
- **Body**: references Plan 216, the bug (regression of Plan 208 / issue #307), the `?view=map` opt-in fix, QA evidence (QA COMPLETE — 1910 unit/regression tests + 12 real-browser checks + type-check + build), and the v0.15.17 version bump.

## 7. Release-Procedures Gate Verification

| Gate | Result | Evidence |
|------|--------|----------|
| UAT status | READY — QA verdict "APPROVED FOR RELEASE" with UAT checklist included (real-device tap-check recommended, environmental finding documented) | QA doc verdict section |
| QA status | **QA COMPLETE** — 1910 passed / 24 skipped full suite, 12/12 real-browser checks, type-check 0, build 0, delta lint 0 errors | QA doc |
| Version consistency | ✅ package.json `0.15.17` = package-lock `0.15.17` = CHANGELOG `## [0.15.17]`; tag v0.15.17 not yet created (Stage 2) | This record |
| Branch sync | ✅ 0 behind origin/main | This record |
| Unrelated changes | ✅ excluded from commits; only 3 version files + 2 record files staged | This record |
| Migrations | None — no schema/data migration in Plan 216 (frontend-only fix) | Plan doc |
| CI | ✅ ALL GREEN on final HEAD `79f3ee56` (run 31977899065): Build Verification 3m5s, Lint & Type Check 1m40s, Run Tests 6m59s, Security Audit 55s, Supply Chain IOC Scan 6s, CI Summary 3s, snyk pass | gh pr checks 325 |

## 8. Lifecycle Status (per document-lifecycle skill)

**Per session instruction: merge not executed yet, so lifecycle docs remain Active — closure (Status → Committed + move to `closed/`) is deferred to the release (Stage 2/3) when the final commit lands.**

| File | Current Status | Action at release |
|------|----------------|-------------------|
| `agent-output/analysis/216-filter-button-redirect.md` | Active (untracked) | → Committed → closed/ |
| `agent-output/planning/216-filter-button-redirect-plan.md` | QA Complete | → Committed → closed/ |
| `agent-output/implementation/216-filter-button-redirect.md` | Active (untracked) | → Committed → closed/ |
| `agent-output/code-review/216-filter-button-redirect-review.md` | Active (committed `433cc04b`) | → Committed → closed/ |
| `agent-output/qa/216-filter-button-redirect-qa.md` | QA Complete (untracked) | → Committed → closed/ |

## 9. Pending User Confirmation (Stage 2/3 trigger)

Production release is **NOT executed** — awaiting explicit user approval:

1. **Review PR** https://github.com/abu-lina/uflow/pull/325 (CI status as reported in PR checks).
2. **Approve release of v0.15.17** → DevOps will: squash-merge PR, create annotated tag `v0.15.17`, push tag, run PROD deploy (`deploy-hetzner.yml`), run health check, close lifecycle docs, sync roadmap.
3. Optional per QA: one manual UAT tap-check of the home filter button on a real device before merge (environmental finding — client-side `router.push` from home page could not be committed in headless dev; button URL contract pinned by unit test).

**Abort option**: if the user declines, this record is marked Aborted and no merge/tag/deploy happens.


---

## 10. Stage 2 — Release Execution (2026-08-17)

**User approval**: Explicit — task prompt: "user has APPROVED production release of v0.15.17".

| Step | Result |
|------|--------|
| CI final state | ✅ ALL GREEN on HEAD `c5d701b3` (runs 31978354299, 31978356359) — Run Tests 6m49s / 5m26s, Build, Lint & Type, Security Audit, IOC, Snyk all pass; `mergeStateStatus` CLEAN |
| PR #325 squash-merge | ✅ MERGED — merge commit `212f96682c717498e962cb2efcd36ce1bbdc7b83`, merged 2026-08-16T23:17:34Z by abu-lina |
| Annotated tag | ✅ `v0.15.17` created on `212f9668` + pushed (message: "Release v0.15.17 — filter button lands on filters, map is opt-in via view=map (Plan 216)") |
| PROD deploy | ✅ `deploy-hetzner.yml` run **31978780554** — conclusion SUCCESS, head `212f9668`; all steps green (build, GHCR push, blue-green swap, nginx, domain health) |
| PROD health check | ✅ https://ummahflow.com/api/health → `{"status":"healthy", ... "environment":"production"}` HTTP 200 (fresh container, uptime ~34s) |
| Version consistency | ✅ tag `v0.15.17` == package.json `0.15.17` == CHANGELOG `## [0.15.17]` == main HEAD `212f9668` |
| Migrations | None (frontend-only fix) — no migration apply needed |
| Closed docs | ✅ analysis 216, planning 216, implementation 216, code-review 216, qa 216 → Status **Committed**, moved to `closed/` (see §11) |
| GitHub issues | None dedicated to Plan 216 (issue #307 belongs to Plan 208) — nothing to close |

## 11. Lifecycle Docs Closed (Status: Committed)

| File | Status before | Status after | Location |
|------|---------------|--------------|----------|
| `agent-output/analysis/216-filter-button-redirect.md` | Active | **Committed** | `agent-output/analysis/closed/` |
| `agent-output/planning/216-filter-button-redirect-plan.md` | QA Complete | **Committed** | `agent-output/planning/closed/` |
| `agent-output/implementation/216-filter-button-redirect.md` | Active | **Committed** | `agent-output/implementation/closed/` |
| `agent-output/code-review/216-filter-button-redirect-review.md` | In Review | **Committed** | `agent-output/code-review/closed/` |
| `agent-output/qa/216-filter-button-redirect-qa.md` | QA Complete | **Committed** | `agent-output/qa/closed/` |

**DevOps/deployment records remain Active** per lifecycle rules (devops release record + deployment record `216-stage1-v0.15.17.md`).

**PROD is now at v0.15.17.**
