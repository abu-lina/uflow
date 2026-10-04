---
ID: 055
Origin: 055
UUID: b7e4a3f1
Status: Planned
---

# 055 — Category Gallery Image HTTP 400 — Root Cause Analysis

## Changelog

| Date       | Author   | Change                          |
| ---------- | -------- | ------------------------------- |
| 2026-03-24 | Analyst  | Initial analysis — root cause verified |
| 2026-03-24 | Planner  | Status updated to Planned; handed off to plan artifact | Analysis converted into implementation-ready plan |

## Value Statement and Business Objective

Category gallery images on the home page are a key visual element that communicates immediacy and community activity to users. Broken image placeholders in the "Clothing & Fashion" row degrade trust and perceived quality. Fixing this ensures all categories present professionally on the landing page.

## Objective

Determine why `/_next/image?url=https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/a65-design-2NLeXS3NR5E-unsplash.jpg&w=384&q=75` returns HTTP 400, and why "Clothing & Fashion" shows broken placeholders while "Health & Sports" renders correctly.

## Context

- **Version**: Next.js 15.5.9
- **Supabase project**: `rdtdtcfntopcxcigkqoq` (production)
- **Bucket**: `category-images` (public, 50 MB limit, no MIME restrictions, 0 RLS policies)
- **Component chain**: `CategoryGallerySection` → `UnifiedGallery` → `useImageFallback` hook → `next/image`

### Image Resolution Pipeline

```
useImageFallback {
  1. Fetch entity images (providers/community_services table → *_images column)
  2. If < limit (3): append category_images URLs from categories.category_images JSONB
  3. Fill remaining with /images/placeholder.jpg
}
→ UnifiedGallery renders <Image src={url} /> for each
→ next/image proxies via /_next/image?url=<upstream>&w=<w>&q=<q>
```

## Methodology

1. Read `next.config.js` `images.remotePatterns` to check domain allow-listing.
2. Traced rendering chain: `CategoryGallerySection` → `UnifiedGallery` → `useImageFallback` → `parseCategoryImages`.
3. Read SQL seed data (`sync-categories-dev-to-prod.sql`) to identify stored URLs per category.
4. **POC**: Direct `curl` to each category image URL in the production Supabase storage bucket.

## Findings

### Verified: Root Cause — Image File Does Not Exist in Storage

The file `a65-design-2NLeXS3NR5E-unsplash.jpg` is **not present** in the `category-images` Supabase storage bucket.

**Evidence** (cURL against production):

| File                                  | HTTP Status | Content-Type       | Exists? |
| ------------------------------------- | ----------- | ------------------ | ------- |
| `a65-design-2NLeXS3NR5E-unsplash.jpg` | **400**     | application/json   | **No**  |
| `community_services.jpg`              | 200         | image/jpeg         | Yes     |
| `sports.jpg`                          | 200         | image/jpeg         | Yes     |

Supabase returns HTTP 400 with body:
```json
{"statusCode":"404","error":"not_found","message":"Object not found"}
```

Next.js `/_next/image` optimizer fetches this upstream URL, receives a non-image JSON error response, and cannot process it — so it returns HTTP 400 to the browser client.

### Verified: `remotePatterns` Is NOT the Blocker

```js
// next.config.js → images.remotePatterns
{ protocol: 'https', hostname: '**.supabase.co' }
```

This pattern correctly matches `rdtdtcfntopcxcigkqoq.supabase.co`. Proof: `sports.jpg` from the same hostname/bucket loads successfully via `/_next/image`.

### Verified: Why "Health & Sports" Works

"Health & Sports" works because either:
- It has ≥ 3 approved provider entity images (priority 1 in `useImageFallback`), so category fallback is never reached, **or**
- Its category fallback (`sports.jpg`) exists in storage (confirmed HTTP 200)

### Verified: Why "Clothing & Fashion" Breaks

"Clothing & Fashion" has < 3 entity images → `useImageFallback` falls back to `category_images` → URL points to `a65-design-2NLeXS3NR5E-unsplash.jpg` → file not found → HTTP 400 → broken placeholder.

## Root Cause

**The image file `a65-design-2NLeXS3NR5E-unsplash.jpg` was either never uploaded to the `category-images` storage bucket, or was deleted.** The `categories.category_images` JSONB column references a non-existent object.

This is a data-level issue, not a code-level issue. The `next.config.js` configuration is correct.

## System Weaknesses

### 1. No image error handling in UnifiedGallery (Code)
- `UnifiedGallery` uses `<Image src={url} />` without an `onError` handler.
- When the upstream image returns an error, the component shows a broken image rather than gracefully falling back to a placeholder.
- **Risk**: Any category with a stale or broken image URL will silently show broken placeholders.

### 2. No URL validation before rendering (Code)
- `parseCategoryImages()` and `useImageFallback()` trust all stored URLs blindly.
- There is no check that the upstream URLs are reachable or return valid image content.
- **Risk**: Stale references (renamed/deleted storage objects) break silently.

### 3. No migration for `category_images` column (Process)
- The `category_images` JSONB column on `categories` table has no Supabase migration.
- It was added and populated via manual SQL (`sync-categories-dev-to-prod.sql`).
- **Risk**: Schema drift between environments; no audit trail for data changes.

### 4. Inconsistent category image coverage (Data)
- Of the categories in `sync-categories-dev-to-prod.sql`, only 3 of ~10 have `category_images` URLs; the rest are `NULL`.
- Categories with `NULL` category_images fall through to placeholder without error, but categories with broken URLs show broken images.

## Instrumentation Gaps

| What                                        | Type   | Purpose                                                      |
| ------------------------------------------- | ------ | ------------------------------------------------------------ |
| `onError` callback on `<Image>` components  | Normal | Log broken image URLs for monitoring; swap in placeholder    |
| Storage object existence check at build/seed | Debug  | Validate all `category_images` URLs resolve before deploy    |

## Analysis Recommendations (Next Steps)

1. **Upload the missing image** to the `category-images` bucket, OR **update the `category_images` JSONB** in the `categories` table to reference an existing file. This is the immediate fix.
2. **Add `onError` handler** to `<Image>` in `UnifiedGallery` — swap broken images to `/images/placeholder.jpg` to prevent silent visual breakage.
3. **Create a migration** for the `category_images` column to formalize the schema.
4. **Validation script** (optional, debug-level): a script that checks all `category_images` URLs in the DB return HTTP 200 — useful before deployments.

## Open Questions

1. **Was `a65-design-2NLeXS3NR5E-unsplash.jpg` ever uploaded?** If so, when was it deleted and by whom? (Supabase audit logs may clarify.)
2. **Is the original image available locally or in version control?** Check if there's a source image in `imports/` or `public/` that can be reuploaded.
3. **Are other categories with `NULL` category_images intentional or pending?** If pending, which images should be assigned?
