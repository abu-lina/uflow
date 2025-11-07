'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

type HeaderVariant = 'title-only' | 'back-and-title' | 'back-title-icon' | 'title-and-icon' | 'about-logo';

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
}: PageHeaderProps) {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);

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
  const shouldShowRightIcon = variant === 'back-title-icon' || variant === 'title-and-icon' || variant === 'about-logo';
  
  // Priority: rightIcon > rightContent
  const actualRightContent = shouldShowRightIcon && rightIcon ? rightIcon : rightContent;

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
        'fixed left-0 right-0 top-0 z-50 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-[calc(env(safe-area-inset-top)+24px)] pb-2 md:hidden',
        className
      )}
      style={{
        // Exact match with page background - no blur to ensure seamless integration
        background: 'linear-gradient(180deg, #f5f5f5 0%, #fbfbfb 100%)',
        backgroundAttachment: 'scroll',
      }}
    >
      <div className="flex items-center w-full px-safe-24 h-header-height-mobile sm:h-header-height-tablet">
        {/* Back Button */}
        {shouldShowBackButton && onBack && (
          <button
            aria-label="Zurück"
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={handleBack}
          >
            <Icon 
              className="w-8 h-8 text-[#272727] pointer-events-none" 
              icon="material-symbols:chevron-left" 
            />
          </button>
        )}

        {/* Title or Custom Content */}
        {customContent ? (
          customContent
        ) : (
          <h1 className="text-xl font-semibold text-content-title flex-1">
            {title}
          </h1>
        )}

        {/* Right Content */}
        {actualRightContent && (
          <div className="ml-auto flex items-center">
            {actualRightContent}
          </div>
        )}
      </div>
    </header>
  );
}

