---
ID: 177
Origin: 177
UUID: e7f2d4b9
Status: Active
---

# QA Validation Report: Bug #177 — Null provider_images TypeError on /saved page

## Test Results Summary

| Check | Result |
|-------|--------|
| All tests pass | 211 passed, 2 skipped (1731 tests, 22 skipped) |
| New imageUtils tests | 18/18 passed |
| Existing transform regression test | Passes (`provider_images: null` → `images` is `null`) |
| Type-check (`tsc --noEmit`) | Passes clean |

## Coverage Verification

### Test file: `src/__tests__/utils/imageUtils.test.ts`

| Input | `getFirstImageUrl` | `getAllTrustedImageUrls` |
|-------|-------------------|-------------------------|
| `null` | Returns placeholder | Returns `[]` |
| `undefined` | Returns placeholder | Returns `[]` |
| `""` (empty string) | Returns placeholder | Returns `[]` |
| `"null"` (string) | Returns placeholder | Returns `[]` |
| Valid JSON `{"urls":["a.jpg"]}` | Returns `"a.jpg"` | Returns `["a.jpg"]` |
| Array `["a.jpg"]` | Returns `"a.jpg"` | Returns `["a.jpg"]` |
| Object `{urls: ["a.jpg"]}` | Returns `"a.jpg"` | Returns `["a.jpg"]` |
| Empty `{urls: []}` | Returns placeholder | Returns `[]` |
| Invalid JSON `"invalid json"` | Returns placeholder | Returns `[]` |

All 18 cases present. The `"null"` string input (exact bug path) is covered for both functions.

## Source Changes

| File | Line | Change |
|------|------|--------|
| `src/services/providers.ts` | 145 | `provider.provider_images == null ? null : ...` guard |
| `src/services/providers.server.ts` | 179 | Same guard in bookmark fetch path |
| `src/utils/imageUtils.ts` | 36 | Post-parse null check: `if (imagesData === null) return PLACEHOLDER_IMAGE` |
| `src/utils/imageUtils.ts` | 71 | Same for `getAllTrustedImageUrls` |

## Verdict

**QA COMPLETE** — All validation criteria met. No issues found.

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | QA | Document created, validation complete |
