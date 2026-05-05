---
ID: 123
Origin: 123
UUID: 4f8e1a2c
Status: Released
---

# Process Improvement Analysis — Plan 123 Iteration 2 (Deployment Lessons)

**Source Retrospective**: `agent-output/retrospectives/123-navbar-auth-state-iteration2-retrospective.md`  
**Date**: 2026-05-05T08:00Z  
**Scope**: DevOps mode instructions (`devops.agent.md`)  
**PIs implemented**: PI-5, PI-6, PI-7, PI-8

---

## Executive Summary

4 deployment-phase process improvements extracted from Plan 123 Iteration 2 retrospective. All 4 are low-risk, additive changes to `devops.agent.md` targeting friction points in CI polling, lifecycle doc staging, multi-iteration branch divergence, and security audit gating. No conflicts with existing instructions. All implemented in a single pass.

| PI | Risk | Priority | Status |
|---|---|---|---|
| PI-5: CI polling — ban `gh pr checks --watch` | LOW | HIGH | ✅ Implemented |
| PI-6: Lifecycle staging — avoid double-index | LOW | MEDIUM | ✅ Implemented |
| PI-7: Branch divergence pre-flight in Stage 1 | LOW | MEDIUM | ✅ Implemented |
| PI-8: Security audit pre-existing delta check | LOW | MEDIUM | ✅ Implemented |

---

## Recommendation Analysis

### PI-5: Standardised CI Polling — Never Use `gh pr checks --watch`

**Source**: L8 from Iteration 2 retrospective. `gh pr checks --watch` opened the terminal alternate buffer twice; two failed attempts before switching to working pattern.

**Current state**: Step 4a said `Monitor with 'gh pr checks <PR#> ...'` — no guidance on `--watch` flag.

**Proposed change**: Replace with explicit polling recipe using `sleep N && ... | cat`; add explicit ban on `--watch`.

**Conflict analysis**: None. Purely additive.

**Affected section**: Phase 2C Step 4a.

**Implemented**: ✅ Line 453 — `sleep 90 && gh pr checks <PR#> --repo <org>/<repo> 2>&1 | cat` with `N=90`/`N=150` guidance; `--watch` explicitly banned.

---

### PI-6: Lifecycle Doc Closure — Avoid Double-Staging New Artifacts

**Source**: L9 from Iteration 2 retrospective. New artifacts staged at original path before `mv` caused both original and `closed/` versions to appear in the index.

**Current state**: Step 2 in Document Lifecycle section listed the five `closed/` folder paths with no staging guidance beyond listing them.

**Proposed change**: Add explicit staging discipline: tracked files use `git mv`; new files use `git rm --cached` + mv + `git add closed/` (or create directly in `closed/`). Explain the double-staging failure mode.

**Conflict analysis**: None. Additive guidance; does not change what goes where, only how it is staged.

**Affected section**: Document Lifecycle section step 2.

**Implemented**: ✅ Lines 690–713 — two options documented (Option A: create directly in `closed/`; Option B: `git rm --cached` then add `closed/` path); double-staging failure mode explained.

---

### PI-7: Pre-Flight Branch Divergence Check for All Plans

**Source**: L10 from Iteration 2 retrospective. Multi-iteration plans always diverge after the previous iteration's squash-merge. The stash → rebase → pop cycle was undocumented and easy to skip.

**Current state**: Step 4d ran `git fetch origin --tags && git rebase origin/main` but did not include an explicit divergence check or handle the stash-required case.

**Proposed change**: Add `git rev-list --left-right --count origin/main...HEAD` as the first divergence check; add the `stash → rebase → pop` sequence for the diverged case; annotate that multi-iteration plans will always hit this path.

**Conflict analysis**: None. Extends existing step 4d; does not remove anything.

**Affected section**: Stage 1 step 4d.

**Implemented**: ✅ Lines 133–150 — divergence check first, expected output documented (`"0  K"`), stash → rebase → pop sequence added, rationale note for multi-iteration plans.

---

### PI-8: Security Audit — Pre-Existing Check Before Blocking

**Source**: L11 from Iteration 2 retrospective. `vite` HIGH findings were pre-existing on `origin/main` but appeared as potential blockers without a delta check.

**Current state**: Step 3b said "record whether any new HIGH/CRITICAL vulnerabilities appear" — but gave no tooling for determining "new vs pre-existing".

**Proposed change**: Add explicit `git show origin/main:package-lock.json | python3` delta-check command with a decision table (same version = pre-existing = not a blocker; newer version = investigate; new package = investigate).

**Conflict analysis**: None. Additive; strengthens the existing gate without weakening it. A finding that is genuinely new (not pre-existing) still blocks.

**Affected section**: Phase 2A step 3b.

**Implemented**: ✅ Lines 289–302 — delta-check command added; three-case decision table; `npm audit` command updated to `npm audit --audit-level=high`.

---

## Validation Plan

- Run next DevOps session; confirm agent follows `sleep N && ... | cat` polling (not `--watch`)
- On next multi-iteration plan Stage 1: confirm `rev-list --left-right --count` appears in pre-flight output
- On next `npm audit` HIGH finding: confirm delta check runs before any blocker decision
- Monitor lifecycle staging: confirm no double-index entries in `git diff --cached --name-status` before commit

---

## Related Artifacts

- Source retrospective: `agent-output/retrospectives/123-navbar-auth-state-iteration2-retrospective.md`
- Plan retrospective (Iteration 1): `agent-output/retrospectives/123-navbar-auth-state-retrospective.md`
- Agent instructions updated: `.github/agents/devops.agent.md`
- Release: v0.12.8 — PR #216, squash SHA `9bcc660a`
