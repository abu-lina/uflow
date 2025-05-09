import { OrnamentIcon } from '@/components/ui/OrnamentIcon';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  label: string;
  size?: 'lg' | 'md';
}

export function ActionButton({
  className = '',
  label,
  size = 'lg',
  type = 'button',
  ...props
}: ActionButtonProps) {
  // Size variants following Rule of 8
  const sizeClasses = {
    lg: {
      button: 'h-14 px-4 gap-2 rounded-[16.8px] text-xl',
      icon: 'size-6',
    },
    md: {
      button: 'h-12 px-4 gap-2 rounded-[14px] text-lg',
      icon: 'size-5',
    },
  };

  return (
    <button
      aria-label={label}
      className={`
        inline-flex items-center justify-center
        bg-primary font-medium
        text-white
        transition-colors duration-200
        hover:bg-primary-dark
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${sizeClasses[size].button}
        ${className}
      `.trim()}
      type={type}
      {...props}
    >
      <span>{label}</span>
      <OrnamentIcon aria-hidden="true" className={`text-white ${sizeClasses[size].icon}`} />
    </button>
  );
}

ActionButton.displayName = 'ActionButton';
