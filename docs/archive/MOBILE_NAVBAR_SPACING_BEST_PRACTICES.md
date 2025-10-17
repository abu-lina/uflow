# Mobile Navbar Spacing - Best Practices

## Problem

When using fixed bottom navbars on mobile, content can get hidden behind the navbar when scrolling to the bottom. This is especially problematic on iOS devices with safe area insets.

## ❌ Bad Practice (What NOT to Do)

```tsx
// Hardcoded magic numbers
<div className="pb-32">  // 128px - What is this? Why 128?
<div className="pb-[180px]">  // Where did 180 come from?
```

**Issues:**
- Magic numbers with no documentation
- Not responsive to safe areas
- Breaks when navbar height changes
- Hard to maintain across pages
- No single source of truth

## ✅ Best Practice (What TO Do)

Use the `mobile-nav-spacing` utility class:

```tsx
<div className="mobile-nav-spacing">
  {/* Your content */}
</div>
```

## How It Works

### 1. CSS Variables (Single Source of Truth)

**File:** `src/styles/globals.css`

```css
:root {
  /* Mobile navigation spacing */
  --mobile-nav-height: 96px;      /* 80px container + 16px (pb-4) */
  --mobile-nav-spacing: 32px;     /* Gap between content and nav */
  --mobile-nav-total: calc(var(--mobile-nav-height) + var(--mobile-nav-spacing)); /* 128px */
}
```

### 2. Utility Class with Dynamic Safe Area

```css
.mobile-nav-spacing {
  /* 96px navbar + 32px gap + safe area */
  padding-bottom: calc(var(--mobile-nav-total) + max(12px, env(safe-area-inset-bottom)));
}
```

**This calculates:**
- Base: 128px (navbar + spacing)
- Plus: Dynamic safe area (34px on iPhone X+, 12px minimum on older devices)
- **Total: ~140-162px depending on device**

## Benefits

✅ **Maintainable**: Change navbar height in ONE place  
✅ **Responsive**: Automatically adapts to safe areas  
✅ **Consistent**: All pages use the same spacing  
✅ **Self-documenting**: CSS variables explain themselves  
✅ **Device-aware**: Works on all iOS devices (SE to Pro Max)  

## Where to Use

### Scrollable Content Areas

```tsx
// ✅ Good
<div className="content-scroll-container overflow-y-auto mobile-nav-spacing">
  <form>...</form>
</div>

// ❌ Bad
<div className="content-scroll-container overflow-y-auto pb-32">
  <form>...</form>
</div>
```

### Pages with Fixed Bottom Navbars

All create flow pages should use this:
- `/create/location` ✅ Fixed
- `/create/contact` ✅ Already uses it
- `/create/media` ✅ Already uses it
- `/create/basics/offers` ✅ Already uses it
- etc.

## Related Utilities

### For Height (Navbars)

```tsx
<div className="mobile-nav-height">
  {/* Sets height dynamically */}
</div>
```

### For Other Safe Areas

```tsx
<div className="pt-safe-top">     {/* Top notch */}
<div className="pb-safe-bottom">  {/* Bottom home indicator */}
<div className="p-safe">          {/* All sides */}
```

## When Navbar Changes

If you ever need to change navbar height:

1. Update the CSS variable in `globals.css`:
   ```css
   --mobile-nav-height: 100px; /* New height */
   ```

2. **That's it!** All pages update automatically.

## Architecture Pattern

```
CSS Variables (globals.css)
    ↓
Utility Classes (globals.css)
    ↓
Component Usage (pages)
```

This follows the **Single Source of Truth** principle and keeps the codebase maintainable.

## Testing Checklist

When implementing:
- [ ] Test on iPhone SE (no safe area)
- [ ] Test on iPhone 14 Pro (dynamic island)
- [ ] Test on iPhone 15 Pro Max (large safe area)
- [ ] Test in landscape orientation
- [ ] Test in PWA standalone mode
- [ ] Scroll to bottom and verify all content is visible
- [ ] Verify comfortable spacing above navbar

## References

- CSS Variables: `src/styles/globals.css:21-24`
- Utility Class: `src/styles/globals.css:444-448`
- Example Usage: Multiple pages in `src/app/(public)/`

---

**Remember:** Always use semantic utility classes over magic numbers!

