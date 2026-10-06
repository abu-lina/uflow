# Issue #548 — Design-fix evidence

Captured against the real app: `npm run dev` spawned by Playwright's
webServer (127.0.0.1:3000) from worktree `feature/548-halal-approve-reject`,
local Supabase (migration 138 applied), signed in as a seeded `role=admin`
user, on a seeded pending food provider whose `food_providers` row is the
production-shape import default (`no_alcohol/no_pork/no_gambling = false`).

## Captured

| File                                  | What it shows                                                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-desktop-1440-scrolled-bottom.png` | 1440x900, `main` scrolled to the end. ONE fixed bar: teal `Genehmigen` + red `Ablehnen` row above a muted `Speichern` + close. `BottomSpacer` reserves room — no content clipped behind the footer. |
| `02-mobile-390-top.png`               | 390x844. Same single bar at mobile width; 48px touch targets.                                                                                                                                       |
| `03-mobile-390-scrolled-bottom.png`   | Same after scrolling `main` to the end — the verdict panel clears the footer entirely (was clipped mid-glyph before).                                                                               |
| `04-mobile-390-rtl-ar.png`            | `locale=ar`, `dir="rtl"` (asserted). Approve/reject mirror correctly with localized strings.                                                                                                        |
| `05-mobile-390-approve-modal.png`     | `ApproveModal` open on mobile — consequence copy ("…veröffentlicht X sofort und öffentlich und startet die Anreicherung.").                                                                         |
| `06-desktop-1440-approve-modal.png`   | Same modal on desktop.                                                                                                                                                                              |

## Computed-style probe (same session, asserted in the run)

```json
{
  "footerCount": 1,
  "approve": { "height": 48, "bg": "rgb(93, 152, 152)" },
  "reject": { "height": 48, "bg": "rgb(210, 112, 112)" },
  "save": { "height": 48, "bg": "rgb(232, 232, 232)" }
}
```

One fixed bar total (`bg-green-600`/`bg-red-600` are gone — teal is
`bg-primary`, red is `bg-danger`, save is `variant="secondary"` on neutral).

## Method

The capture ran as a throwaway Playwright spec under the suite's own
webServer lifecycle (`e2e/zz-548-design-shots.spec.ts`, deleted after the
run — a standalone `next dev` could not be spawned in this session).
Seeded users and the provider row were deleted by `afterAll`.
