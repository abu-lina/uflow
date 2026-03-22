---
ID: 053
Origin: 053
UUID: b7e4a1c9
Status: Planned
---

# 053 — Offers Mapping & vxconfig Parser Analysis

## Changelog

| Date       | Change                                      |
| ---------- | ------------------------------------------- |
| 2026-03-22 | Initial analysis of offers mapping + vxconfig bug |
| 2026-03-22 | Planner created Plan 053 and closed analysis | 

## Value Statement and Business Objective

Imported JoinHalal providers must have correct `offers_ids` (food categories) and valid `import_source` / `import_source_id` (upsert identity) for the platform to display accurate provider data and support re-imports without duplicates.

## Objective

Determine whether:
1. The **vxconfig parser bug** (already identified) causes NULL `import_source`/`import_source_id`
2. Offers (Speisen) are **properly mapped** against existing DB offers
3. New offers are **created automatically** when Speisen terms have no DB match
4. Mapped `offers_ids` are **correctly persisted** to the `providers` row

---

## Findings

### Finding 1: vxconfig Parser Bug — VERIFIED (Root Cause for NULL identity keys)

**Status: Verified**

`parseVxConfig()` in `joinhalal-parser.ts:325` uses `html.match()` which returns only the **first** regex match. Real JoinHalal pages have **3** `<script class="vxconfig">` blocks:

| Block | Size   | Has `current_post`? | Content                                    |
| ----- | ------ | ------------------- | ------------------------------------------ |
| 0     | ~797   | **No**              | Search/filter config (`post_types`, `keywords`) |
| 1     | ~856   | **No**              | Similar search config                      |
| 2     | ~2587  | **Yes**             | Timeline config with `current_post.id` and `display_name` |

**Evidence**: Live curl test against `echte-baerliner-augsburg-oberhausen-26548`:
- `html.match()` captures Block 0 → no `current_post` → returns `null`
- `extractJoinHalalPostId(html)` returns `null`
- `import_source` set to `null` (conditional: `postId ? 'joinhalal' : null`)
- `import_source_id` set to `null`

**Impact**: ALL imported providers go through the insert-only fallback path. The upsert RPC is never called. Re-imports create duplicates.

**Fix required**: Change `parseVxConfig()` to iterate all vxconfig blocks (using `matchAll()`) and return the first one containing `current_post`.

### Finding 2: Speisen → offers_ids Mapping — WORKING CORRECTLY

**Status: Verified**

The Speisen extraction and offer resolution pipeline works correctly through 4 stages:

#### Stage 1: Schema.org Extraction ✅
`extractSchemaOrgFromHtml()` correctly handles the `@graph` wrapper. Extracts node 0 (the business entity) which contains `additionalProperty` array.

Live test (`ECHTE BÄRLINER` page):
```
additionalProperty:
  - name: "Halal-Merkmale", value: "Türkisch"
  - name: "Speisen", value: "Döner, Falafel, Pommes"
  - name: "Lieferservice", value: "https://wolt.com/..."
```

#### Stage 2: Speisen Parsing ✅
`extractSpeisen(schema)` finds the `additionalProperty` entry with `name === 'Speisen'`, splits the comma-delimited value, trims whitespace, and deduplicates.

Result: `['Döner', 'Falafel', 'Pommes']`

#### Stage 3: Offer Resolution ✅
`resolveOfferIds(speisen, offers)` performs case-insensitive lookup against the offers catalog loaded from DB (`SELECT offer_id, name_de FROM offers`).

- Each Speisen term is lowercased and matched against `offers.name_de.toLowerCase()`
- Matched terms → `matchedIds[]` (offer UUIDs)
- Unmatched terms → `unmatchedSpeisen[]` (reported in dry-run)
- Deduplication via `Set` prevents duplicate offer IDs

#### Stage 4: Provider Record ✅
`offers_ids: matchedIds` is set on the provider record. The insert or upsert RPC writes these UUIDs into the `providers.offers_ids` column (UUID array with GIN index).

**Conclusion**: If the DB offers table contains entries matching the Speisen terms (case-insensitive on `name_de`), the mapping works. The user's Supabase data showed some providers with populated `offers_ids` arrays, confirming this path works.

### Finding 3: Non-Existent Offers Are NOT Auto-Created

**Status: Verified**

**Offers that don't exist in the DB `offers` table are silently dropped.** There is no auto-creation logic anywhere in the import pipeline:

1. `resolveOfferIds()` returns unmatched Speisen in `unmatchedSpeisen[]`
2. The dry-run path tracks them in `unmappedOfferEntries[]` and reports "Unmapped Speisen (top 10)" in the console
3. The write path in `scripts/import-joinhalal.ts` **does not collect or report** unmatched Speisen — it destructures only `{ matchedIds }`, discarding `unmatchedSpeisen`
4. **No code path creates new offer rows** for unmatched terms

**Impact**:
- If a provider's Speisen are "Döner, Sushi, Ramen" and only "Döner" exists in the offers table, the provider gets `offers_ids: [döner-uuid]` — Sushi and Ramen are lost
- The dry-run reports these gaps, but the write path does not
- The operator has no visibility into what was dropped during a real `--write` execution

### Finding 4: Upsert RPC Correctly Handles offers_ids

**Status: Verified**

Migration 063's `upsert_joinhalal_providers()` RPC handles `offers_ids` correctly:

- **INSERT**: `offers_ids` is extracted from JSONB with safe type coercion: `ARRAY(SELECT (jsonb_array_elements_text(elem->'offers_ids'))::UUID)` with empty-array fallback
- **UPDATE** (on conflict): `offers_ids = EXCLUDED.offers_ids` — source-controlled field, updated on re-import
- **Admin safety**: `offers_ids` is in the DO UPDATE SET allowlist (not admin-controlled), which is correct — offer mappings should update when the source page changes

### Finding 5: Write Path Discards Unmapped Speisen Info

**Status: Verified**

Asymmetry between dry-run and write paths:

| Path      | Collects `unmatchedSpeisen`? | Reports? |
| --------- | ----------------------------- | -------- |
| Dry-run   | ✅ Yes → `unmappedOfferEntries[]` → console report | ✅ Yes |
| Write CLI | ❌ Only captures `matchedIds`, ignores `unmatchedSpeisen` | ❌ No |

In `scripts/import-joinhalal.ts:343`:
```typescript
const { matchedIds } = resolveOfferIds(speisen, offers);
// unmatchedSpeisen is destructured away — silently lost
```

---

## Root Cause Summary

| Issue | Severity | Root Cause | Status |
| ----- | -------- | ---------- | ------ |
| `import_source` / `import_source_id` always NULL | **CRITICAL** | `parseVxConfig()` matches only first of 3 vxconfig blocks; first block has no `current_post` | Verified |
| `extractDisplayNameFromHtml()` returns null | MEDIUM | Same vxconfig bug; masked by Schema.org name fallback | Verified |
| Non-existent offers not auto-created | **BY DESIGN** | Only known offers are matched; unmatched terms reported in dry-run only | Verified |
| Write path drops unmatched Speisen silently | LOW | Destructuring discards `unmatchedSpeisen`; no write-mode reporting | Verified |

---

## System Weaknesses

### Architecture
1. **Single-match parser for multi-block HTML**: `parseVxConfig()` assumes one vxconfig block per page — incorrect for the Voxel theme which emits multiple configuration blocks.
2. **No offer auto-creation**: The import pipeline is match-only. Providers coming from a source with novel food terms lose offer associations. This is a deliberate design choice but limits data completeness.

### Code
1. **Asymmetric reporting**: Dry-run reports unmatched Speisen; write mode does not. Operator loses visibility.
2. **Test fixture gap**: Test HTML uses a single vxconfig block with `current_post` — never caught the multi-block issue.

### Process
1. **No live-page integration test**: All tests use synthetic HTML fixtures. A single curl-based test against a real page would have caught the multi-block vxconfig issue immediately.

---

## Instrumentation Gaps

| What to Log | Level | Rationale |
| ----------- | ----- | --------- |
| Count of vxconfig blocks found per page | **Debug** | Would immediately surface the multi-block scenario |
| Unmatched Speisen per provider during `--write` | **Normal** | Operators need to know what offers are missing from catalog |
| Total matched vs unmatched offers in write report | **Normal** | Summary stat for data quality assessment |

---

## Analysis Recommendations (Next Steps Only)

1. **Fix `parseVxConfig()`**: Iterate all vxconfig blocks using `matchAll()`, return first with `current_post`. This resolves both `import_source` and `extractDisplayNameFromHtml` bugs.
2. **Update test fixtures**: Add multi-block vxconfig HTML matching real page structure.
3. **Add write-path Speisen reporting**: Collect and report unmatched Speisen in write mode, not just dry-run.
4. **Decide on offer auto-creation policy**: If desired, the import could `INSERT INTO offers (name_de) VALUES (...)` for unmatched Speisen before mapping them.  This is a product decision, not a bug.
5. **Data cleanup**: Before re-import with fix, delete existing NULL-keyed bot rows to prevent duplicates:
   ```sql
   DELETE FROM providers
   WHERE user_created_id = '00000000-0000-0000-0000-000047000001'
     AND import_source IS NULL;
   ```

---

## Open Questions

1. **Should unmatched Speisen auto-create offers?** Currently by-design they don't. Product decision needed.
2. **What is the current offers catalog coverage?** How many unique Speisen terms exist across JoinHalal pages vs. how many are in the `offers` table? A dry-run with `--limit all` would reveal this.
3. **Are the existing imported providers' `offers_ids` correct?** They contain valid UUIDs for matched terms, but may be incomplete if Speisen terms were unmatched.
