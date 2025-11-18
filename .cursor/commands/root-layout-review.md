# Next.js root layout review and cleanup

Review the root layout file and clean it up. Follow these steps:

## 1. Analysis

Examine the root layout and identify:

- Unused imports or dependencies
- Redundant or duplicate code
- Missing or incorrect metadata configurations
- Component structure issues
- Performance concerns (unnecessary client components, caching strategies)
- Accessibility issues
- SEO optimization gaps

## 2. Next.js 14 App Router checks

Verify the layout follows proven approaches:

- Server Components vs Client Components: ensure only client-specific code uses 'use client'
- Metadata API: use exported `metadata` and `viewport` objects instead of manual `<head>` tags
- Duplicate metadata: check for conflicts between exported metadata and manual meta tags
- Font optimization: verify `next/font` usage and configuration
- HTML structure: ensure proper `html` and `body` tags (App Router handles `<head>` automatically)
- Viewport and theme-color: use `viewport` export, avoid manual meta tags
- Analytics and tracking: place scripts correctly (consider `next/script`)

## 3. Code quality

Check for:

- TypeScript types and interfaces
- Error boundaries where needed
- Loading states if required
- Maintainable code structure
- Consistent styling approach (avoid mixing className and inline styles)
- Consistent formatting and naming conventions

## 4. Specific issues to identify

Based on common patterns, check for:

- Duplicate meta tags (viewport, theme-color, apple-mobile-web-app-status-bar-style)
- Manual `<head>` tags (App Router handles this via metadata exports)
- Inconsistent styling (className + inline styles for the same properties)
- Missing Open Graph and Twitter Card metadata
- Performance concerns: `dynamic = 'force-dynamic'` with `revalidate = 0` (verify if this is necessary)
- Font loading: ensure proper `next/font` configuration
- PWA metadata: manifest links, icons, theme colors
- Authentication patterns: verify server-side session handling doesn't block rendering

## 5. Ask before making changes

Before making changes, ask about:

- Code with unclear purpose
- Commented-out code: keep or remove
- Styling approach if multiple valid options exist
- Metadata values that should be updated
- Third-party integrations you're unsure about
- Breaking changes that could affect child layouts or pages
- Performance trade-offs (e.g., force-dynamic vs static generation)

## 6. Provide cleaned version

After getting clarification, provide:

- Cleaned-up version of the layout
- Explanation of changes made
- Recommendations for further improvements
- Migration notes if there are breaking changes

Start by reviewing the current root layout and report findings.

