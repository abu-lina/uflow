'use client';

import { MobileActionButton } from '@/components/ui/MobileActionButton';

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
  animationDelay = 0
}: MobileNavbarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white/34 backdrop-blur-sm border-t border-gray-200/30">
      <div className="flex flex-row justify-center items-center w-full px-4 py-4 pb-[calc(1rem+max(12px,env(safe-area-inset-bottom)))]">
        <MobileActionButton
          animationDelay={animationDelay}
          className={className}
          disabled={disabled}
          icon={icon}
          loading={loading}
          text={text}
          variant={variant}
          onClick={onClick}
        />
      </div>
    </nav>
  );
}
