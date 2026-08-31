---
ID: 199
Origin: 199
UUID: c4e8f213
Status: In Review
---

# Code Review: Plan 199 — Chatbot "Open Now" Filter

**Plan Reference**: `agent-output/planning/199-chatbot-open-now-filter.md`
**Implementation Reference**: `agent-output/implementation/199-chatbot-open-now-filter.md`
**Date**: 2026-08-02
**Reviewer**: Code Reviewer

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-08-02 | Implementer → Code Reviewer | Review Plan 199 implementation | Reviewed 8 files (2 created, 6 modified). 1 MEDIUM finding fixed-in-review (stale dev script). APPROVED. |

---

## Architecture Alignment

**System Architecture Reference**: Architect decisions documented in `agent-output/planning/199-chatbot-open-now-filter.md` Decision Record D1–D6 (all RESOLVED).
**Alignment Status**: ALIGNED

The implementation follows all six architectural decisions exactly:

| Decision | Requirement | Delivered |
|----------|-------------|-----------|
| D1 | TypeScript-layer filtering, not PL/pgSQL | ✅ Filter in `executeToolCall`, not in SQL WHERE clause |
| D2 | RPC returns `opening_hours` as new JSONB column | ✅ Migration 121 adds `opening_hours JSONB` to RETURNS TABLE |
| D3 | `open_now` boolean parameter on `search_providers` tool | ✅ Added to TOOL_DEFINITIONS properties |
| D4 | Annotate results with `is_open` always, filter only when `open_now: true` | ✅ Annotation unconditional; filter gated by `args.open_now === true` |
| D5 | System prompt temporal keyword guidance | ✅ Bullet added to TOOL USAGE section |
| D6 | `null` opening_hours → excluded from `open_now` queries | ✅ `openingHours ? getOpenStatus(...).isOpen : null`; null excluded by `=== true` filter |

Reuse of `getOpenStatus()` from `@/utils/openStatus` (already tested, trusted, used by `/search`) is the correct architectural choice — no duplication, no new logic.

---

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: Yes
**All 3 TypeScript rows show test-first**: ✅ (failure reasons documented, failure verified before implementation)
**SQL DDL row**: Appropriately marked N/A with rationale (no test framework for DDL; covered via schema verification gate and test mock shape)

The primary value-delivery behavior — "user asking for open providers gets ONLY open providers" — is directly exercised by the `open_now: true` filter test (17 tests pass, all new tests red → green documented). Full TDD compliance.

---

## Mandatory Checklist Results

### 6i — Migration Filename Reference Check

Search term: `121_plan_199`, `121_chatbot`
Files checked: `src/__tests__/**`, `tests/**`
**Result**: ✅ No hardcoded migration filename references found.

### 6j — Migration SQL Correctness Review

- **Invalid aggregates**: None. SELECT is a pure passthrough — `p.opening_hours` added alongside existing columns. No aggregates. ✅
- **Mutable display-name targeting**: WHERE clause uses structural filters only (review_status, UUID, ILIKE on city, listing_type, booleans). No name matching. ✅
- **Idempotent**: `CREATE OR REPLACE FUNCTION` — safe to run multiple times. ✅

### 6d — Deployment Path Audit

Search terms: `search_providers_chat` in `scripts/`, `.github/workflows/`, `deploy/`, `sql/`
- `scripts/apply_chatbot_migrations.sql`: contained stale v2 `search_providers_chat` **without** `opening_hours`. **Fixed in-review** (see Finding M1 below).
- No GitHub Actions workflows or `docker run` calls reference `apply_chatbot_migrations.sql`.
- `sql/`: no references to `search_providers_chat`.
- ✅ Post-fix: all known paths consistent.

### 6k — i18n String Literal Scan

Trigger condition: modified files in `src/components/`, `src/features/`, or `src/app/` that render visible text in JSX/TSX.
- `src/features/chat/prompts/system-prompt.ts`: TypeScript string template (not JSX), server-side only, no rendered user-visible labels. Not within i18n scan scope.
- `src/features/chat/services/tool-executor.ts`: No JSX, no rendered labels.
- **i18n scan**: 0 JSX component files modified — N/A. ✅

### 6e — Outbound Data-Flow Cross-Trace

No `router.push`, `Link href`, or new API routes introduced. Does not trigger. ✅

### 6f — Interaction-Layer Audit

No pointer-events, visibility, or overlay changes. Does not trigger. ✅

### 6g — Shared Results Actionability

No inline admin actions added to results. Does not trigger. ✅

### 6h — Deleted-Module Residue Sweep

No modules deleted or renamed. Does not trigger. ✅

---

## Findings

### Critical

None.

### High

None.

### Medium

**[MEDIUM] Deployment Path — Stale Composite Dev Script**
- **Location**: `scripts/apply_chatbot_migrations.sql` (lines 65–157)
- **Issue**: `apply_chatbot_migrations.sql` is a consolidated script that recreates all chatbot-related migrations in one shot, used for fresh DB bootstraps (e.g., UAT reset). It contained the v2 definition of `search_providers_chat` **without** `opening_hours`. If someone runs this script against a fresh database without then running migration 121, the `open_now` feature would silently produce `is_open: null` on all results (no `opening_hours` column in RPC output), because the tool executor's annotation code safely handles missing columns as `null`.
- **Fix Applied (fix-in-review)**: Script updated to v3 — added `opening_hours JSONB` to RETURNS TABLE and `p.opening_hours` to SELECT, matching migration 121 exactly. COMMENT updated to v3.
- **Verification path for QA**: `grep "opening_hours" scripts/apply_chatbot_migrations.sql` should return `opening_hours        JSONB,` in the RETURNS TABLE and `p.opening_hours,` in the SELECT.

### Low

**[LOW] Post-filter Under-delivery with Default Limit**
- **Location**: `src/features/chat/services/tool-executor.ts:L253-L271`
- **Issue**: RPC is called with `p_limit_count: 5` (default), then closed/unknown providers are filtered post-RPC. If the database has 10 open providers but the RPC returns 5 (hitting the limit), and 3 of those 5 are closed, the user receives only 2 results even though 7+ more open providers exist beyond the limit.
- **Status**: Plan-accepted risk (documented in Risks table, Critic reviewed). Advisory only.
- **Recommendation for future**: The LLM can re-query with a higher limit. A follow-up plan could increase the default limit when `open_now: true` is set (e.g., fetch 20, return first N open ones). No action required for this release.

**[LOW] Timezone advisory (carried from critique)**
- **Location**: `src/features/chat/services/tool-executor.ts:L265`; `src/utils/openStatus.ts`
- **Issue**: `getOpenStatus()` uses server-local `new Date()` (no explicit timezone handling). Users in timezones far from the server could see incorrect open/closed status.
- **Status**: Pre-existing, inherited from Plan 196, critique F1 advisory. Acknowledged. No action required for this release.

### Info

**[INFO] `is_open: null` semantics for empty `{}` opening_hours**
- **Location**: `src/features/chat/services/tool-executor.ts:L261-L264`
- **Observation**: A provider with `opening_hours: {}` (empty object, unlikely but possible) would produce `is_open: false` (not `null`), because `{}` is truthy so `getOpenStatus({})` is called and returns `HIDDEN_RESULT` with `isOpen: false`. The `is_open: null` annotation is reserved for `opening_hours: null` from the DB. This is semantically correct behavior — an empty `{}` is a malformed/data-quality issue and being conservatively excluded is right.

---

## Positive Observations

1. **Surgical change with zero blast radius**: The implementation touches exactly 3 logical layers (SQL, executor, prompt) with no changes to auth, routing, or shared infrastructure. The plan's scope was tight and the implementation honored it.

2. **Correct reuse of existing infrastructure**: `getOpenStatus()` was already tested with overnight-window awareness, malformed-data guards, and `null` passthrough. Reusing it here rather than writing new time-comparison logic is the right call — DRY, lower risk.

3. **Strict equality filter (`=== true`)**: The `args.open_now === true` guard correctly handles all edge cases: `false`, `undefined`, `null`, and absent parameter all produce the "no filter" path. This is robust.

4. **Annotation-first design**: All results are annotated with `is_open` regardless of the `open_now` parameter. This lets the LLM present open/closed status even in general (non-filtered) searches — a useful UX improvement beyond just the fix.

5. **TDD discipline**: All 3 new logic paths (annotation, filter, tool-definition shape) followed red-first TDD with documented failure reasons. The system-prompt test adds a regression guard so future prompt edits won't silently remove the `open_now` guidance.

6. **Backward compatibility**: Migration 121 uses `CREATE OR REPLACE FUNCTION` — no breaking change to callers. The RPC's existing `p_limit_count` default (5) is unchanged. Old calls without `opening_hours` in their result handling will simply receive the column and ignore it.

---

## Summary of Changes Reviewed

| File | Status | Notes |
|------|--------|-------|
| `supabase/migrations/121_plan_199_chatbot_open_now.sql` | ✅ Approved | SQL clean, idempotent, additive |
| `src/features/chat/services/tool-executor.ts` | ✅ Approved | Filter/annotation logic correct, strict equality |
| `src/features/chat/prompts/system-prompt.ts` | ✅ Approved | Guidance clear, bilingual keywords present |
| `src/__tests__/features/chat/tool-executor.test.ts` | ✅ Approved | 3 new tests cover annotation, filter, tool-def shape |
| `src/__tests__/features/chat/system-prompt.test.ts` | ✅ Approved | Prompt regression guard correct |
| `package.json` / `package-lock.json` | ✅ Approved | Version bump clean, lockfile synced |
| `CHANGELOG.md` | ✅ Approved | Entry accurate and well-scoped |
| `scripts/apply_chatbot_migrations.sql` | ✅ Fixed-in-review | Updated to v3 (opening_hours added) |

---

## Verdict

**Status**: APPROVED
**Rationale**: Implementation is clean, surgical, and architecturally aligned. All 6 plan decisions delivered as specified. TDD compliance complete with documented red-green cycle. One MEDIUM finding (stale dev script) resolved in-review. Two LOW advisories are plan-accepted risks, no action required for this release. No security, data-loss, or architectural violations found.

---

## Required Actions Before QA

1. ✅ Apply migration 121 to all target environments (dev/UAT/prod) before functional QA of `open_now` filtering. (DevOps/QA gate — migration not yet pushed to remote.)
2. ✅ Verify fix-in-review: `grep "opening_hours" scripts/apply_chatbot_migrations.sql` returns matches in both RETURNS TABLE and SELECT.

## Next Steps

Handing off to qa agent for test execution.
