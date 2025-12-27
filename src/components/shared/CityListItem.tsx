'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface CityListItemProps {
  cityName: string;
  interestCount: number;
  isUnlocked: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable city list item component
 * 
 * Displays:
 * - Line 1: City name (e.g., "Berlin")
 * - Line 2: Status + interest count (e.g., "Not active yet · 14 people interested")
 * 
 * Features:
 * - Rule of 8 spacing (p-4)
 * - Hover states
 * - Disabled state when submitting
 * - Semantic Tailwind colors
 * - Motion animations
 */
export const CityListItem = memo(function CityListItem({
  cityName,
  interestCount,
  isUnlocked,
  onClick,
  disabled = false,
  className = '',
}: CityListItemProps) {
  // Get status text based on unlock status
  const statusText = isUnlocked ? 'Live' : 'Not active yet';
  
  // Format interest count
  const interestText = interestCount === 1 
    ? `${interestCount} person interested`
    : `${interestCount} people interested`;

  return (
    <motion.button
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'w-full flex flex-col p-4 rounded-xl bg-white text-left transition-all duration-150 h-[72px]',
        'hover:bg-neutral-light hover:shadow-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        className
      )}
      disabled={disabled}
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      type="button"
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
    >
      {/* City name */}
      <span className="font-inter-tight text-base font-semibold text-content-heading">
        {cityName}
      </span>
      
      {/* Status and interest count */}
      <div className="flex items-center gap-1 text-sm text-content-muted">
        <span>{statusText}</span>
        <span>·</span>
        <span>{interestText}</span>
      </div>
    </motion.button>
  );
});

