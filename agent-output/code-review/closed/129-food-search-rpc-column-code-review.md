---
ID: 129
Origin: 129
UUID: c7e3a91f
Status: Committed
---

# Code Review: 129 food search RPC column hotfix

**Plan Reference**: Not present in `agent-output/planning/` for ID 129 (hotfix pipeline used analysis artifact as source of truth)
**Analysis Reference**: [agent-output/analysis/129-food-search-rpc-column-rca.md](agent-output/analysis/129-food-search-rpc-column-rca.md)
**Implementation Reference**: [agent-output/implementation/129-food-search-rpc-column-hotfix.md](agent-output/implementation/129-food-search-rpc-column-hotfix.md)
**Date**: 2026-05-12
**Reviewer**: Code Reviewer

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-05-12 | Implementer -> Code Reviewer | Review hotfix #129 before QA | Reviewed migration + regression test for `search_food_concepts` outage fix; 1 medium finding; no blockers. |

## Architecture Alignment

**System Architecture Reference**: [agent-output/architecture/system-architecture.md](agent-output/architecture/system-architecture.md)
**Alignment Status**: ALIGNED

Assessment:
- Fix follows Postgres-first architecture by correcting SQL at the RPC boundary.
- Uses additive migration (`089_*`) rather than mutating historical baseline, preserving migration-chain integrity.
- Function signature and privileges are preserved, maintaining service contract stability.

## Scope Reviewed

Files listed in implementation doc were reviewed end-to-end:
- [supabase/migrations/089_fix_search_food_concepts_junction.sql](supabase/migrations/089_fix_search_food_concepts_junction.sql)
- [src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts](src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts)

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: Yes
**Concerns**: None blocking.

Primary behavior coverage check:
- If the hotfix were reverted to `p.offers_ids`, the new migration contract test would fail (`expect(sql).not.toContain('p.offers_ids')` plus required `provider_offers` join assertions). This is an adequate direct regression guard for this migration-scoped outage fix.

## Mandatory Checklist Results

### Migration Filename Reference Check (Triggered)

Search terms and paths checked:
- `089_fix_search_food_concepts_junction.sql` in `src/__tests__/**`
- `089_fix_search_food_concepts_junction.sql` in `tests/**`

Result:
- Hardcoded filename found in [src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts](src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts#L8) and [src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts](src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts#L15)

### Migration SQL Correctness Review (Triggered)

- Invalid aggregates on unsupported types: no invalid aggregates found ✅
- Mutable display-name targeting without uniqueness guard: not applicable ✅
- Idempotence: uses `DROP FUNCTION IF EXISTS` + recreate; repeat-safe ✅

## Findings

### Critical

None.

### High

None.

### Medium

**[MEDIUM] Test Robustness**: Test hardcodes exact migration filename (rename-fragile)
- **Location**: [src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts](src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts#L8)
- **Issue**: The test directly references `supabase/migrations/089_fix_search_food_concepts_junction.sql`. Future migration renumbering/renaming can break test discovery without changing behavior.
- **Recommendation**: Resolve migration path by pattern (for example `files.find(f => f.includes('search_food_concepts_junction'))`) rather than exact filename.

### Low/Info

**[INFO] SQL Design Quality**: Correct relational join replacement applied
- **Location**: [supabase/migrations/089_fix_search_food_concepts_junction.sql](supabase/migrations/089_fix_search_food_concepts_junction.sql#L90)
- **Note**: Join via `provider_offers` aligns with Phase 3 normalization and removes dependency on dropped array column.

## Positive Observations

- Minimal blast radius: only affected RPC function is recreated.
- Signature (`TEXT, INTEGER -> TABLE`) unchanged, avoiding client/API regressions.
- Permission parity (`REVOKE`/`GRANT EXECUTE`) was preserved after function recreation.
- Regression guard explicitly forbids reintroduction of `p.offers_ids`.

## Verdict

**Status**: APPROVED_WITH_COMMENTS
**Rationale**: The outage root cause is fixed correctly and safely, with no blocking correctness, architecture, or security defects identified. One medium test-maintainability issue should be cleaned up in a follow-up.

## Required Actions

- Before or during next migration-test touchpoint, refactor filename lookup in [src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts](src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts) to pattern-based discovery.

## Next Steps

Handing off to qa agent for test execution.
