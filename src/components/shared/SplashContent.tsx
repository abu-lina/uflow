'use client';

import { motion } from 'framer-motion';

import { Bismillah } from '@/components/ui/Bismillah';
import { ContentSection } from '@/components/layout/ContentSection';
import { useLanguage } from '@/providers/LanguageProvider';

export function SplashContent() {
  const { t } = useLanguage();
  
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-full"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Content Container - All content grouped together */}
      <ContentSection>
        {/* Calligraphy + Translation */}
        <motion.div 
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center w-full gap-1 mb-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          {/* Arabic Calligraphy */}
          <Bismillah className="h-auto w-full" shouldAnimate={false} />

          {/* German Translation */}
          <p 
            className="font-baskerville text-base text-center w-full"
            style={{
              background: 'linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent'
            }}
          >
            {t('landing.bismillah.translation').split(',')[0]},<br />
            {t('landing.bismillah.translation').split(',')[1]}
          </p>
        </motion.div>

        {/* Welcome Message */}
        <motion.div 
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center w-full gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
        >
          <h1 className="font-inter-tight text-4xl font-medium text-center text-[#232323]">
            <span className="text-[#232323]">Von </span>
            <span className="text-[#589D96]">Muslimen</span>
            <br />
            <span className="text-[#232323]">für </span>
            <span className="text-[#589D96]">Muslime.</span>
          </h1>

          <p className="font-inter text-base leading-6 text-center text-[#555555]">
            Ummah Flow - der erste halal konforme Marktplatz der Muslime miteinander verbindet - <span className="text-[#C2A274]">insha&apos;Allah.</span>
          </p>
        </motion.div>

      </ContentSection>
    </motion.div>
  );
}
