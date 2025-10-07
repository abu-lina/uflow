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
              variant={primaryButton.variant || 'primary'}
              icon={primaryButton.icon}
              disabled={primaryButton.disabled}
              loading={primaryButton.loading}
              onClick={primaryButton.onClick}
              aria-label={primaryButton['aria-label']}
              className="flex-1"
            >
              {primaryButton.label}
            </ActionButton>

            <ActionButton
              variant="secondary"
              icon={secondaryButton.icon}
              disabled={secondaryButton.disabled}
              loading={secondaryButton.loading}
              onClick={secondaryButton.onClick}
              aria-label={secondaryButton['aria-label']}
              className="w-16"
            />
          </div>
        ) : (
          /* Single Button Layout */
          <ActionButton
            variant={primaryButton.variant || 'primary'}
            icon={primaryButton.icon}
            disabled={primaryButton.disabled}
            loading={primaryButton.loading}
            onClick={primaryButton.onClick}
            aria-label={primaryButton['aria-label']}
          >
            {primaryButton.label}
          </ActionButton>
        )}
      </div>
    </footer>
  );
}
