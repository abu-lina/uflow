---
ID: 184
Origin: 184
UUID: f7cf91ef
Status: Active
---

# DevOps: Deactivate ummah and stores sections

## 1. Changelog

| Date | Agent | Summary |
|---|---|---|
| 2026-06-17 | DevOps (opencode) | Created PR, verified branch state |

## 2. Branch Summary

- Branch: `feature/184-deactivate-ummah-stores`
- Commits:
  - `094c5e9f` fix: add sections.soon to remaining locales (ps, ur, tr)
  - `d73c3c68` feat: deactivate ummah and stores sections with Soon badge (ID 184)
- PR URL: https://github.com/abu-lina/uflow/pull/262

## 3. PR Details

- Title: feat: deactivate ummah and stores sections with Soon badge (ID 184)
- Base: main
- Head: feature/184-deactivate-ummah-stores

## 4. Release Notes

**Section deactivation for ummah and stores**

Unfinished "ummah" and "stores" sections are now hidden behind a config flag. Both section tabs remain visible with a "Soon" badge and disabled styling, but clicking them is a no-op. Direct navigation to `/ummah` or `/stores` redirects to `/food`. The feature is config-driven via `SECTION_META` in `src/config/sectionFilters.ts` — to re-activate a section, flip `active: true` for the relevant entry (no code changes required).

Includes:
- Disabled section tabs with "Soon" badge (translated in all 6 locales)
- Defensive guards in Header, search page, and providers page
- Route-level redirects for inactive section URLs
