'use client';

import { useState } from 'react';
import { useLanguage } from '@/providers/LanguageProvider';
import { Icon } from '@/components/ui/Icon';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'toggle';
}

export function LanguageSwitcher({ className = '', variant = 'dropdown' }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en' as const, name: t('language.english'), flag: '🇺🇸' },
    { code: 'de' as const, name: t('language.german'), flag: '🇩🇪' },
    { code: 'ar' as const, name: t('language.arabic'), flag: '🇸🇦' },
    { code: 'tr' as const, name: t('language.turkish'), flag: '🇹🇷' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  if (variant === 'toggle') {
    const nextLanguageIndex = (languages.findIndex(lang => lang.code === language) + 1) % languages.length;
    const nextLanguage = languages[nextLanguageIndex];
    
    return (
      <button
        aria-label={t('language.switchTo')}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors ${className}`}
        onClick={() => setLanguage(nextLanguage.code)}
      >
        <span className="text-lg">{currentLanguage?.flag}</span>
        <span className="text-sm font-medium">{currentLanguage?.name}</span>
        <Icon className="w-4 h-4" icon="lucide:chevron-down" />
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        aria-label={t('language.switchTo')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-lg">{currentLanguage?.flag}</span>
        <span className="text-sm font-medium">{currentLanguage?.name}</span>
        <Icon 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          icon="lucide:chevron-down" 
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  language === lang.code ? 'bg-primary/10 text-primary' : 'text-gray-700'
                }`}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
                {language === lang.code && (
                  <Icon className="w-4 h-4 ml-auto text-primary" icon="lucide:check" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

