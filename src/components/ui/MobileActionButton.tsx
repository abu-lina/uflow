'use client';

import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface MobileActionButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  animationDelay?: number;
}

export function MobileActionButton({
  text,
  onClick,
  variant = 'primary',
  icon = 'material-symbols:chevron-right',
  disabled = false,
  loading = false,
  className = '',
  animationDelay = 0
}: MobileActionButtonProps) {
  const baseClasses = "flex flex-row justify-center items-center w-full max-w-[345px] h-12 rounded-xl px-5 py-4 gap-2 transition-all duration-200";
  
  const variantClasses = {
    primary: "bg-[#589D96] hover:bg-[#4a8a85] active:bg-[#3d7470]",
    secondary: "bg-gray-500 hover:bg-gray-600 active:bg-gray-700"
  };

  const disabledClasses = disabled || loading 
    ? "opacity-50 cursor-not-allowed" 
    : "hover:scale-[1.02] active:scale-[0.98]";

  return (
    <motion.button
      animate={{ opacity: 1, y: 0 }}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
      disabled={disabled || loading}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay: animationDelay }}
      onClick={onClick}
    >
      <span className="font-inter-tight text-base font-medium text-white text-center">
        {loading ? 'Lädt...' : text}
      </span>
      {!loading && (
        <Icon className="h-6 w-6 text-white" icon={icon} />
      )}
    </motion.button>
  );
}
