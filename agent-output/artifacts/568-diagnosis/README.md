# Issue #568 diagnosis artifacts

All captures are Chromium, viewport 1440x900, taken 2026-10-07 against the dev
server on `http://127.0.0.1:3000` (the running server is the
`562-halal-footer-design-fixes` worktree at `b1ff2328`; its
`ProviderDetailPageClient.tsx` and `Modal.tsx` are byte-identical to
`fix/568-banner-behind-modal` HEAD, verified with `diff -q`).

Signed in as the local admin `admin@uflow.local` via `/api/auth/set`, the same
cookie contract `e2e/issue547-pending-provider.spec.ts` uses. Provider
`7a2f2cb4-709d-4f0a-85ff-933d279ef88a` ("Dbg"), `review_status = 'pending'`.

## Screenshots

### `01-defect-modal-covers-banner.png`
`/p/7a2f2cb4-...` immediately after load, nothing clicked, HalalTrustPopup
suppressed via `localStorage.uf_halal_popup_view_count = 99`. The whole viewport
is the `ProviderDetailModal`: a dimmed, blurred backdrop with the white
1200x900 provider detail card centred on it. The amber awaiting-review banner is
not visible anywhere; it is underneath the backdrop. Verified in the same page
state: `document.elementFromPoint` at the banner's own centre returns
`DIV.fixed inset-0 z-0 bg-black/40 backdrop-blur-sm`, not the banner
(`stack-at-banner-centre.json`).

### `02-same-page-modal-node-removed.png`
The exact same page state as 01, after removing the single portal node
`div.fixed.inset-0[role="dialog"]` from the DOM with JS. Nothing else changed.
The amber banner reading "Your submission has been saved and is awaiting a
manual review." is now visible as a strip across the top of the page, under the
site header, above the provider content. Verified: `elementFromPoint` at the
banner centre now returns the banner's own `<p>`.

### `03-first-visit-halal-popup-also-above-banner.png`
Same URL, same viewport, but a fresh browser context with no
`uf_halal_popup_view_count` set, i.e. the first-visit state. Two overlays are
stacked on the page here, so the capture also shows the `HalalTrustPopup`
(`fixed inset-0 z-[1000] bg-black/40`) in the layer sandwich. Included to show
the banner is below *both* unprompted overlays, not just the detail modal.

### `04-uat-anonymous-404.png`
`https://uat.ummahflow.com/p/2e3f9942-8cce-4570-a474-24cba76963f0` fetched
anonymously. HTTP status 404 (also confirmed with `curl -o /dev/null -w
"%{http_code}"`). The capture shows UAT's 404/empty-state page chrome: the
UMMAH FLOW header with the "Über uns / Food / Ummah / Stores" nav and the
footer, with no provider content and no banner.

**The reported UAT state could not be captured.** UAT ships the PROD Supabase
project (see the comment in `e2e/issue547-pending-provider.spec.ts:76`), the row
is `review_status != 'approved'`, and #547's rule means only its creator, owner
or an admin gets a 200. I have no UAT/PROD credentials, so there is no capture
of the defect on UAT itself. Everything above is the local reproduction.

## Data files

- `stack-at-banner-centre.json` — `document.elementsFromPoint` at the banner's
  centre, topmost first, with computed `z-index` and `position` per element.
  HalalTrustPopup suppressed, so this is the two-element case.
- `stacking-local-head-pending.json` — computed style, rect and ancestor chain
  for the banner, the modal portal root and the modal backdrop, plus the
  `--footer-action-height` reading and the banner-centre hit test. Provider
  `7a2f2cb4-...` (`pending`).
- `stacking-local-head.json` — same probe against provider
  `84624d5e-999c-4b73-9c03-81a3ebb9b4be`, whose `review_status` is `rejected`.
  `bannerText` and `banner` are `null` there because that first probe matched
  the banner by the English awaiting-review text, and a rejected row renders
  `submissionStatus.rejectedBanner` instead. Kept because its modal and
  backdrop readings are an independent confirmation on a second provider.
