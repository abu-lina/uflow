'use client';

import { ActionButton } from './ActionButton';

interface ActionButtonGroupProps {
  primaryButton: {
    label: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'success';
    'aria-label'?: string;
  };
  secondaryButton?: {
    icon: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    'aria-label'?: string;
  };
  className?: string;
}

export function ActionButtonGroup({
  primaryButton,
  secondaryButton,
  className = '',
}: ActionButtonGroupProps) {
  return (
    <footer className={`fixed bottom-0 left-0 right-0 z-40 bg-white/10 backdrop-blur-3xl border-t border-white/20 ${className}`}>
      <div className="flex h-12 w-full max-w-[393px] mx-auto items-center px-4">
        {secondaryButton ? (
          /* Two Button Layout */
          <div className="flex w-full gap-2">
            <ActionButton
              aria-label={primaryButton['aria-label']}
              className="flex-1"
              disabled={primaryButton.disabled}
              icon={primaryButton.icon}
              loading={primaryButton.loading}
              variant={primaryButton.variant || 'primary'}
              onClick={primaryButton.onClick}
            >
              {primaryButton.label}
            </ActionButton>

            <ActionButton
              aria-label={secondaryButton['aria-label']}
              className="w-16"
              disabled={secondaryButton.disabled}
              icon={secondaryButton.icon}
              loading={secondaryButton.loading}
              variant="secondary"
              onClick={secondaryButton.onClick}
            >
              {/* Icon-only button, no text */}
            </ActionButton>
          </div>
        ) : (
          /* Single Button Layout */
          <ActionButton
            aria-label={primaryButton['aria-label']}
            disabled={primaryButton.disabled}
            icon={primaryButton.icon}
            loading={primaryButton.loading}
            variant={primaryButton.variant || 'primary'}
            onClick={primaryButton.onClick}
          >
            {primaryButton.label}
          </ActionButton>
        )}
      </div>
    </footer>
  );
}
