---
ID: 128
Origin: 128
UUID: c7e4a91d
Status: Committed
---

# Plan 128 — Admin Edit-Provider Section Dropdown HTTP 400 Bugfix

## Plan Header

| Field          | Value                                                                                 |
|----------------|---------------------------------------------------------------------------------------|
| Plan ID        | 128                                                                                   |
| Target Release | Next available patch after v0.12.10; confirm at DevOps Stage 1                       |
| Epic Alignment | Admin moderation workflow — provider edit panel reliability                           |
| Related Issues | https://github.com/abu-lina/uflow/issues/221                                         |
| Classification | Bugfix                                                                                |
| Pipeline       | Abbreviated (Planner → Critic → Implementer → Code Reviewer → QA → DevOps)          |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/222                                         |
| Created        | 2026-05-12T11:55Z                                                                     |

## Changelog

| Date                | Agent       | Action                                              |
|---------------------|-------------|-----------------------------------------------------|
| 2026-05-12T11:48Z   | Analyst     | RCA complete — L1 Proven root cause identified      |
| 2026-05-12T11:55Z   | Planner     | Plan drafted from analysis 128; analysis → Planned  |
| 2026-05-12T12:22Z   | Implementer | Implementation started (TDD gate initiated)         |
| 2026-05-12T12:45Z   | Code Reviewer | Review approved; fix-in-review applied to CHANGELOG version header alignment |
| 2026-05-12T13:05Z   | QA          | All automated gates passed; QA Complete             |
| 2026-05-12T13:15Z   | UAT         | Value delivery confirmed; UAT Approved, ready for DevOps |

## Value Statement and Business Objective

> As an **admin moderator**, I want to change a provider's section (Food / Business / Unclassified) via the provider edit panel, so that providers are correctly classified and appear in the right section of the platform.

The section dropdown is a core admin workflow for reclassifying providers. The bug makes it completely non-functional for the "Business/Store" option, silently blocking every moderation action that requires a section change.

## Release Strategy

**Standalone** — no other known active plans targeting the next patch after v0.12.10.

## Decision Record

| # | Decision | Status | Rationale |
|---|----------|--------|-----------|
| D1 | Fix scope: update Zod schema, service type, and test mock only | `[RESOLVED]` | Root cause is entirely in the validation layer; no DB migration, UI change, or new feature needed |
| D2 | Enum value to use: `'store'` (not `'business'`) | `[RESOLVED]` | DB enum was renamed in migration 083; `'store'` is the canonical value in DB, frontend, and `Section` type |
| D3 | Add regression test using the real (unmocked) Zod schema | `[RESOLVED]` | Gap identified in analysis: no existing test covers `listingType: 'store'` through real Zod; prevents future enum drift |
| D4 | Do not introduce a shared `LISTING_TYPE_VALUES` constant in this plan | `[RESOLVED]` | YAGNI — the bug is a single stale literal; a shared constant is a separate refactor |
| D5 | Service interface `AdminProviderEditData.listingType` type fix included | `[RESOLVED]` | Type-only fix, zero runtime impact, but required for TypeScript strictness and correctness |

## Assumptions

- Migration `083_m5a_supertype_unification.sql` is applied in all environments (UAT, production). No data with the stale `'business'` value exists in the live DB enum. (**Verified**: migration renames the enum value in place; existing rows retain their values which are now `'store'`.)
- No other runtime code paths write `'business'` to `listing_type` — confirmed by grep during analysis.

## Plan

### Milestone 1 — Fix Zod Validation Schema

**Objective**: Update the `providerEditUpdateSchema` in `adminSchemas.ts` so `listingType` accepts `'store'` instead of the stale `'business'`.

**Target file**: `src/lib/validations/adminSchemas.ts` (line ~44)

**Change**: In `providerEditUpdateSchema`, change `listingType: z.enum(['food', 'business'])` to `z.enum(['food', 'store'])`.

**Acceptance criteria**:
- `z.enum(['food', 'store'])` is the only `listingType` enum in this schema
- The string `'business'` does not appear in `providerEditUpdateSchema`
- TypeScript compilation passes with no new errors

---

### Milestone 2 — Fix Service Interface Type

**Objective**: Update `AdminProviderEditData.listingType` in `src/services/admin/providerEdit.ts` to use `'store'` instead of `'business'`.

**Target file**: `src/services/admin/providerEdit.ts` (line ~17)

**Change**: In `AdminProviderEditData`, change `listingType?: 'food' | 'business' | 'ummah' | null` to `'food' | 'store' | 'ummah' | null`.

**Acceptance criteria**:
- `AdminProviderEditData.listingType` type union contains `'store'`, not `'business'`
- TypeScript compilation passes with no new errors

---

### Milestone 3 — Fix Test Mock

**Objective**: Update the mock validator in `admin-edit-provider.test.ts` so it no longer rejects `'store'` as an invalid listingType.

**Target file**: `src/__tests__/api/admin-edit-provider.test.ts` (line ~61)

**Change**: In the `providerEditUpdateSchema` mock's parse function, replace the check `listingType !== 'business'` with `listingType !== 'store'`. The allowed set becomes `['food', 'store', null, undefined]`.

**Acceptance criteria**:
- The mock no longer rejects `listingType: 'store'`
- The mock still rejects arbitrary invalid values (e.g. `'business'`, `'unknown'`)

---

### Milestone 4 — Add Regression Test

**Objective**: Add a focused test using the real (unmocked) Zod schema that proves `listingType: 'store'` now passes validation, preventing future enum drift.

**Target file**: `src/__tests__/api/admin-edit-provider.test.ts` or `src/__tests__/lib/validations/adminSchemas-cs.test.ts`

> **Implementer's choice**: Place in whichever test file is more appropriate for real-Zod schema tests. The `security-066-regression.test.ts` already uses `vi.doUnmock('zod')` patterns that are similar — follow that pattern.

**Test cases required** (both in the same describe block):

1. **`[pre-fix FAILS]` scenario** — Test name should make the bug visible. Assert that `listingType: 'store'` **now succeeds** with `result.success === true`. (This is the post-fix assertion; name the describe block to explain it prevents regression.)
2. **Complementary**: Assert that `listingType: 'food'` and `listingType: null` still pass.
3. **Guard**: Assert that an arbitrary invalid value (e.g. `listingType: 'unknown'`) still fails.

**Acceptance criteria**:
- All 3 test cases pass
- The test unmocks Zod to use the real validator (not the API-test mock)
- Test naming makes the bug path visible (e.g. includes "listingType store" or similar)

---

### Milestone 5 — Version and Release Artifacts

**Objective**: Bump package version and update CHANGELOG.

**Target files**: `package.json`, `CHANGELOG.md`

**Change**: Increment patch version (e.g. `0.12.10` → `0.12.11`; confirm exact version at DevOps Stage 1 via `git fetch --tags`). Add CHANGELOG entry under the new version.

**CHANGELOG entry** (content):
- `fix: admin edit-provider section dropdown now correctly accepts 'store' listing_type (#221)`
- Reference: Plan 128, fixes GitHub issue #221

**Acceptance criteria**:
- `package.json` version incremented by one patch
- `CHANGELOG.md` has entry for the new version with the fix description
- No other version files exist that need updating (verify)

---

## Testing Strategy

**Unit** (Milestone 3–4): Real-Zod schema tests covering the three `listingType` valid values (`'food'`, `'store'`, `null`) and one invalid value. Test mock aligned with current enum.

**Integration** (existing): Existing `admin-edit-provider.test.ts` integration tests pass without modification beyond the mock fix.

**Regression**: New test in Milestone 4 acts as a sentinel — it will fail if the Zod enum is ever reverted to `'business'`.

**Manual/UAT**: Admin edits a provider → changes Section to "Business" → saves → expect HTTP 200, no toast error, provider section updated in DB.

No new DB migrations, no UI changes, no new dependencies. Scope is fully contained to the validation and type layers.

## Validation

| Gate | Requirement |
|------|-------------|
| TypeScript | `npm run type-check` — zero new errors |
| Unit tests | `npm test` — all tests pass, including new regression test |
| Lint | `npm run lint` — no new warnings |
| Manual smoke | Change section to Business in admin edit panel → 200 response |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Other stale `'business'` references missed | Low | Medium | Analysis grep confirmed 3 files; implementer should re-run `grep -rn "'business'" src/ supabase/` before closing |
| Migration not applied in all environments | Very Low | High | Migration 083 is part of the core Plan 083 deliverable; confirm at UAT |

## Duration Estimates

| Phase       | Estimate    | Uncertainty |
|-------------|-------------|-------------|
| Planner     | Done        | —           |
| Critic      | 15–30 min   | Low         |
| Implementer | 30–60 min   | Low — 3 literal changes + 1 test block |
| QA          | 30–45 min   | Low         |
| DevOps      | 15–30 min   | Low         |

**Total**: ~2–3 hours end-to-end.
