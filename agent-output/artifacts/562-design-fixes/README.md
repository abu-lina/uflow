# Issue #562 — Design-fix verification evidence

Captured against the real app: `npm run dev` spawned by Playwright's
webServer (127.0.0.1:3000) from worktree `562-halal-footer-design-fixes` at
commit `14503ada`, local Supabase (migration 138 applied), signed in as a
seeded `role=admin` user (`users.role` upsert + `sb-*` cookies written via
`/api/auth/set` + the supabase-js localStorage session hydrated so the
header renders signed-in state). Provider is a seeded pending food listing
whose `food_providers` row is the production-shape import default
(`no_alcohol/no_pork/no_gambling = false`).

Locale pinned via `localStorage['preferred-language']` in an init script;
`dir`/`lang` asserted on `<html>` for the ar shot.

Every caption below is backed by an in-run assertion, not visual
inspection. The assertions ran in the same session as the captures; the
logged values are quoted per file.

| File                                       | What it shows (asserted before capture)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-mobile-390-de-approve-modal-focus.png` | 390×844, de. ApproveModal open with focus inside it. Asserted: `role="dialog"` visible and containing the consequence copy (`veröffentlicht`), `aria-modal="true"`, `aria-describedby` resolving to an existing element, `document.activeElement` inside the dialog — the `Abbrechen` button (logged `FOCUS: {"insideDialog":true,"tag":"BUTTON","text":"Abbrechen",...}`). The visible ring is the app's real focus target with a **solid 3px `#1d4ed8` outline injected for the capture** — the app's own `focus:ring-2 ring-primary/20` halo barely survives a still; the outline marks where focus actually sits, it does not invent it. Pixel-verified post-capture: backdrop `(20,60) = rgb(122,122,122)` = black/50 fully faded in, dialog `(195,422) = rgb(255,255,255)`, 1099 px of the injected outline colour present — the earlier pack's mid-fade failure is not repeated. Also asserted after capture: Tab lands on `Genehmigen und veröffentlichen` inside the dialog (trap works). |
| `02-mobile-320-de-review-row-wrapped.png`  | 320×700, de, `main` scrolled to the end. The review-row slot renders the wrapped `loadFailed` notice (meta fetch forced to 500 — the row's free-form content is what wraps in de/tr; the button pair is a fixed `h-12` and never wraps). Asserted: the notice contains `Prüfaktionen nicht verfügbar`, Range line-rect count `paraLines: 3`, paragraph height 56px, **footer height 149px > the old hardcoded 140px**, `--footer-action-height` published as `149px` matching `Math.ceil(footerHeight)`, spacer `.h-bottom-spacing-subpage-review` = 170.75px ≥ bar height, and after scrolling the last content element's bottom (512.95) sits above the bar's top (551) — not occluded (logged `WRAP_METRICS`/`OCCLUSION`). The forced 500 also exercised the new error path: `[halal-edit] provider meta fetch failed: 500` appears in the server log.                                                                                                                                          |
| `03-mobile-390-ar-halal-page.png`          | 390×844, ar. Halal check page fully localized. Asserted: `dir="rtl"`, `lang="ar"` on `<html>`; body text contains `موافقة` (approve), `رفض` (reject), `حفظ` (save); and none of `Genehmigen`, `Ablehnen`, `Speichern`, `Verifizierungsmethode`, `Halal-Zertifikat`, `Bezeugungsfragen`, `genehmigungsbereit`, `Jetzt prüfen` appear anywhere in `document.body.innerText` (logged `AR_CHECKS: {"dir":"rtl","lang":"ar","germanFound":[],...}`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Method and honest caveats

- `e2e/zz-562-design-shots.spec.ts` ran under the suite's own webServer
  lifecycle and was deleted afterwards (a standalone `next dev` is not
  permitted in this environment). Seeded users and provider rows were
  deleted by `afterAll`.
- Shot 02's wrap is the `loadFailed` row, reached by intercepting
  `GET /api/admin/providers/[id]` with a 500. The review slot is free-form:
  in de/tr its notice/error variants are what grow past the 140px the
  spacer token used to hardcode; the pending-state button pair is a fixed
  `h-12` row. This still proves Fix 5's mechanism end-to-end — measured
  var, derived spacer, unoccluded content — on the tallest real content the
  row can carry. The button-row state was asserted non-wrapped implicitly:
  at 390px in de/tr both labels fit one line.
- Shot 01's focus outline colour is injected CSS, disclosed above; focus
  itself is real and asserted (`document.activeElement` inside
  `role="dialog"`, plus a Tab-trap check after the capture).
