'use client';

import { Icon } from '@iconify/react';

import { Logo } from '@/components/ui/Logo';

interface MobileHeaderProps {
  variant: 'splash' | 'about' | 'default';
  title?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
}

export function MobileHeader({
  variant,
  title,
  onBack,
  showBackButton = true,
  className = '',
}: MobileHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <header
      className={`bg-background/34 fixed left-0 right-0 top-0 z-50 w-full border-b border-border/30 pt-safe-top backdrop-blur-sm ${className}`}
    >
      <div className="flex h-16 w-full items-center justify-center px-6 sm:px-8">
        <div className="flex w-full max-w-[400px] items-center justify-center">
          {variant === 'splash' ? (
            /* Splash Header - Centered Logo (removed decorative motion fade-in) */
            <div className="flex w-full flex-row items-center justify-center">
              <div className="animate-fade-in h-10 w-10">
                <Logo className="h-10 w-10" height={40} width={40} />
              </div>
            </div>
          ) : variant === 'about' ? (
            /* About Header - Back Button + Title + Logo */
            <div className="flex w-full flex-row items-center justify-between gap-2">
              {/* Left Side - Back Button + Title */}
              <div className="flex flex-row items-center gap-2">
                {showBackButton && (
                  <button
                    aria-label="Zurück"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
                    onClick={handleBack}
                  >
                    <Icon
                      className="h-6 w-6 text-content-heading"
                      icon="material-symbols:chevron-left"
                    />
                  </button>
                )}
                {title && <h1 className="text-xl font-semibold text-content-heading">{title}</h1>}
              </div>

              {/* Right Side - Logo */}
              <div className="relative h-10 w-10 flex-shrink-0">
                <Logo className="h-10 w-10" height={40} width={40} />
              </div>
            </div>
          ) : (
            /* Default Header - Logo + Optional Actions */
            <div className="flex w-full flex-row items-center justify-between">
              {/* Left Side - Logo */}
              <div className="flex flex-row items-center gap-2">
                <div className="h-10 w-10">
                  <Logo className="h-10 w-10" height={40} width={40} />
                </div>
                {title && <h1 className="text-xl font-semibold text-content-heading">{title}</h1>}
              </div>

              {/* Right Side - Optional Actions */}
              <div className="flex flex-row items-center gap-2">
                {/* Add action buttons here if needed */}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
