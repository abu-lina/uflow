---
ID: 064
Origin: 064
UUID: f3a9c2d7
Status: Active
---

# Retrospective 064: Iconify SW CORS Fix (v0.9.9)

**Plan Reference**: `agent-output/implementation/closed/064-iconify-sw-cors-fix-impl.md` (no standalone plan doc)
**Date**: 2026-03-29
**Retrospective Facilitator**: retrospective

> **NO-MEMORY MODE**: Flowbaby memory tools are unavailable in this session. Proceeding artifact-first.

## Summary

**Value Statement**: As a PWA user, I want push notification handler updates to take effect after each deployment (not cached for 1 year by nginx). As a security-conscious operator, I want CSP `frame-src` to contain only genuine iframe source origins.
**Value Delivered**: YES
**Implementation Duration**: ~4 hours (single day, 2026-03-29)
**Overall Assessment**: Narrow infrastructure bugfix delivered cleanly at the code level. Pipeline execution was disrupted by two process failures — a working-tree silent reversion and uncommitted pipeline artifacts — that required an extra QA round-trip. Both disruptions are recurring patterns with known mitigations from PI-059 and PI-064 that have not yet been enforced.

**Focus**: Emphasizes repeatable process improvements over one-off technical details.

## Timeline Analysis

| Phase          | Planned Duration | Actual Duration | Variance       | Notes                                                |
| -------------- | ---------------- | --------------- | -------------- | ---------------------------------------------------- |
| Planning       | N/A (inherited)  | N/A             | N/A            | Scope inherited from Plan 046 analysis               |
| Analysis       | N/A (inherited)  | N/A             | N/A            | Root cause verified in Plan 046 session              |
| Implementation | ~30 min          | ~30 min         | None           | Clean first commit (b791dc74)                        |
| Code Review    | ~20 min          | ~40 min         | +20 min        | Working-tree divergence required 7 FIR restorations  |
| QA (initial)   | ~20 min          | ~20 min         | None           | QA Failed — 2 findings (dirty tree + build evidence) |
| Implementer re-work | ~15 min     | ~20 min         | +5 min         | Committed artifacts + gathered sw.js evidence        |
| QA (re-run)    | ~10 min          | ~15 min         | +5 min         | Re-verified all gates, updated QA report             |
| UAT            | ~15 min          | ~15 min         | None           | 5 scenarios, APPROVED FOR RELEASE                    |
| DevOps Stage 1 | ~15 min          | ~20 min         | +5 min         | Lifecycle closure, CHANGELOG, version preflight      |
| DevOps Stage 2 | ~10 min          | ~10 min         | None           | Push + tag + roadmap sync                            |
| **Total**      | ~2.5 hr          | ~3.5 hr         | **+1 hr**      | Extra hour entirely from QA round-trip               |

## What Went Well (Process Focus)

### Workflow and Communication

- **Narrow scope preserved throughout pipeline**: No scope creep. Implementation, Code Review, QA, UAT, and DevOps all stayed within the two-bug fix boundary. Zero unnecessary abstractions introduced.
- **QA strategy was appropriate for bugfix**: Focused on config regression verification (14 targeted tests) rather than broad feature testing. The 3-risk-area strategy (SW freshness, Iconify network path, release gates) mapped directly to user-facing failure modes.
- **UAT derived value statement from parent plan**: Without a standalone 064 plan doc, UAT correctly extracted value statements from the Plan 046 parent and the implementation scope. No confusion about what was being tested.

### Agent Collaboration Patterns

- **Code Reviewer caught working-tree divergence**: The silent reversion of all committed changes was detected during review, not during QA or release. This early catch prevented a release with the bug still active.
- **QA correctly blocked on release-readiness**: QA identified that uncommitted pipeline artifacts made the branch unreliable for release certification. This was a legitimate gate enforcement.
- **DevOps roadmap backfill**: DevOps noticed the roadmap was behind by 7 versions (v0.9.2–v0.9.8) and backfilled during the v0.9.9 update. This addressed accumulated bookkeeping debt.

### Quality Gates

- **sw.js content verification**: The Implementer verified the generated service worker contained all 3 expected patterns (importScripts, NetworkOnly route, precache entry). This goes beyond "tests pass" to verify actual build output — strong evidence for a PWA/config change.
- **npm audit at Stage 2**: Zero vulnerabilities confirmed locally; GitHub's 6 pre-existing warnings correctly classified as not-introduced-by-this-release.

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

- **[B1] Working-tree silent reversion after commit**: After the implementation commit (`b791dc74`), all 7 changed files were reverted in the working tree — nginx blocks removed, frame-src restored with Iconify domains, version downgraded, test files deleted. This is the **same pattern** as PI-059 R3 (post-rebase working-tree corruption). The mitigation (post-commit `git status` verification) was not enforced.
  - **Impact**: +20 min at Code Review (7 FIR restorations) + risk of shipping a release with the bug still active.
  - **Root cause**: Likely accidental `git stash pop` or worktree operation. No automated guard exists.

- **[B2] Pipeline artifacts not committed before QA handoff**: The implementation doc, code-review doc, package-lock.json, and QA doc were left as uncommitted/untracked files when QA ran. QA correctly failed the clean-tree gate.
  - **Impact**: Full QA → Implementer → QA round-trip (+30 min elapsed).
  - **Root cause**: No implementer/reviewer instruction mandates committing pipeline artifacts before handing off to QA. Each agent creates docs but doesn't commit them.

### Agent Collaboration Gaps

- **[G1] No standalone plan document**: Plan 064 had no `agent-output/planning/064-*.md` plan doc. The scope was derived from the implementation doc and Plan 046 analysis. Every downstream agent (QA, UAT, DevOps) had to reconstruct the plan scope independently.
  - **Impact**: Low for this narrow bugfix, but increases risk for larger plans where scope ambiguity causes drift.
  - **Assessment**: For a 2-bug infra fix this was acceptable. For plans with >3 changes, a standalone plan doc should be mandatory.

### Quality Gate Failures

- **[Q1] Build gate ambiguity for env-gated failures**: QA classified `npm run build` failure as MEDIUM because `NEXT_PUBLIC_SUPABASE_URL` is missing. This is the same DF-4 finding from Plan 046. The resolution path (verify PWA compilation succeeds + sw.js content) had to be rediscovered each time.
  - **Recommendation**: Document the "partial build verification" pattern formally so QA and Implementer don't renegotiate the same gate each plan.

### Misalignment Patterns

- None detected. Value delivery was clean; no objective drift.

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs**: 8 substantive
**Handoff Chain**: orchestrator → implementer → code-reviewer → qa → implementer → qa → uat → devops

| From Agent   | To Agent     | Artifact                              | What Requested              | Issues Identified                       |
| ------------ | ------------ | ------------------------------------- | --------------------------- | --------------------------------------- |
| Orchestrator | Implementer  | (verbal)                              | Execute Plan 064            | None                                    |
| Implementer  | Code Reviewer| impl doc + commit b791dc74            | Review implementation       | Working tree divergence (HIGH)          |
| Code Reviewer| QA           | code-review doc (APPROVED)            | Execute QA gates            | None                                    |
| QA           | Implementer  | QA doc (QA Failed)                    | Resolve blockers            | Dirty tree (HIGH), build evidence (MED) |
| Implementer  | QA           | impl doc updated + commits            | Re-run QA                   | None                                    |
| QA           | UAT          | QA doc (QA Complete)                  | Validate value delivery     | None                                    |
| UAT          | DevOps       | UAT doc (APPROVED FOR RELEASE)        | Execute release             | None                                    |
| DevOps       | (complete)   | deployment doc + tag v0.9.9           | Released                    | None                                    |

**Handoff Quality Assessment**:
- Were handoffs clear and complete? **Mostly yes** — each handoff included the relevant artifact and a clear next-step block. The one gap was the missing plan doc, which forced downstream agents to reconstruct scope.
- Was context preserved across handoffs? **Yes** — despite NO-MEMORY-MODE in some phases, artifact references were consistent.
- Were unnecessary handoffs made? **One** — the QA → Implementer → QA round-trip was caused by a process gap (B2), not by code quality issues. The actual code was correct from the first commit.

### Issues and Blockers Documented

**Total Issues Tracked**: 4 (2 QA findings + 1 Code Review HIGH + 1 Code Review LOW)

| Issue                                          | Artifact        | Resolution              | Escalated? | Time to Resolve |
| ---------------------------------------------- | --------------- | ----------------------- | ---------- | --------------- |
| Working tree silently reverted post-commit      | Code Review     | 7 FIR restorations      | No         | ~20 min         |
| package-lock.json version not in commit         | Code Review LOW | Committed in 7ecc9d0f   | No         | ~5 min          |
| Dirty working tree at QA                        | QA HIGH         | Committed in 7ecc9d0f   | No         | ~10 min         |
| Build evidence incomplete (env-gated)           | QA MEDIUM       | sw.js content verified  | No         | ~15 min         |

**Issue Pattern Analysis**:
- Most common issue type: **Uncommitted artifacts / working-tree state** (3 of 4 issues)
- Were issues escalated appropriately? **Yes** — all resolved within the same pipeline without user intervention
- Did early issues predict later problems? **Yes** — the Code Review HIGH (working-tree divergence) directly caused the QA HIGH (dirty tree). If the root cause (B1) had been prevented, B2 would not have occurred.

### Changes to Output Files

**Artifact Update Frequency**:

| Artifact                     | Created | Updated | Reason for Updates                        |
| ---------------------------- | ------- | ------- | ----------------------------------------- |
| Implementation doc           | 1       | 2       | QA blocker resolution evidence added      |
| Code Review doc              | 1       | 0       | —                                         |
| QA doc                       | 1       | 1       | Re-run section with resolved findings     |
| UAT doc                      | 1       | 0       | —                                         |
| Deployment doc               | 1       | 1       | Stage 2 evidence + Released status        |

## Lessons Learned

### Successes

1. **Narrow scope + narrow tests = fast pipeline**: With only 6 files changed and 14 targeted regression tests, each phase could be completed quickly. The total elapsed time for code-correct phases was ~2.5 hours (single sitting). The pipeline overhead was proportional to the change size.

2. **Build output verification for PWA changes**: Checking the generated `sw.js` for expected patterns (importScripts, NetworkOnly route, precache entry) is stronger evidence than just "tests pass". This should become a standard practice for any plan that changes Workbox/PWA configuration.

3. **QA clean-tree gate caught a real issue**: The strict "working tree must be clean" requirement, while it caused a round-trip, prevented a release where pipeline artifacts weren't tracked. The gate is working as designed.

### Failures

1. **Post-commit working-tree verification is still not enforced**: PI-059 R3 identified this exact pattern (post-rebase working-tree corruption). The mitigation ("verify `git status` shows no unintended changes after each commit") exists as a recommendation but is not mandatory in implementer instructions. This is the second occurrence.

2. **Pipeline artifacts accumulate without commits**: As the chain progresses (impl → CR → QA), each agent creates output docs but none commits them. By the time QA runs its clean-tree check, 3-4 files are dirty. This is a structural issue in the current workflow.

### Improvements

1. **[R1] Mandatory post-commit `git status` check in Implementer instructions**: After every `git commit`, the implementer MUST run `git status --short` and verify the output shows no unintended changes to implementation files. If any implementation file appears as modified/deleted, the implementer must restore it before handoff. (This is a re-recommendation of PI-059 R3 which has not yet been codified.)

2. **[R2] Pipeline artifact commit step before QA handoff**: Add an explicit instruction to the Code Reviewer (or a new "pre-QA checkpoint" step) that requires committing all pipeline artifacts (impl doc, CR doc, lockfile changes) before QA begins. This prevents the clean-tree gate from triggering on documentation artifacts.

3. **[R3] Formal "partial build verification" pattern for env-gated builds**: Document that when `npm run build` fails due to missing environment variables (DF-4), the acceptable alternative evidence is: (a) PWA compilation phase completes, (b) `public/sw.js` is generated, (c) sw.js content contains expected patterns. This prevents QA and Implementer from re-negotiating the same gate each time.

4. **[R4] Standalone plan doc threshold**: For plans with ≤2 narrowly-scoped changes and a clear parent analysis, a standalone plan doc is optional. For plans with >2 changes or cross-cutting scope, a standalone plan doc SHOULD be created. (Low priority — did not cause issues for Plan 064.)

## Value Delivery Assessment

### Objective Achievement

| Objective | Status | Evidence |
|-----------|--------|----------|
| sw-push-handler.js served with no-cache headers | ✅ Delivered | nginx configs verified + sw.js precache + 7 regression tests |
| Iconify API domains removed from frame-src | ✅ Delivered | next.config.js verified + 2 CSP regression tests |
| No functional regression | ✅ Confirmed | Full suite 736/754 + tsc clean |

### Cost Assessment

| Metric | Value | Assessment |
|--------|-------|------------|
| Files changed (code) | 4 | Minimal |
| Files changed (tests) | 2 | Proportional |
| New dependencies | 0 | None |
| Test count delta | +9 | Appropriate regression coverage |
| Pipeline round-trips | 1 (QA re-run) | Process-caused, not code-caused |
| Total elapsed | ~4 hours | Acceptable for single-day bugfix |

### Drift Timing

No drift detected. All phases executed within the original two-bug scope.

## Recommendations Summary

| ID | Recommendation | Priority | Target Agent | Systemic? |
|----|---------------|----------|-------------|-----------|
| R1 | Mandatory post-commit `git status` check | HIGH | Implementer | YES (2nd occurrence) |
| R2 | Pipeline artifact commit before QA handoff | HIGH | Code Reviewer / Pre-QA | YES (structural gap) |
| R3 | Formal partial-build verification pattern | MEDIUM | QA / Implementer | YES (recurring DF-4) |
| R4 | Standalone plan doc threshold guidance | LOW | Planner | NO (advisory) |

**Systemic findings requiring PI**: YES — R1 and R2 are repeating patterns with demonstrated pipeline cost. R3 is a recurring evidence negotiation.

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-29T12:20Z | retrospective | Created retrospective document |
