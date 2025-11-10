# Component Naming Comparison

## New Names (Clear & Semantic) ✅

| Component | Purpose | Import |
|-----------|---------|--------|
| **ScrollablePageLayout** | Main layout container with scroll context for blur effect | `@/components/layout` |
| **PageContent** | Content wrapper with proper spacing (header/footer aware) | `@/components/layout` |
| **PageHeader** | Header with blur/glass effect | `@/components/layout` |
| **FooterAction** | Fixed footer with action buttons | `@/components/ui` |

## Old Names (Deprecated) ❌

| Old Name | Problem | New Name |
|----------|---------|----------|
| `FigmaScrollContainer` | References implementation tool, not purpose | `ScrollablePageLayout` |
| `FigmaPageContent` | References implementation tool, not purpose | `PageContent` |
| `PageLayout` | Doesn't support blur effect | `ScrollablePageLayout` |
| `PageContentWrapper` | Verbose, unclear | `PageContent` |
| `HeaderSpacer` | Manual spacing (not needed) | *(removed - PageContent handles it)* |

## Why Better Names Matter

### ❌ Old Naming Problems

1. **"Figma" in component names**
   - References where code came from, not what it does
   - Confusing for developers who don't know the context
   - Not scalable (what if design changes?)

2. **Verbose names**
   - `PageContentWrapper` - 18 characters
   - `FigmaScrollContainer` - 21 characters

3. **Unclear purpose**
   - "Wrapper"? "Container"? What's the difference?
   - Why "Figma"? Does it only work with Figma designs?

### ✅ New Naming Benefits

1. **Semantic & Clear**
   - `ScrollablePageLayout` - immediately understand it's scrollable
   - `PageContent` - simple, describes what it holds

2. **Concise**
   - `PageContent` - 11 characters
   - `ScrollablePageLayout` - 20 characters (descriptive but clear)

3. **Purpose-Driven**
   - Names describe **what they do**, not where they came from
   - Easy for new developers to understand

## Usage Comparison

### Old Pattern (Verbose & Unclear)
```tsx
import { 
  FigmaScrollContainer, 
  FigmaPageContent 
} from '@/components/layout';

<FigmaScrollContainer>
  <PageHeader ... />
  <FigmaPageContent hasFooter>
    {content}
  </FigmaPageContent>
  <FooterAction ... />
</FigmaScrollContainer>
```

### New Pattern (Clear & Semantic)
```tsx
import { 
  ScrollablePageLayout, 
  PageContent 
} from '@/components/layout';

<ScrollablePageLayout>
  <PageHeader ... />
  <PageContent hasFooter>
    {content}
  </PageContent>
  <FooterAction ... />
</ScrollablePageLayout>
```

## Migration Path

Both naming patterns are available for backward compatibility:

```tsx
// All of these work (but use new names for new code)
import { 
  ScrollablePageLayout,  // ✅ Recommended
  FigmaScrollContainer,   // ❌ Deprecated
  PageContent,            // ✅ Recommended  
  FigmaPageContent        // ❌ Deprecated
} from '@/components/layout';
```

### When to Migrate

- **New pages**: Use `ScrollablePageLayout` + `PageContent`
- **Existing pages**: Can stay with old names (they work)
- **Refactoring**: Update to new names when touching the code

## Full Example Comparison

### Before (Old Names)
```tsx
'use client';

import { useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';

export default function MyPage() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={scrollRef} 
      className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]"
    >
      <PageHeader
        scrollContainerRef={scrollRef}
        title="My Page"
        variant="back-and-title"
        onBack="/"
      />
      
      <main className="pt-[calc(env(safe-area-inset-top)+88px)] px-6 pb-8">
        <div className="max-w-[361px] mx-auto">
          {content}
        </div>
      </main>
    </div>
  );
}
```

### After (New Names)
```tsx
'use client';

import { PageHeader, ScrollablePageLayout, PageContent } from '@/components/layout';

export default function MyPage() {
  return (
    <ScrollablePageLayout>
      <PageHeader
        title="My Page"
        variant="back-and-title"
        onBack="/"
      />
      
      <PageContent>
        {content}
      </PageContent>
    </ScrollablePageLayout>
  );
}
```

**Benefits:**
- ✅ No manual ref management
- ✅ No manual spacing/padding
- ✅ Clearer component names
- ✅ Less code (18 lines → 11 lines)

## Naming Principles Applied

### 1. Descriptive
- `ScrollablePageLayout` tells you it's:
  - Scrollable (can scroll)
  - Page-level (main layout)
  - Layout component (structural)

### 2. Consistent
- `PageHeader` → header for pages
- `PageContent` → content for pages
- `PageLayout` → layout for pages (legacy)

### 3. No Implementation Details
- ❌ `FigmaScrollContainer` (mentions Figma)
- ✅ `ScrollablePageLayout` (describes behavior)

### 4. Intuitive
- New developers can guess what components do
- No need to read docs to understand names
- Self-documenting code

## Summary

| Aspect | Old Names | New Names |
|--------|-----------|-----------|
| **Clarity** | ⚠️ References tool (Figma) | ✅ Describes purpose |
| **Length** | ⚠️ 18-21 characters | ✅ 11-20 characters |
| **Semantics** | ⚠️ Implementation-focused | ✅ Purpose-focused |
| **Discoverability** | ⚠️ Need context to understand | ✅ Self-explanatory |
| **Maintainability** | ⚠️ Confusing for new devs | ✅ Clear for everyone |

## Recommendation

✅ **Use new names** (`ScrollablePageLayout`, `PageContent`) for all new code

✅ **Old names still work** but are deprecated

✅ **Migrate gradually** when refactoring existing pages

✅ **Better DX** - clearer, shorter, more intuitive

