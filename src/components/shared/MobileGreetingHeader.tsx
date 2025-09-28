'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

interface MobileGreetingHeaderProps {
  className?: string;
}

export function MobileGreetingHeader({ className = '' }: MobileGreetingHeaderProps) {
  const { user } = useAuth();

  // Get user's first name
  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <div className={`w-full ${className}`}>
      {/* Main Header with staggered animation */}
      <div className="flex flex-col items-start gap-2 px-6">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="font-inter text-sm font-medium leading-[140%] text-[#60606F]"
          initial={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {user ? `As-Salamu-Aleikum ${firstName},` : 'As-Salamu-Aleikum,'}
        </motion.div>
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="font-inter text-2xl font-semibold leading-[140%] text-[#5B9DA0]"
          initial={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          Unterstütze Deine Ummah.
        </motion.div>
      </div>
    </div>
  );
}
