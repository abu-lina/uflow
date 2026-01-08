'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';

interface MobileGreetingHeaderProps {
  className?: string;
  cityName?: string; // Optional city name to include in the greeting
}

export function MobileGreetingHeader({ className = '', cityName }: MobileGreetingHeaderProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Check if we've already animated this session
    const animated = sessionStorage.getItem('home-header-animated');
    if (animated) {
      setHasAnimated(true);
    } else {
      sessionStorage.setItem('home-header-animated', 'true');
    }
  }, []);

  // Get user's first name
  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  // Construct the support text with city name if provided
  const supportText = cityName 
    ? `in ${cityName}.`
    : t('common.supportYourUmmah');

  const MotionDiv = hasAnimated ? 'div' : motion.div;

  return (
    <div className={`w-full ${className}`}>
      {/* Main Header with staggered animation */}
      <div className="flex flex-col items-start gap-0">
        <MotionDiv
          {...(!hasAnimated && {
            animate: { opacity: 1, x: 0 },
            initial: { opacity: 0, x: -20 },
            transition: { duration: 0.4, delay: 0.1 },
          })}
          className="font-inter text-sm font-medium leading-[140%] text-[#60606F]"
        >
          {user ? `${t('common.greeting')} ${firstName},` : `${t('common.greeting')},`}
        </MotionDiv>
        <MotionDiv
          {...(!hasAnimated && {
            animate: { opacity: 1, x: 0 },
            initial: { opacity: 0, x: -20 },
            transition: { duration: 0.4, delay: 0.2 },
          })}
          className="font-inter text-2xl font-semibold leading-tight text-[#5B9DA0] -mt-0.5"
        >
          {supportText}
        </MotionDiv>
      </div>
    </div>
  );
}
