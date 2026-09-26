'use client';

import { ReactNode, useEffect, useRef, useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { CreateDesktopLayoutContext, ScrollContext } from './ScrollablePageLayout';

type HeaderVariant =
  'title-only' | 'back-and-title' | 'back-title-icon' | 'title-and-icon' | 'about-logo';

interface PageHeaderProps {
  /**
   * The title text to display in the header
   */
  title: string;
  /**
   * Header variant determining the layout
   * @default 'title-only'
   */
  variant?: HeaderVariant;
  /**
   * Optional back button navigation path or callback
   */
  onBack?: string | (() => void);
  /**
   * Optional right-side content (buttons, icons, etc.)
   */
  rightContent?: ReactNode;
  /**
   * Right icon for variants 3 and 4 (48px size expected)
   */
  rightIcon?: ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Custom content to replace the default title
   */
  customContent?: ReactNode;
  /**
   * Scroll container ref for detecting scroll within a specific element
   */
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

/**
 * Unified reusable page header component with scroll-based visibility
 *
 * **This component is fully reusable across all pages!**
 *
 * Variants:
 * - title-only: Title only (no chevron, no icon)
 * - back-and-title: Back chevron + title  
 * - back-title-icon: Back chevron + title + right icon (48px)
 * - title-and-icon: Title + right icon (48px)
 *
 * Features:
 * - Consistent spacing from safe area
 * - Responsive header height
 * - Optional back button navigation
 * - Flexible right-side content and icons
 * - Semantic HTML with <header> tag
 * - Smooth 300ms transitions (Material Design standard)
 *
 * @example
 * ```tsx
 * // Basic usage - static header
 * <PageHeader title="My Page" variant="title-only" />
 * ```
 *
 */
export function PageHeader({
  title,
  variant = 'title-only',
  onBack,
  rightContent,
  rightIcon,
  className = '',
  customContent,
  scrollContainerRef,
}: PageHeaderProps) {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event from bubbling to document-level listeners that might
    // try to access className.split() on child SVG elements
    e.stopPropagation();
    if (typeof onBack === 'function') {
      onBack();
    } else if (typeof onBack === 'string') {
      router.push(onBack);
    }
  };

  // Determine which elements to show based on variant
  const shouldShowBackButton = variant === 'back-and-title' || variant === 'back-title-icon';
  const shouldShowRightIcon =
    variant === 'back-title-icon' || variant === 'title-and-icon' || variant === 'about-logo';

  // Priority: rightIcon > rightContent
  const actualRightContent = shouldShowRightIcon && rightIcon ? rightIcon : rightContent;

  // Get scroll context (from ScrollablePageLayout)
  const scrollContext = useContext(ScrollContext);
  const createDesktopLayout = useContext(CreateDesktopLayoutContext);

  // Use explicit prop if provided, otherwise use context
  const effectiveScrollRef = scrollContainerRef || scrollContext;

  // Scroll detection for blur/glass effect
  useEffect(() => {
    const handleScroll = () => {
      // Priority 1: Use effective scroll ref (explicit prop or context)
      if (effectiveScrollRef?.current) {
        const scrollY = effectiveScrollRef.current.scrollTop;
        setIsScrolled(scrollY > 0);
        return;
      }

      // Priority 2: Auto-detect main scroll container (our app structure)
      const mainElement = document.querySelector('main.overflow-y-auto') as HTMLElement;
      if (mainElement) {
        const scrollY = mainElement.scrollTop;
        setIsScrolled(scrollY > 0);
        return;
      }

      // Priority 3: Fallback to window scroll
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollY > 0);
    };

    // Check initial scroll position
    handleScroll();

    // Determine which element to listen to
    let scrollElement: HTMLElement | Window = window;

    if (effectiveScrollRef?.current) {
      scrollElement = effectiveScrollRef.current;
    } else {
      const mainElement = document.querySelector('main.overflow-y-auto') as HTMLElement;
      if (mainElement) {
        scrollElement = mainElement;
      }
    }

    if (scrollElement instanceof HTMLElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (scrollElement instanceof HTMLElement) {
        scrollElement.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [effectiveScrollRef]);

  // Use useEffect to ensure child SVG elements have safe className handling
  // This is a defensive measure against injected code (e.g., Next.js dev tools) that tries to access className.split()
  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) return;

    // Find all SVG elements within the header and ensure they have className as string
    const svgElements = headerElement.querySelectorAll('svg');
    svgElements.forEach((svg) => {
      // Ensure className is always a string (not DOMTokenList)
      // This prevents errors when injected code tries to call className.split()
      if (svg.className && typeof svg.className !== 'string') {
        const classList = Array.from(svg.classList || []);
        svg.setAttribute('class', classList.join(' '));
      }
      // Also ensure className exists and is a string even if it's empty
      if (!svg.className || typeof svg.className !== 'string') {
        svg.setAttribute('class', svg.getAttribute('class') || '');
      }
    });
  }, [shouldShowBackButton, actualRightContent]); // Re-run when content changes

  return (
    <header
      ref={headerRef}
      className={cn(
        'fixed left-0 right-0 top-0 z-50 pb-2 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-[calc(env(safe-area-inset-top)+24px)]',
        createDesktopLayout &&
          'md:static md:z-auto md:!mx-auto md:w-full md:max-w-2xl md:pb-0 md:pt-[calc(var(--desktop-header-height,256px)_+_16px)]',
        className,
      )}
      style={{
        // Smooth transition for all properties including backdrop-filter
        transition:
          'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
        // Glassy blur effect when scrolled - transparent with blur only
        // backdropFilter blurs everything behind the header element
        // blur(20px) creates the frosted glass blur effect
        // saturate(180%) makes colors more vibrant through the blur
        // isolation: isolate ensures backdrop-filter works correctly in stacking contexts
        background: isScrolled ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid transparent',
        isolation: 'isolate',
        marginLeft: '-1px',
        marginRight: '-1px',
        paddingLeft: '1px',
        paddingRight: '1px',
      }}
    >
      <div className="px-safe-24 flex h-header-height-mobile w-full items-center sm:h-header-height-tablet">
        {/* Back Button */}
        {shouldShowBackButton && onBack && (
          <button
            aria-label="Zurück"
            className="-ml-1 flex h-8 w-8 items-center justify-center"
            onClick={handleBack}
          >
            <Icon
              className="pointer-events-none h-8 w-8 text-content-heading"
              icon="material-symbols:chevron-left"
            />
          </button>
        )}

        {/* Title or Custom Content */}
        {customContent ? (
          customContent
        ) : (
          <h1 className="flex-1 font-inter-tight text-xl font-semibold text-content-heading">
            {title}
          </h1>
        )}

        {/* Right Content */}
        {actualRightContent && (
          <div className="ml-auto flex items-center">{actualRightContent}</div>
        )}
      </div>
    </header>
  );
}
