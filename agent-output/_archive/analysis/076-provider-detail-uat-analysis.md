---
ID: 076
Origin: 076
UUID: c94b9360
Status: Active
---

# 076 — Provider Detail UAT Bug Analysis

## Changelog

| Date | Author | Summary |
|---|---|---|
| 2026-04-03 | Analyst (@S76) | Initial root cause analysis for 3 UAT defects on provider detail page |

---

## Value Statement and Business Objective

The provider detail page is the primary conversion surface in UFlow — it is the page where users decide to engage with a service provider. Three UAT-reported defects degrade trust and usability on the desktop view:

1. A phantom Barakah Effect card renders for every provider, even those with no linked community service — creating confusing placeholder UI
2. The admin-only "Service bearbeiten" edit button has awkward floating placement that breaks the modal UX
3. Instagram buttons are entirely missing from the desktop modal despite provider records containing Instagram URLs

Fixing these defects restores perceptual clarity and feature parity between the mobile and desktop experiences.

---

## Context

### Architecture Note

The provider detail page is rendered via two paths, both accessed through the same route
`/providers/[provider_id]` — gated by `useIsMobile()` in `ProviderDetailPageClient.tsx`:

| Device | Component | File |
|---|---|---|
| **Mobile** | `ProviderDetailPage` | `src/components/providers/ProviderDetailPage.tsx` |
| **Desktop** | `ProviderDetailModal` | `src/components/providers/ProviderDetailModal.tsx` |

The orchestrating client component that chooses between them:
- `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx`

All three bugs exist **exclusively in the desktop path** (`ProviderDetailModal.tsx`). The mobile path has correct behavior for all three.

---

## Methodology

1. **Grep-first trace** — searched for key terms (`Barakah Effect`, `barakah`, `Service bearbeiten`, `instagram`) across `src/` to identify all touch-points
2. **Component diff** — compared desktop path (`ProviderDetailModal.tsx`) against mobile path (`ProviderDetailPage.tsx`) to identify divergent behavior
3. **Line-by-line inspection** — read both components in full to confirm guard logic presence/absence
4. **Type/import audit** — verified missing imports and type union constraints for Bug C

All findings are **L1 Proven** (direct code inspection).

---

## Findings

### Bug A — "Unser Barakah Effect" renders without data

**Confidence: L1 Proven**

#### Root Cause

In `src/components/providers/ProviderDetailModal.tsx`, the Barakah Effect section is rendered **unconditionally** — it lacks the data presence guard used in the mobile path.

**Desktop modal (broken) — `ProviderDetailModal.tsx` lines 512–573:**
```jsx
{/* Barakah Effekt Section - with fade-in animation */}
<div className="animate-fadeIn flex flex-col ... rounded-2xl p-4 outline ...">
  <div className="...">
    <div className="...">
      {t('providers.ourBarakahEffect')}:    {/* ← always rendered */}
    </div>
    <div className="flex w-full flex-row items-start gap-6">
      {/* Left: Zakat image, name, subtitle — uses communityServices[0]?.* */}
      <button onClick={() => { ... }}>
        <Image src={
          communityServices[0]?.community_service_images?.[0] ?? PLACEHOLDER_IMAGE  // ← PLACEHOLDER used
        } ... />
        <div>{communityServices[0]?.community_service_name}</div>  {/* ← renders undefined/empty */}
      </button>
      ...
    </div>
  </div>
</div>
```

When no community service is linked (`communityServices = []`):
- The section heading "Unser Barakah Effekt:" is rendered
- The image falls back to `PLACEHOLDER_IMAGE` (a generic placeholder)
- The service name renders as `undefined` (no text visible but layout is occupied)
- The card box outline is visible

**Mobile page (correct) — `ProviderDetailPage.tsx` lines 452–465 (loading state) + 466+:**
```jsx
{isLoadingCommunityServices ? (
  /* loading skeleton */
) : (
  communityServices && communityServices.length > 0 && (   // ← guard present
    <div className="mx-6 mt-4 rounded-2xl ...">
      ...
    </div>
  )
)}
```

The mobile path wraps the entire section in `communityServices && communityServices.length > 0 &&`. This guard is entirely absent in the desktop modal.

**Secondary observation:** `isLoadingCommunityServices` is also not used to show a skeleton in the modal's Barakah section — there is no loading UX for this section on desktop. When React Query is still fetching and `communityServices = []` (the default), the section renders immediately as an empty placeholder card.

#### File to Change
- `src/components/providers/ProviderDetailModal.tsx` — wrap Barakah section (line 512) with `communityServices.length > 0 &&`

---

### Bug B — "Service bearbeiten" admin button poorly positioned

**Confidence: L1 Proven**

#### Root Cause

In `ProviderDetailModal.tsx` lines 766–771, the `customActionButtons` slot is rendered using `absolute` positioning at `bottom-24 left-1/2 -translate-x-1/2`:

```jsx
{/* Admin action buttons (e.g., edit) rendered above the actions bar */}
{customActionButtons && (
  <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
    {customActionButtons}
  </div>
)}
```

**What this does spatially:**
- The modal `<section>` is `h-[900px]`
- Actions bar: `absolute bottom-10 left-1/2 -translate-x-1/2` (40px from bottom, center)
- Admin button: `absolute bottom-24 left-1/2 -translate-x-1/2` (96px from bottom, center)

The result is the "Service bearbeiten" button floating horizontally centered at the bottom quarter of the modal, directly above the action bar (Save/Share/Phone/Website), sandwiched between the action bar and the content panels. It has no visual relationship to the content it controls and feels detached from the UI.

**The button being positioned** comes from `AdminProviderDetailButtons` (`variant="desktop"`):
- `src/features/admin/components/AdminProviderDetailButtons.tsx` lines 33–46
- Rendered as a `<button>` with `bg-primary` styling (green pill)

**Correct placement context:** The modal right panel already has a close button anchored at `absolute right-12 top-9`. The edit function is a secondary action relative to the close button. Placing it in the top-right area of the right panel (e.g., near the close button row) would give it visual context. Alternatively, the `customActionButtons` slot on the right panel content can position it as a first-class item.

#### File to Change
- `src/components/providers/ProviderDetailModal.tsx` — move the `customActionButtons` render zone from `absolute bottom-24` to the right panel header area (near close button)

---

### Bug C — Social action buttons (Instagram) missing in desktop modal

**Confidence: L1 Proven**

#### Root Cause

The desktop modal (`ProviderDetailModal.tsx`) has a hardcoded 4-button action bar:
**Save → Share → Phone → Website**

Instagram was never added to this bar. Three concurrent gaps block it:

**Gap 1 — Missing import:**
```typescript
// ProviderDetailModal.tsx lines 24–29 — normalizeInstagramUrl NOT present:
import {
  openNavigation,
  formatAddress,
  isAddressNavigable,
  normalizeWebsiteUrl,    // ← only this, no normalizeInstagramUrl
} from '@/utils/navigationUtils';
```
`normalizeInstagramUrl` is exported from `src/utils/navigationUtils.ts` (line 81) and IS imported in `ProviderDetailPage.tsx`.

**Gap 2 — State type union excludes instagram:**
```typescript
// ProviderDetailModal.tsx line 134 — 'instagram' not in union:
const [expandedAction, setExpandedAction] = useState<'save' | 'share' | 'call' | 'website'>('save');
```
No `'instagram'` variant.

**Gap 3 — No Instagram button in JSX:**
The actions bar (lines 668–774) only renders 4 buttons. There is no `{provider.social_instagram && <button ...>}` element.

**Gap 4 — No handleExpand case for instagram:**
```typescript
// handleExpand only covers: 'save' | 'share' | 'call' | 'website'
const handleExpand = async (action: 'save' | 'share' | 'call' | 'website') => { ... }
```
No handler branch for `'instagram'`.

**Mobile path (correct) — `ProviderDetailPage.tsx` ~lines 397–413:**
```jsx
{/* Contact Icons */}
<div className="mt-4 flex items-center gap-4">
  {provider.social_website && (
    <button onClick={() => { const url = normalizeWebsiteUrl(provider.social_website); ... }}>
      <Icon icon="mdi:internet" />
    </button>
  )}
  {provider.contact_phone && (
    <button onClick={() => window.open(`tel:${provider.contact_phone}`)}>
      <Icon icon="entypo:old-phone" />
    </button>
  )}
  {provider.social_instagram && (               // ← guard present, correct
    <button onClick={() => {
      const url = normalizeInstagramUrl(provider.social_instagram);
      if (url) window.open(url, '_blank');
    }}>
      <Icon icon="mdi:instagram" />
    </button>
  )}
</div>
```

**Note on desktop action bar pattern:** The desktop actions bar uses an "expand on click" pattern (pressed button expands to show label). Instagram should follow the same pattern: pill button with `mdi:instagram` icon, expands to show "Instagram" label, opens the URL via `normalizeInstagramUrl`. The button should be conditionally rendered based on `provider.social_instagram` presence.

#### File to Change
- `src/components/providers/ProviderDetailModal.tsx` — add import, extend state type, add Instagram button + handler

---

## Affected Components Summary

| Bug | File | Lines | Change Type |
|---|---|---|---|
| A | `src/components/providers/ProviderDetailModal.tsx` | 512–573 | Add conditional guard `communityServices.length > 0` |
| B | `src/components/providers/ProviderDetailModal.tsx` | 766–771 | Relocate `customActionButtons` render zone |
| C | `src/components/providers/ProviderDetailModal.tsx` | 24–29, 134, 668–774 | Add import, extend type, add Instagram button |

All three bugs are in the **same single file**: `src/components/providers/ProviderDetailModal.tsx`.
No schema changes, no service layer changes, no API changes required.

---

## Root Cause — Shared Pattern

The root cause across all three bugs is a **feature parity gap** between the desktop modal (`ProviderDetailModal.tsx`) and the mobile page (`ProviderDetailPage.tsx`). Both components diverged at some point, and the desktop modal was not kept in sync with three specific behaviors:

1. Conditional guard on community services data
2. Placement of the admin edit action
3. Instagram social button

This is an L1 Proven finding — all three gaps are confirmed through direct code inspection.

---

## Gap Tracking

| # | Unknown | Status |
|---|---|---|
| 1 | Whether `isLoadingCommunityServices` should show a skeleton in the Barakah section of the modal (not just the guard) | **Deferred** — Bug A fix only needs the visibility guard. Loading skeleton is a UX improvement beyond scope. |
| 2 | Where exactly to place the admin button (exact pixel placement vs design intent) | **Partial** — analysis surface is clear (top-right panel near close button). Exact pixel values are a Planner/Implementer decision. |
| 3 | Whether Instagram button in actions bar should follow the expand-on-click pattern or render as a plain icon | **Observed (L2)** — desktop pattern uses expand-on-click consistently; Instagram should follow. Final decision for Planner. |

---

## Minimal Fix Surface

Only **one file** requires changes:

```
src/components/providers/ProviderDetailModal.tsx
```

Specific change points:
- **Line 24–29**: Add `normalizeInstagramUrl` to navigationUtils import (Bug C)
- **Line 134**: Extend state type to `'save' | 'share' | 'call' | 'website' | 'instagram'` (Bug C)  
- **Line 294–315**: Add `handleExpand` case for `'instagram'` (Bug C)
- **Lines 512–573**: Wrap Barakah section with `communityServices.length > 0 &&` guard (Bug A)
- **Lines 668–774**: Add conditional Instagram button to actions bar (Bug C)
- **Lines 766–771**: Relocate `customActionButtons` from `absolute bottom-24` to top-right area of right panel (Bug B)

---

## Remaining Gaps for Planner

> ⚠️ The following must be resolved or accepted before implementation begins:

1. **Bug B exact placement**: Where should "Service bearbeiten" live? Options:
   - (a) Top-right corner of modal, **left of the close button** (natural for secondary admin action)
   - (b) Top of the right panel content (below the close button, above the Barakah section as a distinct row)
   - (c) Anchor it to the right panel — e.g., `absolute right-12 top-[52px]` (just below the close button)
   
   Analyst recommendation: Option (a) or (c) — keeps admin action in the top-right zone, aligned with the close button's visual gravity.

2. **Instagram button variant**: Should Instagram use the same expand-on-click pill pattern as Website/Phone? Analyst observes this is consistent with the existing UX pattern — recommend yes.

3. **Test coverage**: One existing test (`ProviderDetailModal.test.tsx` line 45–55) asserts `ourBarakahEffect` heading always renders. This test will need updating when Bug A is fixed — the heading should only appear when `communityServices.length > 0`. Planner should include a test update task.

---
