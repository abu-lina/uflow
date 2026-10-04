---
ID: 123
Origin: 123
UUID: 4f8e1a2c
Status: Processed
---

# Retrospective 123 Iteration 2: Profile Route Middleware Exemption (v0.12.8)

**Plan Reference**: `agent-output/planning/closed/123-navbar-auth-state-open-actions.md`
**Date**: 2026-05-05T08:00Z
**Retrospective Facilitator**: retrospective
**Predecessor Retrospective**: `agent-output/retrospectives/123-navbar-auth-state-retrospective.md` (Iteration 1)

---

## Summary

**Value Statement**: As a logged-in non-admin user, I want clicking the profile icon to take me to `/profile`, so that I can access my profile without being silently redirected to `/providers`.  
**Value Delivered**: YES  
**Implementation Duration**: ~1h10min pipeline (Stage 2 next day by design)  
**Overall Assessment**: The tightest pipeline executed for Plan 123. Critique, Code Review, QA and UAT were all single-pass with no revision loops. Root cause was L1-proven against an existing exemption pattern, which front-loaded confidence for every downstream agent. Deployment had three friction points — lifecycle staging double-index, `gh pr checks --watch` alternate buffer, and branch divergence from the previous iteration's squash-merge — all of which are mechanical and addressable by process changes. No objective drift. No architectural misalignment.  
**Focus**: Deployment process lessons. Secondary pipeline observations.

---

## Timeline

| Phase | Start (UTC approx.) | End (UTC approx.) | Duration | Notes |
|---|---|---|---|---|
| Analysis (Rev 0.2 — F6 discovery) | 2026-05-04T19:30Z | 2026-05-04T19:50Z | ~20min | Middleware exemption gap; L1-proven vs `/saved` pattern |
| Planning | 2026-05-04T19:50Z | 2026-05-04T20:00Z | ~10min | Iteration 2 plan authored; tight scope |
| Critique | 2026-05-04T20:03Z | 2026-05-04T20:10Z | ~7min | **Single-pass APPROVED** — no findings requiring revision |
| Implementation | 2026-05-04T20:10Z | 2026-05-04T20:20Z | ~10min | M1 (+6 lines), M2 (4 regression tests), M3 (version bump) |
| Code Review | 2026-05-04T20:20Z | 2026-05-04T20:22Z | ~2min | **Single-pass APPROVED** — 0 findings above LOW |
| QA | 2026-05-04T20:22Z | 2026-05-04T20:25Z | ~3min | 1243 tests pass; all gates executed independently |
| UAT | 2026-05-04T20:25Z | 2026-05-04T20:28Z | ~3min | APPROVED FOR RELEASE |
| DevOps Stage 1 | 2026-05-04T20:28Z | 2026-05-04T20:40Z | ~12min | Branch rebase + lifecycle closure + commit `daf9ec6d` |
| DevOps Stage 2 | 2026-05-05T08:00Z | 2026-05-05T08:30Z | ~30min | Pre-flight + push + CI (4m24s) + merge + tag `v0.12.8` |
| **Total** | — | — | **~1h37min** | Pipeline complete; Stage 2 deferred to user approval next day |

---

## What Went Well

### Deployment

**Parallel-session version check resolved without collision.** Stage 1 pre-flight flagged `session/124-remove-everywhere-location` referencing v0.12.8 in its commit message. At Stage 2, `git fetch --tags` confirmed no `v0.12.8` tag existed — no collision, no version increment needed. The two-gate approach (Stage 1: document risk; Stage 2: confirm before acting) worked exactly as intended.

**Branch divergence recovered cleanly via stash → rebase → pop.** After Iteration 1's Stage 2 squash-merge, the session branch was 1 behind / 1 ahead of `origin/main`. A `git stash --include-untracked → git rebase origin/main → git stash pop` resolved it in one operation. Git auto-skipped the already-applied commit (`60a861a7` skipped because it was already on main as `b1106f0d`). No conflicts.

**Commit-amend before first push kept the release to one clean commit.** After Stage 1 commit, the deployment doc needed a Stage 2 execution block added. Amending before the branch had ever been pushed folded all changes into a single clean commit. The squash SHA on `main` (`9bcc660a`) represents the entire Iteration 2 change set atomically.

**CI gate substituted correctly for worktree dev-server smoke testing.** A worktree dev server is impractical for pre-release validation (port conflicts, env setup, PWA service worker constraints). For a code-only change with no UI surface area, CI gates (Build ✅ Tests ✅ Lint ✅ Security ✅ — 1243 passing tests) provide equivalent confidence.

**Security audit pre-existing check resolved in under 30 seconds.** `npm audit` reported 2 HIGH in `vite 7.3.1`. A targeted `git show origin/main:package-lock.json | python3` one-liner confirmed the same version pre-existed on `main`. Not a blocker. The check is cheap and conclusive.

### Pipeline

**Single-pass critique.** The plan was approved without any revision cycle. Direct payoff of PI-2 from Iteration 1: the Planner read the `/saved` exemption in `shouldRedirectToWaitlist` before writing milestones, ensuring the plan described an established pattern filling a gap — not a novel architectural decision requiring critique scrutiny.

**Single-pass code review with 0 findings above LOW.** No UI changes, no i18n exposure, no novel logic — direct payoff of the constrained scope. The Iteration 1 PI-1 lesson (i18n self-check) was pre-emptively validated by the fact that this iteration touched no `.tsx` files at all.

**All pipeline phases completed with verified artifacts.** Every phase produced a document with its own changelog entry and Status transition. No phases were skipped or "rubber-stamped" from prior artifacts.

---

## What Didn't Go Well

### Deployment Friction

**Lifecycle doc staging produced double index entries.** When moving new (previously-untracked) artifacts from their active paths to `closed/`, `git add` had already been called on the original paths. Both the original and `closed/` versions appeared in the staging index simultaneously. Required `git restore --staged` on the originals to clean up before committing. This is avoidable with discipline around staging order.

**`gh pr checks --watch` opened the terminal alternate buffer.** This command renders into the terminal's alternate screen (like `less` or `vim`), making its output inaccessible to automated polling. Two invocations failed this way before switching to `sleep 90 && gh pr checks ... | cat`. The `--watch` flag should never be used in automated/agentic contexts.

**Post-release records commit is local-only with no upstream.** After squash-merge deletes the remote branch, the follow-up "Status → Released + roadmap update" commit (`f9f5854c`) exists only in the worktree. This is correct by design (the deployment doc on `main` is the authoritative record), but agents unfamiliar with this pattern may incorrectly treat it as an error.

**Multi-iteration branch divergence is a guaranteed maintenance cost.** Any plan running through multiple DevOps Stage 2 cycles will always have a diverged session branch at the next Stage 1. The stash → rebase → pop pattern works reliably, but the divergence check is not currently explicit in the Stage 1 pre-flight checklist, making it easy to skip.

---

## Process Improvement Recommendations

### PI-5: Standardised CI Polling — Never Use `gh pr checks --watch`

**Problem**: `gh pr checks --watch` uses the terminal alternate buffer and cannot be read by automated polling. Two failed invocations before the workaround was found.

**Recommendation**: All CI polling in DevOps Stage 2 must use the non-interactive pattern:

```bash
# Standard CI poll (works in all terminal contexts)
sleep 90 && gh pr checks <PR_NUM> --repo <owner/repo> 2>&1 | cat
```

Set `N=90` for standard pipelines (Supply Chain + Snyk fast; Build/Lint/Test slower). Repeat with longer delays if still pending. The `| cat` prevents alternate-buffer rendering. `--watch` is permanently banned from agentic use.

**Scope**: DevOps Stage 2 instructions.  
**Priority**: HIGH — causes immediate failed invocations.

---

### PI-6: Lifecycle Doc Closure — Avoid Double-Staging of New Artifacts

**Problem**: Staging original path before `mv` causes both original and `closed/` paths to appear in the index. Requires a `git restore --staged` cleanup pass.

**Recommendation**: For new artifacts being moved to `closed/` during Stage 1 closure, use one of:

```bash
# Option A (preferred): create the artifact directly in closed/ from the start.
# No mv needed; no double-staging risk.

# Option B: if already created at original path and staged:
git rm --cached <original_path>    # deindex the original
mv <original_path> closed/
git add closed/<filename>          # index only the closed/ path

# Option C: for tracked files (git-managed, not new), use:
git mv <original_path> closed/<filename>
```

**Scope**: DevOps Stage 1 lifecycle closure step.  
**Priority**: MEDIUM — causes extra cleanup but is recoverable.

---

### PI-7: Pre-Flight Branch Divergence Check for All Plans

**Problem**: Multi-iteration plans always produce a diverged session branch after the previous iteration's squash-merge. This check is not in the current Stage 1 pre-flight checklist.

**Recommendation**: Add immediately after `git fetch origin --tags` in Stage 1 pre-flight:

```bash
git rev-list --left-right --count origin/main...HEAD
# Expected: "0  K" (0 behind, K ahead). If left count > 0: rebase before staging.
# Rebase sequence: git stash --include-untracked → git rebase origin/main → git stash pop
```

Document the expected "0  K" result and the exact remediation sequence if diverged. This makes the multi-iteration maintenance cost explicit and eliminates the risk of committing on a diverged base.

**Scope**: DevOps Stage 1 pre-flight checklist (universal — all plans).  
**Priority**: MEDIUM — diverged base causes confusing diff output and risks incorrect staging.

---

### PI-8: Security Audit — Delta Check Before Treating HIGH+ as a Release Blocker

**Problem**: `npm audit --audit-level=high` may surface HIGH+ vulnerabilities that were pre-existing on `main` before this release. Without a delta check, these appear as blockers and waste investigation time.

**Recommendation**: When `npm audit` reports HIGH or CRITICAL, before blocking the release:

```bash
# Check the affected package version on origin/main
git show origin/main:package-lock.json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); \
  pkg=d.get('packages',{}).get('node_modules/<package>',{}); \
  print('version on main:', pkg.get('version','not found'))"
```

**Decision table**:
- Same version as `origin/main` → pre-existing; document in deployment doc; do NOT block release
- Newer version (bumped in this release) → investigate and potentially fix before releasing
- New package not present on `origin/main` → investigate

**Scope**: DevOps Stage 2 security gate.  
**Priority**: MEDIUM — prevents false-positive release blocks.

---

## Handoff Analysis

**Total Handoffs (Iteration 2)**: 8
**Handoff Chain**: `User bug report → Analyst (Rev 0.2) → Planner → Critic → Implementer → Code Reviewer → QA → UAT → DevOps Stage 1 → DevOps Stage 2`

| From | To | Artifact | Request | Issues |
|---|---|---|---|---|
| User | Analyst | — | Re-investigate — fix insufficient | None (clear bug report) |
| Analyst | Planner | RCA Rev 0.2 | Iteration 2 plan | L1-proven F6 (middleware gap) |
| Planner | Critic | Iteration 2 plan | Review | None — single-pass APPROVED |
| Planner | Implementer | Approved plan | Execute M1/M2/M3 | None |
| Implementer | Code Reviewer | Implementation | Review | 1 LOW finding (non-blocking) |
| Code Reviewer | QA | Approved code | QA testing | None |
| QA | UAT | QA report | UAT review | None |
| UAT | DevOps | UAT approval + "approved" | Release | None — clean handoff |

**Handoff quality**: All handoffs clean and single-pass. No revision loops. Context preserved throughout. One LOW code review finding (non-blocking) was the only friction, resolved inline.

---

## Issues and Blockers

**Total Issues Tracked**: 4

| Issue | Phase | Resolution | Escalated? | Duration |
|---|---|---|---|---|
| F6: `/profile` missing from middleware exemption list | Analysis | 6-line fix in `shouldRedirectToWaitlist` | No | ~20min investigation |
| S124 parallel session version collision risk | DevOps Stage 1 | Documented; confirmed non-blocking at Stage 2 | No | ~5min |
| `gh pr checks --watch` alternate buffer failure | DevOps Stage 2 | Switched to `sleep N \|\| cat` pattern | No | ~5min |
| Lifecycle doc double-staging index | DevOps Stage 1 | `git restore --staged` cleanup | No | ~5min |

**Issue pattern**: All issues were process/tooling friction in DevOps, not planning or code quality issues. Pipeline phases upstream of DevOps were clean.

---

## Lessons Learned

| # | Lesson | Phase | Priority |
|---|---|---|---|
| L7 | Commit-amend before first push keeps releases to one clean commit; never amend after push to a shared branch | DevOps Stage 1 | HIGH |
| L8 | `gh pr checks --watch` is broken in automated contexts; always use `sleep N && gh pr checks \| cat` instead | DevOps Stage 2 | HIGH |
| L9 | Lifecycle doc staging: new files go directly to `closed/`; if moved, use `git rm --cached` not double-add | DevOps Stage 1 | MEDIUM |
| L10 | Multi-iteration branch divergence is guaranteed after squash-merge; `rev-list --left-right --count` pre-flight is mandatory | DevOps Stage 1 | MEDIUM |
| L11 | `npm audit` HIGH findings require origin/main lockfile delta check before blocking; pre-existing findings are not blockers | DevOps Stage 2 | MEDIUM |
| L12 | Single-pass Critique + Code Review validates PI-2: reading existing code before writing milestones prevents no-op and pattern-gap findings | Planning | LOW |
| L13 | CI gate (Build + Tests + Lint + Security) is an acceptable smoke test substitute for code-only changes with no UI surface area | DevOps Stage 2 | LOW |

---

## Comparison: Iteration 1 vs Iteration 2 Pipeline Efficiency

| Metric | Iteration 1 (v0.12.7) | Iteration 2 (v0.12.8) | Delta |
|---|---|---|---|
| Total pipeline duration | ~3h | ~1h37min | −1h23min |
| Critique rounds | 3 rounds | 1 round | −2 rounds |
| Code Review result | REJECTED → re-review | APPROVED first pass | Eliminated rejection loop |
| Handoffs | 14 | 8 | −6 |
| Findings requiring rework | 1 HIGH (i18n) + 2 CRITICAL+MEDIUM critique | 1 LOW (non-blocking) | Near-zero rework |
| DevOps friction points | 1 (S124 version risk) | 4 (version risk + staging + --watch + divergence) | +3 (tooling/process) |

The pipeline efficiency gain (3h → 1h37min) came from scope constraints and PI-2 application. The DevOps friction increase is process tooling that can be eliminated by PI-5 through PI-7.

---

**Report Generated**: 2026-05-05T08:00Z  
**Retrospective Facilitator**: retrospective  
**Plan ID**: 123 Iteration 2  
**Release**: v0.12.8 — PR #216, squash SHA `9bcc660a`

---

✅ PHASE COMPLETE: Retrospective 123 Iteration 2
📄 Output: agent-output/retrospectives/123-navbar-auth-state-iteration2-retrospective.md
➡️ NEXT: ProcessImprovement agent — codify PI-5 through PI-8 into DevOps mode instructions
