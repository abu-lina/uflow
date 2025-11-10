# ScrollablePageLayout Pattern

## Overview

The **ScrollablePageLayout** pattern enables the PageHeader blur/glass effect. This is the recommended approach for all new pages and refactored existing pages.

## Component Names (Semantic & Clear)

| Component | Purpose | Replaces |
|-----------|---------|----------|
| `ScrollablePageLayout` | Main layout container with scroll context | `PageLayout`, `FigmaScrollContainer` |
| `PageContent` | Content wrapper with proper spacing | `PageContentWrapper`, `FigmaPageContent` |
| `PageHeader` | Header with blur/glass effect | (unchanged) |
| `FooterAction` | Fixed footer button | (unchanged) |

## Why These Names?

✅ **ScrollablePageLayout** - Clear that it's scrollable and a layout container
✅ **PageContent** - Simple, semantic, describes what it holds
❌ **FigmaScrollContainer** - References tool, not purpose (deprecated)
❌ **FigmaPageContent** - Same issue (deprecated)

## Basic Usage

```tsx
import { PageHeader, ScrollablePageLayout, PageContent } from '@/components/layout';
import { FooterAction } from '@/components/ui';

export default function MyPage() {
  return (
    <ScrollablePageLayout>
      <PageHeader 
        title="My Page" 
        variant="back-and-title" 
        onBack="/back" 
      />
      
      <PageContent hasFooter>
        <h1>Your content here</h1>
        {/* More content */}
      </PageContent>
      
      <FooterAction
        actionButton={{
          label: 'Next',
          onClick: handleNext,
        }}
      />
    </ScrollablePageLayout>
  );
}
```

## Component APIs

### ScrollablePageLayout

```tsx
interface ScrollablePageLayoutProps {
  children: ReactNode;
  background?: string;  // default: 'bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]'
  className?: string;
}
```

**What it does:**
- Creates scroll container for blur effect
- Auto-injects scroll ref to PageHeader
- Manages stacking contexts for backdrop-filter

### PageContent

```tsx
interface PageContentProps {
  children: ReactNode;
  maxWidth?: 'full' | '361px' | '480px' | '640px';  // default: '361px'
  paddingX?: string;  // default: 'px-6'
  paddingBottom?: string;  // default: 'pb-8'
  hasFooter?: boolean;  // default: false - set true when using FooterAction
  className?: string;
  asMain?: boolean;  // default: true - renders as <main> element
}
```

**What it does:**
- Proper top padding (safe area + header height)
- Automatic footer spacing when `hasFooter={true}`
- Centered content with max-width
- Renders as semantic `<main>` by default

## Migration Guide

### Old Pattern (Legacy)
```tsx
import { PageLayout, PageHeader, HeaderSpacer, PageContentWrapper } from '@/components/layout';

<PageLayout hasBackground={false} maxWidth="full">
  <PageHeader title="My Page" variant="back-and-title" onBack="/back" />
  <HeaderSpacer />
  
  <PageContentWrapper maxWidth="full" padding="lg-safe">
    <div className="flex w-full max-w-[361px] flex-col gap-8">
      {content}
    </div>
  </PageContentWrapper>
  
  <FooterAction ... />
</PageLayout>
```

### New Pattern (Recommended)
```tsx
import { PageHeader, ScrollablePageLayout, PageContent } from '@/components/layout';

<ScrollablePageLayout>
  <PageHeader title="My Page" variant="back-and-title" onBack="/back" />
  
  <PageContent hasFooter className="flex flex-col gap-8">
    {content}
  </PageContent>
  
  <FooterAction ... />
</ScrollablePageLayout>
```

## Benefits

✅ **Clear naming** - Immediately understand component purpose
✅ **Working blur effect** - Proper scroll context and stacking
✅ **Less code** - No HeaderSpacer, no extra wrappers
✅ **Auto-magic** - Scroll ref handled automatically
✅ **Type-safe** - Full TypeScript support
✅ **Semantic** - Uses `<main>` element by default

## Examples

### Simple Page
```tsx
<ScrollablePageLayout>
  <PageHeader title="Simple Page" variant="title-only" />
  <PageContent>
    <h1>Hello World</h1>
  </PageContent>
</ScrollablePageLayout>
```

### Page with Footer
```tsx
<ScrollablePageLayout>
  <PageHeader title="Form Page" variant="back-and-title" onBack="/" />
  <PageContent hasFooter>
    <FormFields />
  </PageContent>
  <FooterAction
    actionButton={{
      label: 'Save',
      onClick: handleSave,
    }}
  />
</ScrollablePageLayout>
```

### Custom Background & Width
```tsx
<ScrollablePageLayout background="bg-gradient-to-br from-blue-50 to-purple-50">
  <PageHeader title="Wide Page" variant="title-only" />
  <PageContent maxWidth="640px" paddingX="px-8">
    <WideContent />
  </PageContent>
</ScrollablePageLayout>
```

## Technical Details

### How Blur Works

1. **ScrollablePageLayout** creates a scroll container
2. Automatically passes ref to **PageHeader**
3. **PageHeader** detects scroll and applies:
   - `backdrop-filter: blur(20px) saturate(180%)`
   - `background: rgba(255, 255, 255, 0.15)`
   - Smooth 300ms transition

### Spacing Calculations

**Top Padding** (`PageContent`):
```
pt-[calc(env(safe-area-inset-top) + 88px)]
```
- Safe area inset: Device notch
- 88px: Header height

**Bottom Padding** (with footer):
```
pb-[calc(80px + env(safe-area-inset-bottom))]
```
- 80px: Footer height
- Safe area inset: Device home indicator

## Troubleshooting

### Blur not visible?
**Issue**: Effect is there but invisible
**Cause**: Content is too light (gray on gray)
**Solution**: Use colorful content or test with vibrant gradients

### Scroll not detected?
**Issue**: Header doesn't blur on scroll
**Cause**: PageHeader not receiving ref
**Solution**: Ensure PageHeader is direct child of ScrollablePageLayout

### Content hidden behind header?
**Issue**: Top content cut off
**Cause**: Insufficient top padding
**Solution**: Use PageContent component (handles padding automatically)

## Related Documentation

- `docs/HEADER_BLUR_REFACTOR_SUMMARY.md` - Complete refactor details
- `docs/FIGMA_SCROLL_PATTERN.md` - Original Figma-based docs (deprecated naming)
- `src/app/(public)/test-header/page.tsx` - Example with colorful content
- `src/app/(public)/create/basics/category/page.tsx` - Production example

## Deprecation Notice

The following components still work but use unclear naming:
- ❌ `FigmaScrollContainer` → Use `ScrollablePageLayout` instead
- ❌ `FigmaPageContent` → Use `PageContent` instead

Both are exported for backward compatibility but will be removed in future versions.

