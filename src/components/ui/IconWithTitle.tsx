import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IconWithTitleProps {
  /**
   * The icon to display - can be any React node (Icon component, SVG, etc.)
   * If not provided, no icon will be displayed
   */
  icon?: ReactNode;
  /**
   * The title text
   */
  title: string;
  /**
   * Additional content (description text) to be grouped with the title
   */
  children?: ReactNode;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * Additional CSS classes for the icon container
   */
  iconClassName?: string;
  /**
   * Additional CSS classes for the title and text container
   */
  titleTextClassName?: string;
  /**
   * Additional CSS classes for the title
   */
  titleClassName?: string;
  /**
   * Size variant for the icon container
   * - 'responsive': 48px -> 64px -> 96px (default, good for most cases)
   * - 'large': Always 96px (good when there's plenty of vertical space)
   */
  size?: 'responsive' | 'large';
}

/**
 * Reusable component that displays an optional icon above a title with 40px gap.
 * 
 * Structure: (icon) + (title + text container)
 * 
 * This component provides consistent spacing and styling for icon + title combinations
 * used throughout the application, particularly in empty states and auth flows.
 * Designed to work with Material Symbols via @iconify/react with different sizing strategies.
 * 
 * Features:
 * - Optional icon display (omit icon prop to show title only)
 * - Size variants: 'responsive' (48px->64px->96px) or 'large' (always 96px)
 * - Gap: 40px (gap-10 - using Tailwind config spacing)
 * - Centered layout with consistent typography
 * - Uses config-based colors (text-content-title)
 * - Flexible for different scenarios (no icon for login, large icon for saved page)
 * - Customizable styling via className props
 * - Title and description text are grouped in one container div
 * 
 * @example
 * ```tsx
 * import { Icon } from '@/components/ui';
 * 
 * // With responsive icon sizing and description
 * <IconWithTitle
 *   icon={<Icon icon="material-symbols:lock-outline" className="w-full h-full text-content-title" />}
 *   title="Anmeldung erforderlich"
 * >
 *   <p className="text-center text-base leading-normal text-content mt-2">
 *     Du musst angemeldet sein, um gespeicherte Inhalte zu sehen.
 *   </p>
 * </IconWithTitle>
 * 
 * // Large icon for pages with plenty of vertical space
 * <IconWithTitle
 *   icon={<Icon icon="material-symbols:lock-outline" className="w-full h-full text-content-title" />}
 *   title="Anmeldung erforderlich"
 *   size="large"
 * />
 * 
 * // No icon (title only - good when icon is in header)
 * <IconWithTitle
 *   title="Willkommen bei Ummah Flow"
 * />
 * ```
 */
export function IconWithTitle({
  icon,
  title,
  children,
  className = '',
  iconClassName = '',
  titleTextClassName = '',
  titleClassName = '',
  size = 'responsive',
}: IconWithTitleProps) {
  const iconSizeClasses = size === 'large' 
    ? 'w-icon-3xl h-icon-3xl' 
    : 'w-icon-xl h-icon-xl sm:w-icon-2xl sm:h-icon-2xl lg:w-icon-3xl lg:h-icon-3xl';

  return (
    <div className={cn('flex flex-col items-center gap-10', className)}>
      {/* Icon container - conditionally render based on icon prop */}
      {icon && (
        <div className={cn('flex items-center justify-center', iconSizeClasses, iconClassName)}>
          {icon}
        </div>
      )}
      
      {/* Title and text container */}
      <div className={cn('flex flex-col items-center', titleTextClassName)}>
        {/* Title */}
        <h2 className={cn(
          'text-center text-3xl font-semibold leading-tight text-content-title',
          titleClassName
        )}>
          {title}
        </h2>
        
        {/* Additional content (description text) */}
        {children}
      </div>
    </div>
  );
}

