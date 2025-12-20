'use client';

import { motion } from 'motion/react';
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
  animationDelay = 0
}: MobileNavbarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white/34 backdrop-blur-sm border-t border-gray-200/30">
      <div className="flex flex-row justify-center items-center w-full px-4 pt-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[345px]"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: animationDelay }}
        >
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
              {!loading && icon && (
                <Icon aria-hidden="true" className="h-6 w-6" icon={icon} />
              )}
            </span>
          </Button>
        </motion.div>
      </div>
    </nav>
  );
}
