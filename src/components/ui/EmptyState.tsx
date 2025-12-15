'use client';

import { memo } from 'react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState = memo(function EmptyState({
  title = 'Keine Provider gefunden',
  description = 'Versuche es mit anderen Suchkriterien oder Kategorien.',
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      {icon && (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          className="mb-4 text-gray-400"
          transition={{ duration: 2, repeat: Infinity }}
        >
          {icon}
        </motion.div>
      )}

      <h3 className="mb-2 text-lg font-semibold text-content-heading">{title}</h3>
      <p className="max-w-md text-content-muted">{description}</p>
    </motion.div>
  );
});
