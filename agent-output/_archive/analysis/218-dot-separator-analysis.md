---
ID: 218
Origin: 218
UUID: 9e41f7c2
Status: Active
---

# Analysis: "Dot" icon between open tag and distance on provider cards

## Changelog

| Date | Agent | Action |
|------|-------|--------|
| 2026-08-17 | Analyst | Opened analysis. Insertion point, icon library, dot icon, and scope all determined (L1). Awaiting Planner. |

## Value Statement and Business Objective

The home near-me list (Plan 217's `HomeNearMeList`) renders each provider on a
shared `ProviderCard` that shows an open/closed status label and a distance
badge ("1,2 km" / "400 m"). They are separated only by a flex gap with no visual
separator, so the two fields read as one run of text. The user wants a "dot"
icon inserted between them, using "the standard icon library we have defined in
tailwind". This analysis pins down (a) the exact insertion point in JSX, (b)
what "the standard icon library" actually is, (c) whether it ships a dot glyph,
and (d) the true blast radius of a change inside the shared card.

## Objective

Convert the request into precise, evidence-backed facts for the Planner:
exact file/line of the open tag and distance badge, the current layout between
them, the confirmed icon library + dot icon name, existing separator precedents,
and which lists the change will and won't affect. No implementation.

## Context

`ProviderCard` (`src/components/providers/ProviderCard.tsx`) is a shared card
used by multiple lists. The distance badge is opt-in via the `distanceKm` prop
(Plan 196), so only lists that pass `distanceKm` render a distance at all. The
open/closed status label renders whenever `opening_hours` are present
(`getOpenStatus` returns `visible: true`). A dot must therefore be conditional:
it should only appear when *both* the status label and the distance are visible,
otherwise a dangling dot renders next to a single field.

## Methodology

1. Read `ProviderCard.tsx` in full to locate both fields and their wrapper.
2. Read all `ProviderCard` call sites (`HomeNearMeList`, `NearMeResultsGrid`,
   `HomeListView`) to determine which pass `distanceKm`.
3. Inspected `tailwind.config.ts`, `package.json`, the design docs
   (`docs/design/ICON_USAGE_STANDARDS.md`, `ICON_STANDARDIZATION_SUMMARY.md`),
   and `node_modules/lucide-react` to establish the standard library and the dot
   glyph's actual SVG geometry.
4. Grepped for existing separator patterns (text middot vs. icon) to find
   consistency precedents.
5. Reviewed the existing distance/open-status tests for assertions a dot could
   break.

## Findings

### F1 (L1 Proven) — The open/closed status label ("open tag") is a text span, not a pill/badge

`src/components/providers/ProviderCard.tsx:448-454`:

```tsx
{openStatus.visible && (
  <span
    className={`font-inter text-sm font-medium leading-normal ${openStatus.isOpen ? 'text-success-dark' : 'text-danger-dark'}`}
  >
    {openStatusLabel}
  </span>
)}
```

- `openStatusLabel` is `t('providerDetail.openStatus.open')` / `closed`
  (ProviderCard.tsx:202-204).
- Styled as inline text, colored green (`text-success-dark`) or red
  (`text-danger-dark`). It is **not** a pill, badge, or tag with a border.
- Rendered for both open *and* closed states (`visible: true` in either case,
  see `src/utils/openStatus.ts`).

### F2 (L1 Proven) — The distance badge is a sibling span in the same flex row

`src/components/providers/ProviderCard.tsx:455-459`:

```tsx
{distanceLabel && (
  <span className="font-inter text-sm font-medium leading-normal text-text-muted" data-testid="provider-distance">
    {distanceLabel}
  </span>
)}
```

- `distanceLabel` = `formatDistance(distanceKm)` (ProviderCard.tsx:205), which
  returns `null` when `distanceKm` is absent/invalid (`src/utils/distance.ts`).
- `data-testid="provider-distance"` confirmed, as noted in Plan 217 docs.

### F3 (L1 Proven) — Current layout: one flex row, gap only, no separator

Both spans live inside a single wrapper, ProviderCard.tsx:446-461:

```tsx
{(openStatus.visible || distanceLabel) && (
  <div className="mt-0.5 flex items-center gap-2" data-testid="provider-open-status">
    {openStatus.visible && (
      <span className={`font-inter text-sm font-medium leading-normal ${openStatus.isOpen ? 'text-success-dark' : 'text-danger-dark'}`}>
        {openStatusLabel}
      </span>
    )}
    {distanceLabel && (
      <span className="font-inter text-sm font-medium leading-normal text-text-muted" data-testid="provider-distance">
        {distanceLabel}
      </span>
    )}
  </div>
)}
```

- The two fields are separated only by the row's `gap-2` (8px). No dot,
  divider, or pipe exists between them.
- **Exact insertion point**: between line 454 (`)}` closing the open-status
  block) and line 455 (`{distanceLabel && (`). The dot must be guarded by
  `openStatus.visible && distanceLabel` so it never renders alone.

### F4 (L1 Proven) — "The standard icon library" = `lucide-react` (Lucide)

Two authoritative docs state this unambiguously:

- `docs/design/ICON_USAGE_STANDARDS.md:5-7`: "**Use:** Lucide React for ALL
  icons. **Don't use:** Emojis, FontAwesome, Material Icons, or other libraries".
- `docs/design/ICON_STANDARDIZATION_SUMMARY.md:217-221`: "**Package:**
  `lucide-react`. Already installed: Yes".

The Tailwind config itself defines only the icon **size tokens**
(`tailwind.config.ts:177-185`, `spacing.icon-xs` … `icon-4xl`), with a
side-comment "(Material Symbols - standardized)". That comment is stale/legacy;
it describes size tokens, not a library, and contradicts the Lucide standard in
the docs. The user's phrase "the standard icon library we have defined in
tailwind" resolves to: **`lucide-react`**, sized with the `icon-*` tokens in the
tailwind config.

`lucide-react` is `^0.577.0` in `package.json` (confirmed installed).

### F5 (L1 Proven) — lucide-react ships a `Dot` icon (a true dot)

Verified against the installed package (`node_modules/lucide-react/dist/esm/icons/dot.js`):

```js
const __iconNode = [["circle", { cx: "12.1", cy: "12.1", r: "1", key: "18d7e5" }]];
const Dot = createLucideIcon("dot", __iconNode);
```

- `Dot` is a filled circle of radius `r=1` inside a 24px viewBox → a ~2px dot
  when rendered at default 24px, and ~1.3px at `icon-xs` (16px). It is the
  correct "dot" glyph, but its tiny radius means it needs a size class of at
  least ~16–24px to stay visible (see G2).
- `CircleSmall` (`circle-small.js`, `r=6`) also exists but renders a ~12px
  filled circle at 24px — a bullet, not a "dot". Not recommended for a separator.

### F6 (L1 Proven) — ProviderCard itself currently uses @iconify/react, not lucide-react

`ProviderCard.tsx:7` imports `import { Icon } from '@iconify/react'` and uses it
for all of the card's existing icons: bookmark heart (`mdi:heart` /
`lucide:heart`, line 421), halal stars (`mdi:star`, line 547), moderation
check/close (`mdi:check` / `mdi:close`, lines 567/584).

There is also a thin wrapper `src/components/ui/Icon.tsx` (re-exports
`@iconify/react` `Icon`), but `ProviderCard` does **not** use it — it imports
`@iconify/react` directly.

**Consequence**: following the documented Lucide standard for the new dot means
adding a `lucide-react` import to a file that currently uses iconify. This is
not a conflict (the two coexist across the codebase; `lucide-react` `MapPin`
powers the near-me chip at `HomeSearchBar.tsx:122` and
`NearMeOpenNowFilters.tsx:69`), but it is a file-local convention divergence the
Planner should acknowledge. The user's instruction ("use the standard icon
library") points to `lucide-react` `Dot`, not to iconify.

### F7 (L1 Proven) — Existing separators are text middot `·`, not icons

- `src/features/chat/components/ProviderCard.tsx:33`: `<span>·</span>` between
  category and city.
- `src/components/shared/CityListItem.tsx:71`: `<span>·</span>` between status
  and interest count.
- `ProviderCard.tsx:498-501`: specialties joined with `' · '` (text, inside the
  same card).

No existing code uses an icon as a field separator. A lucide `Dot` icon would
therefore be a new pattern, but it is what the user explicitly asked for
("'dot' icon"), so it takes precedence over the text-middot precedent.

### F8 (L1 Proven) — Scope: the change lives in the shared ProviderCard and hits both near-me lists

`distanceKm` is passed only by the two near-me surfaces:

| Caller | File:line | Passes `distanceKm`? | Affected by dot? |
|--------|-----------|----------------------|------------------|
| Home near-me list | `HomeNearMeList.tsx:123` | ✅ `result.distance_km` | ✅ (target) |
| Near-me search grid | `NearMeResultsGrid.tsx:101` | ✅ `result.distance_km` | ✅ (same card) |
| Non-near-me home list | `HomeListView.tsx` (no prop) | ❌ | ❌ no distance → no dot |

- `HomeListView` never passes `distanceKm`, so its cards render the open/closed
  label but **no distance badge and therefore no dot**. The non-near-me list is
  unaffected by a change inside `ProviderCard`.
- Because the dot is inserted in the shared `ProviderCard`, it will appear on
  **both** near-me lists (`HomeNearMeList` and `NearMeResultsGrid`), not only the
  home list. Both already render open + distance, so this is almost certainly
  the intended behavior, but the Planner should confirm whether the search-page
  near-me grid should also get the dot. Restricting to the home list only would
  require threading a new opt-in prop through `ProviderCard` rather than editing
  the shared row directly.

### F9 (L1 Proven) — Existing tests won't break from inserting an SVG dot

- `src/__tests__/components/ProviderCard-distance.test.tsx` asserts with
  `getByText('1,2 km')`, `getByText('400 m')`, and
  `queryByTestId('provider-distance')` — none of these are disturbed by an SVG
  element inserted between the two spans.
- `ProviderCard.test.tsx:459,480` asserts on `provider-open-status` presence
  only, not on child count.
- `HomeNearMeList.test.tsx` and `NearMeResultsGrid.test.tsx` mock `ProviderCard`,
  so they're unaffected.

No test currently asserts on the absence of a separator, so a new dot won't
fail existing suites. A regression test for the dot's conditional rendering
(only when both fields present) is the natural new coverage.

## Gap Tracking Table

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| G1 | Exact dot size/color styling | Design decision, not discoverable in code | Planner to pick size token + color token (see F5/F3) | Planner |
| G2 | Whether `NearMeResultsGrid` (search page) should also get the dot | Shared component, no flag | Planner to confirm scope: both near-me lists vs. home-only via new prop | Planner |
| G3 | Whether file-local iconify convention should be preserved vs. documented Lucide standard | Two precedents conflict | Planner to confirm `lucide-react` `Dot` (per user instruction) vs. `@iconify/react` `lucide:dot` | Planner |

## Analysis Recommendations

These are next investigative steps only, not solutions:

1. If the planner wants a text-free, pure-icon separator, confirm the intended
   rendered diameter. `Dot` (r=1) is near-invisible below ~16px; the standard
   `icon-xs` (16px) yields ~1.3px. Test `Dot` at `icon-xs`/`icon-sm`/default in
   a live render before committing to a size class.
2. Verify against the deployed home near-me list (UAT) that the open tag and
   distance actually co-occur in practice — both are independently optional
   (`openStatus.visible` from `opening_hours`, `distanceLabel` from
   `distanceKm`). If a provider has no opening hours, no dot will render even
   with a distance.
3. Trace `formatDistance` edge cases (negative/NaN → `null`) to confirm the dot
   guard `openStatus.visible && distanceLabel` covers all single-field cases.

## Open Questions

1. Should the dot also appear on the search-page `NearMeResultsGrid`, or is this
   home-list-only? (F8/G2)
2. Color: `text-text-muted` (matches the distance badge) vs. `text-content-muted`
   (legacy alias of the same `--color-text-muted`). Both resolve to the same
   CSS variable today; the distance span uses `text-text-muted`.
