'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

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
 * Unified reusable page header component with four variants
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
 * - Optional scroll-based show/hide animation
 * - Flexible right-side content and icons
 * - Semantic HTML with <header> tag
 * 
 * @example
 * ```tsx
 * // Variant 1: Title only
 * <PageHeader title="My Page" variant="title-only" />
 * 
 * // Variant 2: Back button and title
 * <PageHeader 
 *   title="My Page"
 *   variant="back-and-title"
 *   onBack="/previous-page"
 * />
 * 
 * // Variant 3: Back, title, and right icon
 * <PageHeader 
 *   title="My Page"
 *   variant="back-title-icon"
 *   onBack="/previous-page"
 *   rightIcon={<Logo className="h-12 w-12" />}
 * />
 * 
 * // Variant 4: Title and right icon (48px)
 * <PageHeader 
 *   title="Login"
 *   variant="title-and-icon"
 *   rightIcon={<Logo className="h-12 w-12" height={48} width={48} />}
 * />
 * ```
 */
export function PageHeader({
  title,
  variant = 'title-only',
  isVisible = true,
  onBack,
  rightContent,
  rightIcon,
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

  // Determine which elements to show based on variant
  const shouldShowBackButton = variant === 'back-and-title' || variant === 'back-title-icon';
  const shouldShowRightIcon = variant === 'back-title-icon' || variant === 'title-and-icon' || variant === 'about-logo';
  
  // Priority: rightIcon > rightContent
  const actualRightContent = shouldShowRightIcon && rightIcon ? rightIcon : rightContent;

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-[calc(env(safe-area-inset-top)+24px)] transition-all duration-500 ease-in-out md:hidden ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(245, 245, 245, 0.85) 0%, rgba(251, 251, 251, 0.85) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        isolation: 'isolate',
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
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
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

