# Issue #548 — Design-fix evidence (reworked)

Captured against the real app: `npm run dev` spawned by Playwright's
webServer (127.0.0.1:3000) from worktree `feature/548-halal-approve-reject`,
local Supabase (migration 138 applied), signed in as a seeded `role=admin`
user (`users.role` + `user_metadata.role`), on a seeded pending food
provider whose `food_providers` row is the production-shape import default
(`no_alcohol/no_pork/no_gambling = false`). Locale is pinned per shot via
`localStorage['preferred-language']` — headless Chromium otherwise defaults
to en-US, which is what made the first pack's locale claims unreliable.

**Sign-in is the realistic one this time**: the spec writes the `sb-*`
session cookies (server auth, what the dashboard layout and admin APIs
read) AND the supabase-js localStorage session (what `useAuth`/Header
read), which is exactly what AuthSyncer produces after a UI login. That is
why the header now shows the signed-in admin state in every shot. The first
pack set cookies only, so the header rendered `Login`/`Register` while the
admin-gated footer rendered — a harness artifact, not a gating defect: the
review row renders iff `GET /api/admin/providers/[id]` (admin-only) answers
200, and the dashboard layout redirects unauthenticated/non-admin users
before the page ever mounts (e2e AC 9/10 prove both).

## Captured

| File                                  | What it shows (verified by in-run assertions)                                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `01-desktop-1440-scrolled-bottom.png` | 1440×900, de locale, inner `main` scrolled to the end. The single fixed bar shows teal `Genehmigen` + red `Ablehnen` (48px, svg icons) above muted `Speichern` + close. Header shows the signed-in profile menu (asserted via `profile-menu-trigger`). Asserted: `fixedFooterCount: 1`, both review buttons and Save inside the same `<footer>`. |
| `02-mobile-390-top.png`               | 390×844, de locale, top of page. Same single bar at mobile width; the review row waited on (not assumed).                                                                                                                                                                                                                                        |
| `03-mobile-390-scrolled-bottom.png`   | Same page after scrolling to the end. Approve/reject render `✓ Genehmigen` / `✕ Ablehnen` — the svg icons are bundled data, present in the first mounted render (asserted visible).                                                                                                                                                              |
| `04-mobile-390-rtl-ar.png`            | `preferred-language=ar`, `dir="rtl"` asserted on `<html>`. Approve/reject mirror correctly with Arabic strings; icons present.                                                                                                                                                                                                                   |
| `05-mobile-390-approve-modal.png`     | 390×844, de locale. ApproveModal OPEN: asserted `role="dialog"` visible and containing the consequence copy ("veröffentlicht … sofort und öffentlich") before capture.                                                                                                                                                                           |
| `06-desktop-1440-approve-modal.png`   | 1440×900, de locale. Same ApproveModal open on desktop (asserted `role="dialog"` + consequence copy). Modal was dismissed via Escape after each capture; the provider stayed `pending`.                                                                                                                                                          |

## Computed-style probe (asserted in the run, desktop)

```json
{
  "footerCount": 2,
  "fixedFooterCount": 1,
  "sameBar": true,
  "approve": { "height": 48, "bg": "rgb(93, 152, 152)" },
  "reject": { "height": 48, "bg": "rgb(210, 112, 112)" },
  "save": { "height": 48, "bg": "rgb(232, 232, 232)" }
}
```

`footerCount: 2` because the site contentinfo `<footer>` also exists on
desktop; exactly ONE bar is `position: fixed`, and approve/reject/save all
share it (`sameBar`). The first pack's probe counted `footer` elements on
mobile where the site footer is not rendered — same conclusion, corrected
metric.

## What the first pack got wrong (root causes)

- **05/06 had no modal**: the capture never opened it. The modal itself
  works — the e2e AC 1–4 test and the ApproveModal unit tests exercise it —
  the harness simply skipped the click. Now asserted open before capture.
- **01 had no review row**: the shot raced `GET /api/admin/providers/[id]`.
  Until providerMeta resolves the footer is save+close only. The new spec
  waits on the review row (and its icons) before every capture. Separately,
  that fetch used to fail _silently_ — a real gap now fixed: a failed meta
  fetch renders `adminHalalEdit.review.loadFailed` in the footer slot.
- **03 vs 05 icon disagreement**: `'mdi:check'`/`'mdi:close'` string names
  made `@iconify/react` fetch glyphs from api.iconify.design; whichever shot
  ran before the fetch landed had no icons. The buttons now pass bundled
  `IconifyIcon` data (`src/lib/icons.ts`) — no fetch, no reflow (button
  bounding box asserted identical before/after a 1.5s settle).

## Method

`e2e/zz-548-design-shots.spec.ts` ran under the suite's own webServer
lifecycle and was deleted afterwards (a standalone `next dev` could not be
spawned in this session). Seeded users and the provider row were deleted by
`afterAll`. Every image above is gated on role/text/dir assertions taken in
the same session, so the captions describe what the files provably contain.
