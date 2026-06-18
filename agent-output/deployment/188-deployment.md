---
ID: 188
Origin: 188
UUID: f4a8b7c6
Status: Committed
---

# Deployment: Plan 188

## Changelog
- `src/components/providers/ProviderCard.tsx` — Added `hidden sm:flex` to moderation button wrapper div to hide admin Approve/Reject buttons on mobile (<640px viewport)
- `src/__tests__/components/ProviderCard.test.tsx` — Updated tests to reflect mobile visibility behavior

## Summary
Bugfix: The admin moderation buttons (Approve/Reject) in ProviderCard were rendering full-width on mobile screens, dominating the card layout. Added `hidden sm:flex` classes to the button wrapper div so the buttons are hidden on viewports below 640px while remaining visible on desktop and tablet.

## Branch
`fix/188-mobile-admin-buttons`

## Commit
`87c4a242`

## PR
https://github.com/abu-lina/uflow/pull/266

## Plan Status
Committed
