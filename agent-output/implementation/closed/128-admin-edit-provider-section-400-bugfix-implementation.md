---
ID: 128
Origin: 128
UUID: c7e4a91d
Status: Committed
---

# Implementation 128 — Admin Edit-Provider Section Dropdown HTTP 400 Bugfix

## Plan Reference

- Plan: `agent-output/planning/128-admin-edit-provider-section-400-bugfix.md`
- Analysis: `agent-output/analysis/closed/128-admin-edit-provider-section-400-rca.md`
- Critique: `agent-output/critiques/closed/128-admin-edit-provider-section-400-bugfix-critique.md` (APPROVED)

## Date

- 2026-05-12

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|------------|---------|---------|---------|
| 2026-05-12T12:22Z | Critic -> Implementer | Execute Plan 128 (M1-M5) | Started implementation and opened TDD gate |
| 2026-05-12T12:24Z | Implementer | TDD Red evidence captured | New regression test failed as expected for `listingType: 'store'` |
| 2026-05-12T12:39Z | Implementer | M1-M5 completed | Schema/type/mock fixes + regression coverage + version/changelog + lockfile aligned |

## Implementation Summary

Implemented the Plan 128 bugfix by aligning provider listing type validation and typing with the canonical post-migration enum value `store`.

What changed:
- Updated `providerEditUpdateSchema` to accept `store` instead of stale `business`
- Updated admin provider edit service type union to use `store`
- Updated API route test mock whitelist to accept `store` and reject stale `business`
- Added real-Zod regression tests to lock behavior and prevent enum drift
- Bumped version to `0.12.11` and added CHANGELOG entry
- Synced `package-lock.json` version fields via mandatory lockfile alignment

Value delivery:
- Admin section changes to Business/Store no longer fail request-body validation at API boundary, resolving issue #221 acceptance criteria.

## Baseline & Measurements

N/A — no performance baseline target in plan. This is a validation/type alignment bugfix.

## Milestones Completed

- [x] M1: Zod schema updated to `z.enum(['food', 'store'])`
- [x] M2: `AdminProviderEditData.listingType` updated to include `store` and remove `business`
- [x] M3: API test mock whitelist updated to accept `store`
- [x] M4: Regression tests added using real Zod (`vi.doUnmock('zod')`)
- [x] M5: Version bump + CHANGELOG + lockfile alignment completed

## Files Modified

| Path | Changes | Lines (add/del) |
|------|---------|-----------------|
| `src/lib/validations/adminSchemas.ts` | `listingType` enum `business` -> `store` | 1 / 1 |
| `src/services/admin/providerEdit.ts` | `AdminProviderEditData.listingType` union `business` -> `store` | 1 / 1 |
| `src/__tests__/api/admin-edit-provider.test.ts` | Mock validator whitelist + message `business` -> `store` | 2 / 2 |
| `src/__tests__/api/security-066-regression.test.ts` | Added Plan 128 regression test block (real Zod) | 41 / 0 |
| `src/__tests__/services/admin-provider-edit.test.ts` | Updated stale `business` test expectations/type cast to `store` | 4 / 4 |
| `package.json` | Version `0.12.10` -> `0.12.11` | 1 / 1 |
| `package-lock.json` | Lockfile version alignment to `0.12.11` | 2 / 2 |
| `CHANGELOG.md` | Added `[Unreleased]` fix entry for Plan 128 | 6 / 0 |

## Files Created

| Path | Purpose |
|------|---------|
| `agent-output/implementation/128-admin-edit-provider-section-400-bugfix-implementation.md` | Implementation artifact for Plan 128 |

## Deployment Path Audit

N/A — no deployment scripts, workflow files, infra config, or runtime deployment surface changed.

## Code Quality Validation

- [x] `npx vitest run` -> pass (`157 passed | 2 skipped` test files)
- [x] `npm run type-check` -> pass
- [x] `npm run lint` -> pass with pre-existing warnings only (0 errors)
- [x] `npm run build` -> pass with syntactically valid Supabase env values provided inline
- [x] Lockfile alignment after version bump (`npm install --package-lock-only` + version verification)

## Value Statement Validation

Original value statement:
- As an admin moderator, change provider section via edit panel so providers are classified correctly.

Implementation delivers:
- API validation now accepts `listingType: 'store'`, matching frontend dropdown value and DB enum.
- Regression tests ensure this path stays valid in future changes.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `providerEditUpdateSchema` listingType behavior | `src/__tests__/api/security-066-regression.test.ts` | ✅ Yes | ✅ Yes | `[pre-fix FAILS]` test expected `result.success === true` for `listingType: 'store'`, got `false` | ✅ Yes |
| `updateProviderFields` listing type passthrough assertion | `src/__tests__/services/admin-provider-edit.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Existing stale expectation used `business`; corrected to canonical `store` | ✅ Yes |

## Test Coverage

- Unit/Regression coverage added for real Zod parsing of listing type values:
  - accepts `store`
  - accepts `food` and `null`
  - rejects invalid values (`unknown`)
- Existing API and service tests updated and passing for the changed enum contract.

## Test Execution Results

### TDD Red (pre-fix)

```bash
npm test -- src/__tests__/api/security-066-regression.test.ts -t "listingType enum regression"
```

Result:
- 1 failing test (expected)
- Failure: `expected false to be true` for `listingType: 'store'`

### TDD Green (post-fix targeted)

```bash
npx vitest run src/__tests__/api/security-066-regression.test.ts -t "Plan 128 listingType enum regression"
npx vitest run src/__tests__/api/admin-edit-provider.test.ts src/__tests__/services/admin-provider-edit.test.ts
```

Result:
- All targeted tests passed

### Full Suite + Static Gates

```bash
npx vitest run --reporter=dot
npm run type-check
npm run lint
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_1234567890abcdef SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.signature npm run build
```

Result:
- Full tests: pass (`157 passed | 2 skipped` files; `1246 passed | 22 skipped` tests)
- Type-check: pass
- Lint: pass with pre-existing warnings only
- Build: pass

## Additional Mandatory Checks

- Version bump note: **Version bumped to 0.12.11 (preliminary - final version confirmed at DevOps Stage 1).**
- Lockfile alignment: completed and verified both top-level version entries in `package-lock.json`.
- Open Question Gate: no unresolved open questions in plan.
- Search/Filter Client-Interaction Trace: N/A — no search submit handlers or mixed-entity inline actions changed.
- Multi-Plan State Audit: N/A — no prior-plan state mutation paths (`useEffect`/hydration) modified.
- Cross-layer integration self-check: N/A — no new API routes or query-param contracts introduced.
- Local verification: ⚠️ Blocked for live admin flow because no real Supabase credentials/session are available in this environment. Automated regression + API/service tests provide coverage for the bug path.

## Outstanding Items

- [ ] Manual admin UI verification in QA/UAT environment with valid auth/session:
  - Edit provider -> change Section to Business/Store -> save -> expect 200 + success UX

## Next Steps

1. Code Review
2. QA
3. UAT
4. DevOps
