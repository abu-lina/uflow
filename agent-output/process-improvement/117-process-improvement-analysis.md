---
ID: 117
Origin: 116
UUID: b3d9e1f2
Status: Released
---

# Process Improvement Analysis 117 — Retrospective 116 Deployment Findings

**Source Retrospective**: `agent-output/retrospectives/116-field-schema-remediation-retrospective.md`  
**Date**: 2026-05-01  
**Analyst**: ProcessImprovement  

---

## Executive Summary

3 repeatable process improvements extracted from retrospective 116 (v0.12.0 — 28-finding field schema remediation). All three are low-risk, additive changes to existing instructions with no conflicts. One (PI-1) requires a _tightened_ implementer self-check instruction (the existing `npm run lint` instruction is correct but silently permits a delta-only override pattern). Two (PI-2, PI-3) fill genuine gaps where no instruction existed.

| ID | Recommendation | Risk | Affected Agents | Status |
|---|---|---|---|---|
| PI-1 | Run `npm run lint` (full-repo) — never delta-only override | LOW | Implementer | ⚠️ Tighten existing |
| PI-2 | Create release tag AFTER PR merge, not before | LOW | DevOps | 🆕 New rule |
| PI-3 | Enum/column-drop plans require both read+write path inventories | LOW | Planner | 🆕 New rule |

**Overall recommendation**: Implement all three. No conflicts. No logical challenges. Proceed directly to agent instruction updates on user approval.

---

## Changelog Pattern Analysis

### Documents Reviewed

| Document | Agent | Key Events |
|---|---|---|
| `116-field-schema-remediation-retrospective.md` | Retrospective | Source of all 3 recommendations |
| `116-field-schema-remediation-qa.md` | QA | BF-1 (enum residue), BF-2 (dropped column read path), BF-3 (unused param), INFO (orphaned function) |
| `116-v0.12.0-stage1.md` | DevOps | CI lint failure post-push; tag re-point after squash merge |
| `116-field-schema-remediation-plan.md` | Planner | R0→R1→R2→R3 revisions; 33-file enum rename inventory (write-paths only) |

### Handoff Patterns

| Pattern | Frequency | Root Cause | Impact | Recommendation |
|---|---|---|---|---|
| Post-push CI failure requiring fix commit | 1 | Delta lint covered 19 explicit files; `CommunityServiceGallery.tsx` was changed by M-5a but not in the list | Extra commit, CI cycle, tag re-point | PI-1: mandate `npm run lint` (full-repo) |
| Tag created pre-merge, orphaned by squash | 1 | No instruction on when to tag relative to PR merge in squash-merge workflow | Delete + recreate tag after merge | PI-2: tag after merge, not before |
| Post-QA blocking bugs from incomplete rename inventory | 2 of 3 blockers (BF-1, BF-2) | Plan enumerated write paths for `'business'→'store'` and `bookmarks.community_service_id` drop, but not read paths | 2 blocking bugs required in-session fixes; extra QA cycle | PI-3: require both inventories in plan |

### Efficiency Metrics

| Metric | Value |
|---|---|
| Extra commits from CI lint failure | 1 (`f490b537`) |
| Extra CI cycles | 1 |
| Extra tag operations (delete+recreate) | 1 |
| QA blockers from incomplete rename inventory | 2 / 3 (67%) |
| Estimated time cost of all 3 incidents | ~1h |

---

## Recommendation Analysis

### PI-1: Mandate `npm run lint` — Never Delta-Only Override

**Source**: Retrospective section "Delta lint gave false confidence"  
**Current state**: `implementer.agent.md` step 10b reads:
```
npm run lint
npm run type-check
```
`npm run lint` already runs `eslint .` (full repo, per `package.json` line 27). The instruction is correct. However, it implicitly permits substitution with narrower commands — this session's implementer ran `npx eslint --max-warnings=0 [19 files]` as a "delta lint" instead of `npm run lint`. There is no instruction prohibiting this substitution.

**Proposed change**: Add a clarifying note to step 10b that explicitly prohibits delta-only overrides.

**Proposed instruction addition** (in `implementer.agent.md`, appended to step 10b):
```
  > ⚠️ Always run the full `npm run lint` command. Do NOT substitute with a
  > delta-only command such as `npx eslint [explicit-file-list]` — manual file
  > lists silently miss files touched indirectly (e.g. via migration or import
  > changes). Only full-repo lint provides a reliable gate.
```

**Alignment**: Additive. No conflict with existing instruction. Tightens an existing loophole.  
**Affected agents**: Implementer  
**Risk**: LOW — clarification only; no behavioral change for correct usage

---

### PI-2: Create Release Tag AFTER PR Merge, Not Before

**Source**: Retrospective section "Tag-before-merge race condition"  
**Current state**: `devops.agent.md` Phase 2C step 4 reads:
```
4. Tag: `git tag -a v[X.Y.Z] -m "..."`, push tag. If a post-push rebase
   changes `HEAD`, delete and recreate the tag on the new `HEAD` before
   pushing it.
```
This instruction exists within "Phase 2C: Release Execution" which covers branch push only. There is **no step for PR merge or post-merge tag creation** in Phase 2C or Phase 2D. The instruction ambiguously implies tagging the session branch head, which becomes orphaned in squash-merge workflows.

**Proposed change**: Replace step 4 with an explicit post-merge tagging workflow.

**Before** (Phase 2C step 4):
```
4. Tag: `git tag -a v[X.Y.Z] -m "Release v[X.Y.Z] - [plan summaries]"`, push tag. If a post-push rebase changes `HEAD`, delete and recreate the tag on the new `HEAD` before pushing it.
```

**After** (Phase 2C step 4, split into 4a/4b):
```
4a. **Wait for CI to pass** before merging. Monitor with `gh pr checks <PR#> --repo <org>/<repo>`. 
    Do not proceed to merge until all required checks show ✓.

4b. **PR merge and tag (squash-merge workflow)**:
    - Merge the PR: `gh pr merge <PR#> --repo <org>/<repo> --squash --delete-branch`
    - Fetch the squash commit: `git fetch origin --tags`
    - Confirm the squash commit SHA: `git rev-parse origin/main`
    - Create annotated tag on the squash commit: `git tag -a v[X.Y.Z] <squash-sha> -m "Release v[X.Y.Z] — [plan summary]"`
    - Push tag: `git push origin v[X.Y.Z]`
    
    **NEVER** create the tag on the session branch before merge. On squash-merge, 
    the session branch commit is not in main's history and the tag becomes orphaned.
    If a pre-merge tag was created by mistake: `git tag -d v[X.Y.Z] && git push origin :refs/tags/v[X.Y.Z]`
    then recreate on the squash commit after merge.
```

**Alignment**: Additive. Fills a genuine gap — no existing merge or post-merge tag instruction existed. No conflicts.  
**Affected agents**: DevOps  
**Risk**: LOW — new mandatory step; does not change any existing step

---

### PI-3: Schema Plans with Enum Rename or Column Drop Must Enumerate Both Read and Write Inventories

**Source**: Retrospective section "Enum/column drop inventories must cover read paths, not just write paths"  
**Current state**: `planner.agent.md` has no schema-migration-specific planning checklist. The plan for Plan 116 enumerated 33 write-path files for `'business'→'store'` rename but missed `categories.ts` (read path). It enumerated the column drop of `bookmarks.community_service_id` at the schema level but missed `CommunityServiceDetailModal.tsx` (read path via bookmark query). Both caused blocking QA bugs.

**Proposed change**: Add a new mandatory section to `planner.agent.md` for schema-altering plans (alongside the existing "Removal Surface Enumeration" section).

**Proposed instruction addition** (new section in `planner.agent.md`, after "Removal Surface Enumeration"):

```markdown
### Schema Mutation Inventories (MANDATORY when applicable)

If a plan includes an enum value rename or a column drop, the plan MUST enumerate **both**:

**Write inventory** — all locations that write or filter using the old enum value or column:
- DB queries with `eq('column', 'old_value')` or `ilike(...)` filters
- Supabase RPC calls passing the old value
- Migration files referencing the old label

**Read inventory** — all locations that read or SELECT using the old enum value or column:
- `.select('column_name')` in app queries
- Destructuring or mapping of the old column (`row.column_name`)
- Test fixtures or mocks that assert on the old column name

**Verification command pattern** (run and record output in plan):
```bash
# Enum rename 'old' → 'new':
grep -rn "'old_value'" src/ supabase/
grep -rn '"old_value"' src/ supabase/

# Column drop:
grep -rn "column_name" src/ supabase/
```

For each match: classify as write-path, read-path, or irrelevant. Document in the plan milestone that covers the rename/drop. Any file in the read or write inventory that is NOT updated by the milestone is a guaranteed QA blocker.

**Applies to**: Any plan milestone that contains `ALTER TYPE ... RENAME VALUE`, `ALTER TABLE ... DROP COLUMN`, or table rename (`ALTER TABLE ... RENAME TO`).
```

**Alignment**: Additive. No existing schema migration checklist in planner. Complements the existing "Removal Surface Enumeration" section (which covers user-visible capability removal, not schema mutation propagation).  
**Affected agents**: Planner  
**Risk**: LOW — new mandatory section scoped to a specific, identifiable migration type

---

## Conflict Analysis

| PI | Recommendation | Conflicting instruction | Nature | Impact | Resolution | Resolved |
|---|---|---|---|---|---|---|
| PI-1 | Full-repo lint mandatory | Step 10b already says `npm run lint` | **No conflict** — instruction is correct; gap is implicit permission to substitute | None | Tighten with explicit prohibition note | ✅ |
| PI-2 | Tag after merge | Phase 2C step 4 says "Tag... push tag" (before any merge instruction) | **Gap, not conflict** — no merge instruction exists; tag timing is unspecified | Pre-merge tag on squash workflow creates orphaned tag | Add 4a/4b: wait for CI, merge, then tag squash commit | ✅ |
| PI-3 | Read+write inventory | No existing schema migration planning checklist | **Gap** — section does not exist | Missing inventory → blocking QA bugs | Add new section after "Removal Surface Enumeration" | ✅ |

**No conflicts identified.** All three are additive changes.

---

## Logical Challenges

None. All three improvements are well-scoped, independently addressable, and non-overlapping.

---

## Risk Assessment

| Recommendation | Risk Level | Rationale | Mitigation |
|---|---|---|---|
| PI-1: Full-repo lint prohibition | LOW | Clarifying note only; existing `npm run lint` is already correct | None needed |
| PI-2: Tag after merge | LOW | New mandatory step; does not displace any existing step | Document the mistake-recovery pattern (`git tag -d ...`) |
| PI-3: Read+write inventory | LOW | Scoped to specific migration types (enum rename, column drop, table rename); no impact on non-schema plans | "When applicable" qualifier limits false-positive overhead |

---

## Implementation Recommendations

### High-Impact, Low-Risk (implement now)

1. **PI-2** (DevOps tag-after-merge): Closes the most concrete operational gap. Prevents a reproducible error in every squash-merge release.
2. **PI-3** (Planner read+write inventory): Prevents the class of bug that caused 67% of Plan 116's QA blockers.

### Medium-Impact, Low-Risk (implement with PI-2 and PI-3)

3. **PI-1** (Implementer lint clarification): Low cost, prevents false-green lint signal from delta overrides.

### Suggested Agent Instruction Updates

| File | Change |
|---|---|
| `.github/agents/implementer.agent.md` | Append prohibition note to step 10b |
| `.github/agents/devops.agent.md` | Replace Phase 2C step 4 with 4a (wait for CI) + 4b (merge then tag) |
| `.github/agents/planner.agent.md` | Add "Schema Mutation Inventories" section after "Removal Surface Enumeration" |

**Implementation approach**: Use `multi_replace_string_in_file` for all three files in one pass.

**Validation plan**:
- Read each file after edit to confirm insertion point and formatting
- Verify no accidental truncation of surrounding text

---

## User Decision Required

Choose one:

1. ✅ **Update now** — Implement all 3 agent instruction updates immediately
2. 🔍 **Review first** — Review exact before/after text above, then confirm
3. 📋 **Phase rollout** — Implement PI-2 now (highest risk), defer PI-1 and PI-3
4. ⏸️ **Defer** — Record recommendations; implement in a dedicated maintenance pass

---

## Related Artifacts

| Artifact | Path |
|---|---|
| Source retrospective | `agent-output/retrospectives/116-field-schema-remediation-retrospective.md` |
| DevOps agent | `.github/agents/devops.agent.md` |
| Implementer agent | `.github/agents/implementer.agent.md` |
| Planner agent | `.github/agents/planner.agent.md` |
| Update summary (post-approval) | `agent-output/process-improvement/117-agent-instruction-updates.md` |
