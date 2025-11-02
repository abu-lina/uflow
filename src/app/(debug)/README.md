# Debug Pages

Debug pages for testing and inspecting UI components.

## Available Debug Pages

### `/button-debug` - Button Gradient Debug Tool
- Tests gradient rendering with different wrapper scenarios
- Auto-logs gradient inspection to console
- Shows parent opacity chain
- **Use this to debug gradient color issues**

### `/gradient-test` - Gradient Test Page
- Interactive gradient inspection
- Uses `inspectGradient()` utility function
- Click buttons to inspect gradients in console
- **Best for quick gradient checks**

### `/gradient-inspector` - Simple Gradient Inspector
- Direct gradient tests
- Color swatches reference
- Simple comparison tests

### `/button-comparison` - Button Comparison
- Side-by-side comparison of implementations
- Static vs animated versions
- Our implementation vs Figma

## Using the Gradient Debug Utility

The `inspectGradient()` function is available globally in console when you visit any debug page.

### In Browser Console:
```javascript
// Inspect any gradient element
inspectGradient(document.querySelector('[data-gradient-test]'));

// Or manually find the element
const button = document.querySelector('button');
const gradient = button?.querySelector('[style*="linear-gradient"]');
inspectGradient(gradient);
```

### What It Shows:
- Computed background-image
- Opacity values
- Parent opacity chain (identifies dimming sources)
- Total effective opacity
- Warnings if opacity < 1 is found

## Cleanup Status

✅ Removed verbose logging from `getAllBookmarkedItems()`
✅ Removed debug logs from `getCommunityServices()`
✅ Kept only error logging (`console.error`)
✅ Created reusable gradient debug utility
✅ Organized debug pages in `/app/(debug)/`

## Gradient Specification

The correct gold gradient is:
```css
background: linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%);
```

This is used in:
- `src/components/ui/BarikButton.tsx`
- All debug test pages
- Should match Figma exactly

