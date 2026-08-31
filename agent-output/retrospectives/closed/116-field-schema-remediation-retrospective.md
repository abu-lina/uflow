---
ID: 116
Origin: 118
UUID: e7a3f1c9
Status: Processed
---

# Retrospective 116: Field-Level Schema Remediation

**Plan Reference**: `agent-output/planning/closed/116-field-schema-remediation-plan.md`  
**Date**: 2026-05-01T (session) / 2026-05-02T (release)  
**Retrospective Facilitator**: retrospective  
**Version Released**: v0.12.0  
**PR**: [abu-lina/uflow#201](https://github.com/abu-lina/uflow/pull/201) — squash-merged `d25606a3`  

---

## Summary

**Value Statement**: Remediate all 28 field-level schema findings from Architecture 118 — fixing data integrity gaps, naming mismatches, nullable booleans, and the provider table monolith — before first public consumer launch.  
**Value Delivered**: YES  
**Implementation Duration**: ~10 hours (single extended session: plan created 2026-05-01T20:00Z → PR merged 2026-05-02T03:00Z approx.)  
**Overall Assessment**: 28 findings resolved across 8 milestones and 8 migrations. Three planning iterations were essential and added genuine value (architecture review caught a CRITICAL FK/enum dependency ordering issue). Three post-QA blocking bugs were found and fixed in-session. CI caught a fourth residue missed by delta-only lint. Delivery compressed dramatically under the estimate (14–22 days → 1 session). Key process gaps: incomplete local lint coverage, orphaned function not cleaned up in migrations, tag-before-merge race condition.  
**Focus**: Repeatable process improvements over one-off technical details.

---

## Timeline Analysis

| Phase | Planned Duration | Actual Duration | Variance | Notes |
|---|---|---|---|---|
| Planning (R0) | 0.5 day | ~2h (20:00Z → 21:30Z) | Under estimate | Initial plan complete in one pass |
| Critique round 1 (F-1–F-6) | Not estimated | ~1h (→ 21:30Z) | — | 6 findings; plan revised in same session |
| Architecture review (AF-1–AF-7) | Not estimated | ~2h (→ 23:30Z) | — | 7 findings; 1 CRITICAL (AF-1 enum rename ordering) caught and resolved |
| Critique round 2 (G-1–G-3) | Not estimated | ~0.5h (→ 00:15Z) | — | 3 findings on revised plan; closed in same session |
| Implementation | 10–15 days | ~1–2h (00:25Z → commit) | 99% under | 8 milestones, 96 files, 8 migrations; single session |
| QA (strategy + execution) | 2–3 days | ~1.5h | 99% under | 3 blockers found + fixed in-session |
| UAT | 1–2 days | ~0.5h | 99% under | 8 milestones verified against plan; APPROVED |
| DevOps (Stage 1 + 2) | 0.5 day | ~1.5h | Under | CI lint failure required one additional fix push |
| CI unblock + PR merge | Not estimated | ~1h | — | `CommunityServiceImage` residue caught by CI; fix + re-tag |
| **Total** | **14–22 days** | **~10 hours** | **97% under estimate** | Estimate assumed async human team; agent pipeline compressed timeline significantly |

---

## What Went Well (Process Focus)

### Workflow and Communication

- **Multi-round planning justified its cost**: Three plan revisions (6 + 7 + 3 findings) each added genuine value before a single line of code changed. The R2 Architecture review caught AF-1 CRITICAL — `ALTER TYPE RENAME VALUE` without first dropping dependent CHECK constraints and partial indexes. On PostgreSQL, this would have caused runtime failures during migration execution. The extra ~3 hours of planning prevented a guaranteed production incident.

- **Decision Record discipline**: All 11 architectural decisions (D-1 through D-11) were marked RESOLVED in the plan before implementation started. The implementer had unambiguous answers on the most consequential design choices — supertype unification, enum rename sequencing, URL backward-compat mapping, extension table RLS. Zero implementation-time decision requests.

- **QA regression tests were red-before-fix verified**: For BF-1 and BF-2, regression tests were written and confirmed failing BEFORE applying the fix, then confirmed passing after. This created an unambiguous quality signal and documented the bug path in the test suite for permanent guard.

- **Value statement as anchor**: "28 findings, pre-consumer window, structural soundness" was the persistent check throughout QA and UAT. No feature creep. UAT validated all 8 milestones against plan deliverables explicitly.

### Agent Collaboration Patterns

- **QA fixed bugs in-session without handoff delay**: All 3 blockers (BF-1, BF-2, BF-3) were found and fixed by QA in the same session rather than being handed back to the implementer. This eliminated one handoff cycle and kept the release on track. (See also: trade-off below.)

- **Architecture review added a genuinely separate lens**: The Architect's AF-1 finding (CRITICAL) was not found by either of the two Critic passes. This validates using a dedicated architecture reviewer as a distinct agent role rather than folding it into the Critic pass.

- **DevOps pre-push type-check**: Running `npm run type-check` post-commit and before push caught zero regressions and created clean gate evidence. This is a low-cost habit with high documentation value.

### Quality Gates

- **CI acted as a backstop for incomplete local lint**: The `CommunityServiceImage` unused interface was not caught by the 19-file delta lint, but CI's full-repo scan caught it before merge. The CI gate worked as intended.

- **UAT deferred items were explicit and tracked**: Four deferred items (DF-1 through DF-4) were recorded with owners, triggers, and evidence-to-close criteria in `agent-output/planning/116-open-actions.md`. No deferred item was ambiguous.

---

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

- **Delta lint gave false confidence**: The pre-push lint check covered only 19 explicitly named delta files. `CommunityServiceGallery.tsx` was changed by M-5a (updated the query) but was not in the explicit file list. The unused `CommunityServiceImage` interface was left behind, CI caught it, and an additional fix push and tag re-point were required. **Impact**: Added one more commit, one more CI wait cycle, and forced a post-squash tag correction. **Pattern**: Partial lint coverage gives a false-green signal when the changed file list is assembled manually rather than derived from `git diff`.

- **Tag-before-merge race condition**: The `v0.12.0` tag was created and pushed on the session branch BEFORE the PR was squash-merged. After squash merge, the tag pointed to the pre-squash commit (not on main). Required: delete old tag → push delete → recreate annotated tag → push new tag. **Pattern**: On squash-merge workflows, release tags must be created AFTER merge, not before.

- **Migration completeness: orphaned function not cleaned up**: M-5a dropped `community_services` and `provider_community_services` tables but did not `DROP FUNCTION get_community_services_for_provider`. The function body still referenced the dropped tables, causing `supabase db push --local` to fail at migration 005 (PostgreSQL rejects `CREATE OR REPLACE FUNCTION` when the return type changes). PROD and DEV are unaffected because the function already exists in its pre-drop state, but local onboarding and CI local emulator paths are broken. **Impact**: DF-4 deferred; requires migration 087.

- **Post-QA blocking bugs from M-5 rename inventory gap**: BF-1 (`categories.ts:104` still using `'business'` enum) was caused by an incomplete rename inventory. The plan tracked 33 files for `'business'` → `'store'` but `fetchCategoriesBySection` was not in that list. BF-2 (`bookmarks.community_service_id` column dropped in M-5a line 374, but the READ path in `CommunityServiceDetailModal` was not updated in M-5c) was caused by the same root: the column drop's downstream read effects were not fully enumerated. **Pattern**: Enum renames and column drops require a write-side inventory AND a read-side inventory. The plan enumerated write paths; read paths were missed.

### Agent Collaboration Gaps

- **QA-as-implementer blurs separation of concerns**: While fixing bugs in-session was fast, QA validating its own fixes is a reduced-trust cycle. BF-1 and BF-2 regressions were added and verified (red→green), which compensates. But in higher-risk scenarios, the implementer (not QA) should own fixes, with QA re-executing as a separate validation pass. For a schema remediation this large, one post-fix review cycle was skipped.

- **Code review happened before QA but post-implementation**: The code reviewer (APPROVED_WITH_COMMENTS) reviewed the Stage 1 commit. Three bugs not caught by code review were then caught by QA. This is expected — code review is not execution-time testing — but the code reviewer could have flagged the incomplete `'business'` → `'store'` sweep and the dropped-column read path as review concerns.

- **DF-1 manual browser validation deferred without confirmed date**: The 24h browser validation window started at PROD deployment, but there's no confirmed completion timestamp in any artifact. The rollback trigger condition is active. **Pattern**: DF-1 type deferreds (manual validation with rollback trigger) need an explicit confirmation + close workflow, not just a tracker entry.

### Quality Gate Failures

- **Local lint was incomplete**: Explicit file-list approach to delta lint is inherently fragile. Missed one file. CI caught it, but the cost was an extra commit, CI cycle, and tag operation.

- **DF-1 (browser validation) not completed before retrospective**: The release is live but the manual browser validation that triggers rollback if failed has not yet been confirmed closed. The retrospective is running against a deployment whose correctness has not been fully validated at the user-facing level.

---

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs**: 9 across planning → critique → planner → architecture → planner → critique → planner → implementer → code-review → qa → uat → devops  
**Handoff Chain**: `planner → critic → planner(R1) → architect → planner(R2) → critic → planner(R3) → implementer → code-reviewer → qa → uat → devops → retrospective`

| From Agent | To Agent | Artifact | What Requested | Issues Identified |
|---|---|---|---|---|
| architect (118) | planner | Architecture 118 (28 findings) | Create remediation plan | — |
| planner | critic | `116-field-schema-remediation-plan.md` R0 | Plan critique | 6 findings (F-1–F-6): estimate too narrow, UNIQUE constraint misread, PG enum rename risk, semver |
| critic | planner | Critique findings | Plan revision R1 | F-1–F-6 all addressed |
| planner | architect-reviewer | `116-field-schema-remediation-plan.md` R1 | Architecture review | 7 findings (AF-1–AF-7): 1 CRITICAL (enum rename dependency order), 3 HIGH (FL-1/FL-2 duplicate, FL-3 applicable_to drop, FL-28 inventory), 2 MEDIUM, 1 LOW |
| architect-reviewer | planner | Architecture findings | Plan revision R2 | AF-1–AF-7 all addressed |
| planner | critic | R2 plan | Second critique pass | 3 findings (G-1–G-3): badge trigger update, milestone subtitle, RLS requirement |
| critic | planner | G findings | Plan revision R3 | All closed |
| planner | implementer | R3 plan | Execute all 8 milestones | — |
| implementer | code-reviewer | Stage 1 commit | Review 96 files | APPROVED_WITH_COMMENTS; no blocking findings |
| code-reviewer | qa | Implementation + code review | QA strategy + execution | 3 blockers found (BF-1 enum residue, BF-2 dropped column read path, BF-3 unused param) + 1 INFO (orphaned function) |
| qa | uat | Post-fix state | Value delivery validation | APPROVED FOR RELEASE; 4 deferred items |
| uat | devops | UAT approval | Stage 2 release | CI lint failure (CommunityImage interface) required extra fix push |
| devops | retrospective | v0.12.0 merged | Capture lessons learned | — |

**Handoff Quality Assessment**:  
- Handoffs were generally clear and artifact-complete. The architecture-reviewer → planner handoff was the highest-value handoff in the chain (CRITICAL finding).  
- Context was preserved across planning iterations through the plan changelog.  
- No unnecessary back-and-forth beyond the required three-revision planning cycle. Each revision addressed all outstanding findings.

### Issues and Blockers Documented

**Total Issues Tracked**: 19 (6 Critique F, 7 Architecture AF, 3 Critique G, 3 QA BF, 1 INFO)

| Issue | Artifact | Resolution | Escalated? | Category |
|---|---|---|---|---|
| F-1: M-5 estimate too narrow for ~100 files | Critique R1 | Widened to 5–8 days, sub-milestones | No | Planning estimate |
| F-2: UNIQUE constraint on bookmarks misread | Critique R1 | Removed FL-1 from M-1 (already exists in migration 006) | No | Scope correction |
| F-3: PG enum RENAME VALUE risk understated | Critique R1 | Risk documented; PG15+ confirmed safe | No | Risk assessment |
| F-4/F-5/F-6: Version, community_services, CS backfill | Critique R1 | Addressed; v0.12.0 confirmed | No | Planning quality |
| AF-1: CRITICAL — ALTER TYPE without DROP dependent objects | Architecture R2 | M-5 Task 1 expanded with DROP ordering before RENAME VALUE | Yes (CRITICAL) | Production risk |
| AF-2: FL-1+FL-2 duplicate — already in migration 006 | Architecture R2 | FL-1/FL-2 removed from M-1 | No | Scope correction |
| AF-3: Section-scoped CHECKs should not be recreated | Architecture R2 | M-3 changed to DROP-only | No | Design correction |
| AF-4: FL-3 applicable_to still in schema | Architecture R2 | DROP added to M-1 | No | Missing scope |
| AF-5/AF-6/AF-7: trust_level, enum inventory, URL compat | Architecture R2 | Addressed in R2 revision | No | Design gaps |
| G-1/G-2/G-3: Badge trigger, subtitle, RLS | Critique R3 | All addressed in R3 revision | No | Planning gaps |
| BF-1: `categories.ts` still using `'business'` enum | QA Phase 2 | Fixed in-session; regression test added | No | Missing rename |
| BF-2: Bookmark query on dropped column | QA Phase 2 | Fixed in-session; regression test added | No | Dropped column read path |
| BF-3: Unused `entityType` param ESLint error | QA Phase 2 | Fixed in-session (`_entityType` prefix) | No | ESLint residue |
| INFO: Orphaned `get_community_services_for_provider` | QA Phase 2 | Deferred as DF-4 | No | Migration completeness |
| CI: `CommunityServiceImage` unused interface | CI pipeline | Fixed post-push (f490b537); tag re-pointed | No | Delta lint gap |

**Issue Pattern Analysis**:  
- Most common issue type: **Scope completeness** (AF-1, AF-2, AF-4, BF-1, BF-2, CI lint) — items that existed in the codebase but were not enumerated in the change inventory  
- Issues were escalated appropriately: AF-1 (CRITICAL) received the most planning attention  
- Early AF-1 and AF-3 findings did predict BF-1/BF-2: the CRITICAL finding about dependency ordering was the same root pattern as the post-QA enum/column residue bugs (incomplete tracking of downstream effects)

---

## Key Lessons Learned

### Successes

1. **Architecture review as a mandatory gate for migrations**: The AF-1 CRITICAL finding (ALTER TYPE without DROP dependent objects) would have failed the PROD migration. Mandatory architecture review on all schema-altering plans is justified.

2. **Decision Record before implementation**: 11 resolved decisions in the plan gave the implementer a single source of truth and eliminated runtime decision requests. No ambiguity meant faster, cleaner implementation.

3. **Red-before-fix regression test discipline**: BF-1 and BF-2 regressions were verified red BEFORE fix, green AFTER. This is the minimum bar for any fix that changes live DB query behavior.

4. **Single-session pipeline compression**: The entire 14–22 day estimate compressed to ~10 hours. Agent pipelines can sustain high-quality output at dramatically faster timelines than human team estimates.

### Process Improvements (Repeatable)

1. **Run full-repo lint before push — never delta-only**: Replace `npx eslint --max-warnings=0 [explicit-file-list]` with `npx eslint --max-warnings=0 src/` or at minimum `git diff --name-only origin/main | xargs npx eslint --max-warnings=0`. A manual file list will always miss files changed indirectly or overlooked.

2. **Create release tags AFTER merge — not before**: On squash-merge workflows, the pre-squash commit hash becomes orphaned on merge. Tags created before merge require delete + recreate after merge. Standard pattern: push branch → open PR → wait for CI → squash merge → git fetch → tag squash commit → push tag.

3. **Enum/column drop inventories must cover read paths, not just write paths**: When planning an enum rename or column drop, produce two inventories: (a) write inventory — all locations that write the old value, (b) read inventory — all locations that read or query using the old value. M-5a's `'business'` → `'store'` rename tracked 33 write-path files but missed `categories.ts` (read path). M-5a's `bookmarks.community_service_id` drop tracked table writes but missed `CommunityServiceDetailModal.tsx` (read path). Tool: `grep -rn "'business'" src/` and `grep -rn "community_service_id" src/` as explicit pre-migration gates.

4. **Migration completeness: DROP dependent objects before dropping tables**: When a migration drops a table, it must also audit and DROP all functions, views, or triggers that reference that table. Add a pre-commit checklist item: `grep -rn "<dropped_table_name>" supabase/migrations/` to confirm no remaining references in the migration chain.

5. **DF-1 pattern (browser validation with rollback trigger) needs a close ceremony**: Any deferred item tagged as "rollback trigger" must have an explicit closure workflow: assignee, deadline, confirmation message, and how to record evidence. The open-actions tracker entry is necessary but not sufficient without a named assignee who confirms completion.

6. **QA-as-implementer for in-session fixes**: Fast but reduces trust. Acceptable for low-ambiguity changes (ESLint prefix, enum literal correction) where the regression test is the primary quality signal. Not acceptable for architectural changes. Formalize the distinction in QA standards.

---

## Technical Patterns (Secondary)

> Marked secondary per retrospective mode guidance. These are schema-migration-specific patterns, not general workflow improvements.

- **ALTER TYPE RENAME VALUE requires DROP ordering**: All CHECK constraints and partial indexes that reference the old enum label must be DROPped BEFORE `ALTER TYPE ... RENAME VALUE`, then recreated AFTER with the new label. PostgreSQL re-parses expression text at evaluation time — stale labels cause runtime failures even if the DDL succeeds.
- **Supertype unification (community_services → providers)**: 69% column overlap was the threshold that justified merge. Extension table pattern (food_providers, store_providers, ummah_providers) is the correct follow-on for type-specific columns.
- **`listing_type` backward compat**: `resolveSectionFromSearchParams()` maps `?section=business` → `'store'`. URL surface must be versioned separately from DB schema.

---

## Deferred Items Status at Retrospective

| Item | Status | Risk Level |
|---|---|---|
| DF-1: Manual browser validation (store, ummah bookmark, ?section=business, food/store search) | **Open — 24h rollback window active** | HIGH |
| DF-2: M8 doc addendum in implementation + deployment docs | Open | LOW |
| DF-3: `food-menu.ts` unit test for `getProviderMenu()` | Open | LOW |
| DF-4: Migration 087 to drop orphaned `get_community_services_for_provider` | Open | MEDIUM (blocks local emulator) |

---

## Recommendations for Next Agent

- **Immediate**: DF-1 browser validation must be completed before the 24h window closes. This is a rollback trigger. Assign to QA or UAT.  
- **Short-term**: DF-4 migration 087 cleanup; DF-3 food-menu test — both can be bundled into the next schema-maintenance window.  
- **Process**: Add the three process improvements above (full-repo lint, post-merge tag, read+write inventory) to agent-output/process-improvement or copilot-instructions.

---

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-05-01T (session) | retrospective | Initial retrospective created for Plan 116 v0.12.0 |
