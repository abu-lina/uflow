'use client';

import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';

interface MobileNavbarProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  animationDelay?: number;
}

export function MobileNavbar({
  text,
  onClick,
  variant = 'primary',
  icon = 'material-symbols:chevron-right',
  disabled = false,
  loading = false,
  className = '',
}: MobileNavbarProps) {
  return (
    <nav className="bg-background/34 fixed bottom-0 left-0 right-0 z-50 w-full border-t border-border/30 backdrop-blur-sm">
      <div
        className="flex w-full flex-row items-center justify-center px-4 pt-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        {/* Removed decorative motion slide-up animation (Plan 007) */}
        <div className="animate-fade-in w-full max-w-[345px]">
          <Button
            fullWidth
            className={className}
            disabled={disabled}
            loading={loading}
            size="default"
            variant={variant}
            onClick={onClick}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {text}
              {!loading && icon && <Icon aria-hidden="true" className="h-6 w-6" icon={icon} />}
            </span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
