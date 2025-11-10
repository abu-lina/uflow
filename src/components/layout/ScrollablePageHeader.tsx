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
 * - Optional back button
 * - Flexible right-side content
 * - Safe area support for mobile devices
 * 
 * @example
 * ```tsx
 * <ScrollablePageHeader
 *   title="My Page"
 *   onBack="/previous-page"
 * />
 * ```
 */
export function ScrollablePageHeader({
  title,
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
    <header
      className={`fixed left-0 right-0 top-0 z-50 pt-[calc(env(safe-area-inset-top)+24px)] ${className}`}
      style={{
        // Exact match with page background - no blur to ensure seamless integration
        background: 'linear-gradient(180deg, #f5f5f5 0%, #fbfbfb 100%)',
        backgroundAttachment: 'scroll',
      }}
    >
      <div className="flex items-start w-full max-w-[393px] mx-auto px-4 h-10">
        {/* Back Button */}
        {onBack && (
          <button
            aria-label="Zurück"
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={handleBack}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
        )}

        {/* Title or Custom Content */}
        {customContent ? (
          customContent
        ) : showTitle ? (
          <h1 className="text-xl font-semibold text-content-heading">
            {title}
          </h1>
        ) : null}

        {/* Right Content */}
        {rightContent && (
          <div className="ml-auto flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
}
