---
ID: 052
Origin: 052
UUID: b4e91c3f
Status: Planned
---

# Analysis 052 — JoinHalal Import Upsert with Unique ID

## Changelog

| Date       | Change                              |
| ---------- | ----------------------------------- |
| 2026-03-22 | Initial analysis created            |
| 2026-03-22 | Status → Planned; closed by planner |

## Value Statement and Business Objective

Enable the JoinHalal import pipeline to **update existing providers** on re-import instead of creating duplicates, by identifying a stable unique identifier from the JoinHalal source data and implementing a Postgres-level upsert (`ON CONFLICT ... DO UPDATE`) strategy.

## Objective

1. Identify the best unique identifier candidate from the JoinHalal scraped data.
2. Determine what schema changes are needed to support upsert on the `providers` table.
3. Recommend which fields should be updated on conflict vs. preserved.
4. Document the parser extraction path for the identifier.

## Context

- Plans 047/048/051 built the current JoinHalal import pipeline (dry-run + CLI write).
- Write mode currently uses `.insert()` — pure INSERT with no conflict handling.
- Client-side deduplication via `makeProviderKey(name, city)` **skips** existing providers entirely — no update path exists.
- The `import_source_url` field is tracked in TypeScript types but **stripped before DB insert** (not a real column).
- The `providers` table has **no column** for external source identifiers.

## Methodology

1. Examined JoinHalal page HTML structure (Schema.org, Voxel vxconfig).
2. Read existing parser/import code: `joinhalal-parser.ts`, `joinhalal.ts`, `import-joinhalal.ts`.
3. Reviewed test fixtures containing real JoinHalal data structures.
4. Examined all provider-related migration files and the `uat-complete-schema.sql`.
5. Cross-referenced the postgres-best-practices skill for upsert patterns.

## Findings

### Finding 1: JoinHalal Unique ID Candidates (Verified)

Four potential unique identifiers exist in JoinHalal page data:

| Candidate                      | Source                           | Example                                                                        | Stability                         | Compactness         |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------------------------ | --------------------------------- | ------------------- |
| **`vxconfig.current_post.id`** | `<script class="vxconfig">` JSON | `24043`                                                                        | **Immutable** (WordPress PK)      | Best (integer)      |
| URL slug                       | Page URL path segment            | `etem-burger-steak-muenchen-24043`                                             | High (slug editable, but rare)    | Medium (string)     |
| Full page URL                  | `import_source_url`              | `https://joinhalal.com/locations/restaurant/etem-burger-steak-muenchen-24043/` | Medium (URL structure can change) | Worst (long string) |
| `mainEntityOfPage['@id']`      | Schema.org JSON-LD               | `...etem-burger-steak-muenchen-24043/#webpage`                                 | Medium (tracks URL)               | Bad                 |

**Evidence**: From test fixture at `src/__tests__/utils/joinhalal-parser.test.ts:62`:

```html
<script type="text/json" class="vxconfig">
  {
    "current_post": {
      "exists": true,
      "id": 24043,
      "display_name": "Etem Burger &amp; Steak | München"
    }
  }
</script>
```

**Determination**: The `current_post.id` is the WordPress/Voxel post ID — an integer primary key that **never changes** across slug edits, category changes, or URL rewrites. It is the most stable and compact identifier available.

### Finding 2: Parser Already Reads the `vxconfig` Object (Verified)

The existing `extractDisplayNameFromHtml()` function in `joinhalal-parser.ts:100-113` already parses the `vxconfig` script tag and reads `current_post.display_name`. The `current_post.id` field is **right next to it** in the same JSON object — no additional HTML parsing is needed.

Current code reads:

```typescript
const config = JSON.parse(scriptMatch[1]) as {
  current_post?: { display_name?: string };
};
const name = config?.current_post?.display_name;
```

A new function `extractJoinHalalPostId(html)` (or extending the type to include `id?: number`) would extract `current_post.id` from the same JSON.

### Finding 3: Providers Table Has No External ID Column (Verified)

The `providers` table schema (from `sql/uat-complete-schema.sql:83-106`) contains:

- `id UUID PRIMARY KEY` — internal PK
- `provider_id UUID UNIQUE` — internal business key
- No `import_source`, `external_id`, or `import_source_url` column

The `import_source_url` field in the TypeScript `ProviderRecord` type is **not a real DB column** — it is stripped before insert:

```typescript
// scripts/import-joinhalal.ts:648
const cleanBatch = batch.map(({ import_source_url: _ignored, ...rest }) => rest);
```

This was also flagged in code review 047: "import_source_url in ProviderUpsert type is never persisted."

### Finding 4: Current Write Path Is Insert-Only (Verified)

The CLI write mode at `scripts/import-joinhalal.ts:652`:

```typescript
const { error } = await supabase.from('providers').insert(cleanBatch);
```

Uses `.insert()` with no `.upsert()` or `onConflict` parameter. Client-side dedup via `makeProviderKey(name, city)` prevents duplicate creation but provides no update capability.

### Finding 5: Upsert Column Design (High-Confidence Inference)

Two options for the new column(s):

| Option           | Columns                                       | Constraint                                | Stored Value Example     | Pros                                              | Cons                                             |
| ---------------- | --------------------------------------------- | ----------------------------------------- | ------------------------ | ------------------------------------------------- | ------------------------------------------------ |
| **A: Composite** | `import_source TEXT`, `import_source_id TEXT` | `UNIQUE(import_source, import_source_id)` | `'joinhalal'`, `'24043'` | Multi-source extensible, clean queries per source | Two columns                                      |
| **B: Single**    | `import_source_id TEXT`                       | `UNIQUE(import_source_id)`                | `'joinhalal:24043'`      | Simpler, one column                               | Compound key parsing needed for source filtering |

**Recommendation**: **Option A** (composite). The overhead is minimal (two nullable TEXT columns), and it allows `WHERE import_source = 'joinhalal'` queries without string parsing. Future import sources (Google Maps, Lieferando, etc.) would get their own `import_source` value with independent ID namespaces.

Both columns are `NULL` for organically-created (user-submitted) providers, so the unique constraint only applies to imported records.

### Finding 6: Upsert Field Strategy (High-Confidence Inference)

Fields to **update** on conflict (source data refreshes these):

- `provider_name` — business may rename
- `provider_description` — description may change
- `category_id` — recategorization
- `address_street`, `address_zip`, `address_city`, `address_country` — address changes
- `contact_email`, `contact_phone` — contact info updates
- `social_website`, `social_instagram` — social links
- `offers_ids` — Speisen catalog may evolve
- `updated_at` — track last refresh time

Fields to **preserve** on conflict (admin/user data takes precedence):

- `review_status` — admin may have approved/rejected
- `review_feedback` — admin moderation notes
- `provider_owner_id` — owner may have claimed
- `user_created_id` — original creator attribution
- `created_at` — original creation timestamp
- `provider_images` — user/admin may have uploaded images
- `barakah_effects` — community-curated data
- `needs_ids` — community-curated data
- `show_address` — admin-controlled visibility

## Analysis Recommendations

1. **Verify JoinHalal post ID availability at scale**: Run a dry-run import with logging to confirm `current_post.id` is present on all (or nearly all) JoinHalal pages. The test fixture shows it for one page; full-coverage verification across all 5 sitemaps would confirm.

2. **Verify post ID uniqueness**: Confirm that the numeric ID from `vxconfig` matches the URL slug suffix (e.g., URL `...-24043/` ↔ `current_post.id: 24043`). If they always match, the URL slug can serve as a fallback extraction path when vxconfig is absent.

3. **Test upsert behavior with RLS**: The CLI uses `service-role` which bypasses RLS, but the dry-run API uses the admin API route with `getUserFromCookie`. Verify that the upsert `ON CONFLICT` clause works correctly through both access paths.

## Open Questions

1. **Post ID extraction coverage**: What percentage of JoinHalal pages have the `vxconfig` script tag with `current_post.id`? (Expected: 100%, but not verified at scale.)
2. **Should `show_address` be preserved or updated?** Currently set to `true` on all imports; if an admin sets it to `false`, re-import should respect that. Listed as "preserve" above.
3. **Should `import_source_url` become a real column?** Storing the full source URL alongside the post ID adds traceability but is redundant with `import_source + import_source_id`. Could be useful for operator debugging.
