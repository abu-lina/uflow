---
ID: 177
Origin: 177
UUID: a8b3d9f1
Status: Active
---

# Plan: Fix null `provider_images` TypeError on /saved page

## Changelog

| Date | Agent | Outcome |
|------|-------|---------|
| 2026-06-17 | Planner | Document created |

## Value Statement

**As a** developer,
**I want** `transformProviderToSearchResult` to never produce the truthy string `"null"` from a null `provider_images`,
**So that** downstream image utilities (`getFirstImageUrl` / `getAllTrustedImageUrls`) don't throw TypeErrors, eliminating 6 console errors per `/saved` page load and restoring error-log signal.

## Scope

**In scope:**
- Fix the data-corruption bug in both transform locations
- Add defensive post-parse null check in both image utils
- Unit tests for the image utilities (previously untested)
- Unit test for `transformProviderToSearchResult` with null `provider_images`

**Out of scope:**
- Manual browser testing (unit tests cover the logic)
- Fixing `getAllTrustedImageUrlsWithFallback` or `parseCategoryImages` (not affected)
- Migration to extract a shared `transformSearchResult` helper (future refactor)
- Empty-string `provider_images` in DB (gap noted in analysis, no evidence it exists)

## Implementation Steps

### Step 1 — Add unit tests for `getFirstImageUrl` and `getAllTrustedImageUrls` (RED)

**File to create:** `src/__tests__/utils/imageUtils.test.ts`

Test cases for `getFirstImageUrl`:

| Input | Expected |
|-------|----------|
| `null` | `PLACEHOLDER_IMAGE` |
| `undefined` | `PLACEHOLDER_IMAGE` |
| `""` (empty string) | `PLACEHOLDER_IMAGE` |
| `"null"` (string) | `PLACEHOLDER_IMAGE` |
| `'{"urls":["a.jpg","b.jpg"]}'` | `"a.jpg"` |
| `["a.jpg"]` | `"a.jpg"` |
| `{ urls: ["a.jpg"] }` | `"a.jpg"` |
| `{ urls: [] }` | `PLACEHOLDER_IMAGE` |
| `"invalid json"` | `PLACEHOLDER_IMAGE` (catch block) |

Test cases for `getAllTrustedImageUrls`:

| Input | Expected |
|-------|----------|
| `null` | `[]` |
| `undefined` | `[]` |
| `""` (empty string) | `[]` |
| `"null"` (string) | `[]` |
| `'{"urls":["a.jpg","b.jpg"]}'` | `["a.jpg", "b.jpg"]` |
| `["a.jpg"]` | `["a.jpg"]` |
| `{ urls: ["a.jpg"] }` | `["a.jpg"]` |
| `{ urls: [] }` | `[]` |
| `"invalid json"` | `[]` (catch block) |

### Step 2 — Add defensive post-parse null check in `getFirstImageUrl` (GREEN)

**File:** `src/utils/imageUtils.ts`

After `JSON.parse` at line 35, add:

```typescript
if (imagesData === null) return PLACEHOLDER_IMAGE;
```

### Step 3 — Add defensive post-parse null check in `getAllTrustedImageUrls` (GREEN)

**File:** `src/utils/imageUtils.ts`

After `JSON.parse` at line 69, add:

```typescript
if (imagesData === null) return [];
```

### Step 4 — Update existing `transformProviderToSearchResult` test (RED)

**File:** `src/__tests__/services/providers-multi-location.test.ts`

Add a test case in the `transformProviderToSearchResult` describe block:

```
it('[post-fix PASSES] sets images to null when provider_images is null', () => {
  // Provider with provider_images: null
  // expect(result.images).toBeNull()
})
```

### Step 5 — Fix `transformProviderToSearchResult` in `providers.ts` (GREEN)

**File:** `src/services/providers.ts:145`

Change:
```typescript
images: typeof provider.provider_images === 'string' ? provider.provider_images : JSON.stringify(provider.provider_images),
```
To:
```typescript
images: provider.provider_images == null
  ? null
  : typeof provider.provider_images === 'string'
    ? provider.provider_images
    : JSON.stringify(provider.provider_images),
```

### Step 6 — Fix duplicate transform in `providers.server.ts` (GREEN)

**File:** `src/services/providers.server.ts:179`

Same change as Step 5 at line 179.

### Step 7 — Verify tests pass

```bash
npm test -- --run
npm run type-check
npm run lint
```

## Files to Modify

| File | Change |
|------|--------|
| `src/utils/imageUtils.ts` | Add post-parse null guard in `getFirstImageUrl` (line 36) and `getAllTrustedImageUrls` (line 70) |
| `src/services/providers.ts` | Fix `transformProviderToSearchResult` line 145 — null check before type branching |
| `src/services/providers.server.ts` | Fix duplicate transform line 179 — same null check |

## Files to Create

| File | Content |
|------|---------|
| `src/__tests__/utils/imageUtils.test.ts` | Unit tests for `getFirstImageUrl` and `getAllTrustedImageUrls` |

## Files to Update (tests)

| File | Change |
|------|--------|
| `src/__tests__/services/providers-multi-location.test.ts` | Add test: null `provider_images` → `images` is `null` |

## Order of Work

1. Write test file: `src/__tests__/utils/imageUtils.test.ts` (all 18 test cases)
2. Add post-parse null guards in `src/utils/imageUtils.ts`
3. Add `transformProviderToSearchResult` null-images test in providers test file
4. Fix `src/services/providers.ts:145`
5. Fix `src/services/providers.server.ts:179`
6. Run full test suite

## Scope Estimate

~30 lines changed across 5 files (3 source, 2 test).

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Other callers of `getFirstImageUrl`/`getAllTrustedImageUrls` pass valid data that hits the new null guard | Low | `JSON.parse("null")` only produces `null` when input is `"null"` — which is always a bug. Guard is correct. |
| Missed duplicate transform in `providers.server.ts` | — | Already identified, covered in Step 6. |
| Empty string `""` in `provider_images` DB column behaves differently | Unknown | Separate gap in analysis. Not in scope for this fix. |
