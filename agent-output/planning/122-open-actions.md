---
ID: 122
Origin: 122
UUID: a3f7c82d
Status: Closed
---

# Open Actions 122: Deferred Post-Deploy Follow-ups

## Summary

Production Storage image upload (DF-1) was deferred from Stage 1/Stage 2 due to worktree credential constraint (dev `.env.local` only; prod service role key unavailable in worktree). The production JSONB is correctly populated with production Storage URLs. Only the actual WebP file upload to production Storage remains.

Release context: v0.12.6 released 2026-05-03, PR #208 merged, tag v0.12.6 pushed.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to Close | Status |
|------|-------|-------------|------------------|--------|
| Upload 18 WebP food images to production `category-images` Storage bucket (Turkish: 8, Arabic: 6, Italian: 4) | Operator / DevOps | Before/at production deployment promotion | Script exits 0; all 18 files accessible at production Storage URLs listed in JSONB | **Closed 2026-05-03T20:00Z** |

## Command to Run

```bash
# From repo root with production credentials:
SUPABASE_URL=https://rdtdtcfntopcxcigkqoq.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key> \
node scripts/upload-category-images.mjs
```

The script is idempotent — safe to re-run. It mirrors WebP files from the dev bucket public URL; no local files required.

## Verification SQL (run after upload)

```sql
SELECT bucket_id, name, created_at
FROM storage.objects
WHERE bucket_id = 'category-images'
  AND name LIKE '%webp'
ORDER BY name;
```

Expected: 18 rows (8 Turkish + 6 Arabic + 4 Italian).

## Impact Until Resolved

Turkish, Arabic, and Italian category providers display the ornament placeholder image instead of food photography. No error is thrown — graceful degradation confirmed in QA (TDD test 5/7).

## Changelog

| Date (UTC)        | Agent  | Change                                                     |
| ----------------- | ------ | ---------------------------------------------------------- |
| 2026-05-03T22:30Z | devops | Created tracker from DF-1 deferred production Storage upload |
| 2026-05-03T20:00Z | devops | DF-1 CLOSED — 18 WebP files uploaded via Edge Function `upload-category-images`; verified in `storage.objects` (18 rows); production JSONB URLs now live |
