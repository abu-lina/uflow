# Figma Scroll Pattern

## Overview

This document describes the **Figma Scroll Pattern** - a standardized page structure that enables the PageHeader blur/glass effect to work correctly.

## Why This Pattern?

The backdrop-filter blur effect requires specific DOM structure and stacking contexts to work properly:

1. **Scroll container must be explicit**: The element with `overflow-y-auto` must be a ref-accessible container
2. **Header positioning**: The header uses `position: fixed` relative to viewport
3. **Scroll detection**: Header needs a ref to the scroll container to detect scroll position
4. **Stacking context**: Proper isolation ensures backdrop-filter blurs the correct content

## Components

### 1. FigmaScrollContainer

The main wrapper that provides the scroll context.

```tsx
import { FigmaScrollContainer } from '@/components/layout';

<FigmaScrollContainer>
  {/* Your page content */}
</FigmaScrollContainer>
```

**Features:**
- Automatically injects `scrollContainerRef` into PageHeader
- Handles absolute positioning and overflow
- Default background gradient (customizable)

**Props:**
```tsx
interface FigmaScrollContainerProps {
  children: ReactNode;
  background?: string;  // default: 'bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]'
  className?: string;
}
```

### 2. FigmaPageContent

Content wrapper that provides consistent spacing.

```tsx
import { FigmaPageContent } from '@/components/layout';

<FigmaPageContent hasFooter>
  {/* Your content */}
</FigmaPageContent>
```

**Features:**
- Proper top padding (accounts for safe area + header height)
- Configurable max-width
- Footer padding support
- Renders as `<main>` by default

**Props:**
```tsx
interface FigmaPageContentProps {
  children: ReactNode;
  maxWidth?: 'full' | '361px' | '480px' | '640px';  // default: '361px'
  paddingX?: string;  // default: 'px-6'
  paddingBottom?: string;  // default: 'pb-8'
  hasFooter?: boolean;  // default: false
  className?: string;
  asMain?: boolean;  // default: true
}
```

## Usage Examples

### Basic Page

```tsx
'use client';

import { PageHeader, FigmaScrollContainer, FigmaPageContent } from '@/components/layout';

export default function MyPage() {
  return (
    <FigmaScrollContainer>
      <PageHeader 
        title="My Page" 
        variant="back-and-title" 
        onBack="/back" 
      />
      
      <FigmaPageContent>
        <h1>Content here</h1>
        {/* Your page content */}
      </FigmaPageContent>
    </FigmaScrollContainer>
  );
}
```

### Page with Footer

```tsx
'use client';

import { PageHeader, FigmaScrollContainer, FigmaPageContent } from '@/components/layout';
import { FooterAction } from '@/components/ui';

export default function MyPageWithFooter() {
  return (
    <FigmaScrollContainer>
      <PageHeader 
        title="My Page" 
        variant="back-and-title" 
        onBack="/back" 
      />
      
      <FigmaPageContent hasFooter>
        {/* Content */}
      </FigmaPageContent>
      
      <FooterAction
        actionButton={{
          label: 'Save',
          onClick: handleSave,
        }}
      />
    </FigmaScrollContainer>
  );
}
```

### Custom Background & Max Width

```tsx
<FigmaScrollContainer background="bg-gradient-to-b from-blue-50 to-purple-50">
  <PageHeader title="Custom Page" variant="title-only" />
  
  <FigmaPageContent maxWidth="640px" paddingX="px-8">
    {/* Wider content */}
  </FigmaPageContent>
</FigmaScrollContainer>
```

## Migration Guide

### Before (Old Pattern)

```tsx
import { PageLayout, PageHeader, HeaderSpacer, PageContentWrapper } from '@/components/layout';

return (
  <PageLayout hasBackground={false} maxWidth="full">
    <PageHeader title="My Page" variant="back-and-title" onBack="/back" />
    <HeaderSpacer />
    
    <PageContentWrapper includeMobileNavSpacing maxWidth="full" padding="lg-safe">
      <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8">
        {/* Content */}
      </div>
    </PageContentWrapper>
    
    <FooterAction ... />
  </PageLayout>
);
```

### After (New Pattern)

```tsx
import { PageHeader, FigmaScrollContainer, FigmaPageContent } from '@/components/layout';

return (
  <FigmaScrollContainer>
    <PageHeader title="My Page" variant="back-and-title" onBack="/back" />
    
    <FigmaPageContent hasFooter className="flex flex-col gap-8">
      {/* Content */}
    </FigmaPageContent>
    
    <FooterAction ... />
  </FigmaScrollContainer>
);
```

## Benefits

✅ **Cleaner code**: Fewer wrapper components
✅ **Automatic scroll ref injection**: No manual ref management
✅ **Consistent spacing**: Standardized padding and safe area handling
✅ **Working blur effect**: Properly configured stacking contexts
✅ **Better DX**: Single import, clear API
✅ **Maintainable**: Centralized layout logic

## Technical Details

### Spacing Calculations

**Top Padding:**
```
pt-[calc(env(safe-area-inset-top) + 88px)]
```
- `env(safe-area-inset-top)`: Device notch/status bar
- `88px`: Header height (64px content + 24px padding)

**Bottom Padding (with footer):**
```
pb-[calc(80px + env(safe-area-inset-bottom))]
```
- `80px`: Footer height
- `env(safe-area-inset-bottom)`: Device home indicator

### Backdrop Filter Requirements

1. Element with `backdrop-filter` must have `position: fixed` or `position: sticky`
2. Must have semi-transparent background
3. Must have `isolation: isolate` for proper stacking context
4. Content behind must be in same or parent stacking context

## Troubleshooting

### Blur not visible

**Issue**: Blur effect appears not to work
**Cause**: Content is too light (gray on gray)
**Solution**: Use colorful content or test with vibrant gradients

### ScrollRef not working

**Issue**: Header doesn't detect scroll
**Cause**: PageHeader not receiving scrollContainerRef
**Solution**: Ensure PageHeader is direct child of FigmaScrollContainer

### Content hidden behind header

**Issue**: Top content is cut off
**Cause**: Insufficient top padding
**Solution**: Use FigmaPageContent which handles padding automatically

## Examples in Codebase

- `src/app/(public)/create/basics/category/page.tsx` - Production example
- `src/app/(public)/test-header/page.tsx` - Test page with colorful content
- `src/app/(public)/figma-test/page.tsx` - Figma reference implementation

## Related Components

- `PageHeader` - The header component with blur effect
- `FooterAction` - Fixed footer button component
- `PageLayout` - Legacy layout (still used in some pages)
- `PageContentWrapper` - Legacy content wrapper

## Future Improvements

- [ ] Automatic migration script for old pattern
- [ ] Support for horizontal scroll
- [ ] Performance optimization for scroll detection
- [ ] Theme-based background gradients

