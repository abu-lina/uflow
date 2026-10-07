# Issue #568 fix evidence

All captures are Chromium against this branch's dev server on
`http://127.0.0.1:3001` (`next dev --webpack`, worktree
`568-banner-behind-modal`), signed in as local admin `admin@uflow.local` via
the real password grant + `/api/auth/set` — the same cookie contract
`e2e/issue547-pending-provider.spec.ts` uses. Produced by `capture.mjs` in
this directory; every capture was gated on the in-page assertion its caption
claims, and each PNG was then pixel-sampled to confirm the amber bar
(`bg-amber-50` = rgb(255,251,235)) is actually in the image.

## Screenshots

### `01-desktop-pending-banner-inside-modal.png`

Viewport 1440x900, `/p/7a2f2cb4-709d-4f0a-85ff-933d279ef88a` (pending),
`uf_halal_popup_view_count=99` so the halal popup is suppressed. The amber
"awaiting manual review" banner is the top strip of the provider detail card,
inside the modal — the card's top corners are rounded on the banner itself and
the white panels below keep only their bottom rounding. Verified in-page:
`document.elementFromPoint` at the banner's centre (720, 67) returns the
banner's own `<p>` (`P.mx-auto max-w-4xl text-sm font-medium text-amber-900`),
and the banner node is inside `[data-testid="modal-content"]`
(`insideModal: true`). Pixel check: rgb(255,251,235) at (720, 50) and
(720, 67), white at (720, 90) directly beneath it, dimmed backdrop
rgb(148,148,148) at (100, 400) beside the card.

### `02-desktop-first-visit-halal-popup-mounted.png`

Same URL and viewport, fresh context with no `uf_halal_popup_view_count`, i.e.
the first-visit state in which `HalalTrustPopup` mounts. Visually this frame
looks like 01 — and that is the honest finding: the popup's
`fixed inset-0 z-[1000]` overlay is in the DOM but is _itself underneath_ the
modal's `z-[999999]` backdrop (verified: `elementFromPoint` at the popup's own
centre returns `DIV.fixed inset-0 z-0 bg-black/40 backdrop-blur-sm`). Either
way the banner hit test stays clean: `elementFromPoint` at (720, 67) returns
the banner `<p>`. The popup's z-1000 being under the dialog is pre-existing
stacking, untouched by this fix — the structural change means the banner can
no longer be covered by _any_ page-level overlay.

### `03-desktop-rejected-banner-inside-modal.png`

Viewport 1440x900, `/p/84624d5e-999c-4b73-9c03-81a3ebb9b4be`
(`review_status = 'rejected'`), popup suppressed. Same composition as 01: the
amber `submissionStatus.rejectedBanner` strip tops the card inside the modal.
Verified: `elementFromPoint` at the banner centre (720, 67) returns the banner
`<p>`; pixel rgb(255,251,235) at that point.

### `04-mobile-banner-unchanged.png`

iPhone 13 device emulation (390x844 CSS px, DPR 3), same pending provider,
popup suppressed. No desktop modal mounts (`modal-content` count = 0) and the
banner renders as before — a page-level sticky amber strip across the top of
the full provider page, above the provider name. Verified: `elementFromPoint`
at the banner centre (195, 32 CSS px) returns the banner `<p>`; pixels
rgb(255,251,235) at the banner's device-pixel coordinates.

## Data

- `capture.mjs` — the capture script; run output is the assertions above.
  Needs `UFLOW_ADMIN_PASSWORD` in env and `PLAYWRIGHT_BASE_URL` if the dev
  server is not on :3001.
