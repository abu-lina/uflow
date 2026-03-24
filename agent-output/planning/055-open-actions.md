---
ID: 055
Origin: 055
UUID: b7e4a3f1
Status: Active
---

# Open Actions 055: Deferred Post-Deploy Follow-ups

## Summary

Plan 055 was committed locally for v0.8.25 with two deferred operational items that cannot be completed without a live deployed environment:

1. **Migration 061 application** — the production database `category_images` field still points to the broken URL until migration 061 is manually applied. The app-side fallback (`onError`) ships with the app deploy, but the data fix requires the migration.
2. **Post-deploy browser verification** — no live browser-backed Supabase environment is available in this worktree; visual confirmation requires the deployed app + applied migration.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to Close | Status |
|---|---|---|---|---|
| Apply `supabase/migrations/061_fix_clothing_category_image_reference.sql` to production database | DevOps | Before/alongside app deploy (Stage 2) | psql / Supabase SQL editor: `RETURNING` confirms 1 row, `name_de = 'Kleidung & Mode'`, `category_images` contains `clothing.jpg` URL | Open |
| Post-deploy browser smoke test: Clothing & Fashion renders `clothing.jpg` with no `/_next/image` 400 | QA Lead / DevOps | Immediately after deploy + migration | Browser Network tab shows 200 for `clothing.jpg`; no 4xx for Clothing & Fashion category row; Health & Sports still renders correctly | Open |
| Upload a proper Clothing & Fashion branded image to replace generic `clothing.jpg` | Product Owner | Next content sprint / when brand assets available | New image URL returns HTTP 200 and passes visual review; `category_images` updated via new migration | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-24T13:00Z | devops | Created tracker from deferred UAT validations and deployment pre-requisites |
