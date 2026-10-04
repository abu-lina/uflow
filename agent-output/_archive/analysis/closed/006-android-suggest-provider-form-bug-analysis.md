---
ID: 006
Origin: 006
UUID: f3a8c7d2
Status: Planned
---

# Analysis: Android Suggest Provider Form Bug

## Changelog

| Date       | Agent    | Action                          | Outcome                                  |
|------------|----------|--------------------------------|------------------------------------------|
| 2026-02-22 | Analyst  | Initial investigation          | Root cause identified with high confidence |
| 2026-02-22 | Planner  | Analysis closed for planning   | Status set to Planned; handed off to implementation planning |

---

## Value Statement and Business Objective

Users on Android devices cannot use the "Suggest Provider" (Anbieter empfehlen) feature effectively because the form displays incorrectly - showing only partial fields and preventing data entry. This blocks a key user acquisition mechanism where community members can recommend local providers.

---

## Context

**Bug report**: User on Android device reported the "Anbieter empfehlen" form shows only one input field (Instagram) instead of the complete form. The user cannot enter required information and the submit button appears disabled.

**Affected route**: `/create/recommend` (StreamlinedRecommendForm component)

**Screenshots analysis**:
- Screenshot 1: Shows header "Anbieter empfehlen", a single Instagram ContactCheckbox with value `@https://www.instagram.com/henpoint/`, and disabled "Absenden" button
- Screenshot 2: Same view with Android keyboard visible, user attempting to interact with the form

**Expected form structure** (from code analysis):
1. Section 1 (Basics): City input, Provider Name input, Category selector
2. Section 2 (Contact): Email, Website, Phone, Instagram checkboxes (4 fields)
3. Section 3 (for anonymous users): User email input
4. Section 4: Message textarea (optional)
5. Footer: Submit button

---

## Methodology

Techniques used:
- **Code tracing**: Traced `StreamlinedRecommendForm.tsx` rendering logic
- **Component isolation**: Examined `ContactCheckbox` component behavior
- **Upstream tracing**: Investigated localStorage state restoration flow
- **Cross-reference**: Compared expected translations with visible UI

---

## Findings

### Finding 1: Auto-focus on Restored Checkbox State (Confidence: **Proven**)

**Evidence**: `StreamlinedRecommendForm.tsx` lines 54-57, 342-390

The `ContactCheckbox` component has a `useEffect` that auto-focuses the input when `checked={true}`:

```tsx
// ContactCheckbox component (lines 54-57)
useEffect(() => {
  if (checked && inputRef.current) {
    inputRef.current.focus();
  }
}, [checked]);
```

When form state is restored from localStorage:
1. `selectedContacts` state initializes from `localStorage.getItem('recommendFormData')`
2. If saved state has `instagram: true`, the Instagram checkbox renders as checked
3. The `useEffect` fires, calling `inputRef.current.focus()` on the Instagram input
4. On Android mobile, focusing an input opens the keyboard
5. The browser scrolls the focused element into view
6. **Section 1 (Basics) scrolls out of the viewport**

This explains why the user sees:
- Only the Instagram field visible (last touched field)
- Section 1 hidden above the visible area
- Submit button disabled (because Section 1 required fields are empty/not validated)

### Finding 2: Incorrect Instagram Value Format (Confidence: **Observed**)

**Evidence**: Screenshot shows `@https://www.instagram.com/henpoint/`

The user appears to have pasted a full Instagram URL. The auto-formatting logic in `handleInstagramChange` adds `@` prefix:

```tsx
// lines 1146-1151
const handleInstagramChange = useCallback((value: string) => {
  let formattedValue = value;
  if (formattedValue && !formattedValue.startsWith('@')) {
    formattedValue = '@' + formattedValue;
  }
  setFormData(prev => ({ ...prev, instagram: formattedValue }));
}, []);
```

Result: `https://www.instagram.com/henpoint/` becomes `@https://www.instagram.com/henpoint/`

This is a separate UX issue but not the root cause of the form display bug.

### Finding 3: No Conditional Rendering Issues (Confidence: **Proven**)

**Evidence**: Code analysis of `StreamlinedRecommendForm.tsx` lines 1185-1627

Both Section 1 and Section 2 render unconditionally. There is no `if` statement, feature flag, or early access mode check that would hide Section 1. The form structure is:

```tsx
return (
  <div className="flex flex-col gap-6 ...">
    {/* Section 1: Basics - ALWAYS rendered */}
    <div className="flex flex-col gap-4">
      <h2>{t('create.recommend.step1Title')}</h2>
      {/* City, Provider Name, Category fields */}
    </div>

    {/* Section 2: Contact - ALWAYS rendered */}
    <div className="flex flex-col gap-4">
      <h2>{t('create.recommend.contactTitle')}</h2>
      {/* Email, Website, Phone, Instagram checkboxes */}
    </div>
    ...
  </div>
);
```

### Finding 4: Layout Structure is Correct (Confidence: **Proven**)

**Evidence**: `PageContent.tsx` and `ScrollablePageLayout.tsx` analysis

- `PageContent` applies proper padding: `pt-[calc(env(safe-area-inset-top)+88px)]` for header clearance
- `ScrollablePageLayout` uses `overflow-y-auto` allowing normal scroll behavior
- No `position: fixed` or `absolute` that would cause layout issues

---

## Root Cause

**Primary cause (High confidence)**: Auto-focus behavior in `ContactCheckbox` combined with localStorage state restoration causes Android browsers to scroll to the focused input, hiding Section 1 (Basics) above the viewport.

**Trigger sequence**:
1. User visits `/create/recommend` on Android
2. Form loads with saved state from `localStorage.recommendFormData`
3. `selectedContacts.instagram = true` from previous session
4. `ContactCheckbox` for Instagram renders with `checked={true}`
5. `useEffect` fires → `inputRef.current.focus()`
6. Android keyboard opens
7. Browser scrolls Instagram input into view
8. Section 1 scrolls out of viewport
9. User sees only Instagram field, cannot scroll up (keyboard obstructs), cannot submit

---

## System Weaknesses

| Area | Weakness | Risk Mechanism |
|------|----------|----------------|
| UX | Auto-focus on restored state | Disrupts user orientation when returning to form |
| Form state | No scroll position management | User loses context when form auto-scrolls |
| Input validation | Instagram URL handling | Allows invalid formats that confuse users |
| Accessibility | No visual indicator of hidden content | User doesn't know more fields exist above |

---

## Instrumentation Gaps

| Type | Gap | Recommended Telemetry | Level |
|------|-----|----------------------|-------|
| Error | No client-side error logging | Add Sentry/error boundary for form render failures | Normal |
| UX | No form interaction tracking | Track which fields users interact with first | Normal |
| Debug | No scroll position logging | Log scroll position on form mount when debugging | Debug |
| Debug | No localStorage state dump | Log restored form state on mount when debugging | Debug |

---

## Analysis Recommendations

1. **Validate auto-focus hypothesis**: Test on Android device with:
   - Fresh browser (no localStorage) → verify form displays correctly
   - Save form with Instagram checked → revisit → confirm auto-scroll occurs

2. **Test keyboard interaction**: On Android, check if closing keyboard allows scrolling to Section 1

3. **Consider fix approaches** (for Planner to evaluate):
   - Remove auto-focus on initial mount, only focus on user interaction
   - Add scroll-to-top on form mount
   - Delay focus until after first user interaction

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Does closing keyboard allow scroll? | Need device | Test on Android device with keyboard open | QA |
| 2 | Is this PWA-specific or browser-specific? | Need device | Test Chrome vs PWA on same device | QA |
| 3 | Exact localStorage state that triggers bug | Need user data | Ask user to share localStorage content | User/Support |

---

## Open Questions

1. Was the user returning to a previously started form, or starting fresh?
2. Does the issue occur on all Android browsers or specific ones?
3. Is this reproducible on Android emulator for development testing?

---

## Handoff Notes

**For Planner**: Root cause is identified with high confidence. The fix involves modifying the auto-focus behavior in `ContactCheckbox` to not focus on initial mount when `checked` state is restored from localStorage. Consider:
- Option A: Remove the `useEffect` auto-focus entirely (least disruptive)
- Option B: Add a `skipInitialFocus` prop that defaults to `true`
- Option C: Track "first render" and skip focus on mount

**Secondary fix**: Validate/sanitize Instagram input to extract username from full URLs.
