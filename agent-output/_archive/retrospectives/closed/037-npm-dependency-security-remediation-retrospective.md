---
ID: 037
Origin: Security
UUID: sec-037-npm-deps-2026-03-08
Status: Processed
---

# Retrospective 037: npm Dependency Vulnerability Remediation

**Plan Reference**: N/A (security-origin, no formal planning doc)
**Security Audit**: `agent-output/security/closed/037-npm-dependency-vulnerability-audit.md`
**Date**: 2026-03-08
**Retrospective Facilitator**: retrospective

**Timestamp guidance (SHOULD)**:
- Use UTC and ISO-8601 when recording timestamps (example: `2026-03-08T12:30Z`).

## Summary

**Value Statement**: Eliminate all npm dependency vulnerabilities (10 total: 8 high, 2 moderate) through safe package overrides without breaking application functionality.
**Value Delivered**: YES
**Implementation Duration**: ~3h (security audit trigger to v0.7.2 release, 2026-03-08)
**Overall Assessment**: Objective fully achieved with one QA iteration. The workflow correctly caught a dependency override regression before release. Security posture improved from 10 vulnerabilities → 0 (`npm audit`). GitHub Dependabot also reduced from 11 → 2.
**Focus**: Emphasises repeatable process improvements — override constraints, QA log inspection, PWA artifact safety, and the security-origin lightweight workflow track.

## Timeline Analysis

| Phase | Planned Duration | Actual Duration | Variance | Notes |
| --- | --- | --- | --- | --- |
| Security Audit | Not estimated | ~40m | N/A | Originated from user `npm install` output; chain ID 037 assigned |
| Implementation #1 | Not estimated | ~20m | N/A | Overrides applied; 10 → 2 vulnerabilities |
| Code Review | Not estimated | ~10m | N/A | APPROVED (config-only; existing pattern) |
| QA #1 | Not estimated | ~30m | N/A | **FAILED** — immutable v5 import error in `/api-docs` dev bundle |
| Implementation #2 | Not estimated | ~15m | N/A | Tightened immutable to `^3.8.3`; added dompurify `^3.3.2`; 0 vulns |
| QA #2 | Not estimated | ~20m | N/A | **PASSED** — all gates including `/api-docs` dev compilation |
| UAT | Not estimated | ~15m | N/A | APPROVED FOR RELEASE; 4 scenarios all PASS |
| DevOps Stage 1 | Not estimated | ~15m | N/A | PWA fallback deletion caught and restored before commit |
| DevOps Stage 2 | Not estimated | ~10m | N/A | v0.7.2 tag pushed; roadmap + deployment doc updated |
| **Total** | Not estimated | **~3h** | N/A | Single-day release; one QA iteration bounce |

## What Went Well (Process Focus)

### Workflow and Communication

- **Security audit origin track worked cleanly.** Work originated from a raw `npm install` output, not a planning cycle. The chain security → implementation → code review → QA → UAT → DevOps completed without a formal planning document and was sufficient for this scope. This validates a lightweight track for reactive security fixes.
- **Contextual exploitability analysis prevented overreaction.** The security audit correctly distinguished nominal severity (8 HIGH CVSS scores) from actual exploitability in context (all LOW/VERY LOW — build-time tools, dev-only pages, no untrusted input). This framing avoided costly architectural changes (e.g., removing swagger-ui-react) while maintaining clear risk documentation.
- **Existing `overrides` pattern reused without friction.** `package.json` already had overrides for React and js-yaml, so the pattern was established and team-familiar. Adding minimatch/immutable/serialize-javascript/dompurify felt natural and consistent.

### Agent Collaboration Patterns

- **QA used server log inspection, not just HTTP status codes.** The first QA pass returned HTTP 200 for `/api-docs` but then inspected server output and found `Attempted import error: 'immutable' does not contain a default export`. Marking QA Failed on this log evidence — not the curl result — was correct and prevented a broken dev experience from shipping.
- **Implementer fix was surgical.** Once QA identified root cause (immutable v5 resolve), the fix took one change: `>=3.8.3` → `^3.8.3`. No guesswork, no over-engineering.
- **DevOps caught PWA artifact deletion before commit.** The `git status` pre-commit check revealed `public/fallback-ce627215c0e4a9af.js` as deleted (a side-effect of the dev server run). Restored via `git checkout` before staging. This is the correct procedure working correctly.

### Quality Gates

- **Code review was efficient.** Config-only change was correctly scoped as LOW risk; reviewer spent time verifying the overrides were correct rather than reviewing non-existent code changes. Clean escalation path.
- **UAT scenario 4 explicitly validated the QA regression fix.** Rather than treating the `/api-docs` issue as already resolved by QA, UAT independently verified: `✓ Compiled /api-docs in 5.5s (4040 modules)`. This is the correct defense-in-depth pattern.
- **All automated gates passed on both QA passes.** TypeScript (0 errors), Vitest (198 passed), and `npm run build` all clear. The test suite served as a meaningful regression barrier.

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

- **One unnecessary QA bounce due to imprecise override constraint.** The initial `"immutable": ">=3.8.3"` override was too broad — it resolved to immutable v5.x, which `swagger-ui-react` cannot import in dev. This was an avoidable implementation defect that consumed one full QA cycle (~30m). Root cause: no documented policy on how to write override constraints; implementer defaulted to the common `>=` pattern without considering major-version implications.
- **No formal acceptance criteria before Implementation #1.** Because the work was security-origin (no planning doc), there were no pre-written acceptance criteria that would have caught "immutable must stay in v3." The QA agent authored its own acceptance criteria at test time. For config-only changes, this is acceptable — but if the change had been larger, missing upfront criteria would have compounded rework.

### Agent Collaboration Gaps

- **Implementation #1 did not verify dev-tool pages during initial smoke test.** After applying overrides and running `npm run dev`, the implementer checked HTTP status codes for core routes but did not check `/api-docs` server logs for compilation errors. The first explicit check of `/api-docs` dev log occurred during QA. For overrides that touch packages used by dev-tool pages, the implementer should check those pages before handing off to QA.
- **No explicit override constraint policy guided the implementer.** The choice of `>=3.8.3` vs `^3.8.3` was left to discretion. A policy ("use caret for major-locked overrides") would have prevented the defect entirely and not required a QA bounce.

### Quality Gate Failures

- **QA #1 failed due to a defect introduced by the implementation, not by an external dependency.** The implementation's own override choice broke dev-tool functionality. This is a QA gate doing its job correctly, but the root cause is an implementation-phase defect — preventable with an override constraint policy or implementation-level dev-page smoke check.

### Misalignment Patterns

- **Security audit result (2 moderate remaining) conflicted with implementation goal (0 vulnerabilities).** The initial implementation aimed to resolve 8 high + 2 moderate = 10, but stopped after resolving 8 high (leaving 2 moderate dompurify). QA accepted this as "2 moderate (accepted risk)." It was only in the second implementation pass (fixing immutable) that `dompurify ^3.3.2` was added, achieving 0. The acceptance criteria should have more clearly stated: "Target 0 vulnerabilities; document any accepted residuals explicitly."

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs**: 8 (security → implementer → code-review → qa → implementer → qa → uat → devops)

| From Agent | To Agent | Artifact | What Requested | Issues Identified |
| --- | --- | --- | --- | --- |
| User | Security | security/037-…-audit.md | Perform security audit + remediation plan | None |
| Security | Implementer | package.json + lock | Apply Phase 2 overrides | First override set too broad |
| Implementer | Code Review | package.json (overrides) | Review code quality | LOW: add CHANGELOG entry (noted, acted on at release) |
| Code Review | QA | All files | Verify boot + smoke | Approved; noted /api-docs as deferred manual check |
| QA | Implementer | QA report (FAILED) | Fix immutable override + add dompurify | Immutable v5 import error; required fix |
| Implementer | QA | package.json (fixed) | Re-run QA checks | None |
| QA | UAT | QA report (PASSED) | Verify value delivery | None |
| UAT | DevOps | UAT report (APPROVED) | Release v0.7.2 | PWA fallback deletion caught in pre-commit check |

**Handoff Quality Assessment**:
- Were handoffs clear and complete? **YES** — each handoff included explicit artifact references and status summary
- Was context preserved across handoffs? **YES** — QA failure root cause was clearly documented for implementer; fix was surgical
- Were unnecessary handoffs made? **ONE AVOIDABLE BOUNCE** — QA #1 → Implementer #2 → QA #2 was caused by an implementation defect (override too broad), not a genuine ambiguity. Preventable.

### Issues and Blockers Documented

**Total Issues Tracked**: 3

| Issue | Artifact | Resolution | Escalated? | Time to Resolve |
| --- | --- | --- | --- | --- |
| `immutable >=3.8.3` resolves to v5.x; breaks `/api-docs` | QA report #1 | Tightened to `^3.8.3` | No | ~15m |
| PWA fallback file deleted by dev server run | DevOps pre-commit check | `git checkout -- public/fallback-…js` | No | ~2m |
| GitHub Dependabot shows 2 remaining after 0 `npm audit` | Deployment doc | Documented as known variance (different advisory DBs) | No | Informational |

**Issue Pattern Analysis**:
- Most common issue type: **Implementation precision** (wrong semver operator)
- Were issues escalated appropriately? **YES** — all resolved at the tier they were found
- Did early issues predict later problems? **NO** — issues were independent; the immutable issue was a one-time constraint mistake

### Changes to Output Files

| Artifact | Created/Modified | Change Count | Pattern |
| --- | --- | --- | --- |
| `agent-output/security/closed/037-…-audit.md` | Created | 2 updates | Vulnerability inventory → verification results |
| `agent-output/code-review/closed/037-…-code-review.md` | Created | 1 | Approved at first pass |
| `agent-output/qa/closed/037-…-qa.md` | Created | 3 updates | Initial → QA Failed → QA Complete |
| `agent-output/uat/closed/037-…-uat.md` | Created | 1 | UAT Complete at first pass |
| `agent-output/deployment/v0.7.2.md` | Created | 2 updates | Committed → Released |
| `package.json` | Modified | 2 edits | Override set #1 → Override set #2 (tightened) |
| `package-lock.json` | Modified | Regenerated | 2 × `npm install` passes |
| `CHANGELOG.md` | Modified | 1 | v0.7.2 security section added |

---

## Lessons Learned

### L-001: npm Override Constraint Policy (HIGH PRIORITY)

**Pattern**: Implementer used `>=3.8.3` (unbounded range) for immutable override instead of `^3.8.3` (caret / major-locked).

**Impact**: immutable resolved to v5.x → `swagger-ui-react` import error → QA failed → additional implementation pass + re-QA.

**Rule to codify**: When writing an `overrides` entry to stay within a major version line, **always use caret (`^`)**, not `>=`. Use `>=` only when explicitly allowing any future major — which is rarely appropriate for security patches of a specific package family.

```json
// ✅ CORRECT — stays within major 3
"immutable": "^3.8.3"

// ❌ WRONG — can resolve to v4, v5, etc.
"immutable": ">=3.8.3"
```

**Target for PI**: Add to `backend-expert.mdc` and/or copilot-instructions.md under dependency management.

### L-002: Implementer Must Smoke-Test Dev-Tool Pages When Overrides Touch Their Dependencies (MEDIUM PRIORITY)

**Pattern**: Implementation applied `immutable` override without testing `/api-docs` (the page that uses `swagger-ui-react` which depends on immutable). QA found the issue instead.

**Rule to codify**: When adding a transitive override, identify which direct dependencies use the overridden package and test those features explicitly in dev before handing off to QA.

**Practical check**: After `npm install` with overrides, run `npm run dev`, visit `/api-docs` (or any page backed by overridden packages) and check server logs for import/compilation errors — not just HTTP 200.

**Target for PI**: Add to implementation-phase checklist in copilot-instructions.md or agent instructions.

### L-003: PWA Fallback Artifact Is a Recurring DevOps Pre-Commit Risk (MEDIUM PRIORITY)

**Pattern**: Running `npm run dev` (or `npm run build`) causes the PWA plugin to overwrite/delete `public/fallback-<hash>.js`. This production file disappears from the working tree without warning.

**History**: This same pattern appeared in prior releases (DevOps notes in retros 033/035 family).

**Rule to codify**: Add to the DevOps pre-commit checklist: "Run `git status` and check for deleted files in `public/`. If any `fallback-*.js` files are deleted, restore with `git checkout -- public/fallback-*.js` before staging."

**Ideal fix**: The `.gitignore` already excludes `fallback-development.js`. The production hash-suffixed file should never be regenerated by `npm run dev`; if it is, it is an upstream PWA plugin issue.

**Target for PI**: Add explicit `public/fallback-*.js` check to DevOps checklist doc.

### L-004: npm Advisory DB ≠ GitHub Advisory DB (INFORMATIONAL)

**Pattern**: After remediation, `npm audit` → 0 vulnerabilities. GitHub Dependabot (same push) → 2 vulnerabilities (1 high, 1 moderate). After the next commit, Dependabot showed 2 different remaining advisories.

**Explanation**: npm and GitHub maintain separate advisory databases. `package.json` overrides are respected by both, but they may have different advisories tracked. After any dependency security patch, check both:
1. `npm audit` (Advisory DB, npm registry)
2. GitHub → Security → Dependabot alerts (GitHub Advisory Database)

**Rule to codify**: Security audit documentation should note both sources and distinguishthem. Residual Dependabot advisories after 0 `npm audit` are real and should be reviewed — they are separate advisories not yet in npm's database.

### L-005: Security-Origin Lightweight Workflow Track Is Validated (INFORMATIONAL)

**Pattern**: This work chain had no formal planning or analysis document. It ran: security-audit → implementation → code-review → QA → UAT → DevOps. All phases completed successfully.

**Conclusion**: For reactive security fixes that are config-only (no new features, no schema changes), the lightweight track without Planner/Analyst is appropriate and efficient. Gate rigor (code review, QA log inspection, UAT scenarios) should remain the same regardless of track.

**Rule to codify**: Document the security-origin track as an official fast-path in the agent workflow documentation. Criteria: (a) fix originates from security scan, (b) changes are configuration-only (c) no new user-facing features.

---

## Recommendations for Process Improvement

### PI-1 (HIGH): Codify npm Override Constraint Policy

Add to `copilot-instructions.md` / `backend-expert.mdc`:

> **npm overrides**: Always use caret (`^`) for major-locked transitive dependency overrides. Reserve `>=` only when explicitly allowing future major bumps. After any override, test pages that use the affected package in dev mode (not just HTTP status — check server logs for import errors).

### PI-2 (MEDIUM): Implementer Dev-Tool Page Smoke Check

Add to agent/implementer instructions:

> When adding or modifying `overrides` in `package.json`, identify which app pages depend on overridden packages. Test those pages explicitly with `npm run dev` and check server compilation logs — not just HTTP 200 response.

### PI-3 (MEDIUM): DevOps PWA Fallback Check — Recurring Risk

Add to DevOps phase checklist:

> Before `git add`, run `git status` and check for deleted files in `public/`. Any `fallback-*.js` deletion is likely a dev/build server side-effect. Restore with `git checkout -- public/fallback-*.js` if found.

### PI-4 (LOW): Two-Source Security Validation After Dependency Patches

Add to security audit template:

> After applying npm overrides, verify against **both** `npm audit` (npm Advisory DB) **and** GitHub Dependabot alerts (GitHub Advisory DB). Document residuals from each source separately. `npm audit: 0` does not guarantee `Dependabot: 0`.

---

## Objective Assessment

**Did the chain deliver the stated value?** ✅ YES  
`npm audit` → 0 vulnerabilities (from 10). GitHub Dependabot → 2 (from 11). Application functional, tests passing, v0.7.2 released same day.

**Was the delivery efficient?** MOSTLY — one avoidable QA bounce (override constraint). All other phases completed in single pass.

**Were there any deferred or dropped items?**
- Phase 4 (architectural): Consider moving `swagger-ui-react` to devDependencies or static API docs. Explicitly deferred; tracked in security audit doc as architectural recommendation. Not blocking.
- Dependabot residual 2 advisories: Documented as separate GitHub-only advisories, reviewed informally, not blocking v0.7.2.

---

*Handoff: PI agent to extract L-001, L-002, L-003 as process improvements and consider closing this retrospective once extracted.*

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-08 | pi | Marked Processed; codified L-001/L-002/L-003 into agent instructions (see `agent-output/process-improvement/closed/037-process-improvement-analysis.md`) |