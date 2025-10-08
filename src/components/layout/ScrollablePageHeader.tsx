'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

interface ScrollablePageHeaderProps {
  /**
   * The title text to display in the header
   */
  title: string;
  /**
   * Whether the header should be visible
   * Use with useContainerScroll hook
   */
  isVisible: boolean;
  /**
   * Optional back button navigation path
   * If provided, shows a back button
   */
  onBack?: string | (() => void);
  /**
   * Optional right-side action buttons or content
   */
  rightContent?: ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show the title (some pages might want custom content)
   * @default true
   */
  showTitle?: boolean;
  /**
   * Custom content to replace the default title
   */
  customContent?: ReactNode;
}

/**
 * Reusable scrollable page header component
 * 
 * Features:
 * - Consistent styling across all pages
 * - Smooth show/hide animation based on scroll
 * - Optional back button
 * - Flexible right-side content
 * - Safe area support for mobile devices
 * 
 * @example
 * ```tsx
 * const { isHeaderVisible } = useContainerScroll();
 * 
 * <ScrollablePageHeader
 *   title="My Page"
 *   isVisible={isHeaderVisible}
 *   onBack="/previous-page"
 * />
 * ```
 */
export function ScrollablePageHeader({
  title,
  isVisible,
  onBack,
  rightContent,
  className = '',
  showTitle = true,
  customContent,
}: ScrollablePageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else if (typeof onBack === 'string') {
      router.push(onBack);
    }
  };

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-safe-top transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${className}`}
    >
      <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
        {/* Back Button */}
        {onBack && (
          <button
            aria-label="Zurück"
            className="flex h-8 w-8 items-center justify-center"
            onClick={handleBack}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
        )}

        {/* Title or Custom Content */}
        {customContent ? (
          customContent
        ) : showTitle ? (
          <div className={`flex flex-1 items-center ${onBack ? 'justify-start' : 'justify-start'}`}>
            <h1 className="text-xl font-semibold text-content-title leading-[29px]">
              {title}
            </h1>
          </div>
        ) : null}

        {/* Right Content */}
        {rightContent && (
          <div className="ml-auto flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}

