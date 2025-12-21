'use client';

import { motion } from 'motion/react';

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

          {/* Translation */}
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
            {(() => {
              const translation = t('landing.bismillah.translation');
              const firstCommaIndex = translation.indexOf(',');
              
              if (firstCommaIndex === -1) {
                // No comma found, display as single line
                return translation;
              }
              
              // Split at first comma only, so we get everything before and everything after
              const beforeComma = translation.substring(0, firstCommaIndex);
              const afterComma = translation.substring(firstCommaIndex + 1).trim();
              
              return (
                <>
                  {beforeComma},<br />
                  {afterComma}
                </>
              );
            })()}
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
                  // Preserve whitespace
                  result.push(word);
                  return;
                }
                
                if (!trimmed) return;
                
                const lowerWord = trimmed.toLowerCase();
                // Check for Muslim-related words in different languages
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
                  // Add line break after first Muslim word (before the next non-whitespace word)
                  if (!foundFirstMuslim) {
                    foundFirstMuslim = true;
                    // Check if there's a next word after whitespace
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

          <p className="font-inter text-base leading-6 text-center text-[#555555]">
            {(() => {
              const subtitle = t('splash.subtitle');
              // Find and highlight "insha'Allah" or equivalent
              const inshaPatterns = [
                /insha'?allah/gi,
                /إن شاء الله/gi,
                /inşaallah/gi,
                /inşallah/gi
              ];
              
              let highlighted = subtitle;
              inshaPatterns.forEach(pattern => {
                highlighted = highlighted.replace(pattern, (match) => {
                  return `__IN SHA__${match}__END__`;
                });
              });
              
              const parts = highlighted.split(/(__IN SHA__.*?__END__)/);
              return parts.map((part, index) => {
                if (part.startsWith('__IN SHA__') && part.endsWith('__END__')) {
                  const text = part.replace(/__IN SHA__|__END__/g, '');
                  return (
                    <span key={index} className="text-[#C2A274]">
                      {text}
                    </span>
                  );
                }
                return <span key={index}>{part}</span>;
              });
            })()}
          </p>
        </motion.div>

      </ContentSection>
    </motion.div>
  );
}
