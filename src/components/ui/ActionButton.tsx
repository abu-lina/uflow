'use client';

import { Icon } from '@iconify/react';

interface ActionButtonProps {
  variant: 'primary' | 'secondary' | 'success';
  icon?: string;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}

const variantClasses = {
  primary: 'bg-[#589D96] hover:bg-[#4a8a84] text-white',
  secondary: 'bg-[#EEEEEE] hover:bg-gray-300 text-[#CDCDCD]',
  success: 'bg-[#4a8a84] hover:bg-[#4a8a84] text-white',
};

export function ActionButton({
  variant,
  icon,
  children,
  disabled = false,
  loading = false,
  onClick,
  className = '',
  'aria-label': ariaLabel,
}: ActionButtonProps) {
  const baseClasses = 'w-full h-12 rounded-xl font-inter font-semibold text-base text-white transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2';
  const variantClass = variantClasses[variant];
  
  return (
    <button
      aria-label={ariaLabel}
      className={`${baseClasses} ${variantClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        'Speichern...'
      ) : icon ? (
        <>
          <Icon aria-hidden="true" className="h-5 w-5" icon={icon} />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}