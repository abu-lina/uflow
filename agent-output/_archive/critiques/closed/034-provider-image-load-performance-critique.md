---
ID: 34
Origin: 34
UUID: 9f3a1e7c
Status: Committed
---

# Critique 034: Plan — Fix Provider Detail Page Image Load Latency

**Artifact**: `agent-output/planning/034-provider-image-load-performance-v0.6.12.md`  
**Analysis Reference**: `agent-output/analysis/closed/034-provider-image-loading-analysis.md`  
**Date**: 2026-03-07  
**Critic**: @Critic  
**Status**: Initial

**Changelog**:

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|\n| 2026-03-07T16:45Z | planner → critic | Re-review after incorporating recommendations | Revision 1: All findings addressed |
| 2026-03-07T16:30Z | planner → critic | Review Plan 034 for v0.6.12 approval | Initial critique |

---

## Value Statement Assessment

**Present**: ✅  
**Format**: User story ("As a desktop user... I want... so that...")  
**Business Objective**: Clear — "Primary trust signal; reducing latency should increase engagement and contact intent."

**Assessment**: PASS. The value statement directly addresses the user-reported defect and connects it to a business outcome.

---

## Overview

Plan 034 addresses a verified performance defect where provider hero images load in >10 seconds on desktop, especially after deployment. The plan proposes 7 milestones targeting 5 confirmed root causes from Analysis 034:

1. **Baseline capture** (RC validation)
2. **Remove AVIF, prefer WebP** (primary fix — RC-1)
3. **Add `sizes` + `priority`** (amplifier fix — RC-3)
4. **Persist `.next/cache/images/`** (deployment fix — RC-2)
5. **Optional: Cloudflare cache rule** (CDN optimization — RC-5)
6. **Optional: Reduce `ssr:false` waterfall** (SSR optimization — RC-4)
7. **Version bump** (release housekeeping)

The plan correctly sequences low-risk, high-impact changes first (milestones 2–3) before infrastructure changes (milestone 4).

---

## Architectural Alignment

**ADR-004 (Cache-Control per-route)**: ✅ Respected. Plan 034's optional Cloudflare cache rule (milestone 5) does not override per-route Cache-Control; it enables CDN caching of `/_next/image` responses that already have `Cache-Control: public, max-age=3600` from the Next.js origin.

**Postgres-first**: ✅ Not violated. The plan fixes infrastructure and frontend configuration; no new services or external dependencies introduced.

**Trust system architecture**: ✅ Aligned. Provider images are part of trust-first discovery (Epic 2.1 context). Faster hero images improve trust signal delivery.

**Assessment**: PASS. The plan fits within existing architecture and respects documented ADRs.

---

## Scope Assessment

**Appropriateness**: ✅ The scope is focused on fixing a single user-facing defect with minimal blast radius. Three core milestones (2, 3, 4) are required; two optional milestones (5, 6) are clearly marked as stretch.

**Boundaries**:

- Milestone 6 (reducing `ssr:false` waterfall) is correctly scoped as optional given higher refactoring risk.
- RC-6 (raw image upload) is NOT addressed. This is acceptable scope control — it only affects net-new uploads after system-wide fix deployment. Noted as residual technical debt below.

**Assessment**: PASS. Scope is appropriate for a patch release.

---

## Technical Debt Risks

| Risk                                            | Severity | Notes                                                                                                                                              |
| ----------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC-6 (raw uploads) unaddressed                  | LOW      | Net-new uploads will still encode cold; however, WebP + correct `sizes` make cold encodes <100ms, so this becomes negligible. Acceptable tradeoff. |
| Docker volume mount introduces infra complexity | LOW      | New persistent volume could accumulate stale images; implementer should document max size/eviction expectations.                                   |

**Assessment**: PASS. Debt is minor and explicitly scoped out with documented rationale.

---

## Findings

### Finding 1: Missing measurable success threshold

**Status**: ADDRESSED ✅  
**Severity**: MEDIUM  
**Issue Title**: No explicit latency target for value delivery

**Description**: The plan states the problem (>10s image load) and the expected outcome ("no longer takes multiple seconds"), but does not define a measurable success threshold (e.g., "cold hero image loads in <500ms").

**Impact**: Without a measurable target, QA and UAT cannot objectively confirm whether the fix is successful. "Multiple seconds" vs "10 seconds" is ambiguous.

**Recommendation**: Add a measurable success criterion to Milestone 2 or the overall Validation section. The analysis suggests <500ms is achievable; this should be the target.

**Resolution**: Plan revised to add "Measurable success criteria" section: cold load **< 500ms**, warm load **< 200ms**. Milestone 2 acceptance criteria now references this target.

---

### Finding 2: Rollback procedure missing for Docker volume mount

**Status**: ADDRESSED ✅  
**Severity**: MEDIUM  
**Issue Title**: Milestone 4 lacks rollback procedure for volume mount

**Description**: Milestone 4 introduces a Docker volume mount for `.next/cache/images/`. The plan notes medium risk ("requires coordination with deployment infrastructure") but doesn't describe what happens if the volume mount causes issues (permissions, disk growth, corrupted cache).

**Impact**: If the volume mount fails silently (e.g., images never warm-hit), the defect reappears post-deploy and requires hotfix investigation. If the volume grows unbounded, disk exhaustion could occur.

**Recommendation**: Add a short rollback procedure to Milestone 4:

1. Remove volume mount from deployment config.
2. Restart container (cold cache restored).
3. Fall back to Milestones 2+3 as the sole fix until volume mount is debugged.

**Resolution**: Milestone 4 now includes explicit "Rollback (if this introduces issues)" section with 3 steps. Rollback Considerations section also cross-references Milestone 4 rollback steps.

---

### Finding 3: Open Question on target release is trivially resolvable

**Status**: CLOSED  
**Severity**: LOW  
**Issue Title**: OPEN QUESTION on v0.6.12 target should be closed

**Description**: The plan has an OPEN QUESTION asking to confirm v0.6.12 as the target. Repository version is `0.6.11`; the next patch is by definition `0.6.12`. This is trivially resolved.

**Impact**: None. Process clarity only.

**Recommendation**: Planner should close this OPEN QUESTION by marking it `[CLOSED]` with the note: "v0.6.12 confirmed as next patch following v0.6.11."

---

## Questions for Planner (Non-blocking)

1. **Milestone 4 volume path**: Will the volume be local disk or a managed volume (e.g., Hetzner Volume)? This affects deployment script changes.
2. **Image cache eviction**: Does Next.js's `minimumCacheTTL` handle automatic eviction, or could this volume grow indefinitely?
3. **Mobile hero `priority`**: The plan mentions adding `priority` where missing. Confirm: is this intended for the mobile hero image in `ProviderDetailPage.tsx` line 676, which the analysis flagged as missing `priority`?

These questions are non-blocking; they can be resolved during implementation.

---

## Risk Assessment

| Category              | Rating | Notes                                                        |
| --------------------- | ------ | ------------------------------------------------------------ |
| Architecture          | LOW    | Fits existing patterns, no new services                      |
| Implementation        | LOW    | Configuration changes (formats, sizes) + localized JSX edits |
| Deployment            | MEDIUM | Docker volume mount requires infra coordination              |
| Rollback              | MEDIUM | Volume mount lacks explicit rollback (Finding 2)             |
| Browser compatibility | LOW    | WebP is widely supported since 2019                          |

---

## Recommendations

~~1. **Address Finding 1**: Add `<500ms cold hero image` as the success threshold.~~ DONE
~~2. **Address Finding 2**: Add a 2–3 line rollback procedure for Milestone 4.~~ DONE
~~3. **Close Finding 3**: Mark the OPEN QUESTION as `[CLOSED]` confirming v0.6.12.~~ DONE

All recommendations addressed in plan revision.

---

## Verdict

**APPROVED** ✅ (Revision 1: All findings addressed)

The plan is well-structured, addresses verified root causes with appropriate prioritization, and fits the existing architecture. All three findings from the initial review have been addressed in the plan revision.

Gate for Implementer: Clear. All milestones have acceptance criteria and measurable success thresholds. No open findings remain.

---

## Revision History

| Revision   | Date              | Summary                                                                                         |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| Initial    | 2026-03-07T16:30Z | Created critique; Verdict: APPROVED with 2 MEDIUM findings                                      |
| Revision 1 | 2026-03-07T16:45Z | Re-reviewed after plan revision; all 3 findings ADDRESSED; Verdict: APPROVED (no open findings) |
