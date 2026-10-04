---
ID: 201
Origin: 201
UUID: 3e8b5fa2
Status: Committed
---

# Analysis 201 — Provider Detail Sections: Accordion Exclusivity & Gap Spacing

## Value Statement and Business Objective

The provider detail page is a primary conversion surface. Two visual regressions introduced after Plan 195 degrade the interaction quality: (1) multiple accordion sections can be open simultaneously, breaking the intended single-open contract; (2) spacing between sections is larger than the spacing established by the page layout above, creating a visually inconsistent rhythm. Both bugs are cosmetic/UX — no data or security risk.

---

## Methodology

Static code inspection against the two files named in the task. All findings are L1 Proven (directly read from source at commit `f45512e9`, branch `session/201-provider-sections-fix`).

---

## Bug 1 — Incomplete Accordion Exclusivity

### Root Cause (L1 Proven)

Plan 195 converted three `ExpandSection` instances in `ProviderDetailSections.tsx` to controlled mode using a shared `openSection` state, but left three instances in **uncontrolled mode**. Uncontrolled instances maintain their own internal `internalOpen` state (see `ExpandSection.tsx` line 34) and are invisible to `setOpenSection`, so they cannot be collapsed by other section toggles and cannot collapse each other.

### Evidence

File: `src/features/providers/components/ProviderDetailSections.tsx`

| Section | Line | Mode | Props |
|---|---|---|---|
| Halal Check | 215 | **Controlled** ✅ | `isOpen={openSection === 'halal'}` + `onToggle` |
| Values & Amenities | 232 | **Controlled** ✅ | `isOpen={openSection === 'values'}` + `onToggle` |
| Menu / Offers | 253 | **Controlled** ✅ | `isOpen={openSection === 'menu-offers'}` + `onToggle` |
| Opening Hours | **283** | **Uncontrolled** ❌ | No `isOpen`, no `onToggle` |
| Weitere Standorte | **289** | **Uncontrolled** ❌ | No `isOpen`, no `onToggle` (inside conditional `div#standorte-section`) |
| Nearby | **307** | **Uncontrolled** ❌ | No `isOpen`, no `onToggle` |

`ExpandSection` API supports full controlled mode via `isOpen?: boolean` + `onToggle?: (next: boolean) => void`. No changes to the `ExpandSection` component are required.

### Fix Location

**One file only**: `src/features/providers/components/ProviderDetailSections.tsx`

Three `ExpandSection` instances (lines 283, 289, 307) need `isOpen` and `onToggle` props, using new string keys `'opening-hours'`, `'standorte'`, and `'nearby'` respectively.

Note on Weitere Standorte: the section is conditionally rendered inside `<div id="standorte-section">`. The `ExpandSection` at line 289 needs the props — the outer `<div>` wrapper is unrelated.

---

## Bug 2 — Inconsistent Gap Spacing

### Root Cause (L1 Proven)

The internal flex container in `ProviderDetailSections.tsx` (line 214) uses `gap-8` (32 px) between all accordion sections. In the **mobile path** (`ProviderDetailPage.tsx`), the wrapper div that holds `ProviderDetailSections` uses `mt-4` (16 px) as the top margin from the preceding content block (Barakah section or contact-icon row). This creates a visible rhythm break: 16 px before the first section, then 32 px between every subsequent section.

### Evidence

**Mobile path** — `src/components/providers/ProviderDetailPage.tsx` line 540:

```jsx
<div className="mx-6 mt-4 space-y-4">   {/* mt-4 = 16 px */}
  <ProviderDetailSections ... />
</div>
```

Preceding sibling (Barakah present): `<div className="mx-6 mt-4 rounded-2xl ...">` at line 457 or 477.
Preceding sibling (Barakah absent): `<div className="mt-4 flex items-center gap-4">` (contact icons) at line 421.

Gap from any preceding sibling → Halal Check = **16 px** (mt-4).

**Internal sections** — `src/features/providers/components/ProviderDetailSections.tsx` line 214:

```jsx
<div className="flex flex-col gap-8 self-stretch">   {/* gap-8 = 32 px */}
```

Gap between every accordion section = **32 px**.

**Desktop path** — `src/components/providers/ProviderDetailModal.tsx`:

The right-panel content wrapper at line 608 uses `gap-8 self-stretch`. Both the Barakah card → Halal Check gap and the inter-section gap are 32 px. Desktop is **consistent** and does not have this bug.

The bug is mobile-only.

### Fix Options

| Option | Change | Mobile result | Desktop impact |
|---|---|---|---|
| **(a) Reduce inner gap** | `ProviderDetailSections.tsx` line 214: `gap-8` → `gap-4` | 16 px outer + 16 px inner ✅ | 32 px outer (Barakah → Halal) + 16 px inner — minor hierarchy difference, not a regression |
| **(b) Increase outer margin** | `ProviderDetailPage.tsx` line 540: `mt-4` → `mt-8` | 32 px outer + 32 px inner ✅ | No change |

**Recommended fix: Option (a)** — change `gap-8` to `gap-4` in `ProviderDetailSections.tsx`.

Rationale:
- The user's stated goal is "all gaps uniform, **matching the first-to-Halal-Check gap**" — the reference measurement is the current 16 px outer gap, so all section gaps should become 16 px.
- Option (b) would make gaps uniform at 32 px, which contradicts the user's stated reference.
- The desktop minor hierarchy difference (32 px Barakah→Halal, 16 px between accordion items) is a natural visual hierarchy — major content block vs repeated accordion items.
- `gap-4` is consistent with the `mt-4` spacing already used everywhere in the mobile layout.

### TrustBadgesSection Placement Note

`TrustBadgesSection` at line 305 is a **direct child** of the `gap-8` flex container. It participates in the gap spacing and will automatically use `gap-4` after the fix with no code change required. It renders its own `rounded-2xl bg-white p-4 shadow-sm` card, visually matching the ExpandSection cards. If `badges` is empty and not loading, it returns `null`, removing itself from the gap flow.

---

## Findings Summary

| # | Bug | Confidence | Root Cause | Fix File(s) | Key Lines |
|---|---|---|---|---|---|
| 1 | Accordion not exclusive | L1 Proven | 3 ExpandSection instances left in uncontrolled mode after Plan 195 | `ProviderDetailSections.tsx` | 283, 289, 307 |
| 2 | Inconsistent gap spacing | L1 Proven | `gap-8` (32 px) internal vs `mt-4` (16 px) outer — mobile only | `ProviderDetailSections.tsx` | 214 |

---

## Remaining Gaps

None. Both root causes are fully resolved by static inspection. No reproduction, telemetry, or POC required — the fix locations are unambiguous single-file changes.

---

## Analysis Recommendations

1. Planner: convert lines 283, 289, and 307 to controlled mode using keys `'opening-hours'`, `'standorte'`, `'nearby'`.
2. Planner: change `gap-8` → `gap-4` at line 214.
3. QA: verify on mobile (UAT provider `33084ad8-72a0-42d2-b6ef-ff5065709d5d`) — tap each section and confirm all others collapse; confirm uniform spacing between all cards.
4. QA: verify desktop modal is unaffected.
5. Testing: update `ProviderDetailSections.test.tsx` — add test cases for accordion exclusivity across all 6 sections (opening-hours, standorte, nearby were not covered by Plan 195 tests).
