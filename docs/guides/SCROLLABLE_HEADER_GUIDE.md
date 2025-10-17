# Scrollable Header Components Guide

## Overview

This guide explains the reusable scrollable header system that ensures consistent scroll behavior across all pages in the application.

## Components & Hooks

### 1. `useContainerScroll` Hook

**Location:** `src/hooks/useContainerScroll.ts`

A custom React hook that detects scroll direction in a specific container with iOS optimizations.

#### Features
- ✅ Hide header when scrolling down, show when scrolling up
- ✅ Always show header at top of page
- ✅ iOS rubber band effect protection
- ✅ Jitter prevention with minimum delta
- ✅ Throttled with requestAnimationFrame for performance
- ✅ Configurable thresholds and settings

#### Usage

```tsx
import { useContainerScroll } from '@/hooks/useContainerScroll';

export default function MyPage() {
  const { isHeaderVisible } = useContainerScroll();
  
  return (
    <div>
      <ScrollablePageHeader isVisible={isHeaderVisible} title="My Page" />
      <div className="content-scroll-container">
        {/* Your scrollable content */}
      </div>
    </div>
  );
}
```

#### Options

```tsx
const { isHeaderVisible } = useContainerScroll({
  containerSelector: '.custom-scroll-container', // Default: '.content-scroll-container'
  scrollThreshold: 10,      // Minimum px from top before header can hide
  minScrollDelta: 8,        // Minimum scroll distance to trigger change
  boundaryBuffer: 50,       // Buffer zone for bottom boundary (iOS protection)
  initDelay: 100,           // Delay before attaching listener
});
```

### 2. `ScrollablePageHeader` Component

**Location:** `src/components/layout/ScrollablePageHeader.tsx`

A reusable header component with consistent styling and scroll behavior.

#### Features
- ✅ Consistent styling across all pages
- ✅ Smooth show/hide animation based on scroll
- ✅ Optional back button
- ✅ Flexible right-side content
- ✅ Safe area support for mobile devices
- ✅ Custom content support

#### Basic Usage

```tsx
import { ScrollablePageHeader } from '@/components/layout/ScrollablePageHeader';
import { useContainerScroll } from '@/hooks/useContainerScroll';

export default function MyPage() {
  const { isHeaderVisible } = useContainerScroll();
  
  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col">
      <ScrollablePageHeader
        title="My Page"
        isVisible={isHeaderVisible}
      />
      
      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderVisible ? 'h-16' : 'h-0'
      }`} />
      
      {/* Scrollable content */}
      <div className="content-scroll-container flex flex-1 flex-col overflow-y-auto">
        {/* Your content here */}
      </div>
    </div>
  );
}
```

#### With Back Button

```tsx
<ScrollablePageHeader
  title="Edit Profile"
  isVisible={isHeaderVisible}
  onBack="/profile"  // or use a function: onBack={() => router.back()}
/>
```

#### With Right-Side Content

```tsx
<ScrollablePageHeader
  title="Settings"
  isVisible={isHeaderVisible}
  rightContent={
    <button onClick={handleSave}>
      Save
    </button>
  }
/>
```

#### With Custom Content

```tsx
<ScrollablePageHeader
  title="Custom"
  isVisible={isHeaderVisible}
  customContent={
    <div className="flex w-full justify-between items-center">
      <Logo />
      <button>Actions</button>
    </div>
  }
/>
```

## Implementation Pattern

### Complete Page Example

```tsx
'use client';

import { ScrollablePageHeader } from '@/components/layout/ScrollablePageHeader';
import { useContainerScroll } from '@/hooks/useContainerScroll';

export default function ExamplePage() {
  const { isHeaderVisible } = useContainerScroll();

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Scrollable Header */}
      <ScrollablePageHeader 
        title="Example Page"
        isVisible={isHeaderVisible}
        onBack="/home"
      />

      {/* Spacer prevents content jump when header hides */}
      <div className={`transition-all duration-300 ${
        isHeaderVisible ? 'h-16' : 'h-0'
      }`} />

      {/* Main scrollable content - MUST have class 'content-scroll-container' */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 mobile-nav-spacing overflow-y-auto">
        {/* Your page content here */}
        <p>This content will scroll and trigger the header visibility</p>
      </div>
    </div>
  );
}
```

## Pages Already Migrated

### ✅ Saved Page (`/saved`)
- Uses `ScrollablePageHeader` with local search filtering
- Smooth scroll behavior with hide/show header

### ✅ Profile Page (`/profile`)
- Uses `ScrollablePageHeader` for consistent UX
- Header hides on scroll down, shows on scroll up
- Applied to mobile view

### ✅ Create Flow Pages
The following pages already had complex scroll logic that inspired this system:
- `/create/basics`
- `/create/location`
- `/create/contact`
- `/create/media`
- `/create/media/images`
- `/create/media/social`

**Note:** These pages can be refactored to use the new hook to reduce code duplication.

## Migration Guide

To convert an existing page to use the new scrollable header system:

### Before

```tsx
export default function OldPage() {
  return (
    <div className="relative flex h-screen">
      <div className="fixed top-0 left-0 right-0 bg-white z-50">
        <h1>My Page</h1>
      </div>
      
      <div className="pt-20 overflow-y-auto">
        {/* content */}
      </div>
    </div>
  );
}
```

### After

```tsx
import { ScrollablePageHeader } from '@/components/layout/ScrollablePageHeader';
import { useContainerScroll } from '@/hooks/useContainerScroll';

export default function NewPage() {
  const { isHeaderVisible } = useContainerScroll();
  
  return (
    <div className="relative flex h-screen">
      <ScrollablePageHeader 
        title="My Page"
        isVisible={isHeaderVisible}
      />
      
      <div className={`transition-all duration-300 ${
        isHeaderVisible ? 'h-16' : 'h-0'
      }`} />
      
      <div className="content-scroll-container flex-1 overflow-y-auto">
        {/* content */}
      </div>
    </div>
  );
}
```

## Important Notes

1. **Container Class:** The scroll container **MUST** have the class `content-scroll-container` (or configure a custom selector)

2. **Spacer div:** Always include the spacer div to prevent content jump when the header hides/shows

3. **iOS Optimization:** The hook includes special handling for iOS rubber band effects and boundary detection

4. **Performance:** Uses `requestAnimationFrame` for optimal performance

5. **Accessibility:** The ScrollablePageHeader includes proper ARIA labels and keyboard navigation

## Benefits

- ✅ **Consistency:** All headers behave the same way
- ✅ **Reusability:** Write once, use everywhere
- ✅ **Maintainability:** Single source of truth for header behavior
- ✅ **Performance:** Optimized scroll detection
- ✅ **iOS-friendly:** Special handling for mobile Safari
- ✅ **Customizable:** Flexible options for different use cases

## Future Improvements

- [ ] Refactor remaining create flow pages to use the new system
- [ ] Add unit tests for the hook
- [ ] Consider adding animation customization options
- [ ] Add documentation for edge cases and troubleshooting

---

**Last Updated:** October 2025
**Author:** UFlow Development Team

