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
      button: 'h-14 px-5 gap-2 rounded-[16.8px] text-xl',
      icon: 'h-6 w-6'
    },
    md: {
      button: 'h-12 px-4 gap-2 rounded-[14px] text-lg',
      icon: 'h-5 w-5'
    }
  };

  return (
    <button
      className={`
        flex flex-row items-center justify-center
        bg-[#589D96] text-white
        font-inter-tight font-medium
        transition-colors duration-200
        hover:bg-[#4A8A84]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size].button}
        ${className}
      `.trim()}
      type={type}
      {...props}
    >
      <span className="flex-1 text-center">{label}</span>
      <OrnamentIcon 
        aria-hidden="true"
        className={`text-white ${sizeClasses[size].icon}`}
      />
    </button>
  );
}

ActionButton.displayName = 'ActionButton'; 