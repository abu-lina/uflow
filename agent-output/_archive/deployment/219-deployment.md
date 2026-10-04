---
ID: 219
Origin: 219
UUID: 881ebb4e
Status: Released
---

# Deployment Record: v0.15.18 — Plan 219 (Combined release train 217+218+219 → UAT)

**Plan Reference**: `agent-output/planning/219-provider-card-gap-plan.md`
**Target Version**: v0.15.18 (no version bump — CSS/layout-only change)
**Type**: Refactor / UI polish
**Environment**: UAT (https://uat.ummahflow.com)
**Agent**: devops
**Date**: 2026-08-24

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-08-24 | devops | Version pre-flight + branch verification: `refactor/219-provider-card-gap`, diff vs origin/main = exactly ProviderCard.tsx token change + test assertions + pipeline docs. |
| 2026-08-24 | devops | CHANGELOG `[Unreleased]` entry added for Plan 219; pipeline docs (plan, impl, code-review, qa) marked Committed and committed locally. |
| 2026-08-24 | devops | Branch pushed, PR #329 created, CI green, squash-merged to main. |
| 2026-08-24 | devops | deploy-uat run 32724056485 SUCCESS; UAT health HTTP 200. |

---

## Release Context

| Field | Value |
| --- | --- |
| Plan ID | 219 |
| Epic | Near-me search UX (extends Plan 196 distance badge + Plan 217 home near-me list + Plan 218 dot separator) |
| Classification | Refactor (CSS/layout — tighten status-row gap `gap-2` → `gap-1`) |
| Plan doc | `agent-output/planning/219-provider-card-gap-plan.md` |
| QA doc | `agent-output/qa/219-qa-report.md` |
| QA Status | QA COMPLETE — 59/59 tests, type-check exit 0, delta lint exit 0, APPROVED FOR RELEASE |
| Code Review | APPROVED (no findings) |
| UAT Status | APPROVED FOR RELEASE (technical gate passed; device visual check UAT-219-1 deferred to combined v0.15.18 pass alongside UAT-218-1) |

**Plans included in this release (combined v0.15.18 UAT)**: Plan 217 + Plan 218 + Plan 219

---

## Version Pre-Flight (Confirmed — no bump, v0.15.18 unchanged)

| Check | Command | Result |
| --- | --- | --- |
| Latest tags on origin | `git fetch origin --tags && git tag --list "v*" \| sort -V \| tail -5` | `v0.15.13 … v0.15.17` |
| `package.json` version (origin/main) | `git show origin/main:package.json \| grep '"version"'` | `0.15.18` |
| `package.json` version (local HEAD) | `jq -r .version package.json` | `0.15.18` |
| CHANGELOG | head of CHANGELOG.md | `## [Unreleased] - 2026-08-17` (Plan 219 entry added) |
| Version diff vs main | `git diff origin/main...HEAD -- package.json package-lock.json` | no diff — no bump per plan |

**Conclusion**: Plan 219 is a no-bump CSS/layout change. `package.json` stays `0.15.18`. No tag created, no PROD deploy (per guardrails).

---

## Branch & Sync (Pre-PR)

| Check | Result |
| --- | --- |
| Branch | `refactor/219-provider-card-gap` (checked out) |
| Divergence | `git rev-list --left-right --count origin/main...HEAD` → `0 2` (0 behind, 2 ahead) — no rebase needed |
| Code commits on branch | `fb6b3929` (refactor token change), `80834fbb` (docs build result), `775d89a9` (docs close + CHANGELOG) |
| Diff scope | Exactly `ProviderCard.tsx` (1 token `gap-2`→`gap-1` line 448), `ProviderCard-distance.test.tsx` (+2 assertions), pipeline docs |

---

## PR & CI

| Item | Value |
| --- | --- |
| PR | https://github.com/abu-lina/uflow/pull/329 |
| Title | `refactor(ui): tighten ProviderCard status row gap (Plan 219)` |
| Base / Head | `main` ← `refactor/219-provider-card-gap` |
| Merge | squash-merge |

### CI Status (`gh pr checks 329` — run 32723377064)

| Check | Status | Duration |
| --- | --- | --- |
| Build Verification | ✅ pass | 3m7s |
| Lint & Type Check | ✅ pass | 1m13s |
| Run Tests | ✅ pass | 7m3s |
| Security Audit | ✅ pass | 50s |
| Supply Chain IOC Scan | ✅ pass | 6s |
| CI Summary | ✅ pass | 3s |
| security/snyk (abu-lina) | ✅ pass | no manifest changes |

All checks green. PR #329 squash-merged to main.

---

## Merge & Deploy

| Step | Status |
| --- | --- |
| PR #329 squash-merge | ✅ MERGED — `1e9b88f8a86fd51e42a61ed99dd460b28e1f35c4` |
| UAT deploy (`deploy-uat.yml`, push to main) | ✅ Run 32724056485 — SUCCESS (head `1e9b88f8`, all steps green) |
| UAT health check | ✅ https://uat.ummahflow.com/api/health → HTTP 200, healthy |

**Deploy run URL**: https://github.com/abu-lina/uflow/actions/runs/32724056485
**Merge SHA**: `1e9b88f8a86fd51e42a61ed99dd460b28e1f35c4`

---

## Security Audit Note (pre-existing, non-blocking)

`npm audit --audit-level=high` reports 2 high + 2 moderate in `undici`/`cheerio` (transitive). These are **pre-existing on `origin/main`** — the release diff introduces zero dependency changes (`git diff origin/main...HEAD -- package.json package-lock.json` is empty). GitHub also reports 11 vulnerabilities (4 high, 7 moderate) on the default branch. **Not introduced by Plan 219**; tracked separately as pre-existing debt for a dedicated dependency-remediation effort.

---

## Guardrails

| Guardrail | Status |
| --- | --- |
| NO v0.15.18 tag | ✅ not created |
| NO PROD deploy | ✅ not executed (UAT only) |
| User confirmation | ✅ granted via task delegation (Stage 2 authorized: create PR, verify CI, merge, deploy UAT) |

---

## Post-Release Status

- **UAT is at v0.15.18** (combined 217 + 218 + 219).
- Combined UAT pass now includes: **217 U1–U11 + UAT-218-1 + UAT-219-1**.
- Human QA/UAT executes UAT-219-1 (status-row spacing device check) alongside UAT-218-1 on uat.ummahflow.com.
- Lifecycle docs (plan, implementation, code-review, qa) marked Committed.
- PROD release of v0.15.18 (tag + PROD deploy) deferred until the combined UAT device pass is approved.
