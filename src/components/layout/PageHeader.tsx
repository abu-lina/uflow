'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

interface PageHeaderProps {
  /**
   * The title text to display in the header
   */
  title: string;
  /**
   * Whether the header should be visible (for scroll-based hiding)
   * @default true
   */
  isVisible?: boolean;
  /**
   * Optional back button navigation path or callback
   */
  onBack?: string | (() => void);
  /**
   * Optional right-side content (buttons, icons, etc.)
   */
  rightContent?: ReactNode;
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
 * Unified reusable page header component
 * 
 * Features:
 * - Consistent 24px spacing from safe area
 * - 40px header height
 * - Optional back button
 * - Optional scroll-based show/hide animation
 * - Flexible right-side content
 * - Semantic HTML with <header> tag
 * 
 * @example
 * ```tsx
 * // Simple fixed header
 * <PageHeader title="My Page" />
 * 
 * // With back button
 * <PageHeader 
 *   title="My Page"
 *   onBack="/previous-page"
 * />
 * 
 * // With scroll animation
 * const { isHeaderVisible } = useContainerScroll();
 * <PageHeader 
 *   title="My Page"
 *   isVisible={isHeaderVisible}
 *   onBack="/previous-page"
 * />
 * ```
 */
export function PageHeader({
  title,
  isVisible = true,
  onBack,
  rightContent,
  className = '',
  customContent,
}: PageHeaderProps) {
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
      className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)] transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${className}`}
    >
      <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
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
        ) : (
          <h1 className="text-xl font-semibold text-content-title">
            {title}
          </h1>
        )}

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

