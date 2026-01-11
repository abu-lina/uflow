'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { translateCityName } from '@/utils/cityTranslation';
import { translations } from '@/translations';
import { Icon } from '@/components/ui/Icon';

interface MobileGreetingHeaderProps {
  className?: string;
  cityName?: string; // Optional city name to include in the greeting
}

export function MobileGreetingHeader({ className = '', cityName }: MobileGreetingHeaderProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [hasAnimated, setHasAnimated] = useState(false);
  const [translatedCityName, setTranslatedCityName] = useState<string | undefined>(cityName);

  useEffect(() => {
    // Check if we've already animated this session
    const animated = sessionStorage.getItem('home-header-animated');
    if (animated) {
      setHasAnimated(true);
    } else {
      sessionStorage.setItem('home-header-animated', 'true');
    }
  }, []);

  // Translate city name when cityName or language changes
  useEffect(() => {
    if (!cityName) {
      setTranslatedCityName(undefined);
      return;
    }

    let isCancelled = false;

    // Translate city name to user's language
    translateCityName(cityName, language)
      .then((translated) => {
        if (!isCancelled) {
          setTranslatedCityName(translated);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.warn('Failed to translate city name:', error);
          // Fallback to original city name on error
          setTranslatedCityName(cityName);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [cityName, language]);

  // Get user's first name
  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  // Get translation template and split by {{city}} to get prefix and suffix
  const getCityTextParts = () => {
    const translationTemplate = (translations[language]?.common?.supportYourUmmahInCity as string) || 'in {{city}}.';
    const parts = translationTemplate.split('{{city}}');
    return {
      prefix: parts[0] || '',
      suffix: parts[1] || '',
    };
  };

  const cityTextParts = cityName ? getCityTextParts() : null;
  const supportTextWithoutCity = t('common.supportYourUmmah');

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
          className="font-inter text-2xl font-semibold leading-tight text-primary -mt-0.5"
        >
          {cityName && cityTextParts ? (
            <>
              {cityTextParts.prefix}
              <span className="inline-flex items-center gap-1">
                <span>{translatedCityName || cityName}</span>
                <button
                  aria-label="Change city"
                  className="inline-flex items-center justify-center hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-0.5"
                  type="button"
                  onClick={() => router.push('/city-selection')}
                >
                  <Icon
                    aria-hidden="true"
                    className="w-6 h-6 text-primary"
                    icon="lucide:location-edit"
                  />
                </button>
              </span>
            </>
          ) : (
            supportTextWithoutCity
          )}
        </MotionDiv>
      </div>
    </div>
  );
}
