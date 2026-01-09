'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/providers/LanguageProvider';
import { Icon } from '@/components/ui/Icon';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'toggle' | 'compact';
}

export function LanguageSwitcher({ className = '', variant = 'dropdown' }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const languages = [
    { code: 'en' as const, name: t('language.english'), iso: 'EN' },
    { code: 'de' as const, name: t('language.german'), iso: 'DE' },
    { code: 'ar' as const, name: t('language.arabic'), iso: 'AR' },
    { code: 'tr' as const, name: t('language.turkish'), iso: 'TR' },
    { code: 'ur' as const, name: t('language.urdu'), iso: 'UR' },
    { code: 'ps' as const, name: t('language.pashtu'), iso: 'PS' },
  ].sort((a, b) => a.name.localeCompare(b.name));

  const currentLanguage = languages.find(lang => lang.code === language);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Handle language change with visual feedback
  const handleLanguageChange = (langCode: typeof language) => {
    if (langCode === language || isChanging) return;

    setIsChanging(true);
    setLanguage(langCode);
    setIsOpen(false);

    // Reset changing state after a brief delay for visual feedback
    setTimeout(() => {
      setIsChanging(false);
    }, 300);
  };

  // Compact variant for header use
  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`${t('language.switchTo')} ${currentLanguage?.name || language}`}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          disabled={isChanging}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span aria-hidden="true" className="text-xs font-medium uppercase text-white">{currentLanguage?.iso}</span>
          <Icon 
            aria-hidden="true"
            className={`w-3.5 h-3.5 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
            icon="lucide:chevron-down"
          />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            aria-label={t('language.current')}
            className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
            dir={['ar', 'ur', 'ps'].includes(language) ? 'rtl' : 'ltr'}
            role="menu"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                aria-label={lang.name}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg focus:outline-none focus:bg-gray-50 ${
                  language === lang.code ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700'
                }`}
                role="menuitem"
                onClick={() => handleLanguageChange(lang.code)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLanguageChange(lang.code);
                  }
                }}
              >
                <span className="text-xs font-medium uppercase">{lang.iso}</span>
                <span className="text-sm flex-1">{lang.name}</span>
                {language === lang.code && (
                  <Icon aria-hidden="true" className="w-4 h-4 text-primary" icon="lucide:check" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Toggle variant
  if (variant === 'toggle') {
    const nextLanguageIndex = (languages.findIndex(lang => lang.code === language) + 1) % languages.length;
    const nextLanguage = languages[nextLanguageIndex];
    
    return (
      <button
        aria-label={`${t('language.switchTo')} ${nextLanguage.name}`}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${className}`}
        disabled={isChanging}
        onClick={() => handleLanguageChange(nextLanguage.code)}
      >
        <span className="text-xs font-medium uppercase">{currentLanguage?.iso}</span>
        {isChanging && (
          <Icon aria-hidden="true" className="w-4 h-4 animate-spin" icon="lucide:loader-2" />
        )}
      </button>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`} dir={['ar', 'ur', 'ps'].includes(language) ? 'rtl' : 'ltr'}>
      <button
        ref={buttonRef}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${t('language.switchTo')} ${currentLanguage?.name || language}`}
        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        disabled={isChanging}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-medium uppercase">{currentLanguage?.iso}</span>
        {isChanging ? (
          <Icon aria-hidden="true" className="w-4 h-4 animate-spin" icon="lucide:loader-2" />
        ) : (
          <Icon 
            aria-hidden="true"
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            icon="lucide:chevron-down"
          />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            aria-hidden="true"
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div
            ref={dropdownRef}
            aria-label={t('language.current')}
            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20"
            role="menu"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                aria-label={lang.name}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg focus:outline-none focus:bg-gray-50 ${
                  language === lang.code ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700'
                }`}
                role="menuitem"
                onClick={() => handleLanguageChange(lang.code)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLanguageChange(lang.code);
                  }
                }}
              >
                <span className="text-xs font-medium uppercase">{lang.iso}</span>
                <span className="text-sm font-medium flex-1">{lang.name}</span>
                {language === lang.code && (
                  <Icon aria-hidden="true" className="w-4 h-4 text-primary" icon="lucide:check" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

