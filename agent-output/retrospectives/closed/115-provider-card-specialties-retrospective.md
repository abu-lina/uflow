---
Status: Processed
---

# Retrospective 115: Provider Card Specialty Tags + Open/Closed Status

**Plan Reference**: `agent-output/planning/closed/115-provider-card-specialties-open-status.md`
**Date**: 2026-05-02
**Retrospective Facilitator**: retrospective
**Version Released**: v0.12.2

---

## Summary

**Value Statement**: Users browsing food providers on UFlow can now see what dishes a restaurant is known for and whether it is currently open — directly from the discovery card — without tapping into each provider's detail page.

**Value Delivered**: YES
- Specialty tags (top-2 offers + "+N" overflow) render on ProviderCard
- Open/closed status indicator (green/red dot + localized text) renders when opening_hours available
- Trust chip labels fully i18n across 6 languages (EN/DE/AR/TR/UR/PS)
- 1205 tests pass; zero regressions introduced

**Implementation Duration**: 2026-04-29T18:00Z → 2026-05-02T10:25Z (~64 hours elapsed, 2 working sessions)

**Overall Assessment**: Value delivered cleanly on a lean implementation with no DB migrations or new infrastructure. The key process friction was a **second Code Review cycle after QA and UAT had already completed**, triggered by i18n and UI-behavior findings that should have been caught in the first CR pass. This added one full QA+UAT re-run to the pipeline. The DevOps phase also required manual correction of a stale version recommendation and a CHANGELOG block misplacement.

**Focus**: This retrospective emphasizes the repeatable process improvements (CR thoroughness, i18n checklist, version hygiene) over the one-off technical delivery details.

---

## Timeline Analysis

| Phase | Planned | Actual | Variance | Notes |
|-------|---------|--------|----------|-------|
| Planning + Critique | 1 session | 2026-04-29T18:00–18:30Z (~30 min) | On target | Clean plan; critique approved in single pass |
| Implementation | 1 session | 2026-04-29T23:06Z → 2026-04-30T08:10Z (~9h) | On target | TDD RED→GREEN; lint fix for eslint snapshot path |
| Code Review Pass 1 | 1 review | 2026-04-29 → 2026-04-30 | Extra remediation loop | Found 1 HIGH + 1 MEDIUM (missing regressions, call-site evidence); remediated and re-approved 2026-04-30 |
| QA Pass 1 | 1 run | 2026-05-02T07:35–07:55Z | On target | All automated gates pass |
| UAT Pass 1 | 1 review | 2026-05-02T07:58Z | On target | APPROVED FOR RELEASE |
| Code Review Re-run | — (unplanned) | 2026-05-02T09:47–10:00Z | +1 full CR cycle | Post-UAT CR found 1 HIGH i18n + 2 MEDIUM width/coverage |
| QA Re-test | — (unplanned) | 2026-05-02T10:05–10:10Z | +1 QA cycle | Re-verified CR remediations |
| UAT Re-review | — (unplanned) | 2026-05-02T10:15Z | +1 UAT cycle | Re-confirmed value delivery |
| DevOps Stage 1 | 1 session | 2026-05-02T10:20Z | Minor correction overhead | Version correction (v0.11.4 → v0.12.2); CHANGELOG block fix |
| DevOps Stage 2 | 1 session | 2026-05-02T10:25Z | On target | Push, tag, smoke, issue close — all clean |
| **Total** | ~3 sessions | ~5 sessions | **+2 unplanned cycles** | CR re-run + QA/UAT re-validation |

---

## What Went Well (Process Focus)

### Workflow and Communication

- **Lean scoping**: The plan correctly identified that both features share a single prerequisite (M1 data pipeline wiring), making them efficient to bundle. No scope creep occurred.
- **Reuse of proven utilities**: `getOpenStatus()` from Plan 113 was used without modification, eliminating re-testing an edge-case-rich time-zone utility.
- **Graceful empty states by design**: Planning mandated conditional rendering for null/empty offers and opening_hours. Implementation followed through — zero null-reference regressions.
- **Post-UAT delta check**: DevOps correctly verified no code had changed after the final UAT approval before committing. Clean gate.

### Agent Collaboration Patterns

- **CR remediation was precise**: When the second CR pass found 3 findings, remediation addressed all 3 specifically and narrowly. No unintended side-effects introduced.
- **QA re-test was fast**: Because CR findings were implementation-only (no architecture change), QA re-test was lightweight — existing test suite + 5 minutes of gate verification.
- **DevOps caught version drift independently**: DevOps ran `git fetch --tags` and confirmed v0.11.4 was stale before accepting the UAT recommendation. The correction happened without requiring a new UAT cycle.

### Quality Gates

- **1205 tests at release**: Test count grew by 51 (baseline 1154) — healthy regression density for the feature surface touched.
- **TDD contract maintained**: RED→GREEN verified in implementation for all new tests. Implementation doc captures this explicitly.
- **Security audit gate**: DevOps confirmed the 2 pre-existing vite HIGH vulnerabilities were not introduced by Plan 115. Clear non-regression signal.
- **CHANGELOG and version correction at Stage 1**: Both the stale block placement and stale version recommendation were caught and corrected before the commit landed on main. The artifact correction cycle stayed within the DevOps phase.

---

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

#### **BN-1: Post-UAT Code Review cycle (highest impact)**

**What happened**: After QA and UAT both approved the implementation, a second Code Review pass was triggered. It found 3 new findings (1 HIGH i18n trust chip labels hardcoded in English, 2 MEDIUM truncation behavior and regression coverage). This forced QA and UAT to re-run.

**Root cause**: The initial Code Review pass (2026-04-29/30) focused on architecture alignment, regression presence, and call-site evidence. It did not systematically check i18n compliance for every string in the component or verify conditional CSS width logic against the single-vs-multiple-chip scenario. These are UI-behavior specifics that fell through the CR checklist.

**Process impact**: +1 unplanned CR round, +1 QA re-test, +1 UAT re-review = ~3 extra agent cycles.

**Repeatable risk**: Any plan that touches a component with trust chips, badges, or labeled UI elements is at risk for missed i18n compliance if CR doesn't include an explicit i18n string scan.

#### **BN-2: Stale version recommendation from UAT**

**What happened**: UAT recommended releasing as `v0.11.4` — a version already released two plans prior (Plan 114 Phase 2). DevOps had to independently verify and correct to v0.12.2.

**Root cause**: UAT performs a business-value assessment and does not always run `git fetch --tags` to verify the current release frontier. When multiple plans have been released between the time a plan was written and when UAT runs, the version context goes stale.

**Process impact**: Extra DevOps step; potential for confusion if DevOps had not caught it.

**Repeatable risk**: Any plan that sits pending for more than 48h between UAT approval and DevOps execution is at risk for stale version recommendations.

#### **BN-3: CHANGELOG block misplacement**

**What happened**: The implementer added Plan 115 changelog entries inside the already-released `[0.11.4]` block. DevOps had to move them to a new `[0.12.2]` block at Stage 1.

**Root cause**: The implementer used the then-current "latest version" as the target block, without knowing that v0.11.4 would already be released by the time DevOps ran Stage 1. When multiple plans release in rapid succession, the CHANGELOG target block becomes a race condition.

**Process impact**: Manual correction at Stage 1; increased risk of shipping malformed release history if missed.

### Agent Collaboration Gaps

- **CR i18n scan gap**: The first Code Review approved the implementation without checking whether every label in the affected component used the translation system. An explicit "i18n compliance scan" step (check every string literal in modified components against the LanguageProvider) would have caught the hardcoded English trust chip labels in Pass 1.
- **CR single/multi-item conditional CSS gap**: The single-chip vs two-chip width behavior was a UI-behavior contract that CR did not verify against a real test case in Pass 1. This is a category of "conditional branch coverage" that requires deliberate CR attention for UI components with conditional class logic.

### Quality Gate Failures

- **CR Pass 1 missed i18n compliance**: The HIGH finding in CR Pass 2 (hardcoded English trust chip labels) should have been caught in CR Pass 1. It was a behavioral compliance issue, not an architecture or structure issue.
- **CR Pass 1 missed branch coverage gap**: The MEDIUM finding (no focused max-2/+N overflow regression) was documented as a "concern" in Pass 1 but not blocked on. It should have been a blocking gap given it is the primary user-facing behavior of the specialty tags feature.

---

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs**: 9 across all artifacts (Planner → Analyst → Critic → Implementer → CR × 2 → QA × 2 → UAT × 2 → DevOps Stage 1 → DevOps Stage 2)

**Handoff Chain**:
```
planner → critique → implementer → code-reviewer (pass 1, rejected)
       → implementer (remediation) → code-reviewer (pass 2, approved)
       → qa (pass 1) → uat (pass 1, approved)
       → code-reviewer (pass 3, rejected)
       → implementer (remediation 2) → code-reviewer (pass 4, approved)
       → qa (pass 2) → uat (pass 2, approved)
       → devops (stage 1) → devops (stage 2, released)
```

**Handoff Quality Assessment**:
- Handoff content was clear and specific at each transition
- Context was preserved across sessions via Flowbaby memory and artifact docs
- The CR-after-UAT loop was the one unplanned re-entry in an otherwise linear pipeline
- No unnecessary back-and-forth within any single phase

### Issues and Blockers Documented

| Issue | Phase | Resolution | Escalated? | Time to Resolve |
|-------|-------|------------|------------|-----------------|
| Missing ProviderCard regressions (CR Pass 1) | CR→Impl | Regressions added | No | ~12h (overnight) |
| Missing call-site evidence (CR Pass 1) | CR→Impl | Evidence documented in impl doc | No | ~12h (overnight) |
| Hardcoded i18n trust labels (CR Pass 3) | CR→Impl | Keys migrated to LanguageProvider | No | ~47 min |
| Single-chip half-width truncation (CR Pass 3) | CR→Impl | Conditional `max-w-full` added | No | ~47 min |
| Missing max-2/+N focused regression (CR Pass 3) | CR→Impl | Regression tests added with `[pre-fix FAILS]` label | No | ~47 min |
| Stale version recommendation (UAT→DevOps) | DevOps Stage 1 | Corrected to v0.12.2 via `git fetch --tags` | No | <5 min |
| CHANGELOG block misplacement (Impl→DevOps) | DevOps Stage 1 | Block moved from [0.11.4] to [0.12.2] | No | <5 min |

**Issue Pattern Analysis**:
- Most common type: **CR checklist gaps** (2 separate CR remediation rounds)
- No issues required escalation; all resolved within the assigned agent phase
- Early CR issues (Pass 1) did not fully predict the Pass 3 issues — the second set was a new category (i18n compliance, CSS branch coverage)

---

## Key Lessons (Repeatable Process Improvements)

### L1: Add an explicit i18n compliance scan to Code Review

**Observation**: CR Pass 1 checked architecture and test coverage but not i18n compliance for string literals in modified components. Hardcoded English trust chip labels passed CR Pass 1 and were only caught in CR Pass 3 (post-UAT).

**Improvement**: Code Review should include an explicit step: *"For each modified component, search for string literals that should use `t()` or translation keys. If any label text is hardcoded, block approval."*

**Where to codify**: `code-review-checklist` skill or `code-reviewer.agent.md` — add "i18n String Literal Scan" as a mandatory checklist item for any plan touching UI components.

---

### L2: Block on branch-coverage regression gaps in CR Pass 1

**Observation**: CR Pass 1 noted the missing max-2/+N overflow regression as a concern but did not block. By not blocking, it allowed the implementation to pass CR with the primary user-visible behavior untested. It was re-caught in CR Pass 3 as a MEDIUM finding.

**Improvement**: If the plan's primary user-facing behavior (the feature contract) lacks a direct regression test, CR should block — not merely note it. "Concern" status should require explicit sign-off from the user, not silent passage.

**Where to codify**: `code-reviewer.agent.md` — clarify that "missing regression for the primary value-delivery behavior" is a blocking MEDIUM, not a non-blocking concern.

---

### L3: UAT should state the current git tag, not recommend a version

**Observation**: UAT recommended `v0.11.4` — derived from a stale read of the plan or context, not from a live `git fetch --tags`. DevOps corrected this independently.

**Improvement**: UAT should not recommend a specific version number. Version selection belongs exclusively to DevOps (who runs `git fetch --tags` as the first Stage 1 step). UAT should state: *"All value criteria pass; version target deferred to DevOps pre-flight."*

**Where to codify**: `uat.agent.md` — remove or gate any version recommendation with a note that the concrete version is determined at DevOps Stage 1.

---

### L4: Implementer should not target a specific CHANGELOG block

**Observation**: The implementer wrote Plan 115 entries into `[0.11.4]` — the then-current version block — without knowing that v0.11.4 would be released by Plan 114 Phase 2 before DevOps ran Stage 1.

**Improvement**: Implementers should use a placeholder block header (`[Unreleased]` or `[NEXT]`) when adding CHANGELOG entries. DevOps Stage 1 is the only phase that knows the correct target version with certainty (via `git fetch --tags`).

**Where to codify**: `implementer.agent.md` — add guidance: *"Use `[Unreleased]` as the CHANGELOG block header. DevOps will rename it to the correct semver at Stage 1."*

---

### L5: Multi-pass CR cycles signal a CR checklist coverage gap, not a one-off

**Observation**: Plan 115 required 4 CR passes (2 per remediation round). The second set of findings was a completely different category from the first (i18n vs. test coverage). This indicates the CR checklist does not have uniform coverage across categories.

**Improvement**: After any multi-pass CR cycle, the new finding categories should be reviewed for addition to the CR checklist. This is the retrospective→process-improvement feedback loop working as intended.

**Where to codify**: `processimprovement.agent.md` / `code-review-checklist` skill — add i18n compliance and CSS conditional branch coverage as explicit checklist items.

---

### L6: UAT should provision dev data and validate visually in the browser

**Observation**: Plan 115’s UAT validated value delivery entirely through code-reading and test evidence. The actual visual rendering of specialty tags and the open/closed indicator on a real card was deferred as DF-1 (“within 24h of production deployment”). This deferred gate is weak: it depends on production data happening to include providers with `offers` and `opening_hours` populated, and it moves the validation responsibility outside the pipeline.

**Improvement**: For any plan that touches rendered UI on real data (cards, detail pages, search results), UAT should include a **dev data provisioning step**:

1. Use `supabase-dev/execute_sql` to confirm at least one record in the dev database has the relevant fields populated (e.g., `offers` non-empty, `opening_hours` non-null). If no suitable record exists, INSERT or UPDATE one test provider record with representative data.
2. Start the dev server and visually confirm the feature renders as expected on that record at the relevant route.
3. Record a brief note (provider ID + route + what was observed) as UAT evidence.

This converts the visual gate from a post-release open action into a first-class UAT acceptance criterion. It also catches rendering bugs (CSS, conditional layout, overflow) that automated tests with mocked props cannot reliably surface.

**Where to codify**: `uat.agent.md` — add “UI Visual Validation Gate” as a MANDATORY section for UI-touching plans.

---

## Technical Patterns (Secondary)

The following are noted as secondary observations — not the primary focus of this retrospective.

- **Reuse pattern**: `getOpenStatus()` from Plan 113 required zero modification for use in Plan 115. This validates the Plan 113 investment in a well-abstracted utility.
- **Data flow was already correct**: `select('*')` in `searchProviders()` already returned `opening_hours`; the main work was wiring it through the TypeScript interface and the mapping function. This is a sign of a well-structured data layer.
- **No DB migrations for feature enhancements**: Plan 115 delivered new UI behavior using only existing data. This is the intended "Postgres-first" pattern — the data was already there; the UI just wasn't using it.
- **41 ProviderCard tests**: Healthy test density for a relatively small component. The focused `[pre-fix FAILS] [post-fix PASSES]` pattern (from PI-045) was applied correctly for the trust chip regression.

---

## Recommended Process Improvements

| # | Improvement | Urgency | Codify In |
|---|-------------|---------|-----------|
| PI-1 | Add "i18n String Literal Scan" to Code Review mandatory checklist | **HIGH** | `code-reviewer.agent.md` |
| PI-2 | Block (not note) on missing primary-behavior regression in CR | **HIGH** | `code-reviewer.agent.md` |
| PI-3 | UAT must not recommend a version number; defer to DevOps Stage 1 | **MEDIUM** | `uat.agent.md` |
| PI-4 | Implementer uses `[Unreleased]` block header in CHANGELOG | **MEDIUM** | `implementer.agent.md` |
| PI-5 | Multi-pass CR finding categories → trigger PI update for that category | **LOW** | `processimprovement.agent.md` |
| PI-6 | UAT provisions dev Supabase data + visual browser validation for UI plans | **HIGH** | `uat.agent.md` |

---

## Open Actions

| Item | Owner | Status |
|------|-------|--------|
| **DF-1**: Visual validation of specialty tags + open-status on production cards | User / Release Lead | Open — within 24h of production deployment |
| **PI-1 to PI-6**: Process improvement codification | ProcessImprovement agent | ✅ Implemented in this session |

---

✅ **PHASE COMPLETE: [115] Retrospective**
📄 **Output**: agent-output/retrospectives/115-provider-card-specialties-retrospective.md
➡️ **NEXT**: ProcessImprovement agent — codify PI-1 (i18n CR scan) and PI-2 (blocking regression gap) as highest priority; PI-3/PI-4 as follow-on
