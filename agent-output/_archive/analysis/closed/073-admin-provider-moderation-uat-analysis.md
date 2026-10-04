---
ID: 073
Origin: 073
UUID: c4e19b7a
Status: Planned
---

# 073 Admin Provider Moderation UAT Analysis

## Changelog

| Date | Agent | Update | Notes |
| --- | --- | --- | --- |
| 2026-04-02 | Analyst | Initial RCA for UAT moderation failure | Traced approve/reject flow to request-validation boundary on `/api/admin/edit-provider` |
| 2026-04-02 | Analyst | Promoted validation failure to proven | User supplied Zod error showing `providerImages` field rejection |

## Value Statement and Business Objective

Admin moderators must be able to approve or reject providers on UAT. The current failure blocks moderation throughput entirely because both actions abort before the review mutation is sent.

## Objective

Determine why the admin approve/reject flow returns HTTP 400 with `Invalid request body` on UAT, identify the affected execution path, and document the smallest safe fix direction without implementing it.

## Context

- Reported symptom: iPhone Safari on UAT shows `Error submitting moderation action: Error: Invalid request body`.
- Reported network failure: `PATCH https://uat.ummahflow.com/api/admin/edit-provider` returns HTTP 400.
- Reported page: `/dashboard/providers/d0c015ca-1b9a-4a4d-8768-75530a0ac386/edit`.
- Session constraints: analysis-only, worker worktree, no new ID allocation.

## Methodology

1. Traced the moderation path from the dashboard edit page through the save-first flow.
2. Compared the request body emitted by the client against the `providerEditUpdateSchema` contract.
3. Reviewed existing regression/security tests for accepted and rejected `providerImages` shapes.
4. Compared the admin route contract against the shared image model used elsewhere in the app.

## Findings

### L1 Proven

1. **The failing moderation request is rejected specifically on the `providerImages` field.**
   User-provided validation output shows the exact schema issue array:
   ```json
   [
     {
       "code": "custom",
       "message": "providerImages must be valid JSON with shape { urls: string[] }",
       "path": ["providerImages"]
     }
   ]
   ```
   This proves the HTTP 400 is caused by `providerEditUpdateSchema` rejecting the `providerImages` value in the moderation save request.

2. **Approve and reject both hit `/api/admin/edit-provider` before `/api/admin/review-provider`.**
   The admin edit page calls `saveProviderEdits(formData)` first inside `finishModerationAction()`, and only calls `reviewProvider()` after the edit request succeeds. This means any 400 from `PATCH /api/admin/edit-provider` blocks both moderation actions before the review route is reached.

3. **The failing route returns the exact user-facing error string when body validation fails.**
   `src/app/api/admin/edit-provider/route.ts` parses the request with `providerEditUpdateSchema.parse(body)` and returns HTTP 400 with `{ error: 'Invalid request body' }` on validation failure. This matches the user’s network symptom and toast/error text.

4. **The admin edit page always sends `providerImages: formData.images` as part of moderation save.**
   The request body built in `saveProviderEdits()` includes `providerImages: formData.images` unconditionally.

5. **The shared edit form defaults missing provider images to the JSON array string `[]`.**
   `ProviderEditForm` initializes `images` with `provider.provider_images || '[]'`. For providers with no stored images, moderation therefore serializes `providerImages: '[]'` unless a sub-page or local draft overwrites it.

6. **The admin edit route accepts only `null` or JSON shaped like `{ urls: string[] }` for `providerImages`.**
   `providerEditUpdateSchema` rejects any other JSON shape and explicitly requires `providerImages` to parse to an object containing a `urls` array. Existing security tests in `src/__tests__/api/security-066-regression.test.ts` confirm that malformed JSON and wrong structures are rejected, while `null` and `JSON.stringify({ urls: [...] })` are accepted.

### L2 Observed

1. **The shared app image model is broader than the admin route contract.**
   `src/utils/imageUtils.ts` defines `ProviderImages` as `string | string[] | ImageData | null | undefined` and downstream consumers accept string, array, or object forms. The admin route is therefore stricter than the shared UI/data model it serves.

### L3 Inferred

1. **Most likely exact bad value in the failing UAT request:** `providerImages: '[]'` or another non-`{ urls: string[] }` image payload.
   - Why this remains L3: the validation output proves the field is the failure point, but it does not expose the exact serialized value that was submitted.
   - Fastest disconfirming test: inspect the rejected request payload in browser devtools or structured logs for the failing moderation attempt.
   - Missing telemetry to make this L1: captured request body shape or a structured validation log field such as `providerImagesShape` for the failed UAT request.

## Affected Path

`/dashboard/providers/[id]/edit`
→ `ProviderEditForm` moderation footer
→ `finishModerationAction(formData, reviewStatus, reviewFeedback?)`
→ `saveProviderEdits(formData)`
→ `PATCH /api/admin/edit-provider`
→ `providerEditUpdateSchema.parse(body)`
→ HTTP 400 `Invalid request body`
→ `reviewProvider()` never runs

## Branch / State Coverage

| Branch | Current status | Confidence | Notes |
| --- | --- | --- | --- |
| Provider has no images and no overriding admin draft state | Highly likely broken | L2 | Default form value is `'[]'`, and `providerImages` is now proven as the failing field |
| Provider has valid `{ "urls": [...] }` image JSON | Likely healthy | L2 | Matches schema and existing regression tests |
| Provider images are `null` at submission time | Likely healthy | L2 | Existing regression tests accept `null` |
| Provider images persisted as bare JSON array string from older/shared flows | Likely broken | L2 | Shared model tolerates arrays; route validator does not and failure field is proven |

## Candidate Root Cause

Root cause: **contract drift at the `providerImages` request boundary**. The shared provider-edit UI and image helpers tolerate multiple image shapes, but the admin edit API validates only `{ urls: string[] } | null`. Because moderation uses a save-first flow, that mismatch prevents both approve and reject actions from reaching the review endpoint.

## Smallest Safe Fix Direction

Normalize `providerImages` at a single boundary so the admin moderation save payload and the route schema agree. The narrowest safe direction is to ensure the moderation save path sends `null` or `JSON.stringify({ urls: [...] })` for empty and populated image states, rather than broadening multiple downstream consumers at once.

## System Weaknesses

1. **Shared form / API contract drift**: the same `ProviderEditForm` state can be valid for owner flows and invalid for admin API validation.
2. **Missing regression coverage for moderation with empty images**: current tests validate the route contract and moderation footer independently, but not the combined payload shape emitted by the admin page when no images exist.
3. **Save-first moderation amplifies validation mismatches**: unrelated field-shape errors in the edit payload prevent the actual moderation action from being attempted.

## Instrumentation Gaps

| Type | Gap | Why it matters |
| --- | --- | --- |
| Normal | Structured validation metadata for edit-provider failures (for example `providerImagesShape`, `hasProviderImages`) | Would identify contract mismatches without requiring raw body inspection |
| Debug | One-time capture of the rejected request payload for the failing UAT provider | Would identify the exact bad serialized value (`[]`, legacy array string, or another shape) |

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
| --- | --- | --- | --- | --- |
| 1 | Exact `providerImages` value in the failing UAT request | Validation output identifies the field, not the submitted value | Inspect browser network payload or server validation log for the failed PATCH | Planner / Implementer / operator |
| 2 | Whether the failure reproduces only for providers without images or also for providers with legacy array-shaped images | No authenticated UAT smoke verification in this session | Retry approve/reject on one provider with valid `{urls}` images and one with no images | Planner / QA |

## Analysis Recommendations

1. Capture one failing UAT moderation request body and confirm the `providerImages` shape.
2. Add a focused regression test that exercises the current admin moderation page payload when `provider.provider_images` is absent.
3. Confirm whether any persisted provider records still use array-shaped `provider_images`, since those would remain at risk even after fixing only the empty-image default.

## Open Questions

1. Does the failing UAT provider currently have `provider_images = null`, `'[]'`, or a legacy array/object string in the database?
2. Was the current `enableLocalStorage={true}` reintroduction on the admin page intentional, given prior implementation notes that this path had been restored to `false` during Plan 061?