'use client';

import { motion } from 'motion/react';

import { Bismillah } from '@/components/ui/Bismillah';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/providers/LanguageProvider';
import { useSplash } from '@/providers/splash-provider';

interface SplashContentProps {
  onContinue?: () => void;
}

export function SplashContent({ onContinue }: SplashContentProps) {
  const { t, language } = useLanguage();
  const { isFirstVisit } = useSplash();
  
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex flex-col items-center w-full gap-16"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Body Content */}
      <div className="flex flex-col items-center w-full gap-8">
        {/* Bismillah + Translation */}
        <motion.div 
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center w-full gap-1 px-12"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          {/* Arabic Calligraphy */}
          <Bismillah className="h-auto w-full max-w-[345px]" shouldAnimate={false} />

          {/* Translation - Hidden for Arabic since the Arabic text is already shown above */}
          {language !== 'ar' && (
            <p 
              className="font-baskerville text-xs leading-[13px] text-center w-full bg-gold-gradient bg-clip-text text-transparent"
            >
              {t('landing.bismillah.translation')}
            </p>
          )}
        </motion.div>

        {/* Logo + Text + CTA */}
        <div className="flex flex-col items-center w-full gap-8 max-w-[345px]">
          {/* Logo */}
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
          >
            <Logo className="h-24 w-24" height={96} width={96} />
          </motion.div>

          {/* Title + Subtitle */}
          <motion.div 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center w-full gap-2"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
          >
            {/* Title */}
            <h1 className="font-inter-tight text-3xl font-medium leading-[40px] text-center text-content-heading">
              {(() => {
                const title = t('splash.title');
                // Parse title: highlight Muslim-related words and add line break after first Muslim word
                const words = title.split(/(\s+)/);
                const result: React.ReactNode[] = [];
                let key = 0;
                let foundFirstMuslim = false;
                
                words.forEach((word, index) => {
                  const trimmed = word.trim();
                  if (!trimmed && word) {
                    result.push(word);
                    return;
                  }
                  
                  if (!trimmed) return;
                  
                  const lowerWord = trimmed.toLowerCase();
                  const isMuslimWord = 
                    lowerWord.includes('muslim') || 
                    lowerWord.includes('مسلم') || 
                    lowerWord.includes('müslüman');
                  
                  if (isMuslimWord) {
                    result.push(
                      <span key={key++} className="text-primary">
                        {trimmed}
                      </span>
                    );
                    if (!foundFirstMuslim) {
                      foundFirstMuslim = true;
                      const nextNonWhitespace = words.slice(index + 1).find(w => w.trim());
                      if (nextNonWhitespace) {
                        result.push(<br key={key++} />);
                      }
                    }
                  } else {
                    result.push(<span key={key++}>{word}</span>);
                  }
                });
                
                return result;
              })()}
            </h1>

            {/* Subtitle */}
            <p className="font-inter text-base font-normal leading-[19px] text-center text-content">
              {t('splash.subtitle')}
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={isFirstVisit ? "flex w-full" : "flex justify-center"}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.8, ease: 'easeOut' }}
          >
            <Button
              className="h-12 rounded-md w-full"
              icon="lucide:store"
              variant="primary"
              onClick={onContinue}
            >
              {t('splash.discoverProviders')}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
