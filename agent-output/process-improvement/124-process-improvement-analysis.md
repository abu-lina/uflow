---
ID: PI-124
Origin: Plan 124 — Remove Everywhere Location
Status: Closed
Date: 2026-05-05
Agent: ProcessImprovement
---

# Process Improvement Analysis — Plan 124

## Executive Summary

| Item | Count |
|---|---|
| PIs analysed | 7 (PI-1 through PI-7) |
| HIGH priority | 4 (PI-1, PI-2, PI-3, PI-7) |
| MEDIUM priority | 2 (PI-4, PI-5) |
| LOW priority | 1 (PI-6) |
| Codified into devops.agent.md | 4 (PI-1, PI-2, PI-3, PI-7) |
| Deferred for future session | 2 (PI-4, PI-5) |
| No action needed | 1 (PI-6) |
| Conflicts identified | 0 |
| Overall risk | LOW |

**Assessment**: Four of the seven PIs are now codified. All high-priority items targeting repeatable DevOps failure modes (version collision, stash-before-rebase, CHANGELOG rebase conflict) are implemented. PI-4 and PI-5 target other agents and are deferred to their respective retrospective cycles.

---

## Source Retrospective

`agent-output/retrospectives/124-remove-everywhere-location-retrospective.md`

Plan 124 ran across multiple sessions (scope: remove location field from `/providers` search bar). Two version collisions were detected and resolved during the DevOps stages. PI-1 and PI-3 from earlier retrospectives were retrieved from memory and applied successfully. PI-7 is a new discovery from Stage 2.

---

## Recommendation Analysis

### PI-1 — Stash before rebase (HIGH)

| Field | Detail |
|---|---|
| Source | Stage 1 DevOps — `git rebase` blocked by uncommitted deployment doc edits in working tree |
| Current state before this PI | No stash guidance in Stage 1 step 4d |
| Proposed change | Add `git stash push -u -m "plan-NNN-working-state"` + `git stash pop` around the rebase |
| Affected agents | DevOps |
| Conflict with existing instruction | None |
| Risk | LOW — additive bash pattern; does not change commit or version logic |
| Implementation | ✅ **Applied to `devops.agent.md` step 4d** |

**Template applied**:
```bash
# PI-1: stash uncommitted working changes before rebase
git status --short
git stash push -u -m "plan-NNN-working-state"
git rebase origin/main
git stash pop
```

---

### PI-2 — CHANGELOG conflict resolution during rebase (HIGH)

| Field | Detail |
|---|---|
| Source | CHANGELOG merge conflict during Stage 1 rebase when two plans modified CHANGELOG concurrently |
| Current state before this PI | Only generic "resolve conflicts" note; no CHANGELOG-specific pattern |
| Proposed change | 6-step CHANGELOG conflict procedure (accept origin base, insert plan entry above, strip markers, `rebase --continue`, bump version, document) |
| Affected agents | DevOps |
| Conflict | None — new sub-procedure under existing conflict note |
| Risk | LOW — well-scoped pattern for a specific file type |
| Implementation | ✅ **Applied to `devops.agent.md` step 4d** |

---

### PI-3 — Second git fetch immediately before rebase (HIGH)

| Field | Detail |
|---|---|
| Source | Version tag collision would have been missed without a fresh fetch between session start and Stage 1 rebase |
| Current state before this PI | Single `git fetch origin --tags` at session start, but not repeated immediately before rebase |
| Proposed change | `git fetch origin --tags` repeated immediately before the `git rebase` in step 4d |
| Affected agents | DevOps |
| Conflict | None — adds a second fetch; the first (at session start pre-flight) is still useful |
| Risk | LOW — read-only operation; no side effects |
| Implementation | ✅ **Applied to `devops.agent.md` step 4d** |

---

### PI-4 — Scope-change artifact update gate (MEDIUM)

| Field | Detail |
|---|---|
| Source | When scope expanded mid-session (partial → full field removal), some lifecycle doc titles and summaries became stale and required retroactive correction |
| Current state | No explicit gate in Implementer or Planner instructions requiring doc update on scope change |
| Proposed change | Add a "scope-change artifact update gate" to the Implementer handoff: when scope changes after QA/UAT docs are created, require explicit update to all affected doc summaries and statuses |
| Affected agents | Implementer, Planner |
| Conflict | None detected |
| Risk | MEDIUM — adds a new gate that could slow down fast plans; needs to be scoped to scope changes only |
| Implementation | ⏸️ **Deferred — not in DevOps domain; needs Implementer/Planner retrospective cycle** |

---

### PI-5 — Multi-session lifecycle doc naming (MEDIUM)

| Field | Detail |
|---|---|
| Source | Two phases created QA/UAT docs with different name suffixes (`124-remove-location-field-qa.md` vs `124-divider-removal-qa.md`), leading to "double lifecycle doc" confusion at closure |
| Current state | No naming standard for multi-phase plans with multiple QA/UAT rounds |
| Proposed change | When a plan spawns a second QA/UAT cycle for a follow-on delta, name the second docs `[ID]-[delta-slug]-qa.md` and reference the delta slug in the Stage 1 deployment doc so the DevOps agent knows which docs to close together |
| Affected agents | QA, UAT, DevOps, document-lifecycle skill |
| Conflict | None detected |
| Risk | MEDIUM — affects naming convention across multiple agents |
| Implementation | ⏸️ **Deferred — requires coordinated update across QA/UAT/DevOps agents** |

---

### PI-6 — DF items need a forcing function at creation (LOW)

| Field | Detail |
|---|---|
| Source | DF-1 (manual browser verification) was tracked but remained open without owner/trigger pressure |
| Current state | DF items are created and tracked but have no structured due-trigger or owner-role requirement |
| Proposed change | DF item template requires: named owner role + concrete trigger + documented fallback |
| Affected agents | Planner, DevOps |
| Conflict | None |
| Risk | LOW — administrative, no code change |
| Implementation | ⏸️ **Deferred — low priority; can be addressed in document-lifecycle skill update** |

---

### PI-7 — Pre-push version collision guard (HIGH)

| Field | Detail |
|---|---|
| Source | Stage 2 push: parallel plan merged and tagged `v0.12.8` between Stage 1 commit and Stage 2 push window. PI-3 (Stage 1 fetch) detected it, but Stage 2 step 8 had no explicit version recheck immediately before `git push` |
| Current state before this PI | Stage 2 step 8 runs `git fetch origin --prune --tags` for branch divergence but does not re-verify the version target |
| Proposed change | Add an explicit collision check block immediately before `git push` in Stage 2 step 8: fetch + compare `$TARGET_VERSION` vs `$LATEST`; if collision, bump-amend-recheck-push (max 2 cycles) |
| Affected agents | DevOps |
| Conflict | None — extends step 8; existing version collision resolution steps (8c) remain as the resolution path |
| Risk | LOW — additive guard; does not remove any existing check |
| Implementation | ✅ **Applied to `devops.agent.md` Stage 2 step 8** |

**Template applied**:
```bash
git fetch origin --tags
LATEST=$(git tag --list "v*" | sort -V | tail -1)
echo "Collision check: is $TARGET_VERSION > $LATEST?"
# If $LATEST >= $TARGET_VERSION → bump, amend, recheck, then push
# Limit to 2 bump cycles; escalate on third collision
```

---

## Conflict Analysis

No conflicts detected. All four codified PIs (PI-1, PI-2, PI-3, PI-7) are additive to existing DevOps step 4d and step 8. They do not contradict any existing rule, bypass any quality gate, or introduce scope creep.

---

## Risk Assessment

| PI | Risk Level | Rationale | Mitigation |
|---|---|---|---|
| PI-1 | LOW | Additive stash pattern; not destructive | Stash is recoverable; `stash pop` always follows |
| PI-2 | LOW | 6-step CHANGELOG conflict recipe; well-scoped | Procedure is deterministic and easy to follow |
| PI-3 | LOW | Read-only fetch; no file changes | None needed |
| PI-4 | MEDIUM | Adds new gate for implementer; scope needed | Defer until Implementer/Planner retrospective |
| PI-5 | MEDIUM | Naming convention change across agents | Defer until multi-agent coordinated update |
| PI-6 | LOW | Administrative template addition | Defer — low frequency issue |
| PI-7 | LOW | Additive guard; existing resolution path unchanged | 2-cycle limit prevents infinite bump loops |

---

## Implementation Summary

### Files Updated

| File | Changes |
|---|---|
| `.github/agents/devops.agent.md` | Step 4d: PI-1 stash pattern, PI-3 second fetch, PI-2 CHANGELOG conflict procedure; Step 8: PI-7 pre-push collision guard; Changelog: 4 new entries |
| `agent-output/retrospectives/124-remove-everywhere-location-retrospective.md` | Stage 2 addendum: PI-7 section, timeline rows, What Went Well bullet, summary updated to v0.12.9, Next Actions status column, changelog entry |

### Deferred Items

| PI | Target Agent | Trigger |
|---|---|---|
| PI-4 | Implementer | Next retrospective touching scope-change or mid-plan QA loop |
| PI-5 | QA + UAT + DevOps | Next multi-phase plan with multiple QA rounds |
| PI-6 | Planner + document-lifecycle | Next document-lifecycle skill review |

---

## Validation Plan

- Verify `devops.agent.md` step 4d contains all three PI blocks (PI-1 stash, PI-3 second fetch, PI-2 CHANGELOG)
- Verify `devops.agent.md` step 8 contains PI-7 pre-push guard block
- Verify `devops.agent.md` changelog has 4 new entries dated 2026-05-05
- Verify retrospective contains PI-7 section, updated timeline, and status column in Next Actions

---

## Related Artifacts

| Artifact | Path |
|---|---|
| Source retrospective | `agent-output/retrospectives/124-remove-everywhere-location-retrospective.md` |
| DevOps agent instructions | `.github/agents/devops.agent.md` |
| Stage 1 deployment doc | `agent-output/deployment/v0.12.8-stage1.md` |
| Plan | `agent-output/planning/closed/124-remove-everywhere-location-plan.md` |

---

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-05-05 | pi | Created PI analysis for Plan 124; PI-1/PI-2/PI-3/PI-7 codified; PI-4/PI-5/PI-6 deferred |
