---
ID: 164
Origin: 164
UUID: a3f7c2b1
Status: Closed
---

# Category Image Enrichment Coverage Analysis

**Date**: 2026-06-12
**Confidence Level**: 2 (Observed) — UUIDs verified against DEV Supabase database `qrekonfhaenjdnjhwdum`. Production UUIDs may differ if the DB was reseeded with different migration history.

---

## Changelog

| Date | Agent | Action |
|------|-------|--------|
| 2026-06-12 | Analyst | Initial analysis created. Queried DEV DB for all 75 categories. |
| 2026-06-12 | DevOps | Document closed. Committed as f45ad459. |

---

## Value Statement & Objective

UFlow's image enrichment system uses Unsplash to auto-populate placeholder images for providers. The `CATEGORY_IMAGE_POOL` (`src/lib/enrichment/image-enrichment.ts:30`) maps 20 hardcoded category UUIDs to search queries. ~37 new categories were added via migrations 100, 103 (plus earlier additions: American via 089, Groceries via 097) with zero enrichment coverage. This analysis maps every uncovered category to its database UUID and proposes Unsplash queries.

---

## Context

- **Enrichment flow**: `resolveCategoryImageQueries()` looks up a category UUID in `CATEGORY_IMAGE_POOL`. On miss, falls back to `DEFAULT_CATEGORY_ID` ("Sonstiges/Other" — `5e5d910d-d790-4184-a061-9cd74d0950e8`).
- **Curate script**: `scripts/enrich-images.ts` uses `CATEGORY_IMAGE_POOL` keys as the source of truth for which categories to curate. New categories can't be curated until their UUIDs are added to the pool.
- **Demo rate limit**: 50 Unsplash requests/hour. The script enforces `≤45` calls per run.
- **Migrations queried**: DEV Supabase project `qrekonfhaenjdnjhwdum` (75 rows returned).

---

## Methodology

1. Queried the DEV Supabase `categories` table for all `(category_id, name_de, name_en, category_type, applicable_section)` tuples.
2. Cross-referenced each pool UUID against the live database.
3. For uncovered categories, matched DB rows to the migration source (100, 103, 089, 097).
4. Proposed Unsplash queries following the existing pattern: 3x English landscape-oriented search phrases per category.

---

## Findings

### Finding 1: Pool Staleness (CRITICAL)

**11 of 20** `CATEGORY_IMAGE_POOL` UUIDs do NOT exist in the DEV database. The DB has equivalent categories under different UUIDs (likely from a reseed or migration replay). These pool entries are effectively dead — `resolveCategoryImageQueries()` returns the DEFAULT fallback for any provider assigned to the current-DB UUID.

| Pool UUID (STALE) | Pool Label | Actual DB UUID | DB Name |
|---|---|---|---|
| `a8d3cf09-b606-4de9-8744-b8c584c5e172` | Arabic | `8c0bad33-ebc9-4cc7-b3cf-237453fc8498` | Arabisch |
| `d2cef2bf-bd0b-4b54-8606-ac371a1e1588` | Balkan | `88d60ec2-497e-40ea-bce7-9c1ec8b4d007` | Balkan- |
| `7ef6672b-97a2-4078-9d04-6ad1db6bac28` | German | `f502a5fa-3ea0-4a6b-9e1b-884b10811092` | Deutsche Kueche (Halal) |
| `f0118e0e-1b6d-4691-b5d9-aa1a5c2aa9ae` | Indian/Pakistani (combined) | `dd99f21b-74ab-4abc-b1ed-c7099be4655d` | Indisch |
| | | `9eef8348-dd0f-4abe-80c4-66e177bfa0e0` | Pakistanisch |
| `b35965ed-fdb0-4bc5-a872-ab3bbc5139de` | Italian | `414bb2e2-4a82-4e4c-a6b8-f75d9056b43b` | Italienisch |
| `d6812686-a908-43a5-9621-845a69ead77d` | North African | `4aa30403-895a-4d68-b617-6882c0a20adf` | Nordafrikanisch |
| `611dd280-59d7-4996-a4e1-046c0ddfe6b6` | East African | `8550d193-5623-49da-b8c9-1187f8fe5e6c` | Afrikanisch |
| `b39cf9f5-fb5d-4e17-bc1a-2d379e130e82` | Persian | `549ee1f0-a2fb-4c05-b548-0e702456ea16` | Persisch |
| `f577c7ce-d2e2-46ba-b494-57b038aa4b48` | Thai/SE Asian | `b02b28bc-b0ef-44f0-9df0-b8c737c5f253` | Thailandisch |
| `232c2870-7929-43eb-a909-6cac90203192` | Turkish | `65a3e4e8-5dac-41a9-94c4-f65b33c6e59b` | Tuerkisch |
| `93808e5e-c124-4dc7-a107-9867cc708a52` | West African | `12ca550a-62b3-464a-984c-5f3e8ac547dc` | Westafrikanisch |

**Impact**: These 11 categories silently fall through to the "Sonstiges/Other" default image queries. The test at `src/__tests__/lib/enrichment/image-enrichment.test.ts:18` uses `232c2870-7929-43eb-a909-6cac90203192` (Turkish — STALE) and still passes because the test only checks `CATEGORY_IMAGE_POOL` contents, not DB alignment.

### Finding 2: 9 Pool UUIDs Still Valid

These UUIDs DO exist in the DEV database and their enrichment still works:

| Pool UUID | DB Name |
|---|---|
| `21e8a577-f42c-499d-a277-0b8ba327c00b` | Bildung & Lernen |
| `20c10efe-404b-4a39-bb81-5089a0332d78` | Essen & Trinken |
| `b43ba9ba-965e-46f8-a97e-c76d352c2ff0` | Handwerk & Reparatur |
| `5e5d910d-d790-4184-a061-9cd74d0950e8` | Sonstiges (DEFAULT) |
| `8204a370-26fb-4c8d-8183-2e5550a09dcb` | Afghanisch |
| `1288f269-2cdb-47e8-bd8e-9d552ff25e83` | Dienstleistungen |
| `df8e549d-54c4-48ef-8e0b-c5a6646fcb7d` | Gesundheit & Sport |
| `49563bf0-6962-4fd8-9147-5e68e9310eb1` | Kleidung & Mode |
| `4470c3e0-458f-40a6-a96e-ca0fbdf145d7` | Gemeinschaft & Spenden |

### Finding 3: Kebab / Döner Never Inserted

Migration 100 line 91 checks `WHERE NOT EXISTS` for any category matching `%kebab%` or `%döner%`. The legacy category "Wraps, Döner & Falafel" (`24e15afc-4be3-4fc4-bd7d-cb201b366382`) matches this condition, so the Kebab/Döner INSERT was silently skipped. No row exists in the DB for "Kebab / Döner" as a separate dish type.

### Finding 4: Duplicate "Italian" Entry

The pool has `b35965ed-fdb0-4bc5-a872-ab3bbc5139de` for Italian (stale, not in DB). Migration 100 inserts a NEW Italian row (`414bb2e2-4a82-4e4c-a6b8-f75d9056b43b`) as a cuisine type. Both the old and new Italian concepts exist in the codebase but only the new UUID is in the DB. The same applies to Indian/Pakistani: the pool had a combined entry, but the DB has separate rows.

---

## Coverage Summary

| Status | Count |
|---|---|
| Covered (pool UUID matches DB) | 9 |
| Pool UUID stale (different DB UUID for same concept) | 11 |
| New categories — no enrichment at all | 37 |
| New categories — Kebab/Döner missing from DB | 1 |

**Effective coverage**: 9 of 75 categories (12%).

---

## New Categories Table

Each row includes 3 proposed Unsplash search queries in English (landscape orientation, food/retail photography).

### Cuisines (9)

| name_de | name_en | category_id | query_1 | query_2 | query_3 |
|---|---|---|---|---|---|
| Franzoesisch | French | `9a7971c1-8d86-42c8-b668-e232487b90dc` | french cuisine plated | french bakery pastry display | parisian bistro interior |
| Italienisch | Italian | `414bb2e2-4a82-4e4c-a6b8-f75d9056b43b` | italian pasta fresh | italian pizza restaurant | italian trattoria interior |
| Griechisch | Greek | `36f70529-254c-40b2-8b93-fbb5693df68a` | greek food platter | greek taverna interior | mediterranean meze spread |
| Chinesisch | Chinese | `482d6624-a071-447e-b503-cdfbbdca8cd1` | chinese cuisine stir fry | chinese restaurant interior | asian noodle dish |
| Japanisch | Japanese | `ae5cdad6-7a43-448f-a01f-c33040dd1a21` | japanese ramen bowl | japanese sushi platter | japanese izakaya interior |
| Thailandisch | Thai | `b02b28bc-b0ef-44f0-9df0-b8c737c5f253` | thai curry dish | thai street food vendor | thai restaurant interior |
| Mediterran | Mediterranean | `d69e5008-2d9e-483c-86b7-1da2d81f9ff8` | mediterranean food spread | mediterranean restaurant terrace | olive oil fresh herbs |
| Indisch | Indian | `dd99f21b-74ab-4abc-b1ed-c7099be4655d` | indian curry biryani | indian restaurant interior | tandoori naan bread |
| Pakistanisch | Pakistani | `9eef8348-dd0f-4abe-80c4-66e177bfa0e0` | pakistani cuisine biryani | pakistani food platter | karahi dish pakistani |

### Dish Types (11) — Kebab/Döner excluded (not in DB)

| name_de | name_en | category_id | query_1 | query_2 | query_3 |
|---|---|---|---|---|---|
| Pizza | Pizza | `cd11b30c-cad9-4833-b50f-7dd8437fa5e9` | pizza fresh baked | pizzeria restaurant interior | neapolitan pizza oven |
| Burger | Burger | `486dad69-d36b-44f7-adb8-16bb0fe95763` | gourmet burger fries | burger restaurant interior | smashed burger grill |
| Sushi | Sushi | `428d18d2-b016-4b26-93e2-5a1c627945d7` | sushi platter fresh | japanese sushi chef | sushi restaurant counter |
| Pasta / Nudeln | Pasta | `51a40e1d-fbce-418a-ab0e-ad695fd44a15` | fresh pasta handmade | pasta dish italian | pasta restaurant kitchen |
| Tacos / Wraps | Tacos / Wraps | `d93f316c-c786-4310-87b8-e6bd2f01b887` | mexican tacos spread | wrap sandwich fresh | burrito bowl ingredients |
| BBQ / Grill | BBQ / Grill | `4a0979fb-61ca-46d6-9af4-3a76e0ede96b` | bbq grill platter | barbecue smoke meat | outdoor grilling food |
| Fried Chicken | Fried Chicken | `8d95591e-0228-4164-9603-d08d724b60b4` | fried chicken crispy | chicken wings platter | fried chicken restaurant |
| Suppen | Soups | `edc62206-513d-4d34-bf15-8ecbf21b2ff8` | hearty soup bowl | soup kitchen warm | ramen broth closeup |
| Bowl | Bowls | `f901958d-f285-4c70-9bcf-217fd42243e6` | healthy food bowl | buddha bowl colorful | poke bowl fresh |
| Sandwiches | Sandwiches | `2c806e77-2b96-4126-9551-2789e17d5fd8` | gourmet sandwich deli | fresh sandwich ingredients | sandwich shop counter |
| Nudelsuppe (Pho/Ramen) | Noodle Soup | `d9e09fbc-9b17-4ef1-b057-14c6d8fbf543` | ramen noodle soup | pho vietnamese bowl | noodle soup steaming |

### Dietary (2)

| name_de | name_en | category_id | query_1 | query_2 | query_3 |
|---|---|---|---|---|---|
| Vegetarisch | Vegetarian | `2ee3929e-acc4-44eb-b93c-7714496927a9` | vegetarian food spread | colorful vegetables fresh | plant based meal bowl |
| Vegan | Vegan | `7acbb5e6-703c-4fd1-8f2f-676d2f0f2db9` | vegan food bowl | plant based cuisine | vegan ingredients fresh |

### Meal Types (4)

| name_de | name_en | category_id | query_1 | query_2 | query_3 |
|---|---|---|---|---|---|
| Fruehstueck / Brunch | Breakfast / Brunch | `a798fc0d-1160-4773-8a93-7a21266921b0` | breakfast brunch spread | brunch table setting | cafe breakfast sunny |
| Desserts / Eis | Desserts / Ice Cream | `0f9ed256-d3ef-47aa-991c-d2bc4119219d` | dessert platter sweets | ice cream scoops colorful | pastry display bakery |
| Salate | Salads | `e2c82e56-ae9c-40fc-ab7a-d002f446133f` | fresh salad bowl | garden salad colorful | salad bar display |
| Kuchen / Cafe | Cake / Cafe | `678e44ce-521f-4397-bb0b-018176622a59` | cake display bakery | cafe interior cozy | coffee and cake table |

### Store Types (7)

| name_de | name_en | category_id | query_1 | query_2 | query_3 |
|---|---|---|---|---|---|
| Elektronik | Electronics | `ed7d9c57-0ab2-419d-8735-b3cf82f82ddd` | electronics store display | gadget store interior | technology shop modern |
| Haushalt & Wohnen | Household & Living | `88a8d687-f670-4bee-9d16-f762f2f07fa8` | home decor display | household goods store | interior design showroom |
| Kosmetik & Pflege | Cosmetics & Care | `5a8b8bb7-502f-43bc-9819-539d53369c82` | cosmetics store display | skincare products natural | beauty shop interior |
| Buecher & Medien | Books & Media | `7da24ba3-8fb1-4fbb-a113-8f00b011f189` | bookstore interior cozy | bookshelf display library | bookshop reading nook |
| Geschenke & Deko | Gifts & Decor | `48fa5d40-bd93-444c-b32a-d929dda82fad` | gift shop display | home decor store | artisan craft market |
| Baby & Kind | Baby & Child | `90c2c997-2d06-454b-84ae-2afe5ec7c5af` | baby store display | childrens clothing shop | nursery decor items |
| Schreibwaren & Buero | Stationery & Office | `12671354-0c9a-4312-9648-7556d81d9e97` | stationery store display | office supplies organized | art supply shop |

### Others (5)

| name_de | name_en | category_id | query_1 | query_2 | query_3 |
|---|---|---|---|---|---|
| Amerikanisch | American | `a5c07a6b-0de8-45e8-8c01-2b3b696e6d2e` | american diner interior | classic burgers fries | american comfort food |
| Lebensmittel | Groceries | `6507aea0-cff2-4804-82c6-422e57fbeaaa` | grocery store fresh produce | supermarket aisle display | halal grocery market |
| Baeckerei | Bakery | `062f1303-f3e4-4975-bc5a-c0f51e75701d` | bakery fresh bread | bakery shop display | artisan bread oven |
| Uigurisch | Uyghur | `11ebc505-64bb-4021-8ff9-13c4e634827e` | uyghur cuisine laghman | central asian food | samsa uyghur pastry |
| Desserts & Suessspeisen | Desserts & Sweets | `eea06ee4-2718-4bfa-b1c0-09036d1fd891` | middle eastern sweets | baklava dessert tray | turkish delight display |

---

## Batch Plan

### Query Count

| Group | Categories | Queries (3/category) |
|---|---|---|
| New + uncovered | 36 | 108 |
| Stale pool UUIDs to fix | 11 | 33 |
| **Total** | **47** | **141** |

### Recommended Batching

Unsplash demo tier limit: **50 requests/hour**, with a 1400ms delay between calls.

The existing script (`scripts/enrich-images.ts:160`) enforces `≤45` calls per run (max 15 categories at 3 queries each).

**Plan**: Run in **4 sessions**, spaced ≥1 hour apart. Each session curates **12 categories** (36 queries, well within the 45-query safety limit).

| Session | Categories | Queries | Categories to include |
|---|---|---|---|
| 1 | 12 | 36 | Cuisines (9) + Dietary (2) + Meal: Fruehstueck/Brunch |
| 2 | 12 | 36 | Dish Types: Pizza, Burger, Sushi, Pasta, Tacos, BBQ, Fried Chicken, Soups, Bowls, Sandwiches, Noodle Soup (11) + Meal: Desserts/Eis |
| 3 | 12 | 36 | Store Types (7) + Others: American, Groceries, Bakery, Uyghur, Desserts & Sweets |
| 4 | 11 | 33 | Stale pool fixes (11 legacy categories with new UUIDs) |

**Timing**: Each batch of 12 categories × 3 queries × ~1.4s delay ≈ **50 seconds** for API calls, plus image download/upload time. Schedule sessions 1 hour apart to respect rate limit.

**Command pattern** (after pool UUIDs are added to `CATEGORY_IMAGE_POOL`):
```bash
npx tsx scripts/enrich-images.ts --curate --write --per-category 5 --categories <comma-separated-uuids>
```

---

## Open Questions

1. **Production vs DEV UUIDs**: The DEV Supabase project was queried. Do production/staging databases have the same UUIDs? If they were seeded from the same migrations, yes. If they have different histories, the UUIDs may differ and the pool needs per-environment awareness.
2. **Kebab / Doener**: Should this category be force-inserted (ignore the WHERE NOT EXISTS) or should "Wraps, Doener & Falafel" serve both purposes?
3. **Legacy duplicate cleanup**: The DB has many overlapping pairs (Pizza & Flammkuchen vs Pizza, Salate & Bowls vs both Salate and Bowl, etc.). Should these be consolidated?

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Do production UUIDs match DEV? | No production DB access from local env. | Query production Supabase via dashboard or deploy a one-off script. | DevOps |
| 2 | Kebab/Doener — insert or merge? | Blocked by WHERE NOT EXISTS against Wraps, Doener & Falafel. | Decide: (a) remove the blocking condition from migration, (b) merge into Wraps/Doener/Falafel, or (c) add a new migration with a fixed UUID. | PM |
| 3 | Pool UUID staleness should be fixed atomically with new entries | 11 pool entries point to non-existent UUIDs. | Update `CATEGORY_IMAGE_POOL` to replace stale UUIDs with current DB UUIDs in the same PR that adds new categories. | Implementer |
| 4 | Vegetarian/Vegan `category_type` is NULL in DEV | Migration 100 may not have been applied to DEV. | Verify migration status on DEV; re-apply if needed. | DevOps |
| 5 | Test at `image-enrichment.test.ts:18` uses stale Turkish UUID | Test passes because it checks pool contents, not DB alignment. | Update test to use a verified DB UUID (e.g., Afghan `8204a370`) or add DB-integration test. | QA |

---

## Analysis Recommendations

1. **Fix pool staleness first**: The 11 stale UUIDs make the enrichment system silently broken for those categories. Replace them with the current DB UUIDs in the same PR.
2. **Add all 36 new UUIDs** to `CATEGORY_IMAGE_POOL` to enable curation.
3. **Curate in 3-4 batches** following the batch plan above.
4. **Consider a name-based fallback**: Instead of hardcoding UUIDs, the pool could use `category_type + name_en` as a lookup key, which would survive DB reseeds. Alternatively, future migration inserts should use fixed UUIDs (like American and Groceries do) instead of `gen_random_uuid()`.
5. **Fix the test** to avoid using a known-stale UUID as the "happy path" test case.
