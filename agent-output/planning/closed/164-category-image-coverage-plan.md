---
ID: 164
Origin: 164
UUID: b7e39f1d
Status: Closed
---

# Plan: Expand Category Image Enrichment Coverage

**Date**: 2026-06-12
**Depends on**: [164-category-image-coverage-analysis.md](../analysis/164-category-image-coverage-analysis.md)

---

## Changelog

| Date | Agent | Action |
|------|-------|--------|
| 2026-06-12 | Planner | Plan created from analysis 164. |
| 2026-06-12 | Planner (via Architect review) | Fixed count error (36→38 entries, 53→55 pool size). Added missing Salads & Cake/Cafe to Batch 3. Added stale-UUID removal regression test. |
| 2026-06-12 | DevOps | Document closed. Committed as f45ad459. |

---

## 1. Overview

`CATEGORY_IMAGE_POOL` in `src/lib/enrichment/image-enrichment.ts:30` is the central registry that maps category UUIDs to Unsplash search queries. It currently has 20 entries but only 9 (45%) actually resolve — 11 UUIDs are stale (DB was reseeded, UUIDs changed), and 38 categories added via migrations 089, 097, 100, 103 have zero enrichment coverage. Providers in uncovered categories silently fall back to "Sonstiges/Other" stock images.

**Goal**: Restore 100% category enrichment coverage by fixing all stale UUIDs and adding queries for every uncovered category. Then curate new stock images via Unsplash in 4 batched sessions.

---

## 2. Current State

### Pool Status

| Status | Count | Details |
|--------|-------|---------|
| Valid (UUID matches DEV DB) | 9 | Bildung, Essen, Handwerk, Sonstiges, Afghanisch, Dienstleistungen, Gesundheit, Kleidung, Gemeinschaft |
| Stale (UUID not in DEV DB) | 11 | Arabic, Balkan, German, Indian/Pakistani (combined), Italian, N African, E African, Persian, Thai/SE Asian, Turkish, W African |
| **Total pool entries** | **20** | |

### Test Coverage

- `src/__tests__/lib/enrichment/image-enrichment.test.ts:18` uses stale Turkish UUID `232c2870-7929-43eb-a909-6cac90203192`. Test passes because it only validates pool contents, not DB alignment.
- `toHaveLength(20)` assertion at line 12 will fail after adding new entries.

---

## 3. Target State

### Final Pool: 55 entries

| Group | Count | Explanation |
|-------|-------|-------------|
| Valid original (unchanged) | 9 | Already correct UUIDs + queries |
| Non-overlapping stale fixes | 8 | Replace UUID only, keep existing queries |
| New categories | 38 | New entries with proposed queries from analysis tables |

**Why 55 not 58**: 3 of the 11 stale entries (Italian, Indian, Thai) share replacement UUIDs with new cuisine entries that have improved queries. These 3 are handled in the "new categories" milestone, not the "fix stale" milestone. The combined Indian/Pakistani stale entry (`f0118e0e`) is replaced by separate Indian (`dd99f21b`) and Pakistani (`9eef8348`) entries. Net: 20 - 3 (overwritten stale) + 38 (new) = 55.

### Overlap Detail

| Concept | Stale UUID (removed) | New UUID (from "new" cuisines table) | Queries Source |
|---------|---------------------|--------------------------------------|----------------|
| Italian | `b35965ed-fdb0-4bc5-a872-ab3bbc5139de` | `414bb2e2-4a82-4e4c-a6b8-f75d9056b43b` | New cuisine table (improved) |
| Indian | `f0118e0e-1b6d-4691-b5d9-aa1a5c2aa9ae` | `dd99f21b-74ab-4abc-b1ed-c7099be4655d` | New cuisine table (improved) |
| Thai | `f577c7ce-d2e2-46ba-b494-57b038aa4b48` | `b02b28bc-b0ef-44f0-9df0-b8c737c5f253` | New cuisine table (improved) |
| Pakistani | (was part of combined `f0118e0e`) | `9eef8348-dd0f-4abe-80c4-66e177bfa0e0` | New cuisine table (separate entry) |

---

## 4. Milestone Breakdown

### M1: Fix Non-Overlapping Stale UUIDs (8 entries)

Replace only the UUID key for these 8 stale entries. Keep existing query strings unchanged.

| Old UUID (STALE) | New UUID (DEV DB) | Label |
|---|---|---|
| `a8d3cf09-b606-4de9-8744-b8c584c5e172` | `8c0bad33-ebc9-4cc7-b3cf-237453fc8498` | Arabic |
| `d2cef2bf-bd0b-4b54-8606-ac371a1e1588` | `88d60ec2-497e-40ea-bce7-9c1ec8b4d007` | Balkan |
| `7ef6672b-97a2-4078-9d04-6ad1db6bac28` | `f502a5fa-3ea0-4a6b-9e1b-884b10811092` | German |
| `d6812686-a908-43a5-9621-845a69ead77d` | `4aa30403-895a-4d68-b617-6882c0a20adf` | North African |
| `611dd280-59d7-4996-a4e1-046c0ddfe6b6` | `8550d193-5623-49da-b8c9-1187f8fe5e6c` | East African |
| `b39cf9f5-fb5d-4e17-bc1a-2d379e130e82` | `549ee1f0-a2fb-4c05-b548-0e702456ea16` | Persian |
| `232c2870-7929-43eb-a909-6cac90203192` | `65a3e4e8-5dac-41a9-94c4-f65b33c6e59b` | Turkish |
| `93808e5e-c124-4dc7-a107-9867cc708a52` | `12ca550a-62b3-464a-984c-5f3e8ac547dc` | West African |

**Implementation**: Edit `CATEGORY_IMAGE_POOL` to change the key for each of these 8 entries. Do NOT change the array values (queries).

**File**: `src/lib/enrichment/image-enrichment.ts:56-110`

---

### M2: Add New Category Entries (38 entries)

Add entries for all uncovered categories. Remove the 3 stale entries that overlap with new cuisine entries (Italian `b35965ed`, Indian/Pakistani `f0118e0e`, Thai `f577c7ce`). The M1 entries don't include those 3, so they're removed here alongside adding the new cuisine entries.

**Entries by group** (full tables from analysis doc):

#### Cuisines (9 entries — new + overlapping stale replaced)

| Entry Key (UUID) | Query 1 | Query 2 | Query 3 |
|---|---|---|---|
| `9a7971c1-8d86-42c8-b668-e232487b90dc` (French) | french cuisine plated | french bakery pastry display | parisian bistro interior |
| `414bb2e2-4a82-4e4c-a6b8-f75d9056b43b` (Italian) | italian pasta fresh | italian pizza restaurant | italian trattoria interior |
| `36f70529-254c-40b2-8b93-fbb5693df68a` (Greek) | greek food platter | greek taverna interior | mediterranean meze spread |
| `482d6624-a071-447e-b503-cdfbbdca8cd1` (Chinese) | chinese cuisine stir fry | chinese restaurant interior | asian noodle dish |
| `ae5cdad6-7a43-448f-a01f-c33040dd1a21` (Japanese) | japanese ramen bowl | japanese sushi platter | japanese izakaya interior |
| `b02b28bc-b0ef-44f0-9df0-b8c737c5f253` (Thai) | thai curry dish | thai street food vendor | thai restaurant interior |
| `d69e5008-2d9e-483c-86b7-1da2d81f9ff8` (Mediterranean) | mediterranean food spread | mediterranean restaurant terrace | olive oil fresh herbs |
| `dd99f21b-74ab-4abc-b1ed-c7099be4655d` (Indian) | indian curry biryani | indian restaurant interior | tandoori naan bread |
| `9eef8348-dd0f-4abe-80c4-66e177bfa0e0` (Pakistani) | pakistani cuisine biryani | pakistani food platter | karahi dish pakistani |

#### Dish Types (11 entries)

| Entry Key (UUID) | Query 1 | Query 2 | Query 3 |
|---|---|---|---|
| `cd11b30c-cad9-4833-b50f-7dd8437fa5e9` (Pizza) | pizza fresh baked | pizzeria restaurant interior | neapolitan pizza oven |
| `486dad69-d36b-44f7-adb8-16bb0fe95763` (Burger) | gourmet burger fries | burger restaurant interior | smashed burger grill |
| `428d18d2-b016-4b26-93e2-5a1c627945d7` (Sushi) | sushi platter fresh | japanese sushi chef | sushi restaurant counter |
| `51a40e1d-fbce-418a-ab0e-ad695fd44a15` (Pasta) | fresh pasta handmade | pasta dish italian | pasta restaurant kitchen |
| `d93f316c-c786-4310-87b8-e6bd2f01b887` (Tacos/Wraps) | mexican tacos spread | wrap sandwich fresh | burrito bowl ingredients |
| `4a0979fb-61ca-46d6-9af4-3a76e0ede96b` (BBQ/Grill) | bbq grill platter | barbecue smoke meat | outdoor grilling food |
| `8d95591e-0228-4164-9603-d08d724b60b4` (Fried Chicken) | fried chicken crispy | chicken wings platter | fried chicken restaurant |
| `edc62206-513d-4d34-bf15-8ecbf21b2ff8` (Soups) | hearty soup bowl | soup kitchen warm | ramen broth closeup |
| `f901958d-f285-4c70-9bcf-217fd42243e6` (Bowls) | healthy food bowl | buddha bowl colorful | poke bowl fresh |
| `2c806e77-2b96-4126-9551-2789e17d5fd8` (Sandwiches) | gourmet sandwich deli | fresh sandwich ingredients | sandwich shop counter |
| `d9e09fbc-9b17-4ef1-b057-14c6d8fbf543` (Noodle Soup) | ramen noodle soup | pho vietnamese bowl | noodle soup steaming |

#### Dietary (2 entries)

| Entry Key (UUID) | Query 1 | Query 2 | Query 3 |
|---|---|---|---|
| `2ee3929e-acc4-44eb-b93c-7714496927a9` (Vegetarian) | vegetarian food spread | colorful vegetables fresh | plant based meal bowl |
| `7acbb5e6-703c-4fd1-8f2f-676d2f0f2db9` (Vegan) | vegan food bowl | plant based cuisine | vegan ingredients fresh |

#### Meal Types (4 entries)

| Entry Key (UUID) | Query 1 | Query 2 | Query 3 |
|---|---|---|---|
| `a798fc0d-1160-4773-8a93-7a21266921b0` (Breakfast/Brunch) | breakfast brunch spread | brunch table setting | cafe breakfast sunny |
| `0f9ed256-d3ef-47aa-991c-d2bc4119219d` (Desserts/Ice Cream) | dessert platter sweets | ice cream scoops colorful | pastry display bakery |
| `e2c82e56-ae9c-40fc-ab7a-d002f446133f` (Salads) | fresh salad bowl | garden salad colorful | salad bar display |
| `678e44ce-521f-4397-bb0b-018176622a59` (Cake/Cafe) | cake display bakery | cafe interior cozy | coffee and cake table |

#### Store Types (7 entries)

| Entry Key (UUID) | Query 1 | Query 2 | Query 3 |
|---|---|---|---|
| `ed7d9c57-0ab2-419d-8735-b3cf82f82ddd` (Electronics) | electronics store display | gadget store interior | technology shop modern |
| `88a8d687-f670-4bee-9d16-f762f2f07fa8` (Household/Living) | home decor display | household goods store | interior design showroom |
| `5a8b8bb7-502f-43bc-9819-539d53369c82` (Cosmetics/Care) | cosmetics store display | skincare products natural | beauty shop interior |
| `7da24ba3-8fb1-4fbb-a113-8f00b011f189` (Books/Media) | bookstore interior cozy | bookshelf display library | bookshop reading nook |
| `48fa5d40-bd93-444c-b32a-d929dda82fad` (Gifts/Decor) | gift shop display | home decor store | artisan craft market |
| `90c2c997-2d06-454b-84ae-2afe5ec7c5af` (Baby/Child) | baby store display | childrens clothing shop | nursery decor items |
| `12671354-0c9a-4312-9648-7556d81d9e97` (Stationery/Office) | stationery store display | office supplies organized | art supply shop |

#### Others (5 entries — migrations 089, 097)

| Entry Key (UUID) | Query 1 | Query 2 | Query 3 |
|---|---|---|---|
| `a5c07a6b-0de8-45e8-8c01-2b3b696e6d2e` (American) | american diner interior | classic burgers fries | american comfort food |
| `6507aea0-cff2-4804-82c6-422e57fbeaaa` (Groceries) | grocery store fresh produce | supermarket aisle display | halal grocery market |
| `062f1303-f3e4-4975-bc5a-c0f51e75701d` (Bakery) | bakery fresh bread | bakery shop display | artisan bread oven |
| `11ebc505-64bb-4021-8ff9-13c4e634827e` (Uyghur) | uyghur cuisine laghman | central asian food | samsa uyghur pastry |
| `eea06ee4-2718-4bfa-b1c0-09036d1fd891` (Desserts/Sweets) | middle eastern sweets | baklava dessert tray | turkish delight display |

**File**: `src/lib/enrichment/image-enrichment.ts:30`

**Removals** (3 stale entries that overlap with new cuisine entries above):
- `b35965ed-fdb0-4bc5-a872-ab3bbc5139de` (old Italian — replaced by `414bb2e2`)
- `f0118e0e-1b6d-4691-b5d9-aa1a5c2aa9ae` (old Indian/Pakistani combined — replaced by `dd99f21b` + `9eef8348`)
- `f577c7ce-d2e2-46ba-b494-57b038aa4b48` (old Thai — replaced by `b02b28bc`)

---

### M3: Handle Kebab/Döner

The "Kebab / Döner" category from migration 100 was never inserted (blocked by `WHERE NOT EXISTS` matching "Wraps, Döner & Falafel" legacy row). It does not exist in the DB. Do NOT add it to `CATEGORY_IMAGE_POOL`.

Add a TODO comment above or near the pool noting the omission:

```typescript
// TODO: Kebab/Döner category was blocked from DB insertion (migration 100 line 91).
// If unblocked and inserted, add entry with queries:
//   'turkish kebab doner', 'doener kebab shop', 'kebab platter restaurant'
```

---

### M4: Update Tests

**File**: `src/__tests__/lib/enrichment/image-enrichment.test.ts`

#### 4a: Fix pool length assertion

```diff
- expect(Object.keys(CATEGORY_IMAGE_POOL)).toHaveLength(20);
+ expect(Object.keys(CATEGORY_IMAGE_POOL)).toHaveLength(55);
```

This test will go RED before code changes (expects 55, currently 20).

#### 4b: Fix stale UUID reference

Replace the stale Turkish UUID with a verified DB UUID (Afghan `8204a370-26fb-4c8d-8183-2e5550a09dcb`):

```diff
- const queries = resolveCategoryImageQueries('232c2870-7929-43eb-a909-6cac90203192');
- expect(queries).toContain('turkish kebab doner');
+ const queries = resolveCategoryImageQueries('8204a370-26fb-4c8d-8183-2e5550a09dcb');
+ expect(queries).toContain('afghan food kabuli');
```

#### 4c: Add regression tests

Add these tests to verify post-fix correctness:

```typescript
describe('CATEGORY_IMAGE_POOL — post-fix regression', () => {
  it('resolves queries for a formerly-stale category (Turkish, now with updated UUID)', () => {
    const queries = resolveCategoryImageQueries('65a3e4e8-5dac-41a9-94c4-f65b33c6e59b');
    expect(queries).toContain('turkish kebab doner');
    expect(queries).toHaveLength(3);
  });

  it('resolves queries for a newly-added cuisine (French)', () => {
    const queries = resolveCategoryImageQueries('9a7971c1-8d86-42c8-b668-e232487b90dc');
    expect(queries).toContain('french cuisine plated');
    expect(queries).toHaveLength(3);
  });

  it('falls back to DEFAULT for a UUID not in the pool', () => {
    const queries = resolveCategoryImageQueries('00000000-0000-0000-0000-000000000000');
    expect(queries).toContain('small business storefront');
  });

  it('has no duplicate UUID keys in the pool', () => {
    const keys = Object.keys(CATEGORY_IMAGE_POOL);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('does not contain removed stale UUIDs', () => {
    expect(CATEGORY_IMAGE_POOL).not.toHaveProperty('b35965ed-fdb0-4bc5-a872-ab3bbc5139de');
    expect(CATEGORY_IMAGE_POOL).not.toHaveProperty('f0118e0e-1b6d-4691-b5d9-aa1a5c2aa9ae');
    expect(CATEGORY_IMAGE_POOL).not.toHaveProperty('f577c7ce-d2e2-46ba-b494-57b038aa4b48');
  });
});
```

---

### M5: Curate Images (4 Batches)

After code changes are committed and deployed to DEV, run curation in 4 sessions spaced >= 1 hour apart (Unsplash demo tier: 50 req/hr, script enforces <= 45 calls/run). Each batch is 8--14 categories x 3 queries = 24--42 calls, well within the 45 limit.

**Prerequisite**: `UNSPLASH_ACCESS_KEY` in `.env.local`.

#### Batch 1: Cuisines + Dietary + Breakfast/Brunch (12 categories, 36 queries)

Covers the 9 cuisines (all new + overlapping stale replacements), 2 dietary categories, and 1 meal type.

```bash
npx tsx scripts/enrich-images.ts --curate --write --per-category 5 \
  --categories 9a7971c1-8d86-42c8-b668-e232487b90dc,414bb2e2-4a82-4e4c-a6b8-f75d9056b43b,36f70529-254c-40b2-8b93-fbb5693df68a,482d6624-a071-447e-b503-cdfbbdca8cd1,ae5cdad6-7a43-448f-a01f-c33040dd1a21,b02b28bc-b0ef-44f0-9df0-b8c737c5f253,d69e5008-2d9e-483c-86b7-1da2d81f9ff8,dd99f21b-74ab-4abc-b1ed-c7099be4655d,9eef8348-dd0f-4abe-80c4-66e177bfa0e0,2ee3929e-acc4-44eb-b93c-7714496927a9,7acbb5e6-703c-4fd1-8f2f-676d2f0f2db9,a798fc0d-1160-4773-8a93-7a21266921b0
```

#### Batch 2: Dish Types + Desserts/Ice Cream (12 categories, 36 queries)

Covers all 11 dish types and 1 meal type.

```bash
npx tsx scripts/enrich-images.ts --curate --write --per-category 5 \
  --categories cd11b30c-cad9-4833-b50f-7dd8437fa5e9,486dad69-d36b-44f7-adb8-16bb0fe95763,428d18d2-b016-4b26-93e2-5a1c627945d7,51a40e1d-fbce-418a-ab0e-ad695fd44a15,d93f316c-c786-4310-87b8-e6bd2f01b887,4a0979fb-61ca-46d6-9af4-3a76e0ede96b,8d95591e-0228-4164-9603-d08d724b60b4,edc62206-513d-4d34-bf15-8ecbf21b2ff8,f901958d-f285-4c70-9bcf-217fd42243e6,2c806e77-2b96-4126-9551-2789e17d5fd8,d9e09fbc-9b17-4ef1-b057-14c6d8fbf543,0f9ed256-d3ef-47aa-991c-d2bc4119219d
```

#### Batch 3: Store Types + Others + Remaining Meal Types (14 categories, 42 queries)

Covers 7 store types, 5 "others" categories, and 2 meal types (Salads, Cake/Cafe).

```bash
npx tsx scripts/enrich-images.ts --curate --write --per-category 5 \
  --categories ed7d9c57-0ab2-419d-8735-b3cf82f82ddd,88a8d687-f670-4bee-9d16-f762f2f07fa8,5a8b8bb7-502f-43bc-9819-539d53369c82,7da24ba3-8fb1-4fbb-a113-8f00b011f189,48fa5d40-bd93-444c-b32a-d929dda82fad,90c2c997-2d06-454b-84ae-2afe5ec7c5af,12671354-0c9a-4312-9648-7556d81d9e97,a5c07a6b-0de8-45e8-8c01-2b3b696e6d2e,6507aea0-cff2-4804-82c6-422e57fbeaaa,062f1303-f3e4-4975-bc5a-c0f51e75701d,11ebc505-64bb-4021-8ff9-13c4e634827e,eea06ee4-2718-4bfa-b1c0-09036d1fd891,e2c82e56-ae9c-40fc-ab7a-d002f446133f,678e44ce-521f-4397-bb0b-018176622a59
```

#### Batch 4: Non-Overlapping Stale Fixes (8 categories, 24 queries)

Covers the 8 legacy categories where only the UUID changed (queries are the original ones).

```bash
npx tsx scripts/enrich-images.ts --curate --write --per-category 5 \
  --categories 8c0bad33-ebc9-4cc7-b3cf-237453fc8498,88d60ec2-497e-40ea-bce7-9c1ec8b4d007,f502a5fa-3ea0-4a6b-9e1b-884b10811092,4aa30403-895a-4d68-b617-6882c0a20adf,8550d193-5623-49da-b8c9-1187f8fe5e6c,549ee1f0-a2fb-4c05-b548-0e702456ea16,65a3e4e8-5dac-41a9-94c4-f65b33c6e59b,12ca550a-62b3-464a-984c-5f3e8ac547dc
```

**Timing**: Each batch completes in ~50s (12 cats x 3 queries x 1.4s delay) plus image download/upload. Schedule >= 1 hour apart.

**Note**: Batch 1 includes Italian (`414bb2e2`), Indian (`dd99f21b`), and Thai (`b02b28bc`) with proposed queries. These 3 are NOT repeated in Batch 4 since they were already curated with improved queries.

---

### M6: Verify

After all code changes, run in order:

```bash
# 1. Type check
npm run type-check

# 2. Unit tests (RED before changes, GREEN after)
npm test -- src/__tests__/lib/enrichment/

# 3. Dry-run curation (one batch to validate UUIDs resolve)
npx tsx scripts/enrich-images.ts --curate --categories 9a7971c1-8d86-42c8-b668-e232487b90dc,414bb2e2-4a82-4e4c-a6b8-f75d9056b43b,dd99f21b-74ab-4abc-b1ed-c7099be4655d,65a3e4e8-5dac-41a9-94c4-f65b33c6e59b
```

---

## 5. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Production UUIDs differ from DEV** | HIGH | Query production DB before deploying. If UUIDs differ, create a per-environment lookup or sync migrations. See Open Question 1 in analysis. |
| **Unsplash rate limit (50/hr)** | MEDIUM | 4 batched sessions >= 1h apart. Each batch is 24-42 calls, well within 45-call script limit. |
| **Language/translation quality** | LOW | Queries are English; Unsplash returns generic stock photography. Category names are in German (`name_de`) but image search is language-agnostic. |
| **Vegetarian/Vegan `category_type` is NULL** | LOW | Migration 100 may not have been applied to DEV. Verify and re-apply if needed. Does not block enrichment — pool works regardless of `category_type`. |
| **Duplicate category concepts in DB** | LOW | DB has overlapping pairs (Pizza & Flammkuchen vs Pizza, Salate & Bowls vs Salate + Bowl). Not a blocker for this task — can be consolidated later. |
| **Manual curation required** | MEDIUM | QA should spot-check curated images for each category. Unsplash photos should be appropriate and high-quality. |

---

## 6. Rollout Strategy

```
DEV (local) → UAT → Production
```

1. **DEV**: Make code changes (M1-M4). Run verification (M6). Curate images to DEV Supabase Storage (M5). Manual QA spot-check.
2. **UAT**: Deploy code changes. Run curation against UAT Storage. Assign images to providers. Manual QA on UAT.
3. **Production**: Deploy code changes. Run curation against Production Storage. Assign images to providers. Monitor.

**Production UUID Verification (blocker check)**: Before curating in production, verify all 55 pool UUIDs exist in the production `categories` table. Query:

```sql
SELECT category_id, name_de FROM categories
WHERE category_id = ANY(ARRAY[
  -- list all 55 UUIDs from the pool
]::uuid[]);
```

If any are missing, adjust UUIDs before curating.

---

## 7. TDD Strategy

### Phase 1: RED — Update tests before code changes

| # | Test | Expected Result | Reason |
|---|------|----------------|--------|
| 1 | Update `toHaveLength(20)` → `toHaveLength(55)` | **FAIL** — pool still has 20 entries | Proves test catches missing entries |
| 2 | Update Turkish UUID → Afghan UUID, update assertion | **PASS** — Afghan is valid in current pool | Proves Afghan entry resolves correctly |
| 3 | Add regression test for Turkish (`65a3e4e8`) queries | **FAIL** — Turkish UUID not yet in pool | Proves test catches stale UUID |
| 4 | Add regression test for French (`9a7971c1`) queries | **FAIL** — French not yet in pool | Proves test catches missing entry |

Run: `npm test -- src/__tests__/lib/enrichment/` — should see 2 passes (updated Afghan, existing tests), 3 fails.

### Phase 2: GREEN — Implement code changes

Apply M1 (fix 8 stale UUIDs) and M2 (add 38 new entries). Run tests again — all should pass.

### Phase 3: REFACTOR — Optional cleanup

- Consider adding a build-time invariant: `if (Object.keys(CATEGORY_IMAGE_POOL).length !== 55) throw...` (not required, but prevents silent drift)
- Consider sorting pool entries alphabetically by UUID for readability

---

## 8. Files Changed

| File | Change | Milestone |
|------|--------|-----------|
| `src/lib/enrichment/image-enrichment.ts` | Update CATEGORY_IMAGE_POOL: fix 8 stale UUIDs + add 38 entries + remove 3 overlapping stale + add Kebab TODO | M1, M2, M3 |
| `src/__tests__/lib/enrichment/image-enrichment.test.ts` | Fix pool length, fix stale UUID reference, add regression tests | M4 |

---

## 9. Open Questions (inherited from analysis)

| # | Question | Status |
|---|----------|--------|
| 1 | Do production UUIDs match DEV? | Verify before prod curation |
| 2 | Should Kebab/Döner be force-inserted or merged into Wraps/Döner/Falafel? | PM decision |
| 3 | Should overlapping category pairs be consolidated? | Deferred |
| 4 | Is Vegetarian/Vegan `category_type` NULL in production? | Verify migration status |

(End of file - 243 lines)
