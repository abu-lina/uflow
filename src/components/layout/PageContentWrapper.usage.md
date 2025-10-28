/**
 * PageContentWrapper - Reusable Layout Component
 * 
 * This component provides a standardized layout structure that can be reused
 * across all pages with consistent spacing, responsive behavior, and proper
 * mobile navigation handling.
 * 
 * USAGE PATTERNS:
 * 
 * 1. BASIC PAGE (with padding)
 * ```tsx
 * <PageLayout hasBackground={false} maxWidth="full">
 *   <PageHeader title="Page Title" />
 *   <HeaderSpacer />
 *   <PageContentWrapper padding="responsive">
 *     <div>Your content here</div>
 *   </PageContentWrapper>
 * </PageLayout>
 * ```
 * 
 * 2. CENTERED CONTENT (like create page)
 * ```tsx
 * <PageLayout hasBackground={false} maxWidth="full">
 *   <PageHeader title="Add Provider" />
 *   <HeaderSpacer />
 *   <PageContentWrapper 
 *     centerVertically={true}
 *     hasBackground={true}
 *     padding="none"
 *     includeMobileNavSpacing={true}
 *   >
 *     <div>Centered content</div>
 *   </PageContentWrapper>
 * </PageLayout>
 * ```
 * 
 * 3. FORM PAGE (with constraints)
 * ```tsx
 * <PageLayout hasBackground={false} maxWidth="xs">
 *   <PageHeader title="Login" />
 *   <HeaderSpacer />
 *   <PageContentWrapper 
 *     maxWidth="xs"
 *     padding="responsive"
 *     includeMobileNavSpacing={true}
 *   >
 *     <LoginForm />
 *   </PageContentWrapper>
 * </PageLayout>
 * ```
 * 
 * 4. FULL WIDTH CONTENT
 * ```tsx
 * <PageLayout hasBackground={false} maxWidth="full">
 *   <PageHeader title="Dashboard" />
 *   <HeaderSpacer />
 *   <PageContentWrapper 
 *     maxWidth="full"
 *     padding="none"
 *     hasBackground={true}
 *   >
 *     <div>Full width content</div>
 *   </PageContentWrapper>
 * </PageLayout>
 * ```
 * 
 * PROPS EXPLANATION:
 * 
 * - centerVertically: Centers content between header and footer
 * - hasBackground: Adds background with proper margins (respects footer)
 * - padding: Controls edge spacing ('none', 'sm', 'default', 'lg', 'responsive')
 * - maxWidth: Controls content width constraints
 * - includeMobileNavSpacing: Adds space for mobile navigation
 * - contentClassName: Additional classes for content area
 * - className: Additional classes for container
 * - asMain: Renders as <main> instead of <div>
 */
