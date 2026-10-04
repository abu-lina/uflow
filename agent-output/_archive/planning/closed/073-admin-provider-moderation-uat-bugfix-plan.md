---
ID: 073
Origin: 073
UUID: c4e19b7a
Status: Committed
Target Release: v0.10.1 (next patch after current origin/main v0.10.0; confirm at DevOps Stage 1)
Related Issues: None (reported via live UAT session on iPhone Safari)
---

# 073 — Admin Provider Moderation UAT Bugfix Plan

## Changelog

| Date | Agent | Update | Notes |
| --- | --- | --- | --- |
| 2026-04-02T20:33Z | Analyst | Analysis complete | RCA proven: `providerImages` contract drift causes HTTP 400 |
| 2026-04-02T21:05Z | Planner | Plan created | Focused bugfix, two-file scope |
| 2026-04-03T00:10Z | Planner | Revision per critique | Corrected D3 null semantics (M-1), acknowledged enableLocalStorage (L-1), stated explicit semver (L-2) |
| 2026-04-03T08:10Z | Implementer | Implementation complete | M1-M4 delivered, all gates passed, ready for Code Review |
| 2026-04-03T08:15Z | Code Reviewer | Code review approved | Verdict: APPROVED with fix-in-review applied (React hooks dependency); ready for QA |
| 2026-04-03T08:25Z | QA | QA complete | All gates passed; APPROVED FOR UAT; manual smoke test scenarios documented |
| 2026-04-03T07:00Z | UAT | UAT complete | APPROVED FOR RELEASE — live iPhone Safari approve-path evidence received; all HIGH findings resolved |

## Value Statement and Business Objective

As an admin moderator, I want to approve or reject providers on UAT without encountering a validation error, so that moderation throughput is unblocked and provider listings can be curated.

## Epic Alignment

Supports operational moderation capability introduced in Plans 058/059/061. This is a bugfix restoring existing functionality, not a new feature.

## Release Strategy

Standalone (no other known plans for this version).

## Decision Record

| # | Decision | Status |
| --- | --- | --- |
| D1 | Fix at the client serialisation boundary (admin edit page), not by loosening the schema | [RESOLVED] — the schema's `{ urls: string[] }` contract is intentional (Plan 060 M-1 security hardening); broadening it would regress security |
| D2 | Normalise `providerImages` in `saveProviderEdits()` in the admin edit page, not inside the shared `ProviderEditForm` | [RESOLVED] — the shared form also serves the owner direct-Supabase flow which bypasses the admin API; changing the form default would be a wider blast radius |
| D3 | Empty / absent images should be sent as `undefined` (omit the field), not `null` or `'{"urls":[]}'` | [RESOLVED] — In `updateProviderFields()`, the guard `if (editData.providerImages !== undefined)` means: `undefined` (field omitted) = no DB change; `null` = clears `provider_images` to `null`; `'{"urls":[]}'` = overwrites with empty array. For providers with no images the DB value is already `null`, so sending `null` would be safe but semantically wrong for providers that *do* have images and the admin didn't touch them. The correct approach is to **omit** `providerImages` from the request body when the form value represents "no change" (falsy / `'[]'`), and only include it when the admin actively provided images via the sub-page. |
| D4 | Ownership scope: applies to all providers visible in the admin moderation UI (both claimed and unclaimed) | [RESOLVED] — the moderation edit page fetches via `/api/admin/providers/:id` which returns any provider regardless of ownership |

## Assumptions

1. The `providerEditUpdateSchema` contract (`{ urls: string[] } | null`) is correct and must not be loosened.
2. The `ProviderEditForm` default of `provider.provider_images || '[]'` is the primary source of the bad value.
3. No other field in the admin moderation save payload currently fails validation (the Zod error array contained only the `providerImages` path).
4. The admin edit page currently uses `enableLocalStorage={true}` with `localStoragePrefix="admin_"`. This does not affect the fix because the normalisation runs at serialisation time inside `saveProviderEdits()`, regardless of whether the form value originated from the provider record or from a localStorage draft. The `enableLocalStorage={true}` setting is intentional for admin draft state persistence across sub-page navigation.

## Plan

### Milestone 1 — Normalise `providerImages` in the admin save path

**Objective:** Ensure `saveProviderEdits()` always sends a schema-valid `providerImages` value.

**Where:** `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`, inside `saveProviderEdits()`.

**What:**
- Before serialising the request body, normalise `formData.images`:
  - If the value is falsy, empty string, `'[]'`, or `'null'` → **omit** `providerImages` from the request body entirely (do not send `null`). This triggers the `!== undefined` guard in the service layer, leaving the DB value untouched.
  - If the value is already valid JSON matching `{ urls: string[] }` with a non-empty `urls` array → send as-is.
  - Otherwise attempt to parse and wrap in `{ urls: [...] }` if the parsed result is a non-empty array of strings; else omit the field.
- This keeps the normalisation at the narrowest possible boundary (the admin page's own serialiser) without touching the shared form or the API schema.

**Acceptance criteria:**
- `PATCH /api/admin/edit-provider` no longer returns HTTP 400 for the moderation save when the provider has no images.
- `PATCH /api/admin/edit-provider` still correctly passes through valid `{ urls: [...] }` image payloads.
- Existing security regression tests (`security-066-regression.test.ts` M-1 suite) continue to pass.

### Milestone 2 — Regression test for moderation with empty images

**Objective:** Prevent this contract drift from recurring.

**What:**
- Add a focused test that exercises the payload shape emitted by the admin edit page when `provider.provider_images` is absent/null/empty.
- The test should assert the normalised value is either `null` or valid `{ urls: string[] }` JSON, and that the schema accepts it.

**Acceptance criteria:**
- New test passes.
- Test name clearly labels the pre-fix and post-fix behaviour per project convention.

### Milestone 3 — Version and release artifacts

**Objective:** Update version artifacts to match release target.

**Tasks:**
- Update `package.json` version (exact version confirmed at DevOps Stage 1).
- Add CHANGELOG entry documenting the bugfix.

**Acceptance criteria:**
- `package.json` version matches tag.
- CHANGELOG entry describes the fix.

## Testing Strategy

- **Unit:** Regression test (M2) exercising the normalisation logic and schema acceptance.
- **Existing suite:** All current tests in `admin-edit-provider.test.ts`, `security-066-regression.test.ts` (M-1 suite), and `ProviderEditForm.regression.test.tsx` must continue to pass.
- **Manual UAT:** Approve and reject one provider with no images and one with images on UAT after deployment.

## Validation

- `npm run type-check` passes.
- `npm test` passes (all existing + new tests).
- `npm run lint` passes.
- Manual UAT smoke: approve/reject on iPhone Safari reproduces the original scenario and now succeeds.

## Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| 1 | Normalisation accidentally drops valid image data | Medium | Implementation must preserve any `{ urls: [...] }` payload; regression tests assert both empty and populated paths |
| 2 | Legacy providers with array-shaped `provider_images` strings still fail | Low | Normalisation wraps bare arrays into `{ urls: [...] }` as a secondary path; QA verifies |

## Duration Estimates

| Phase | Estimate | Uncertainty |
| --- | --- | --- |
| Implementation (M1 + M2) | < 1 hour | Low — two-file change, well-scoped |
| QA gate (automated) | < 15 min | Low |
| UAT smoke | < 30 min | Medium — requires authenticated admin session on UAT |
| DevOps (M3 + deploy) | < 1 hour | Low |

## Handoff Notes

- Implementer should read the analysis at `agent-output/analysis/073-admin-provider-moderation-uat-analysis.md` for full evidence chain.
- The normalisation logic belongs in `saveProviderEdits()` only, not in the shared `ProviderEditForm` component (Decision D2).
- Do not loosen the Zod schema (Decision D1).
- **Critical `null` vs `undefined` semantics (Decision D3):** In the service layer, `null` *clears* the DB field; only `undefined` (omitting the key) means "no change". The normalisation must omit empty image values, not send `null`.
